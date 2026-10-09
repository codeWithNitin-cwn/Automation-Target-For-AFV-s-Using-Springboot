package com.afv.targetdetection.dto;

import java.io.InputStream;

public record AnalysisImage(
        InputStream inputStream,
        String contentType,
        String fileName
) {
}
