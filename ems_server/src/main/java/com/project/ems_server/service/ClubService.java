package com.project.ems_server.service;

import com.project.ems_server.dto.request.ClubDecisionRequest;
import com.project.ems_server.dto.request.ClubRequest;
import com.project.ems_server.dto.response.ClubMemberResponse;
import com.project.ems_server.dto.response.ClubResponse;
import com.project.ems_server.entity.Club;
import com.project.ems_server.entity.ClubMembership;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.ClubMemberRole;
import com.project.ems_server.enums.ClubStatus;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.ClubMembershipRepository;
import com.project.ems_server.repository.ClubRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubService {

    private final ClubRepository clubRepository;
    private final ClubMembershipRepository clubMembershipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public ClubResponse createClub(ClubRequest request, Long presidentId) {
        User president = getUserById(presidentId);
        validateStudentPresident(president);

        User lecturer = getUserById(request.getSeniorTreasurerLecturerId());
        validateLecturerTreasurer(lecturer);

        String clubName = request.getName().trim();
        if (clubRepository.existsByNameIgnoreCase(clubName)) {
            throw new RuntimeException("Club already exists with name: " + clubName);
        }

        if (clubRepository.existsByPresidentIdAndStatusIn(
                presidentId,
                List.of(ClubStatus.PENDING_TREASURER, ClubStatus.PENDING_DEAN, ClubStatus.ACTIVE)
        )) {
            throw new RuntimeException("A student can only be president of one club at a time");
        }

        Club club = Club.builder()
                .name(clubName)
                .description(normalizeNullableText(request.getDescription()))
                .type(request.getType())
                .presidentId(presidentId)
                .seniorTreasurerLecturerId(lecturer.getId())
                .status(ClubStatus.PENDING_TREASURER)
                .build();

        Club savedClub = clubRepository.save(club);

        clubMembershipRepository.save(ClubMembership.builder()
                .clubId(savedClub.getId())
                .userId(presidentId)
                .memberRole(ClubMemberRole.PRESIDENT)
                .build());

        notificationService.createNotification(
                lecturer.getId(),
                "Club Registration Awaiting Treasurer Approval",
                String.format(
                        "%s submitted the club '%s' and assigned you as Senior Treasurer. Please review the request.",
                        president.getName(),
                        savedClub.getName()
                ),
                NotificationType.GENERAL
        );

        return mapToResponse(savedClub);
    }

    @Transactional(readOnly = true)
    public List<ClubResponse> getActiveClubs() {
        return clubRepository.findByStatusOrderByNameAsc(ClubStatus.ACTIVE).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClubResponse getClubById(Long clubId) {
        return mapToResponse(getClubEntity(clubId));
    }

    @Transactional(readOnly = true)
    public ClubResponse getMyClub(Long presidentId) {
        Club club = clubRepository.findTopByPresidentIdAndStatusInOrderByCreatedAtDesc(
                        presidentId,
                        List.of(ClubStatus.PENDING_TREASURER, ClubStatus.PENDING_DEAN, ClubStatus.ACTIVE, ClubStatus.INACTIVE)
                )
                .or(() -> clubRepository.findTopByPresidentIdOrderByCreatedAtDesc(presidentId))
                .orElseThrow(() -> new RuntimeException("Club not found for current president"));

        return mapToResponse(club);
    }

    @Transactional
    public ClubResponse approveByTreasurer(Long clubId, Long lecturerId) {
        Club club = getClubEntity(clubId);
        ensureTreasurerApprovalAllowed(club, lecturerId);

        club.setStatus(ClubStatus.PENDING_DEAN);
        club.setRejectionReason(null);
        Club savedClub = clubRepository.save(club);

        notifyAdminsForDeanReview(savedClub);
        notificationService.createNotification(
                savedClub.getPresidentId(),
                "Club Treasurer Approved",
                String.format(
                        "The Senior Treasurer accepted your club '%s'. It is now awaiting dean approval.",
                        savedClub.getName()
                ),
                NotificationType.GENERAL
        );

        return mapToResponse(savedClub);
    }

    @Transactional
    public ClubResponse rejectByTreasurer(Long clubId, Long lecturerId, ClubDecisionRequest request) {
        Club club = getClubEntity(clubId);
        ensureTreasurerApprovalAllowed(club, lecturerId);

        String rejectionReason = request != null ? normalizeReason(request.getReason()) : "Senior Treasurer rejected the club registration.";
        club.setStatus(ClubStatus.REJECTED);
        club.setRejectionReason(rejectionReason);
        Club savedClub = clubRepository.save(club);

        notificationService.createNotification(
                savedClub.getPresidentId(),
                "Club Registration Rejected",
                String.format(
                        "The Senior Treasurer rejected your club '%s'. Reason: %s",
                        savedClub.getName(),
                        rejectionReason
                ),
                NotificationType.GENERAL
        );

        return mapToResponse(savedClub);
    }

    @Transactional
    public ClubResponse approveByDean(Long clubId) {
        Club club = getClubEntity(clubId);
        if (club.getStatus() != ClubStatus.PENDING_DEAN) {
            throw new RuntimeException("Only clubs pending dean approval can be approved");
        }

        club.setStatus(ClubStatus.ACTIVE);
        club.setRejectionReason(null);
        Club savedClub = clubRepository.save(club);

        notificationService.createNotification(
                savedClub.getPresidentId(),
                "Club Approved",
                String.format(
                        "Your club '%s' has been approved by the dean and is now ACTIVE.",
                        savedClub.getName()
                ),
                NotificationType.GENERAL
        );

        return mapToResponse(savedClub);
    }

    @Transactional
    public ClubResponse rejectByDean(Long clubId, ClubDecisionRequest request) {
        Club club = getClubEntity(clubId);
        if (club.getStatus() != ClubStatus.PENDING_DEAN) {
            throw new RuntimeException("Only clubs pending dean approval can be rejected");
        }

        String rejectionReason = normalizeReason(request.getReason());
        club.setStatus(ClubStatus.REJECTED);
        club.setRejectionReason(rejectionReason);
        Club savedClub = clubRepository.save(club);

        notificationService.createNotification(
                savedClub.getPresidentId(),
                "Club Rejected",
                String.format(
                        "Your club '%s' was rejected by the dean. Reason: %s",
                        savedClub.getName(),
                        rejectionReason
                ),
                NotificationType.GENERAL
        );

        return mapToResponse(savedClub);
    }

    @Transactional
    public void joinClub(Long clubId, Long userId) {
        Club club = getClubEntity(clubId);
        User user = getUserById(userId);
        validateStudentMember(user);

        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new RuntimeException("Only active clubs can accept new members");
        }

        if (clubMembershipRepository.existsByClubIdAndUserId(clubId, userId)) {
            throw new RuntimeException("User already exists in this club");
        }

        clubMembershipRepository.save(ClubMembership.builder()
                .clubId(clubId)
                .userId(userId)
                .memberRole(ClubMemberRole.MEMBER)
                .build());
    }

    @Transactional(readOnly = true)
    public List<ClubMemberResponse> getClubMembers(Long clubId) {
        getClubEntity(clubId);

        return clubMembershipRepository.findByClubIdOrderByJoinedAtAsc(clubId).stream()
                .map(this::mapMemberToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClubResponse> getClubsByTreasurer(Long lecturerId) {
        return clubRepository.findBySeniorTreasurerLecturerIdOrderByCreatedAtDesc(lecturerId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public void ensureUserCanOrganizeEvents(Long userId) {
        if (!clubRepository.existsByPresidentIdAndStatus(userId, ClubStatus.ACTIVE)) {
            throw new RuntimeException("Only presidents of ACTIVE clubs can organize events");
        }
    }

    private void ensureTreasurerApprovalAllowed(Club club, Long lecturerId) {
        if (!club.getSeniorTreasurerLecturerId().equals(lecturerId)) {
            throw new RuntimeException("You are not assigned as the Senior Treasurer for this club");
        }

        if (club.getStatus() != ClubStatus.PENDING_TREASURER) {
            throw new RuntimeException("This club is not pending Senior Treasurer approval");
        }
    }

    private void notifyAdminsForDeanReview(Club club) {
        User president = getUserById(club.getPresidentId());
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.createNotification(
                    admin.getId(),
                    "Club Awaiting Dean Approval",
                    String.format(
                            "Club '%s' submitted by %s has been approved by the Senior Treasurer and now requires dean approval.",
                            club.getName(),
                            president.getName()
                    ),
                    NotificationType.GENERAL
            );
        }
    }

    private Club getClubEntity(Long clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new RuntimeException("Club not found with id: " + clubId));
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
    }

    private void validateStudentPresident(User user) {
        if (user.getRole() != Role.STUDENT) {
            throw new RuntimeException("Club president must have STUDENT role");
        }
    }

    private void validateStudentMember(User user) {
        if (user.getRole() != Role.STUDENT) {
            throw new RuntimeException("Only students can join clubs");
        }
    }

    private void validateLecturerTreasurer(User user) {
        if (user.getRole() != Role.LECTURER) {
            throw new RuntimeException("Senior Treasurer must have LECTURER role");
        }
    }

    private String normalizeNullableText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new RuntimeException("Invalid reason");
        }
        return reason.trim();
    }

    private ClubResponse mapToResponse(Club club) {
        User president = club.getPresident() != null ? club.getPresident() : userRepository.findById(club.getPresidentId()).orElse(null);
        User lecturer = club.getSeniorTreasurerLecturer() != null
                ? club.getSeniorTreasurerLecturer()
                : userRepository.findById(club.getSeniorTreasurerLecturerId()).orElse(null);

        return ClubResponse.builder()
                .id(club.getId())
                .name(club.getName())
                .description(club.getDescription())
                .type(club.getType() != null ? club.getType().name() : null)
                .presidentId(club.getPresidentId())
                .presidentName(president != null ? president.getName() : null)
                .presidentEmail(president != null ? president.getEmail() : null)
                .seniorTreasurerLecturerId(club.getSeniorTreasurerLecturerId())
                .seniorTreasurerLecturerName(lecturer != null ? lecturer.getName() : null)
                .seniorTreasurerLecturerEmail(lecturer != null ? lecturer.getEmail() : null)
                .status(club.getStatus() != null ? club.getStatus().name() : null)
                .rejectionReason(club.getRejectionReason())
                .memberCount(clubMembershipRepository.countByClubId(club.getId()))
                .createdAt(club.getCreatedAt())
                .build();
    }

    private ClubMemberResponse mapMemberToResponse(ClubMembership membership) {
        User user = membership.getUser() != null ? membership.getUser() : userRepository.findById(membership.getUserId()).orElse(null);

        return ClubMemberResponse.builder()
                .id(membership.getId())
                .clubId(membership.getClubId())
                .userId(membership.getUserId())
                .userName(user != null ? user.getName() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .memberRole(membership.getMemberRole() != null ? membership.getMemberRole().name() : null)
                .joinedAt(membership.getJoinedAt())
                .build();
    }
}
