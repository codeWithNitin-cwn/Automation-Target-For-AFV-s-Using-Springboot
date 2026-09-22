package com.afv.targetdetection.client;

import com.afv.targetdetection.dto.AiInferenceResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Mono;

@Component
public class AiInferenceClient {

    private final WebClient webClient;

    public AiInferenceClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.ai.service-url}") String aiServiceUrl) {
        this.webClient = webClientBuilder.baseUrl(aiServiceUrl).build();
    }

    public Mono<AiInferenceResponse> runInference(MultipartFile file, String modelVersion) {
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        // file.getResource() extracts the resource wrapper containing the inputStream, size, and filename
        bodyBuilder.part("file", file.getResource());
        bodyBuilder.part("model_version", modelVersion);

        return this.webClient.post()
                .uri("/inference")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                .retrieve()
                .bodyToMono(AiInferenceResponse.class);
    }
}
