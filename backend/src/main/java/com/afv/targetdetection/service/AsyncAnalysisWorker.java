package com.afv.targetdetection.service;

import com.afv.targetdetection.client.AiInferenceClient;
import com.afv.targetdetection.dto.AiDetection;
import com.afv.targetdetection.dto.AiInferenceResponse;
import com.afv.targetdetection.entity.Analysis;
import com.afv.targetdetection.entity.DetectedObject;
import com.afv.targetdetection.entity.ModelVersion;
import com.afv.targetdetection.repository.AnalysisRepository;
import com.afv.targetdetection.repository.ModelVersionRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

@Component
public class AsyncAnalysisWorker {

    private final FileStorageService fileStorageService;
    private final AiInferenceClient aiInferenceClient;
    private final AnalysisRepository analysisRepository;
    private final ModelVersionRepository modelVersionRepository;

    public AsyncAnalysisWorker(FileStorageService fileStorageService,
                               AiInferenceClient aiInferenceClient,
                               AnalysisRepository analysisRepository,
                               ModelVersionRepository modelVersionRepository) {
        this.fileStorageService = fileStorageService;
        this.aiInferenceClient = aiInferenceClient;
        this.analysisRepository = analysisRepository;
        this.modelVersionRepository = modelVersionRepository;
    }

    @Async
    @Transactional
    public void processAnalysisAsync(UUID analysisId, MultipartFile file, String modelVersionStr) {
        Analysis analysis = analysisRepository.findById(analysisId).orElse(null);
        if (analysis == null) {
            return;
        }

        try {
            // 1. Update status to RUNNING
            analysis.setStatus("RUNNING");
            analysisRepository.saveAndFlush(analysis);

            // 2. Upload file to MinIO
            String storagePath = "analyses/" + analysisId + "/" + file.getOriginalFilename();
            fileStorageService.uploadFile(storagePath, file);
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
            AiInferenceResponse aiResponse = aiInferenceClient.runInference(file, modelVersionStr).block();

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
        }
    }
}
