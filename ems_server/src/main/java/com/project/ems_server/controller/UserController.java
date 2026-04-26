package com.project.ems_server.controller;

import com.project.ems_server.dto.request.UserProfileUpdateRequest;
import com.project.ems_server.dto.request.ProfilePictureUpdateRequest;
import com.project.ems_server.dto.response.UserProfileResponse;
import com.project.ems_server.dto.response.UserSummaryResponse;
import com.project.ems_server.entity.LecturerProfile;
import com.project.ems_server.entity.StudentProfile;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.LecturerProfileRepository;
import com.project.ems_server.repository.StudentProfileRepository;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.FileServerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
    private final FileServerService fileServerService;

    @GetMapping("/students")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserSummaryResponse>> getAllStudents() {
        List<UserSummaryResponse> students = userRepository.findByRole(Role.STUDENT)
                .stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
        return ResponseEntity.ok(students);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserSummaryResponse>> getAllUsers() {
        List<UserSummaryResponse> users = userRepository.findAll()
                .stream()
                .sorted((left, right) -> {
                    int roleCompare = left.getRole().compareTo(right.getRole());
                    if (roleCompare != 0) {
                        return roleCompare;
                    }
                    return left.getName().compareToIgnoreCase(right.getName());
                })
                .map(this::mapToSummary)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/me/profile-picture")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> updateMyProfilePicture(
            @Valid @RequestBody ProfilePictureUpdateRequest request,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setProfilePictureId(request.getFileId().trim());
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "profilePictureUrl",
                fileServerService.buildFileAccessUrl(user.getProfilePictureId())
        ));
    }

    @GetMapping("/me/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(buildProfile(resolveCurrentUser(authentication)));
    }

    @PatchMapping("/me/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @Valid @RequestBody UserProfileUpdateRequest request,
            Authentication authentication) {
        User user = resolveCurrentUser(authentication);
        user.setName(request.getName().trim());
        userRepository.save(user);

        if (user.getRole() == Role.STUDENT) {
            studentProfileRepository.findByOfficialEmail(user.getEmail())
                    .ifPresent(profile -> {
                        profile.setFullName(user.getName());
                        studentProfileRepository.save(profile);
                    });
        } else if (user.getRole() == Role.LECTURER) {
            LecturerProfile profile = lecturerProfileRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new RuntimeException("Lecturer profile not found"));

            if (request.getDesignation() != null && !request.getDesignation().trim().isBlank()) {
                profile.setDesignation(request.getDesignation().trim());
                lecturerProfileRepository.save(profile);
            }
        }

        return ResponseEntity.ok(buildProfile(resolveCurrentUser(authentication)));
    }

    private UserSummaryResponse mapToSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .isVerified(user.getIsVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private User resolveCurrentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private UserProfileResponse buildProfile(User user) {
        UserProfileResponse.UserProfileResponseBuilder builder = UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .faculty("Faculty of Technology")
                .createdAt(user.getCreatedAt());

        if (user.getRole() == Role.STUDENT) {
            Optional<StudentProfile> profile = studentProfileRepository.findByOfficialEmail(user.getEmail());
            builder
                    .department(profile.map(StudentProfile::getDepartment).orElse(null))
                    .studentNumber(profile.map(StudentProfile::getStudentNumber).orElse(null))
                    .batchYear(profile.map(StudentProfile::getBatchYear).orElse(null));
        } else if (user.getRole() == Role.LECTURER) {
            Optional<LecturerProfile> profile = lecturerProfileRepository.findByUserId(user.getId());
            builder
                    .department(profile.map(LecturerProfile::getDepartment).orElse(null))
                    .staffId(profile.map(LecturerProfile::getStaffId).orElse(null))
                    .designation(profile.map(LecturerProfile::getDesignation).orElse(null));
        }

        return builder.build();
    }
}
