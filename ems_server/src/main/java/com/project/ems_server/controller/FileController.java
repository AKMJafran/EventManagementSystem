package com.project.ems_server.controller;

import com.project.ems_server.dto.response.FileUploadResponse;
import com.project.ems_server.service.FileContentResult;
import com.project.ems_server.service.FileServerService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileController {

    private static final Logger logger = LoggerFactory.getLogger(FileController.class);
    private final FileServerService fileServerService;

    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> uploadFile(@RequestParam(value = "file", required = true) MultipartFile file) {
        try {
            FileUploadResponse uploadResponse = fileServerService.uploadImage(file);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploadResponse);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .body(Map.of("error", e.getReason() != null ? e.getReason() : "File upload failed"));
        } catch (Exception e) {
            logger.error("File upload failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload file", "details", e.getMessage()));
        }
    }

    @GetMapping("/content/{fileId}")
    public ResponseEntity<?> serveFile(
            @PathVariable String fileId,
            @RequestParam long expires,
            @RequestParam String signature) {
        try {
            if (!fileServerService.isValidAccessSignature(fileId, expires, signature)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Invalid or expired file access signature"));
            }

            FileContentResult fileContent = fileServerService.fetchFileContent(fileId);
            MediaType mediaType = fileContent.getContentType() != null && !fileContent.getContentType().isBlank()
                    ? MediaType.parseMediaType(fileContent.getContentType())
                    : MediaType.APPLICATION_OCTET_STREAM;

            ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok()
                    .contentType(mediaType)
                    .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePrivate());

            if (fileContent.getContentDisposition() != null && !fileContent.getContentDisposition().isBlank()) {
                responseBuilder.header(HttpHeaders.CONTENT_DISPOSITION, fileContent.getContentDisposition());
            }

            return responseBuilder.body(fileContent.getContent());
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .body(Map.of("error", e.getReason() != null ? e.getReason() : "Failed to load file"));
        } catch (Exception e) {
            logger.error("File retrieval failed for fileId {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to load file"));
        }
    }
}
