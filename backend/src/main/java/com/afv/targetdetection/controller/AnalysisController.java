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

    @GetMapping("/{id}/image")
    public ResponseEntity<org.springframework.core.io.Resource> getAnalysisImage(@PathVariable("id") UUID id) {
        com.afv.targetdetection.dto.AnalysisImage image = analysisService.getAnalysisImage(id);
        org.springframework.http.MediaType mediaType;
        try {
            mediaType = org.springframework.http.MediaType.parseMediaType(image.contentType());
        } catch (Exception e) {
            mediaType = org.springframework.http.MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + image.fileName() + "\"")
                .body(new org.springframework.core.io.InputStreamResource(image.inputStream()));
    }

    @GetMapping
    public ResponseEntity<List<AnalysisResponse>> getAnalysisHistory() {
        List<AnalysisResponse> history = analysisService.getAnalysisHistory();
        return ResponseEntity.ok(history);
    }
}
