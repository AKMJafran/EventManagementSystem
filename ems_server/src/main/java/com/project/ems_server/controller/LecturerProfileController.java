package com.project.ems_server.controller;

import com.project.ems_server.dto.request.LecturerProfileUpdateRequest;
import com.project.ems_server.dto.response.LecturerProfileResponse;
import com.project.ems_server.entity.LecturerProfile;
import com.project.ems_server.entity.User;
import com.project.ems_server.repository.LecturerProfileRepository;
import com.project.ems_server.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/lecturer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('LECTURER')")
public class LecturerProfileController {

    private final UserRepository userRepository;
    private final LecturerProfileRepository lecturerProfileRepository;

    /**
     * GET /lecturer/profile — lecturer views their own profile
     */
    @GetMapping("/profile")
    public ResponseEntity<LecturerProfileResponse> getMyProfile(Authentication authentication) {
        User user = resolveUser(authentication);
        LecturerProfile profile = lecturerProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Lecturer profile not found"));

        return ResponseEntity.ok(LecturerProfileResponse.builder()
                .id(profile.getId())
                .name(user.getName())
                .email(user.getEmail())
                .staffId(profile.getStaffId())
                .department(profile.getDepartment())
                .designation(profile.getDesignation())
                .createdAt(profile.getCreatedAt())
                .build());
    }

    /**
     * PUT /lecturer/profile — lecturer updates own name and designation only
     */
    @PutMapping("/profile")
    public ResponseEntity<LecturerProfileResponse> updateMyProfile(
            @Valid @RequestBody LecturerProfileUpdateRequest request,
            Authentication authentication) {
        User user = resolveUser(authentication);
        LecturerProfile profile = lecturerProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Lecturer profile not found"));

        user.setName(request.getName().trim());
        userRepository.save(user);

        profile.setDesignation(request.getDesignation().trim());
        lecturerProfileRepository.save(profile);

        return ResponseEntity.ok(LecturerProfileResponse.builder()
                .id(profile.getId())
                .name(user.getName())
                .email(user.getEmail())
                .staffId(profile.getStaffId())
                .department(profile.getDepartment())
                .designation(profile.getDesignation())
                .createdAt(profile.getCreatedAt())
                .build());
    }

    /**
     * GET /lecturer/clubs — stub: clubs where this lecturer is Senior Treasurer
     * Returns empty list until Club entity is implemented.
     */
    @GetMapping("/clubs")
    public ResponseEntity<List<Map<String, Object>>> getMyClubs() {
        return ResponseEntity.ok(Collections.emptyList());
    }

    /**
     * GET /lecturer/events/pending-approval — stub: events pending treasurer approval
     * Returns empty list until Club + approval workflow is implemented.
     */
    @GetMapping("/events/pending-approval")
    public ResponseEntity<List<Map<String, Object>>> getPendingApprovals() {
        return ResponseEntity.ok(Collections.emptyList());
    }

    private User resolveUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
