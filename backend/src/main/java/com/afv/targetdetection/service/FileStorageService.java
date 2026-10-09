package com.afv.targetdetection.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public interface FileStorageService {
    String uploadFile(String path, MultipartFile file);
    String uploadBytes(String path, byte[] bytes, String contentType);
    InputStream downloadFile(String path);
}
