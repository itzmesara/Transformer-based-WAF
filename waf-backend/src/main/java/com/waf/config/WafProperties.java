package com.waf.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "waf")
@Data
public class WafProperties {
    private String pythonUrl = "http://localhost:5000/predict";
    private boolean blockingEnabled = true;
    private double confidenceThreshold = 0.70;
    private List<String> bypassPaths = new ArrayList<>();
}
