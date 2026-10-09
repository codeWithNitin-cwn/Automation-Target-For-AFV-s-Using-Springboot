package com.afv.targetdetection.service;

import com.afv.targetdetection.client.AiInferenceClient;
import com.afv.targetdetection.dto.AiDetection;
import com.afv.targetdetection.dto.AiInferenceResponse;
import com.afv.targetdetection.dto.AnalysisResponse;
import com.afv.targetdetection.dto.DetectedObjectResponse;
import com.afv.targetdetection.entity.Analysis;
import com.afv.targetdetection.entity.DetectedObject;
import com.afv.targetdetection.entity.ModelVersion;
import com.afv.targetdetection.repository.AnalysisRepository;
import com.afv.targetdetection.repository.ModelVersionRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class AsyncAnalysisWorker {

    private final FileStorageService fileStorageService;
    private final AiInferenceClient aiInferenceClient;
    private final AnalysisRepository analysisRepository;
    private final ModelVersionRepository modelVersionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public AsyncAnalysisWorker(FileStorageService fileStorageService,
                               AiInferenceClient aiInferenceClient,
                               AnalysisRepository analysisRepository,
                               ModelVersionRepository modelVersionRepository,
                               SimpMessagingTemplate messagingTemplate) {
        this.fileStorageService = fileStorageService;
        this.aiInferenceClient = aiInferenceClient;
        this.analysisRepository = analysisRepository;
        this.modelVersionRepository = modelVersionRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Async("taskExecutor")
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void processAnalysisAsync(UUID analysisId, byte[] fileBytes, String filename, String contentType, String modelVersionStr) {
        Analysis analysis = null;
        for (int i = 0; i < 10; i++) {
            analysis = analysisRepository.findById(analysisId).orElse(null);
            if (analysis != null) {
                break;
            }
            try {
                Thread.sleep(150);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }

        if (analysis == null) {
            System.err.println("Fatal: Analysis record not found for ID: " + analysisId);
            return;
        }

        try {
            // 1. Update status to RUNNING
            analysis.setStatus("RUNNING");
            analysisRepository.saveAndFlush(analysis);
            broadcastUpdate(analysis);

            // 2. Upload file to MinIO (or fallback directory)
            String storagePath = "analyses/" + analysisId + "/" + filename;
            fileStorageService.uploadBytes(storagePath, fileBytes, contentType);
            analysis.setStoragePath(storagePath);

            // 3. Ensure the model version exists in our DB
            ModelVersion modelVersion = modelVersionRepository.findById(modelVersionStr).orElse(null);
            if (modelVersion == null) {
                modelVersion = ModelVersion.builder()
                        .version(modelVersionStr)
                        .description("Dynamically registered model version during scan")
                        .active(true)
                        .build();
                modelVersionRepository.saveAndFlush(modelVersion);
            }
            analysis.setModelVersion(modelVersion);

            // 4. Send request to Python AI Microservice (blocks inside the background thread)
            AiInferenceResponse aiResponse = aiInferenceClient.runInference(fileBytes, filename, modelVersionStr).block();

            if (aiResponse != null && "success".equalsIgnoreCase(aiResponse.getStatus())) {
                // 5. Save the targets found by AI
                for (AiDetection detection : aiResponse.getDetections()) {
                    DetectedObject obj = DetectedObject.builder()
                            .analysis(analysis)
                            .className(detection.getClassName())
                            .confidence(detection.getConfidence())
                            .boxXMin(detection.getBox().getXMin())
                            .boxYMin(detection.getBox().getYMin())
                            .boxXMax(detection.getBox().getXMax())
                            .boxYMax(detection.getBox().getYMax())
                            .build();
                    analysis.getDetectedObjects().add(obj);
                }
                analysis.setStatus("COMPLETED");
                analysis.setProcessingTimeMs(aiResponse.getProcessingTimeMs());
            } else {
                analysis.setStatus("FAILED");
            }
        } catch (Exception e) {
            analysis.setStatus("FAILED");
            System.err.println("Error processing analysis " + analysisId + ": " + e.getMessage());
        } finally {
            analysisRepository.save(analysis);
            broadcastUpdate(analysis);
        }
    }

    private void broadcastUpdate(Analysis analysis) {
        try {
            List<DetectedObjectResponse> objectResponses = new ArrayList<>();
            if (analysis.getDetectedObjects() != null) {
                objectResponses = analysis.getDetectedObjects().stream()
                        .map(obj -> DetectedObjectResponse.builder()
                                .id(obj.getId())
                                .className(obj.getClassName())
                                .confidence(obj.getConfidence())
                                .boxXMin(obj.getBoxXMin())
                                .boxYMin(obj.getBoxYMin())
                                .boxXMax(obj.getBoxXMax())
                                .boxYMax(obj.getBoxYMax())
                                .build())
                        .collect(Collectors.toList());
            }

            AnalysisResponse response = AnalysisResponse.builder()
                    .id(analysis.getId())
                    .userId(analysis.getUser() != null ? analysis.getUser().getId() : null)
                    .status(analysis.getStatus())
                    .fileName(analysis.getFileName())
                    .fileType(analysis.getFileType())
                    .fileSize(analysis.getFileSize())
                    .storagePath(analysis.getStoragePath())
                    .modelVersion(analysis.getModelVersion() != null ? analysis.getModelVersion().getVersion() : null)
                    .processingTimeMs(analysis.getProcessingTimeMs())
                    .createdAt(analysis.getCreatedAt())
                    .updatedAt(analysis.getUpdatedAt())
                    .detectedObjects(objectResponses)
                    .build();

            messagingTemplate.convertAndSend("/topic/analyses", response);
            messagingTemplate.convertAndSend("/topic/analyses/" + analysis.getId(), response);
        } catch (Exception e) {
            System.err.println("Failed to broadcast WebSocket update: " + e.getMessage());
        }
    }
}
