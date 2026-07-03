package com.waf.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WafPredictionResponse {
    private String payload;
    
    @JsonProperty("decoded_payload")
    private String decodedPayload;
    
    @JsonProperty("is_malicious")
    private boolean malicious;
    
    private double confidence;
    
    @JsonProperty("attack_type")
    private String attackType;
    
    private Map<String, Object> features;
    
    @JsonProperty("model_used")
    private String modelUsed;
}
