package com.afv.targetdetection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoundingBox {
    @JsonProperty("x_min")
    private Double xMin;

    @JsonProperty("y_min")
    private Double yMin;

    @JsonProperty("x_max")
    private Double xMax;

    @JsonProperty("y_max")
    private Double yMax;
}
