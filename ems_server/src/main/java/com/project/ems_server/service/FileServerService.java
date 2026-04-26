package com.project.ems_server.service;

import com.project.ems_server.dto.response.FileUploadResponse;
import com.project.ems_server.entity.Event;
import com.project.ems_server.repository.EventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
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

    @Value("${cloudinary.cloud-name}")
    private String cloudinaryCloudName;

    @Value("${cloudinary.api-key}")
    private String cloudinaryApiKey;

    @Value("${cloudinary.api-secret}")
    private String cloudinaryApiSecret;

    @Value("${cloudinary.folder:ems}")
    private String cloudinaryFolder;

    @Value("${cloudinary.images.max-size:5MB}")
    private DataSize maxImageSize;

    public FileServerService(EventRepository eventRepository, RestTemplate restTemplate) {
        this.eventRepository = eventRepository;
        this.restTemplate = restTemplate;
    }

    public FileUploadResponse uploadImage(MultipartFile file) {
        validateImage(file);

        String contentType = normalizeContentType(file.getOriginalFilename(), file.getContentType());
        String checksum = calculateChecksum(file);

        Optional<Event> existingEvent =
                eventRepository.findTopByImageChecksumAndImageIdIsNotNull(checksum);

        if (existingEvent.isPresent()) {
            return mapExistingUpload(existingEvent.get(), checksum);
        }

        CloudinaryUploadResult uploadResult = uploadToCloudinary(file, contentType);
        LocalDateTime uploadedAt = LocalDateTime.now();

        return FileUploadResponse.builder()
                .fileId(uploadResult.secureUrl())
                .originalFilename(safeFilename(file.getOriginalFilename()))
                .contentType(contentType)
                .checksum(checksum)
                .reusedExisting(false)
                .uploadedAt(uploadedAt)
                .imageUrl(uploadResult.secureUrl())
                .build();
    }

    public String buildFileAccessUrl(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            return null;
        }

        if (isAbsoluteUrl(fileId)) {
            return fileId;
        }

        return UriComponentsBuilder.fromUriString("https://res.cloudinary.com")
                .pathSegment(cloudinaryCloudName, "image", "upload")
                .path("/")
                .path(fileId)
                .toUriString();
    }

    public boolean isValidAccessSignature(String fileId, long expires, String signature) {
        long now = LocalDateTime.now().toEpochSecond(ZoneOffset.UTC);
        return fileId != null && !fileId.isBlank() && signature != null && !signature.isBlank() && expires >= now;
    }

    public FileContentResult fetchFileContent(String fileId) {
        String fileUrl = buildFileAccessUrl(fileId);
        if (fileUrl == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing file id");
        }

        try {
            ResponseEntity<byte[]> response =
                    restTemplate.exchange(fileUrl, HttpMethod.GET, HttpEntity.EMPTY, byte[].class);

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
        } catch (HttpStatusCodeException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Cloudinary file fetch failed with status " + e.getStatusCode().value()
            );
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cloudinary is unavailable");
        }
    }

    private CloudinaryUploadResult uploadToCloudinary(MultipartFile file, String contentType) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(cloudinaryApiKey, cloudinaryApiSecret, StandardCharsets.UTF_8);
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return safeFilename(file.getOriginalFilename());
                }
            };

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(contentType));
            fileHeaders.setContentDispositionFormData("file", resource.getFilename());

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new HttpEntity<>(resource, fileHeaders));
            if (cloudinaryFolder != null && !cloudinaryFolder.isBlank()) {
                body.add("folder", cloudinaryFolder.trim());
            }

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    buildCloudinaryUploadUrl(),
                    request,
                    Map.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Invalid Cloudinary upload response");
            }

            Object secureUrl = response.getBody().get("secure_url");
            if (secureUrl == null || secureUrl.toString().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cloudinary upload returned no secure URL");
            }

            Object publicId = response.getBody().get("public_id");
            return new CloudinaryUploadResult(
                    publicId != null ? publicId.toString() : null,
                    secureUrl.toString()
            );
        } catch (HttpStatusCodeException e) {
            logger.warn("Cloudinary upload failed with status {}", e.getStatusCode(), e);
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Cloudinary upload failed with status " + e.getStatusCode().value()
            );
        } catch (ResourceAccessException e) {
            logger.warn("Cloudinary upload could not reach remote service", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cloudinary is unavailable");
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read upload bytes");
        }
    }

    private String buildCloudinaryUploadUrl() {
        return UriComponentsBuilder.fromUriString("https://api.cloudinary.com")
                .pathSegment("v1_1", cloudinaryCloudName, "image", "upload")
                .toUriString();
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
        String ext = getFileExtension(filename);

        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image type");
        }

        if (type == null || !ALLOWED_CONTENT_TYPES.contains(type.toLowerCase(Locale.ROOT))) {
            return "png".equals(ext) ? MediaType.IMAGE_PNG_VALUE : MediaType.IMAGE_JPEG_VALUE;
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
        return name == null ? "file" : name.replace("/", "_").replace("\\", "_");
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image type");
        }

        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private boolean isAbsoluteUrl(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.startsWith("https://") || lower.startsWith("http://");
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

    private record CloudinaryUploadResult(String publicId, String secureUrl) {
    }
}
