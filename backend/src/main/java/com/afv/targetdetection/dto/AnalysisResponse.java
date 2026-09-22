package com.afv.targetdetection.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisResponse {
    private UUID id;
    private UUID userId;
    private String status;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String storagePath;
    private String modelVersion;
    private Long processingTimeMs;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<DetectedObjectResponse> detectedObjects;
}
