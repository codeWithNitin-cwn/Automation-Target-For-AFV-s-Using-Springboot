package com.afv.targetdetection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiDetection {
    @JsonProperty("class_name")
    private String className;

    private Double confidence;

    private BoundingBox box;
}
