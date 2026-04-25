package com.project.ems_server.service;

import com.project.ems_server.dto.response.FileUploadResponse;
import com.project.ems_server.entity.Event;
import com.project.ems_server.repository.EventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
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
import java.util.Base64;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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

    @Value("${fileserver.access-link-secret:${jwt.secret:verysecretvalue12345678901234567890}}")
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

    public FileUploadResponse uploadImage(MultipartFile file) {
        validateImage(file);

        String contentType = normalizeContentType(file.getOriginalFilename(), file.getContentType());
        String checksum = calculateChecksum(file);
        Optional<Event> existingEvent = eventRepository.findTopByImageChecksumAndImageIdIsNotNull(checksum);
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

    public String buildFileAccessUrl(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            return null;
        }

        long expires = LocalDateTime.now().plusMinutes(accessLinkTtlMinutes).toEpochSecond(ZoneOffset.UTC);
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
        if (expires < now) {
            return false;
        }

        String expected = sign(fileId, expires);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
    }

    public FileContentResult fetchFileContent(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing file id");
        }

        ResponseStatusException lastFailure = null;

        for (int attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
            try {
                String accessUrl = requestFileLink(fileId);
                ResponseEntity<byte[]> fileResponse = restTemplate.exchange(accessUrl, HttpMethod.GET, HttpEntity.EMPTY, byte[].class);

                if (!fileResponse.getStatusCode().is2xxSuccessful() || fileResponse.getBody() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "File server returned an empty response");
                }

                return FileContentResult.builder()
                        .content(fileResponse.getBody())
                        .contentType(fileResponse.getHeaders().getContentType() != null
                                ? fileResponse.getHeaders().getContentType().toString()
                                : null)
                        .contentDisposition(fileResponse.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                        .build();
            } catch (HttpStatusCodeException e) {
                if ((e.getStatusCode().value() == 403 || e.getStatusCode().value() == 404) && attempt < maxAttempts) {
                    logger.warn("One-time file link failed on attempt {} for fileId {}, retrying with a fresh link", attempt, fileId);
                    sleepBeforeRetry(attempt);
                    continue;
                }

                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to fetch file content from file server");
            } catch (ResponseStatusException e) {
                lastFailure = e;
                if (e.getStatusCode().is5xxServerError() && attempt < maxAttempts) {
                    sleepBeforeRetry(attempt);
                    continue;
                }
            } catch (Exception e) {
                logger.error("Unexpected error fetching file content for fileId {}", fileId, e);
                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, "File server is temporarily unavailable");
                if (attempt < maxAttempts) {
                    sleepBeforeRetry(attempt);
                    continue;
                }
            }
        }

        throw lastFailure != null ? lastFailure : new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to fetch file");
    }

    private synchronized void authenticate() {
        Map<String, String> payload = new HashMap<>();
        payload.put("client_name", clientName);
        payload.put("client_secret", clientSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/login", request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                this.authToken = stringValue(response.getBody().get("token"));
                if (this.authToken != null && !this.authToken.isBlank()) {
                    logger.info("Authenticated with file server");
                    return;
                }
            }
        } catch (HttpStatusCodeException e) {
            logger.warn("File server login failed with status {}", e.getStatusCode().value());
        } catch (Exception e) {
            logger.warn("File server login failed: {}", e.getMessage());
        }

        signupAndLogin(request);
    }

    private void signupAndLogin(HttpEntity<Map<String, String>> request) {
        try {
            try {
                restTemplate.postForEntity(fileServerUrl + "/signup", request, Map.class);
                logger.info("Registered backend client with file server");
            } catch (HttpStatusCodeException e) {
                if (e.getStatusCode().value() != 409) {
                    logger.warn("File server signup returned status {}", e.getStatusCode().value());
                }
            }

            ResponseEntity<Map> loginResponse = restTemplate.postForEntity(fileServerUrl + "/login", request, Map.class);
            if (loginResponse.getStatusCode().is2xxSuccessful() && loginResponse.getBody() != null) {
                this.authToken = stringValue(loginResponse.getBody().get("token"));
            }

            if (this.authToken == null || this.authToken.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "File server authentication failed");
            }
        } catch (Exception e) {
            logger.error("Failed to authenticate with file server", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to authenticate with the file server");
        }
    }

    private String getAuthToken() {
        if (authToken == null || authToken.isBlank()) {
            authenticate();
        }
        return authToken;
    }

    private String uploadToFileServer(MultipartFile file, String contentType) {
        ResponseStatusException lastFailure = null;

        for (int attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
            try {
                HttpHeaders requestHeaders = new HttpHeaders();
                requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
                requestHeaders.setBearerAuth(getAuthToken());

                ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return safeFilename(file.getOriginalFilename());
                    }
                };

                HttpHeaders partHeaders = new HttpHeaders();
                partHeaders.setContentType(MediaType.parseMediaType(contentType));
                partHeaders.setContentDisposition(ContentDisposition.formData()
                        .name("file")
                        .filename(safeFilename(file.getOriginalFilename()), StandardCharsets.UTF_8)
                        .build());

                HttpEntity<Resource> filePart = new HttpEntity<>(fileResource, partHeaders);
                MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                body.add("file", filePart);

                HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, requestHeaders);
                ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/upload_file", requestEntity, Map.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().get("file_id") != null) {
                    return response.getBody().get("file_id").toString();
                }

                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "File server did not return a valid file id");
            } catch (HttpStatusCodeException e) {
                if (e.getStatusCode().value() == 401) {
                    authToken = null;
                    authenticate();
                    continue;
                }

                if (e.getStatusCode().value() == 400) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, extractErrorMessage(e, "The file server rejected the image upload"));
                }

                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, extractErrorMessage(e, "File server upload failed"));
            } catch (ResourceAccessException e) {
                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, "File server is temporarily unavailable");
            } catch (IOException e) {
                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to read image for upload");
            } catch (ResponseStatusException e) {
                lastFailure = e;
                if (!e.getStatusCode().is5xxServerError()) {
                    throw e;
                }
            }

            if (attempt < maxAttempts) {
                sleepBeforeRetry(attempt);
            }
        }

        throw lastFailure != null ? lastFailure : new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Image upload failed");
    }

    private String requestFileLink(String fileId) {
        ResponseStatusException lastFailure = null;

        for (int attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(getAuthToken());

                Map<String, String> payload = new HashMap<>();
                payload.put("file_id", fileId);

                HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(payload, headers);
                ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/request_file", requestEntity, Map.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().get("url") != null) {
                    return response.getBody().get("url").toString();
                }

                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "File server did not return a usable access URL");
            } catch (HttpStatusCodeException e) {
                if (e.getStatusCode().value() == 401) {
                    authToken = null;
                    authenticate();
                    continue;
                }

                if (e.getStatusCode().value() == 404) {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found on the file server");
                }

                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, extractErrorMessage(e, "Failed to request file access"));
            } catch (ResourceAccessException e) {
                lastFailure = new ResponseStatusException(HttpStatus.BAD_GATEWAY, "File server is temporarily unavailable");
            } catch (ResponseStatusException e) {
                lastFailure = e;
                if (!e.getStatusCode().is5xxServerError()) {
                    throw e;
                }
            }

            if (attempt < maxAttempts) {
                sleepBeforeRetry(attempt);
            }
        }

        throw lastFailure != null ? lastFailure : new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to request file access");
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

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No image was uploaded");
        }

        if (file.getSize() > maxImageSize.toBytes()) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "Image size must be " + maxImageSize.toMegabytes() + "MB or less");
        }

        normalizeContentType(file.getOriginalFilename(), file.getContentType());
    }

    private String normalizeContentType(String filename, String contentType) {
        String extension = extensionOf(filename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPG, JPEG, and PNG images are allowed");
        }

        String normalizedType;
        if (contentType == null || contentType.isBlank()) {
            normalizedType = "png".equals(extension) ? "image/png" : "image/jpeg";
        } else {
            normalizedType = contentType.toLowerCase(Locale.ROOT);
        }

        if (!ALLOWED_CONTENT_TYPES.contains(normalizedType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPG, JPEG, and PNG images are allowed");
        }

        return "image/jpg".equals(normalizedType) ? "image/jpeg" : normalizedType;
    }

    private String calculateChecksum(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            StringBuilder builder = new StringBuilder();
            for (byte current : hash) {
                builder.append(String.format("%02x", current));
            }
            return builder.toString();
        } catch (Exception e) {
            logger.error("Failed to calculate file checksum", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process uploaded image");
        }
    }

    private String sign(String fileId, long expires) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(accessLinkSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] signature = mac.doFinal((fileId + ":" + expires).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (Exception e) {
            logger.error("Failed to sign file access URL", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create file access URL");
        }
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(retryBackoffMs * attempt);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
        }
    }

    private String extractErrorMessage(HttpStatusCodeException exception, String fallbackMessage) {
        String body = exception.getResponseBodyAsString();
        if (body != null && !body.isBlank()) {
            return body;
        }
        return fallbackMessage;
    }

    private String safeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "upload-image";
        }
        return filename.replace("\\", "_").replace("/", "_");
    }

    private String extensionOf(String filename) {
        String safeName = safeFilename(filename);
        int separatorIndex = safeName.lastIndexOf('.');
        if (separatorIndex < 0 || separatorIndex == safeName.length() - 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file must have a JPG, JPEG, or PNG extension");
        }
        return safeName.substring(separatorIndex + 1).toLowerCase(Locale.ROOT);
    }

    private String trimTrailingSlash(String value) {
        return value != null && value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String stringValue(Object value) {
        return value != null ? value.toString() : null;
    }
}
