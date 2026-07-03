package com.waf.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.waf.config.WafProperties;
import com.waf.entity.WafLog;
import com.waf.model.WafPredictionResponse;
import com.waf.repository.WafLogRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
public class WafFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(WafFilter.class);

    private final WafProperties wafProperties;
    private final WafLogRepository wafLogRepository;
    private final RestTemplate restTemplate;
    private final AntPathMatcher pathMatcher;
    private final ObjectMapper objectMapper;

    public WafFilter(WafProperties wafProperties, WafLogRepository wafLogRepository) {
        this.wafProperties = wafProperties;
        this.wafLogRepository = wafLogRepository;
        this.restTemplate = new RestTemplate();
        this.pathMatcher = new AntPathMatcher();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;

        String requestPath = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();

        // 1. Check if the path is bypassed
        boolean shouldBypass = wafProperties.getBypassPaths().stream()
                .anyMatch(pattern -> pathMatcher.match(pattern, requestPath));

        if (shouldBypass) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        // 2. Wrap request to cache the body bytes for multiple reads
        CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(httpRequest);

        // 3. Extract payload components (Query string + POST body + URL parameters)
        StringBuilder payloadBuffer = new StringBuilder();
        
        if (httpRequest.getQueryString() != null) {
            payloadBuffer.append(httpRequest.getQueryString()).append(" ");
        }
        
        String body = wrappedRequest.getBody();
        if (body != null && !body.isEmpty()) {
            payloadBuffer.append(body).append(" ");
        }
        
        httpRequest.getParameterMap().forEach((key, values) -> {
            for (String val : values) {
                payloadBuffer.append(key).append("=").append(val).append(" ");
            }
        });

        String payload = payloadBuffer.toString().trim();

        // If payload is empty, it's a simple safe request (e.g. landing page load)
        if (payload.isEmpty()) {
            filterChain.doFilter(wrappedRequest, servletResponse);
            return;
        }

        // 4. Perform WAF Check
        long startTime = System.currentTimeMillis();
        WafPredictionResponse prediction = null;
        boolean communicationError = false;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("payload", payload);
            
            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(requestBody, headers);
            
            prediction = restTemplate.postForObject(
                    wafProperties.getPythonUrl(),
                    requestEntity,
                    WafPredictionResponse.class
            );
        } catch (Exception e) {
            log.warn("[WAF WARNING] Failed to connect to Python AI WAF service: {}. Running local heuristics.", e.getMessage());
            communicationError = true;
            prediction = runLocalHeuristics(payload);
        }

        long latencyMs = System.currentTimeMillis() - startTime;

        if (prediction == null) {
            prediction = new WafPredictionResponse(payload, payload, false, 1.0, "Benign", new HashMap<>(), "Fallback Heuristic");
        }

        boolean isMalicious = prediction.isMalicious();
        double confidence = prediction.getConfidence();
        String attackType = prediction.getAttackType();
        String modelUsed = prediction.getModelUsed() + (communicationError ? " (Local Fallback)" : "");

        boolean shouldBlock = isMalicious && confidence >= wafProperties.getConfidenceThreshold() && wafProperties.isBlockingEnabled();

        // 5. Log security event to database
        WafLog securityLog = WafLog.builder()
                .timestamp(LocalDateTime.now())
                .clientIp(getClientIp(httpRequest))
                .requestMethod(method)
                .requestPath(requestPath)
                .payload(payload)
                .blocked(shouldBlock)
                .attackType(attackType)
                .confidence(confidence)
                .modelUsed(modelUsed)
                .latencyMs(latencyMs)
                .build();
        
        securityLog = wafLogRepository.save(securityLog);

        // 6. Enforce Blocking if flagged
        if (shouldBlock) {
            log.info("[WAF BLOCK] Path: {} | IP: {} | Attack: {} (confidence: {})", 
                    requestPath, securityLog.getClientIp(), attackType, confidence);
            
            sendBlockResponse(httpResponse, securityLog);
            return;
        }

        // 7. Proceed to target application
        filterChain.doFilter(wrappedRequest, servletResponse);
    }

    private WafPredictionResponse runLocalHeuristics(String payload) {
        String lowerPayload = payload.toLowerCase();
        
        // Simple local regex rules
        boolean isSqli = lowerPayload.contains("' or '") || lowerPayload.contains("' or 1=1") || 
                         lowerPayload.contains("union select") || lowerPayload.contains("select null") ||
                         lowerPayload.contains("drop table");
                         
        boolean isXss = lowerPayload.contains("<script") || lowerPayload.contains("javascript:") ||
                        lowerPayload.contains("onerror=") || lowerPayload.contains("onload=");
                        
        boolean isCmd = lowerPayload.contains("; rm ") || lowerPayload.contains("&& ls") || 
                        lowerPayload.contains("&& ipconfig") || lowerPayload.contains("; cat /");

        if (isXss) {
            return new WafPredictionResponse(payload, payload, true, 0.90, "XSS", new HashMap<>(), "Java Regex Heuristic");
        } else if (isSqli) {
            return new WafPredictionResponse(payload, payload, true, 0.90, "SQLi", new HashMap<>(), "Java Regex Heuristic");
        } else if (isCmd) {
            return new WafPredictionResponse(payload, payload, true, 0.90, "Command Injection", new HashMap<>(), "Java Regex Heuristic");
        }
        
        return new WafPredictionResponse(payload, payload, false, 0.95, "Benign", new HashMap<>(), "Java Regex Heuristic");
    }

    private void sendBlockResponse(HttpServletResponse response, WafLog logDetail) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> errorDetails = new HashMap<>();
        errorDetails.put("status", HttpServletResponse.SC_FORBIDDEN);
        errorDetails.put("error", "Forbidden");
        errorDetails.put("message", "Request Blocked by Antigravity AI-WAF");
        errorDetails.put("timestamp", LocalDateTime.now().toString());
        errorDetails.put("attack_category", logDetail.getAttackType());
        errorDetails.put("threat_confidence", String.format("%.2f%%", logDetail.getConfidence() * 100));
        errorDetails.put("event_id", logDetail.getId());
        errorDetails.put("client_ip", logDetail.getClientIp());

        response.getWriter().write(objectMapper.writeValueAsString(errorDetails));
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
