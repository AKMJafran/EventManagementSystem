package com.project.ems_server.service;

import com.project.ems_server.dto.request.AdminLecturerCreateRequest;
import com.project.ems_server.dto.request.LecturerProfileBulkItemRequest;
import com.project.ems_server.dto.response.AdminLecturerResponse;
import com.project.ems_server.dto.response.BulkLecturerImportFailureResponse;
import com.project.ems_server.dto.response.BulkLecturerImportResponse;
import com.project.ems_server.entity.LecturerProfile;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.LecturerProfileRepository;
import com.project.ems_server.repository.RefreshTokenRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminLecturerService {

    private static final String TEMPORARY_PASSWORD = "FoT@1234";

    private final UserRepository userRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final TransactionTemplate transactionTemplate;

    public AdminLecturerResponse createLecturer(AdminLecturerCreateRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String staffId = request.getStaffId().trim();
        String name = request.getName().trim();
        String department = request.getDepartment().trim();
        String designation = request.getDesignation().trim();

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("User already exists with email: " + email);
        }

        if (lecturerProfileRepository.existsByStaffId(staffId)) {
            throw new RuntimeException("Staff ID already exists: " + staffId);
        }

        return transactionTemplate.execute(status -> {
            User user = userRepository.save(User.builder()
                    .name(name)
                    .email(email)
                    .password(passwordEncoder.encode(TEMPORARY_PASSWORD))
                    .role(Role.LECTURER)
                    .isVerified(true)
                    .isFirstLogin(true)
                    .isActive(true)
                    .build());

            LecturerProfile profile = lecturerProfileRepository.save(LecturerProfile.builder()
                    .userId(user.getId())
                    .staffId(staffId)
                    .department(department)
                    .designation(designation)
                    .build());

            emailService.sendLecturerWelcomeEmail(email, name, TEMPORARY_PASSWORD);
            return mapToResponse(user, profile);
        });
    }

    public BulkLecturerImportResponse bulkImportLecturers(List<LecturerProfileBulkItemRequest> lecturers) {
        if (lecturers == null || lecturers.isEmpty()) {
            throw new RuntimeException("Invalid request: lecturer list cannot be empty.");
        }

        List<BulkLecturerImportFailureResponse> failures = new ArrayList<>();
        Set<String> payloadStaffIds = new HashSet<>();
        Set<String> payloadEmails = new HashSet<>();
        int successCount = 0;

        for (int index = 0; index < lecturers.size(); index++) {
            LecturerProfileBulkItemRequest item = lecturers.get(index);
            int rowNumber = index + 1;
            String rawStaffId = item != null ? item.getStaffId() : null;
            String rawEmail = item != null ? item.getEmail() : null;

            try {
                if (item == null) {
                    throw new RuntimeException("Empty row.");
                }

                String staffId = requireNonBlank(rawStaffId, "staffId is required");
                String email = requireNonBlank(rawEmail, "email is required").toLowerCase(Locale.ROOT);
                String name = requireNonBlank(item.getName(), "name is required");
                String department = requireNonBlank(item.getDepartment(), "department is required");
                String designation = requireNonBlank(item.getDesignation(), "designation is required");

                if (!payloadStaffIds.add(staffId)) {
                    throw new RuntimeException("Duplicate staff ID in payload.");
                }

                if (!payloadEmails.add(email)) {
                    throw new RuntimeException("Duplicate email in payload.");
                }

                if (userRepository.existsByEmail(email)) {
                    throw new RuntimeException("User already exists with email: " + email);
                }

                if (lecturerProfileRepository.existsByStaffId(staffId)) {
                    throw new RuntimeException("Staff ID already exists: " + staffId);
                }

                User user = userRepository.save(User.builder()
                        .name(name.trim())
                        .email(email)
                        .password(passwordEncoder.encode(TEMPORARY_PASSWORD))
                        .role(Role.LECTURER)
                        .isVerified(true)
                        .isFirstLogin(true)
                        .isActive(true)
                        .build());

                lecturerProfileRepository.save(LecturerProfile.builder()
                        .userId(user.getId())
                        .staffId(staffId.trim())
                        .department(department.trim())
                        .designation(designation.trim())
                        .build());

                emailService.sendLecturerWelcomeEmail(email, name, TEMPORARY_PASSWORD);
                successCount++;
            } catch (RuntimeException exception) {
                failures.add(BulkLecturerImportFailureResponse.builder()
                        .rowNumber(rowNumber)
                        .staffId(rawStaffId != null ? rawStaffId.trim() : null)
                        .email(rawEmail != null ? rawEmail.trim() : null)
                        .reason(exception.getMessage())
                        .build());
            }
        }

        return BulkLecturerImportResponse.builder()
                .total(lecturers.size())
                .success(successCount)
                .failed(failures.size())
                .failures(failures)
                .build();
    }

    private String requireNonBlank(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException(message);
        }
        return value.trim();
    }

    public List<AdminLecturerResponse> getAllLecturers() {
        Map<Long, LecturerProfile> profilesByUserId = lecturerProfileRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        LecturerProfile::getUserId,
                        profile -> profile,
                        (left, right) -> left
                ));

        return userRepository.findByRole(Role.LECTURER)
                .stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(LocalDateTime::compareTo)).reversed())
                .map(user -> mapToResponse(user, profilesByUserId.get(user.getId())))
                .toList();
    }

    public AdminLecturerResponse getLecturer(Long userId) {
        User user = userRepository.findById(userId)
                .filter(existing -> existing.getRole() == Role.LECTURER)
                .orElseThrow(() -> new RuntimeException("Lecturer not found"));

        LecturerProfile profile = lecturerProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Lecturer profile not found"));

        return mapToResponse(user, profile);
    }

    public AdminLecturerResponse updateLecturer(Long userId, AdminLecturerCreateRequest request) {
        User user = userRepository.findById(userId)
                .filter(existing -> existing.getRole() == Role.LECTURER)
                .orElseThrow(() -> new RuntimeException("Lecturer not found"));

        LecturerProfile profile = lecturerProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Lecturer profile not found"));

        user.setName(request.getName().trim());
        userRepository.save(user);

        profile.setDepartment(request.getDepartment().trim());
        profile.setDesignation(request.getDesignation().trim());
        lecturerProfileRepository.save(profile);

        return mapToResponse(user, profile);
    }

    public void deactivateLecturer(Long userId) {
        User user = userRepository.findById(userId)
                .filter(existing -> existing.getRole() == Role.LECTURER)
                .orElseThrow(() -> new RuntimeException("Lecturer not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            return;
        }

        user.setIsActive(false);
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    public AdminLecturerResponse setLecturerActive(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .filter(existing -> existing.getRole() == Role.LECTURER)
                .orElseThrow(() -> new RuntimeException("Lecturer not found"));

        user.setIsActive(active);
        userRepository.save(user);

        if (!active) {
            refreshTokenRepository.deleteByUserId(user.getId());
        }

        LecturerProfile profile = lecturerProfileRepository.findByUserId(user.getId()).orElse(null);
        return mapToResponse(user, profile);
    }

    private AdminLecturerResponse mapToResponse(User user, LecturerProfile profile) {
        return AdminLecturerResponse.builder()
                .id(user.getId())
                .profileId(profile != null ? profile.getId() : null)
                .name(user.getName())
                .email(user.getEmail())
                .staffId(profile != null ? profile.getStaffId() : null)
                .department(profile != null ? profile.getDepartment() : null)
                .designation(profile != null ? profile.getDesignation() : null)
                .isActive(user.getIsActive())
                .isFirstLogin(user.getIsFirstLogin())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
