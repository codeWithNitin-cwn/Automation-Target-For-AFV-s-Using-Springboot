package com.afv.targetdetection.controller;

import com.afv.targetdetection.dto.AnalysisResponse;
import com.afv.targetdetection.service.AnalysisService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/analyses")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping
    public ResponseEntity<AnalysisResponse> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "model_version", defaultValue = "yolov8n-afv-v1.0") String modelVersion) {
        
        AnalysisResponse response = analysisService.submitAnalysis(file, modelVersion);
        // Returns 202 Accepted because the analysis will run asynchronously in background threads
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnalysisResponse> getAnalysis(@PathVariable("id") UUID id) {
        AnalysisResponse response = analysisService.getAnalysis(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<AnalysisResponse>> getAnalysisHistory() {
        List<AnalysisResponse> history = analysisService.getAnalysisHistory();
        return ResponseEntity.ok(history);
    }
}
