package com.waf.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
public class TestController {

    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> testSubmit(@RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Request successfully bypassed the WAF and reached the backend target controller!");
        response.put("receivedData", body);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/query")
    public ResponseEntity<Map<String, Object>> testQuery(@RequestParam(name = "q", defaultValue = "") String q) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Query parameters successfully bypassed the WAF!");
        response.put("queryReceived", q);
        return ResponseEntity.ok(response);
    }
}
