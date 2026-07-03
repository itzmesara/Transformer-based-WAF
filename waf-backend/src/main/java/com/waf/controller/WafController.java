package com.waf.controller;

import com.waf.config.WafProperties;
import com.waf.entity.WafLog;
import com.waf.repository.WafLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/waf")
@CrossOrigin(origins = "*")
public class WafController {

    private final WafLogRepository wafLogRepository;
    private final WafProperties wafProperties;

    public WafController(WafLogRepository wafLogRepository, WafProperties wafProperties) {
        this.wafLogRepository = wafLogRepository;
        this.wafProperties = wafProperties;
    }

    @GetMapping("/logs")
    public ResponseEntity<List<WafLog>> getLogs() {
        return ResponseEntity.ok(wafLogRepository.findAllByOrderByTimestampDesc());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<WafLog> logs = wafLogRepository.findAll();
        
        long totalRequests = logs.size();
        long blockedRequests = logs.stream().filter(WafLog::isBlocked).count();
        long allowedRequests = totalRequests - blockedRequests;
        
        double blockRate = totalRequests == 0 ? 0.0 : ((double) blockedRequests / totalRequests) * 100.0;
        
        double avgLatency = logs.stream()
                .mapToLong(WafLog::getLatencyMs)
                .average()
                .orElse(0.0);

        // Group by attack type for chart data
        Map<String, Long> attackBreakdown = logs.stream()
                .filter(log -> !"Benign".equals(log.getAttackType()))
                .collect(Collectors.groupingBy(WafLog::getAttackType, Collectors.counting()));

        // Also count benign
        long benignCount = logs.stream().filter(log -> "Benign".equals(log.getAttackType())).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRequests", totalRequests);
        stats.put("blockedRequests", blockedRequests);
        stats.put("allowedRequests", allowedRequests);
        stats.put("blockRate", round(blockRate, 2));
        stats.put("avgLatencyMs", round(avgLatency, 1));
        stats.put("attackBreakdown", attackBreakdown);
        stats.put("benignCount", benignCount);
        stats.put("blockingEnabled", wafProperties.isBlockingEnabled());
        stats.put("confidenceThreshold", wafProperties.getConfidenceThreshold());
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("blockingEnabled", wafProperties.isBlockingEnabled());
        config.put("confidenceThreshold", wafProperties.getConfidenceThreshold());
        config.put("pythonUrl", wafProperties.getPythonUrl());
        config.put("bypassPaths", wafProperties.getBypassPaths());
        return ResponseEntity.ok(config);
    }

    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> updateConfig(@RequestBody Map<String, Object> updates) {
        if (updates.containsKey("blockingEnabled")) {
            wafProperties.setBlockingEnabled((Boolean) updates.get("blockingEnabled"));
        }
        if (updates.containsKey("confidenceThreshold")) {
            // Can be Double or Integer
            Number threshold = (Number) updates.get("confidenceThreshold");
            wafProperties.setConfidenceThreshold(threshold.doubleValue());
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "WAF Configuration updated successfully");
        response.put("blockingEnabled", wafProperties.isBlockingEnabled());
        response.put("confidenceThreshold", wafProperties.getConfidenceThreshold());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/clear")
    public ResponseEntity<Map<String, String>> clearLogs() {
        wafLogRepository.deleteAll();
        Map<String, String> response = new HashMap<>();
        response.put("message", "All WAF logs cleared successfully");
        return ResponseEntity.ok(response);
    }

    private double round(double value, int places) {
        if (places < 0) throw new IllegalArgumentException();
        long factor = (long) Math.pow(10, places);
        value = value * factor;
        long tmp = Math.round(value);
        return (double) tmp / factor;
    }
}
