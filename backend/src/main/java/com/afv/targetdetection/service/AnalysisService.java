package com.afv.targetdetection.service;

import com.afv.targetdetection.dto.AnalysisResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;

public interface AnalysisService {
    AnalysisResponse submitAnalysis(MultipartFile file, String modelVersion);
    AnalysisResponse getAnalysis(UUID id);
    List<AnalysisResponse> getAnalysisHistory();
}
