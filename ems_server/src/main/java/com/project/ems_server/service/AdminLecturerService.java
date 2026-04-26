package com.project.ems_server.service;

import com.project.ems_server.dto.request.AdminLecturerCreateRequest;
import com.project.ems_server.dto.response.AdminLecturerResponse;
import com.project.ems_server.entity.LecturerProfile;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.LecturerProfileRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminLecturerService {

    private static final String TEMPORARY_PASSWORD = "FoT@1234";

    private final UserRepository userRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
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
