package com.afv.targetdetection.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetectedObjectResponse {
    private Long id;
    private String className;
    private Double confidence;
    private Double boxXMin;
    private Double boxYMin;
    private Double boxXMax;
    private Double boxYMax;
}
