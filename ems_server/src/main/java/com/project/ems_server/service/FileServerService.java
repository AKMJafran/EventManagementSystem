package com.project.ems_server.service;

import com.project.ems_server.dto.response.FileUploadResponse;
import com.project.ems_server.entity.Event;
import com.project.ems_server.repository.EventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.unit.DataSize;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class FileServerService {

    private static final Logger logger = LoggerFactory.getLogger(FileServerService.class);

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/jpg", "image/png");

    private final RestTemplate restTemplate;
    private final EventRepository eventRepository;

    @Value("${fileserver.url:http://localhost:8080/api}")
    private String fileServerUrl;

    @Value("${fileserver.client.name:test_backend}")
    private String clientName;

    @Value("${fileserver.client.secret:your_random_jwt_secret_32_chars_minimum}")
    private String clientSecret;

    @Value("${fileserver.public-base-url:http://localhost:8081}")
    private String publicBaseUrl;

    @Value("${fileserver.access-link-secret:verysecretvalue12345678901234567890}")
    private String accessLinkSecret;

    @Value("${fileserver.access-link-ttl-minutes:1440}")
    private long accessLinkTtlMinutes;

    @Value("${fileserver.images.max-size:5MB}")
    private DataSize maxImageSize;

    @Value("${fileserver.retry.max-attempts:3}")
    private int maxAttempts;

    @Value("${fileserver.retry.backoff-ms:400}")
    private long retryBackoffMs;

    private volatile String authToken;

    public FileServerService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
        this.restTemplate = new RestTemplate();
    }

    // =========================
    // IMAGE UPLOAD
    // =========================
    public FileUploadResponse uploadImage(MultipartFile file) {
        validateImage(file);

        String contentType = normalizeContentType(file.getOriginalFilename(), file.getContentType());
        String checksum = calculateChecksum(file);

        Optional<Event> existingEvent =
                eventRepository.findTopByImageChecksumAndImageIdIsNotNull(checksum);

        if (existingEvent.isPresent()) {
            return mapExistingUpload(existingEvent.get(), checksum);
        }

        String fileId = uploadToFileServer(file, contentType);
        LocalDateTime uploadedAt = LocalDateTime.now();

        return FileUploadResponse.builder()
                .fileId(fileId)
                .originalFilename(safeFilename(file.getOriginalFilename()))
                .contentType(contentType)
                .checksum(checksum)
                .reusedExisting(false)
                .uploadedAt(uploadedAt)
                .imageUrl(buildFileAccessUrl(fileId))
                .build();
    }

    // =========================
    // FILE ACCESS URL
    // =========================
    public String buildFileAccessUrl(String fileId) {
        if (fileId == null || fileId.isBlank()) return null;

        long expires = LocalDateTime.now()
                .plusMinutes(accessLinkTtlMinutes)
                .toEpochSecond(ZoneOffset.UTC);

        String signature = sign(fileId, expires);

        return UriComponentsBuilder.fromUriString(trimTrailingSlash(publicBaseUrl))
                .path("/files/content/{fileId}")
                .queryParam("expires", expires)
                .queryParam("signature", signature)
                .buildAndExpand(fileId)
                .toUriString();
    }

    public boolean isValidAccessSignature(String fileId, long expires, String signature) {
        if (fileId == null || fileId.isBlank() || signature == null || signature.isBlank()) {
            return false;
        }

        long now = LocalDateTime.now().toEpochSecond(ZoneOffset.UTC);
        if (expires < now) return false;

        String expected = sign(fileId, expires);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8)
        );
    }

    // =========================
    // FILE FETCH
    // =========================
    public FileContentResult fetchFileContent(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing file id");
        }

        ResponseStatusException lastFailure = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                String accessUrl = requestFileLink(fileId);

                ResponseEntity<byte[]> response =
                        restTemplate.exchange(accessUrl, HttpMethod.GET, HttpEntity.EMPTY, byte[].class);

                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty file response");
                }

                return FileContentResult.builder()
                        .content(response.getBody())
                        .contentType(response.getHeaders().getContentType() != null
                                ? response.getHeaders().getContentType().toString()
                                : null)
                        .contentDisposition(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                        .build();

            } catch (Exception e) {
                logger.error("File fetch failed for fileId {}", fileId, e);
                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, "File fetch failed");
            }

            sleep(attempt);
        }

        throw lastFailure;
    }

    // =========================
    // FILE SERVER UPLOAD
    // =========================
    private String uploadToFileServer(MultipartFile file, String contentType) {
        ResponseStatusException lastFailure = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.MULTIPART_FORM_DATA);
                headers.setBearerAuth(getAuthToken());

                ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return safeFilename(file.getOriginalFilename());
                    }
                };

                MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                body.add("file", new HttpEntity<>(resource));

                HttpEntity<MultiValueMap<String, Object>> request =
                        new HttpEntity<>(body, headers);

                ResponseEntity<Map> response =
                        restTemplate.postForEntity(fileServerUrl + "/upload_file", request, Map.class);

                if (response.getStatusCode().is2xxSuccessful()
                        && response.getBody() != null
                        && response.getBody().get("file_id") != null) {

                    return response.getBody().get("file_id").toString();
                }

                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Invalid upload response");

            } catch (Exception e) {
                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Upload failed");
            }

            sleep(attempt);
        }

        throw lastFailure;
    }

    // =========================
    // AUTH (simplified safe version)
    // =========================
    private String getAuthToken() {
        if (authToken == null) authenticate();
        return authToken;
    }

    private void authenticate() {
        Map<String, String> payload = Map.of(
                "client_name", clientName,
                "client_secret", clientSecret
        );

        HttpEntity<Map<String, String>> request =
                new HttpEntity<>(payload, new HttpHeaders() {{
                    setContentType(MediaType.APPLICATION_JSON);
                }});

        ResponseEntity<Map> response =
                restTemplate.postForEntity(fileServerUrl + "/login", request, Map.class);

        if (response.getBody() != null && response.getBody().get("token") != null) {
            authToken = response.getBody().get("token").toString();
        }
    }

    private String requestFileLink(String fileId) {
        return UriComponentsBuilder.fromUriString(trimTrailingSlash(fileServerUrl))
                .path("/files/content/{fileId}")
                .buildAndExpand(fileId)
                .toUriString();
    }

    // =========================
    // UTIL
    // =========================
    private String sign(String fileId, long expires) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(accessLinkSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));

            byte[] sig = mac.doFinal((fileId + ":" + expires).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(sig);

        } catch (Exception e) {
            throw new RuntimeException("Signing failed");
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No image uploaded");
        }

        if (file.getSize() > maxImageSize.toBytes()) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image too large");
        }

        normalizeContentType(file.getOriginalFilename(), file.getContentType());
    }

    private String normalizeContentType(String filename, String type) {
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();

        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image type");
        }

        return type;
    }

    private String calculateChecksum(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(file.getBytes()));
        } catch (Exception e) {
            throw new RuntimeException("Checksum failed");
        }
    }

    private String safeFilename(String name) {
        return name == null ? "file" : name.replace("/", "_");
    }

    private String trimTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private void sleep(int attempt) {
        try {
            Thread.sleep(retryBackoffMs * attempt);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private FileUploadResponse mapExistingUpload(Event event, String checksum) {
        return FileUploadResponse.builder()
                .fileId(event.getImageId())
                .originalFilename(event.getImageOriginalFilename())
                .contentType(event.getImageContentType())
                .checksum(checksum)
                .reusedExisting(true)
                .uploadedAt(event.getImageUploadedAt())
                .imageUrl(buildFileAccessUrl(event.getImageId()))
                .build();
    }
}
