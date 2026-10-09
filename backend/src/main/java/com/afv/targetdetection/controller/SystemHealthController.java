package com.afv.targetdetection.controller;

import io.minio.BucketExistsArgs;
import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemHealthController {

    private final JdbcTemplate jdbcTemplate;
    private final MinioClient minioClient;
    private final String bucketName;
    private final WebClient aiWebClient;

    public SystemHealthController(
            JdbcTemplate jdbcTemplate,
            MinioClient minioClient,
            @Value("${app.minio.bucket-name}") String bucketName,
            @Value("${app.ai.service-url:http://localhost:8000}") String aiServiceUrl,
            WebClient.Builder webClientBuilder) {
        this.jdbcTemplate = jdbcTemplate;
        this.minioClient = minioClient;
        this.bucketName = bucketName;
        this.aiWebClient = webClientBuilder.baseUrl(aiServiceUrl).build();
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getSystemHealth() {
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> components = new HashMap<>();

        // 1. Backend
        components.put("backend", Map.of(
                "status", "UP",
                "details", "Spring Boot v3.2.3 operational",
                "lastChecked", Instant.now().toString()
        ));

        // 2. Database
        String dbStatus = "UP";
        String dbDetails = "Database connected";
        try {
            jdbcTemplate.execute("SELECT 1");
        } catch (Exception e) {
            dbStatus = "DOWN";
            dbDetails = "Database unreachable: " + e.getMessage();
        }
        components.put("database", Map.of(
                "status", dbStatus,
                "details", dbDetails,
                "lastChecked", Instant.now().toString()
        ));

        // 3. AI Service (YOLOv8 on port 8000)
        String aiStatus = "UP";
        String aiDetails = "YOLOv8 Engine active";
        try {
            Map<?, ?> aiRes = aiWebClient.get()
                    .uri("/")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(java.time.Duration.ofMillis(1500));
            if (aiRes != null && aiRes.containsKey("engine")) {
                aiDetails = String.valueOf(aiRes.get("engine"));
            }
        } catch (Exception e) {
            aiStatus = "DOWN";
            aiDetails = "AI Service unreachable on port 8000";
        }
        components.put("aiService", Map.of(
                "status", aiStatus,
                "details", aiDetails,
                "lastChecked", Instant.now().toString()
        ));

        // 4. Object Storage (MinIO or local fallback)
        String storageStatus = "UP";
        String storageDetails = "MinIO bucket '" + bucketName + "' accessible";
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build()
            );
            if (!exists) {
                storageStatus = "DEGRADED";
                storageDetails = "MinIO bucket '" + bucketName + "' does not exist (using local disk fallback)";
            }
        } catch (Exception e) {
            storageStatus = "DEGRADED";
            storageDetails = "MinIO offline (Active Local Disk Fallback: ./uploads)";
        }
        components.put("storage", Map.of(
                "status", storageStatus,
                "details", storageDetails,
                "lastChecked", Instant.now().toString()
        ));

        boolean overallOk = !"DOWN".equals(dbStatus) && !"DOWN".equals(aiStatus);
        response.put("status", overallOk ? "UP" : "DEGRADED");
        response.put("timestamp", Instant.now().toString());
        response.put("components", components);

        return ResponseEntity.ok(response);
    }
}
