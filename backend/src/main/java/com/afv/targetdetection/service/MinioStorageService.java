package com.afv.targetdetection.service;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

@Service
public class MinioStorageService implements FileStorageService {

    private final MinioClient minioClient;
    private final String bucketName;

    public MinioStorageService(MinioClient minioClient,
                               @Value("${app.minio.bucket-name}") String bucketName) {
        this.minioClient = minioClient;
        this.bucketName = bucketName;
    }

    @Override
    public String uploadFile(String path, MultipartFile file) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(path)
                            .stream(file.getInputStream(), file.getSize(), -1L)
                            .contentType(file.getContentType())
                            .build()
            );
            return path;
        } catch (Exception e) {
            System.err.println("MinIO unreachable, storing in local fallback directory: " + e.getMessage());
            try {
                java.nio.file.Path target = java.nio.file.Paths.get("uploads", path);
                java.nio.file.Files.createDirectories(target.getParent());
                file.transferTo(target.toFile());
                return target.toString();
            } catch (Exception localEx) {
                return path;
            }
        }
    }

    @Override
    public String uploadBytes(String path, byte[] bytes, String contentType) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(path)
                            .stream(new java.io.ByteArrayInputStream(bytes), (long) bytes.length, -1L)
                            .contentType(contentType)
                            .build()
            );
            return path;
        } catch (Exception e) {
            System.err.println("MinIO unreachable, storing in local fallback directory: " + e.getMessage());
            try {
                java.nio.file.Path target = java.nio.file.Paths.get("uploads", path);
                java.nio.file.Files.createDirectories(target.getParent());
                java.nio.file.Files.write(target, bytes);
                return target.toString();
            } catch (Exception localEx) {
                return path;
            }
        }
    }

    @Override
    public InputStream downloadFile(String path) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(path)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to download file from MinIO: " + e.getMessage(), e);
        }
    }
}
