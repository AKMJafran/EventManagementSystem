package com.project.ems_server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class FileServerService {

    private static final Logger logger = LoggerFactory.getLogger(FileServerService.class);
    private final RestTemplate restTemplate;

    @Value("${fileserver.url:http://localhost:8080/api}")
    private String fileServerUrl;

    @Value("${fileserver.client.name:test_backend}")
    private String clientName;

    @Value("${fileserver.client.secret:your_random_jwt_secret_32_chars_minimum}")
    private String clientSecret;
    
    private String authToken;

    public FileServerService() {
        this.restTemplate = new RestTemplate();
    }

    private synchronized void authenticate() throws IOException {
        Map<String, String> payload = new HashMap<>();
        payload.put("client_name", clientName);
        payload.put("client_secret", clientSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/login", request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                this.authToken = (String) response.getBody().get("token");
                if (this.authToken == null || this.authToken.isBlank()) {
                    throw new IOException("File server login did not return a valid token");
                }
                logger.info("Successfully authenticated with file server");
                return;
            }

            logger.warn("Initial file server login failed with status {}", response.getStatusCode());
            signupAndLogin(request);
        } catch (Exception e) {
            logger.warn("Login failed, attempting signup: {}", e.getMessage());
            signupAndLogin(request);
        }

        if (this.authToken == null || this.authToken.isBlank()) {
            throw new IOException("Unable to authenticate with file server");
        }
    }

    private void signupAndLogin(HttpEntity<Map<String, String>> request) throws IOException {
        try {
            try {
                restTemplate.postForEntity(fileServerUrl + "/signup", request, Map.class);
                logger.info("Successfully registered client with file server");
            } catch (Exception ex) {
                logger.warn("Signup failed (might already exist): {}", ex.getMessage());
            }

            ResponseEntity<Map> loginResponse = restTemplate.postForEntity(fileServerUrl + "/login", request, Map.class);
            if (loginResponse.getStatusCode().is2xxSuccessful() && loginResponse.getBody() != null) {
                this.authToken = (String) loginResponse.getBody().get("token");
                if (this.authToken == null || this.authToken.isBlank()) {
                    throw new IOException("File server login after signup did not return a valid token");
                }
                logger.info("Successfully authenticated after signup");
                return;
            }
            throw new IOException("Failed to obtain auth token after signup, status: " + loginResponse.getStatusCode());
        } catch (Exception e) {
            logger.error("Failed to authenticate with file server", e);
            throw new IOException("Failed to authenticate with file server", e);
        }
    }

    private String getAuthToken() throws IOException {
        if (authToken == null || authToken.isBlank()) {
            authenticate();
        }
        return authToken;
    }

    public String uploadFile(MultipartFile file) throws IOException {
        String token = getAuthToken();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(token);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        
        Resource fileAsResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename();
            }
        };
        body.add("file", fileAsResource);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(fileServerUrl + "/upload_file", requestEntity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody().get("file_id").toString();
            }
            throw new IOException("Upload failed with status: " + response.getStatusCode());
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("401 Unauthorized")) {
                logger.warn("Upload returned 401, retrying authentication");
                authenticate();
                return uploadFile(file);
            }
            logger.error("Failed to upload file to file server", e);
            throw new IOException("Failed to upload file", e);
        }
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
                return response.getBody().get("url").toString();
            }
            logger.error("Request file link failed with status: {}", response.getStatusCode());
            return null;
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("401 Unauthorized")) {
                try {
                    authenticate();
                    return requestFileLinkRetry(fileId, getAuthToken());
                } catch (IOException retryException) {
                    logger.error("Failed to re-authenticate when requesting file link", retryException);
                    return null;
                }
            }
            logger.error("Failed to request file link from file server for file_id: {}", fileId, e);
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
                return response.getBody().get("url").toString();
            }
        } catch (Exception ex) {
            logger.error("Failed to request file link on retry logic", ex);
        }
        return null;
    }
}