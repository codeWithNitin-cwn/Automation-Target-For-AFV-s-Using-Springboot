package com.afv.targetdetection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiInferenceResponse {
    private String status;

    @JsonProperty("model_version")
    private String modelVersion;

    @JsonProperty("processing_time_ms")
    private Long processingTimeMs;

    private List<AiDetection> detections;
}
