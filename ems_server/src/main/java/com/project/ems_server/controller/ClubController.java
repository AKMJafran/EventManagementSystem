package com.project.ems_server.controller;

import com.project.ems_server.dto.request.ClubDecisionRequest;
import com.project.ems_server.dto.request.ClubRequest;
import com.project.ems_server.dto.request.JoinClubRequest;
import com.project.ems_server.dto.response.ClubAvailableRoleResponse;
import com.project.ems_server.dto.response.ClubMemberResponse;
import com.project.ems_server.dto.response.ClubResponse;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.ClubService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/clubs")
@RequiredArgsConstructor
public class ClubController {

    private final ClubService clubService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ClubResponse> createClub(
            @Valid @RequestBody ClubRequest request,
            Authentication authentication) {
        ClubResponse response = clubService.createClub(request, extractUserIdFromAuthentication(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ClubResponse> updateClub(
            @PathVariable Long id,
            @Valid @RequestBody ClubRequest request,
            Authentication authentication) {
        ClubResponse response = clubService.updateClub(id, request, extractUserIdFromAuthentication(authentication));
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ClubResponse>> getActiveClubs() {
        return ResponseEntity.ok(clubService.getActiveClubs());
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ClubResponse>> getAllClubsForAdmin() {
        return ResponseEntity.ok(clubService.getAllClubsForAdmin());
    }

    @GetMapping("/my-club")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ClubResponse> getMyClub(Authentication authentication) {
        return ResponseEntity.ok(clubService.getMyClub(extractUserIdFromAuthentication(authentication)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClubResponse> getClubById(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.getClubById(id));
    }

    @PatchMapping("/{id}/treasurer-approve")
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<ClubResponse> approveByTreasurer(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(clubService.approveByTreasurer(id, extractUserIdFromAuthentication(authentication)));
    }

    @PatchMapping("/{id}/treasurer-reject")
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<ClubResponse> rejectByTreasurer(
            @PathVariable Long id,
            @RequestBody(required = false) ClubDecisionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(clubService.rejectByTreasurer(id, extractUserIdFromAuthentication(authentication), request));
    }

    @PatchMapping("/{id}/dean-approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClubResponse> approveByDean(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.approveByDean(id));
    }

    @PatchMapping("/{id}/dean-reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClubResponse> rejectByDean(
            @PathVariable Long id,
            @Valid @RequestBody ClubDecisionRequest request) {
        return ResponseEntity.ok(clubService.rejectByDean(id, request));
    }

    @GetMapping("/{id}/available-roles")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<ClubAvailableRoleResponse>> getAvailableRoles(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.getAvailableRoles(id));
    }

    @PostMapping("/{id}/join")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> joinClub(
            @PathVariable Long id,
            @RequestBody(required = false) JoinClubRequest request,
            Authentication authentication) {
        clubService.joinClub(
                id,
                extractUserIdFromAuthentication(authentication),
                request != null ? request.getRole() : null
        );
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<ClubMemberResponse>> getClubMembers(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.getClubMembers(id));
    }

    private Long extractUserIdFromAuthentication(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(user -> user.getId())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
}
