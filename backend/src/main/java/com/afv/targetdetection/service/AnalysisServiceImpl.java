package com.afv.targetdetection.service;

import com.afv.targetdetection.dto.AnalysisResponse;
import com.afv.targetdetection.dto.DetectedObjectResponse;
import com.afv.targetdetection.entity.Analysis;
import com.afv.targetdetection.entity.User;
import com.afv.targetdetection.exception.ResourceNotFoundException;
import com.afv.targetdetection.repository.AnalysisRepository;
import com.afv.targetdetection.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AnalysisServiceImpl implements AnalysisService {

    private final AnalysisRepository analysisRepository;
    private final UserRepository userRepository;
    private final AsyncAnalysisWorker asyncAnalysisWorker;
    private final FileStorageService fileStorageService;

    public AnalysisServiceImpl(AnalysisRepository analysisRepository,
                               UserRepository userRepository,
                               AsyncAnalysisWorker asyncAnalysisWorker,
                               FileStorageService fileStorageService) {
        this.analysisRepository = analysisRepository;
        this.userRepository = userRepository;
        this.asyncAnalysisWorker = asyncAnalysisWorker;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional(readOnly = true)
    public com.afv.targetdetection.dto.AnalysisImage getAnalysisImage(UUID id) {
        Analysis analysis = analysisRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis record not found with ID: " + id));
        if (analysis.getStoragePath() == null || analysis.getStoragePath().isBlank()) {
            throw new ResourceNotFoundException("Image file not available for analysis: " + id);
        }
        java.io.InputStream is = fileStorageService.downloadFile(analysis.getStoragePath());
        String contentType = analysis.getFileType() != null ? analysis.getFileType() : "application/octet-stream";
        return new com.afv.targetdetection.dto.AnalysisImage(is, contentType, analysis.getFileName());
    }

    @Override
    @Transactional
    public AnalysisResponse submitAnalysis(MultipartFile file, String modelVersion) {
        // Find current authenticated user (if any)
        User currentUser = null;
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            currentUser = userRepository.findByUsername(username).orElse(null);
        }

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception e) {
            throw new RuntimeException("Failed to read uploaded file content: " + e.getMessage(), e);
        }
        String originalFilename = file.getOriginalFilename();
        String contentType = file.getContentType();

        // Create initial PENDING Analysis entity
        Analysis analysis = Analysis.builder()
                .status("PENDING")
                .fileName(originalFilename)
                .fileType(contentType)
                .fileSize(file.getSize())
                .storagePath("") // Will be filled by Async worker after upload
                .user(currentUser)
                .build();

        analysis = analysisRepository.saveAndFlush(analysis);

        // Hand over the execution to a background worker to avoid thread blocking
        asyncAnalysisWorker.processAnalysisAsync(analysis.getId(), fileBytes, originalFilename, contentType, modelVersion);

        return mapToResponse(analysis);
    }

    @Override
    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysis(UUID id) {
        Analysis analysis = analysisRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis record not found with ID: " + id));
        return mapToResponse(analysis);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnalysisResponse> getAnalysisHistory() {
        // Load logged in user's history
        User currentUser = null;
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            currentUser = userRepository.findByUsername(username).orElse(null);
        }

        List<Analysis> analyses;
        if (currentUser != null) {
            analyses = analysisRepository.findByUserOrderByCreatedAtDesc(currentUser);
        } else {
            analyses = analysisRepository.findAll();
        }

        return analyses.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private AnalysisResponse mapToResponse(Analysis analysis) {
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

        return AnalysisResponse.builder()
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
    }
}
