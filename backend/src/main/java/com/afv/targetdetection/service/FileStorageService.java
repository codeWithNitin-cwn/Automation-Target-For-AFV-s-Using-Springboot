package com.afv.targetdetection.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public interface FileStorageService {
    String uploadFile(String path, MultipartFile file);
    InputStream downloadFile(String path);
}
