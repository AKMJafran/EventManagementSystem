package com.project.ems_server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.ems_server.exception.FileServerException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileServerService {

    private static final Logger logger = LoggerFactory.getLogger(FileServerService.class);
    private static final String PLACEHOLDER_SECRET = "your_random_jwt_secret_32_chars_minimum";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${fileserver.url:http://localhost:8080/api}")
    private String fileServerUrl;

    @Value("${fileserver.client.name:test_backend}")
    private String clientName;

    @Value("${fileserver.client.secret:your_random_jwt_secret_32_chars_minimum}")
    private String clientSecret;

    @Value("${fileserver.max-upload-attempts:2}")
    private int maxUploadAttempts;

    @Value("${fileserver.token-default-ttl-seconds:900}")
    private long tokenDefaultTtlSeconds;

    @Value("${fileserver.token-refresh-skew-seconds:30}")
    private long tokenRefreshSkewSeconds;

    private volatile String authToken;
    private volatile Instant tokenExpiry = Instant.EPOCH;
    private final Object authLock = new Object();

    public String uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FileServerException(HttpStatus.BAD_REQUEST, "No file was uploaded", "The uploaded file was empty.");
        }

        validateConfiguration();
        int attempts = Math.max(maxUploadAttempts, 1);

        for (int attempt = 1; attempt <= attempts; attempt++) {
            String token = getAuthToken();
            try {
                String fileId = performUpload(file, token);
                logger.info("File uploaded successfully. fileId={}, attempt={}", fileId, attempt);
                return fileId;
            } catch (HttpStatusCodeException ex) {
                HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
                if ((status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) && attempt < attempts) {
                    logger.warn("Upload attempt {} rejected by file server with {}. Re-authenticating and retrying once.", attempt, status);
                    clearAuthToken();
                    continue;
                }
                throw mapUpstreamStatus(ex, "File upload failed at file server");
            } catch (ResourceAccessException ex) {
                throw new FileServerException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "File server is unavailable",
                        safeDetails(ex.getMessage())
                );
            } catch (IOException ex) {
                throw new FileServerException(HttpStatus.BAD_GATEWAY, "File upload failed", safeDetails(ex.getMessage()));
            }
        }

        throw new FileServerException(HttpStatus.BAD_GATEWAY, "File upload failed", "Upload failed after retrying authentication.");
    }

    public String requestFileLink(String fileId) {
        if (fileId == null || fileId.trim().isEmpty()) {
            return null;
        }

        try {
            String token = getAuthToken();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            Map<String, String> payload = new HashMap<>();
            payload.put("file_id", fileId);

            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(payload, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/request_file", requestEntity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object url = response.getBody().get("url");
                return url != null ? url.toString() : null;
            }
            logger.error("Request file link failed with status: {}", response.getStatusCode());
            return null;
        } catch (HttpStatusCodeException ex) {
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            if (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) {
                try {
                    clearAuthToken();
                    return requestFileLinkRetry(fileId, getAuthToken());
                } catch (RuntimeException retryException) {
                    logger.error("Failed to re-authenticate when requesting file link", retryException);
                    return null;
                }
            }
            logger.error("Failed to request file link from file server for file_id: {}", fileId, ex);
            return null;
        } catch (Exception ex) {
            logger.error("Failed to request file link from file server for file_id: {}", fileId, ex);
            return null;
        }
    }

    private String requestFileLinkRetry(String fileId, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, String> payload = new HashMap<>();
        payload.put("file_id", fileId);

        HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(payload, headers);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/request_file", requestEntity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object url = response.getBody().get("url");
                return url != null ? url.toString() : null;
            }
        } catch (Exception ex) {
            logger.error("Failed to request file link on retry logic", ex);
        }
        return null;
    }

    private String performUpload(MultipartFile file, String token) throws IOException {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(token);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        Resource fileAsResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.bin";
            }
        };
        body.add("file", fileAsResource);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/upload_file", requestEntity, Map.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new FileServerException(HttpStatus.BAD_GATEWAY, "File server returned an invalid upload response", "Missing body or non-2xx status.");
        }

        Object fileId = response.getBody().get("file_id");
        if (fileId == null || fileId.toString().isBlank()) {
            throw new FileServerException(HttpStatus.BAD_GATEWAY, "File server returned an invalid upload response", "Missing file_id in response.");
        }

        return fileId.toString();
    }

    private String getAuthToken() {
        if (isTokenValid()) {
            return authToken;
        }

        synchronized (authLock) {
            if (isTokenValid()) {
                return authToken;
            }
            authenticate();
            return authToken;
        }
    }

    private void authenticate() {
        validateConfiguration();

        Map<String, String> payload = new HashMap<>();
        payload.put("client_name", clientName);
        payload.put("client_secret", clientSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/login", request, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new FileServerException(
                        HttpStatus.BAD_GATEWAY,
                        "Unable to authenticate with the file server",
                        "Login endpoint returned no token payload."
                );
            }

            String token = extractToken(response.getBody());
            if (token == null || token.isBlank()) {
                throw new FileServerException(
                        HttpStatus.BAD_GATEWAY,
                        "Unable to authenticate with the file server",
                        "Token was missing in /login response."
                );
            }

            authToken = token;
            tokenExpiry = parseJwtExpiry(token)
                    .orElse(Instant.now().plusSeconds(Math.max(60, tokenDefaultTtlSeconds)));
            logger.info("Authenticated with file server. Token cached until {}.", tokenExpiry);
        } catch (HttpStatusCodeException ex) {
            throw mapUpstreamStatus(ex, "Unable to authenticate with the file server");
        } catch (ResourceAccessException ex) {
            throw new FileServerException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "File server is unavailable",
                    safeDetails(ex.getMessage())
            );
        }
    }

    private Optional<Instant> parseJwtExpiry(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                return Optional.empty();
            }

            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode payload = objectMapper.readTree(new String(decoded, StandardCharsets.UTF_8));
            if (payload.has("exp")) {
                long epochSeconds = payload.get("exp").asLong();
                return Optional.of(Instant.ofEpochSecond(epochSeconds));
            }
        } catch (Exception ex) {
            logger.warn("Could not parse JWT expiry from file server token: {}", ex.getMessage());
        }

        return Optional.empty();
    }

    private boolean isTokenValid() {
        if (authToken == null || authToken.isBlank()) {
            return false;
        }

        Instant threshold = Instant.now().plusSeconds(Math.max(0, tokenRefreshSkewSeconds));
        return tokenExpiry.isAfter(threshold);
    }

    private void clearAuthToken() {
        synchronized (authLock) {
            authToken = null;
            tokenExpiry = Instant.EPOCH;
        }
    }

    private String extractToken(Map body) {
        Object token = body.get("token");
        if (token == null) {
            token = body.get("access_token");
        }
        if (token == null) {
            token = body.get("jwt");
        }
        return token != null ? token.toString() : null;
    }

    private void validateConfiguration() {
        if (fileServerUrl == null || fileServerUrl.isBlank()) {
            throw new FileServerException(HttpStatus.BAD_GATEWAY, "File server configuration is invalid", "fileserver.url is empty.");
        }
        if (clientName == null || clientName.isBlank()) {
            throw new FileServerException(HttpStatus.BAD_GATEWAY, "File server configuration is invalid", "fileserver.client.name is empty.");
        }
        if (clientSecret == null || clientSecret.isBlank() || PLACEHOLDER_SECRET.equals(clientSecret)) {
            throw new FileServerException(
                    HttpStatus.BAD_GATEWAY,
                    "File server configuration is invalid",
                    "Set a valid fileserver.client.secret in application.properties."
            );
        }
    }

    private FileServerException mapUpstreamStatus(HttpStatusCodeException ex, String message) {
        HttpStatus upstreamStatus = HttpStatus.resolve(ex.getStatusCode().value());
        String details = safeDetails(ex.getResponseBodyAsString());

        if (upstreamStatus == HttpStatus.UNAUTHORIZED || upstreamStatus == HttpStatus.FORBIDDEN) {
            return new FileServerException(upstreamStatus, "Unable to authenticate with the file server", details);
        }

        if (upstreamStatus != null && upstreamStatus.is5xxServerError()) {
            return new FileServerException(
                    HttpStatus.BAD_GATEWAY,
                    message,
                    "Upstream file server responded with " + upstreamStatus.value() + ". " + details
            );
        }

        return new FileServerException(HttpStatus.BAD_GATEWAY, message, details);
    }

    private String safeDetails(String details) {
        if (details == null || details.isBlank()) {
            return "No details provided by upstream service.";
        }

        String trimmed = details.trim().replaceAll("\\s+", " ");
        return trimmed.length() > 350 ? trimmed.substring(0, 350) + "..." : trimmed;
    }
}