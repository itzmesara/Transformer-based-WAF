package com.waf.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "waf_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WafLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "client_ip", nullable = false)
    private String clientIp;

    @Column(name = "request_method", nullable = false)
    private String requestMethod;

    @Column(name = "request_path", nullable = false, length = 1024)
    private String requestPath;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @Column(nullable = false)
    private boolean blocked;

    @Column(name = "attack_type", nullable = false)
    private String attackType;

    private double confidence;

    @Column(name = "model_used")
    private String modelUsed;

    @Column(name = "latency_ms")
    private long latencyMs;
}
