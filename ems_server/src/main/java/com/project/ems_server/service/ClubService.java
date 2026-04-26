package com.project.ems_server.service;

import com.project.ems_server.dto.request.ClubDecisionRequest;
import com.project.ems_server.dto.request.ClubRequest;
import com.project.ems_server.dto.response.ClubMemberResponse;
import com.project.ems_server.dto.response.ClubResponse;
import com.project.ems_server.entity.Club;
import com.project.ems_server.entity.ClubMembership;
import com.project.ems_server.entity.LecturerProfile;
import com.project.ems_server.entity.StudentProfile;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.ClubMemberRole;
import com.project.ems_server.enums.ClubStatus;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.ClubMembershipRepository;
import com.project.ems_server.repository.ClubRepository;
import com.project.ems_server.repository.LecturerProfileRepository;
import com.project.ems_server.repository.StudentProfileRepository;
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
    private final StudentProfileRepository studentProfileRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
    private final NotificationService notificationService;

    @Transactional
    public ClubResponse createClub(ClubRequest request, Long presidentId) {
        User president = getUserById(presidentId);
        validateStudentPresident(president);

        User lecturer = getUserById(request.getSeniorTreasurerLecturerId());
        validateLecturerTreasurer(lecturer);
        User secretary = getUserById(request.getSecretaryUserId());
        validateExecutiveStudent(secretary, "Secretary");
        User studentTreasurer = getUserById(request.getTreasurerUserId());
        validateExecutiveStudent(studentTreasurer, "Student treasurer");
        validateExecutiveAssignments(presidentId, secretary.getId(), studentTreasurer.getId());

        String clubName = request.getName().trim();
        if (clubRepository.existsByNameIgnoreCase(clubName)) {
            throw new RuntimeException("Club already exists with name: " + clubName);
        }

        if (clubRepository.existsByPresidentIdAndStatusIn(
                presidentId,
                List.of(ClubStatus.PENDING_TREASURER, ClubStatus.PENDING_DEAN, ClubStatus.ACTIVE)
        )) {
            throw new RuntimeException("You already have an active or pending club registration");
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

        saveMembership(savedClub.getId(), presidentId, ClubMemberRole.PRESIDENT);
        saveMembership(savedClub.getId(), secretary.getId(), ClubMemberRole.SECRETARY);
        saveMembership(savedClub.getId(), studentTreasurer.getId(), ClubMemberRole.TREASURER);

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
    public List<ClubResponse> getAllClubsForAdmin() {
        return clubRepository.findAll().stream()
                .sorted((left, right) -> {
                    if (left.getCreatedAt() == null && right.getCreatedAt() == null) {
                        return 0;
                    }
                    if (left.getCreatedAt() == null) {
                        return 1;
                    }
                    if (right.getCreatedAt() == null) {
                        return -1;
                    }
                    return right.getCreatedAt().compareTo(left.getCreatedAt());
                })
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
                .orElse(null);

        return club != null ? mapToResponse(club) : null;
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

    private void validateExecutiveStudent(User user, String label) {
        if (user.getRole() != Role.STUDENT) {
            throw new RuntimeException(label + " must have STUDENT role");
        }
    }

    private void validateLecturerTreasurer(User user) {
        if (user.getRole() != Role.LECTURER) {
            throw new RuntimeException("Senior Treasurer must have LECTURER role");
        }
    }

    private void validateExecutiveAssignments(Long presidentId, Long secretaryUserId, Long treasurerUserId) {
        if (presidentId.equals(secretaryUserId) || presidentId.equals(treasurerUserId)) {
            throw new RuntimeException("President, Secretary, and Treasurer must be different students");
        }

        if (secretaryUserId.equals(treasurerUserId)) {
            throw new RuntimeException("Secretary and Treasurer must be different students");
        }
    }

    private void saveMembership(Long clubId, Long userId, ClubMemberRole role) {
        clubMembershipRepository.save(ClubMembership.builder()
                .clubId(clubId)
                .userId(userId)
                .memberRole(role)
                .build());
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
        StudentProfile presidentProfile = findStudentProfile(president);
        LecturerProfile lecturerProfile = findLecturerProfile(club.getSeniorTreasurerLecturerId());
        ClubMembership secretaryMembership = clubMembershipRepository.findByClubIdAndMemberRole(club.getId(), ClubMemberRole.SECRETARY).orElse(null);
        ClubMembership treasurerMembership = clubMembershipRepository.findByClubIdAndMemberRole(club.getId(), ClubMemberRole.TREASURER).orElse(null);
        User secretary = secretaryMembership != null ? userRepository.findById(secretaryMembership.getUserId()).orElse(null) : null;
        User studentTreasurer = treasurerMembership != null ? userRepository.findById(treasurerMembership.getUserId()).orElse(null) : null;
        StudentProfile secretaryProfile = findStudentProfile(secretary);
        StudentProfile studentTreasurerProfile = findStudentProfile(studentTreasurer);

        return ClubResponse.builder()
                .id(club.getId())
                .name(club.getName())
                .description(club.getDescription())
                .type(club.getType() != null ? club.getType().name() : null)
                .presidentId(club.getPresidentId())
                .presidentName(president != null ? president.getName() : null)
                .presidentEmail(president != null ? president.getEmail() : null)
                .presidentStudentNumber(presidentProfile != null ? presidentProfile.getStudentNumber() : null)
                .seniorTreasurerLecturerId(club.getSeniorTreasurerLecturerId())
                .seniorTreasurerLecturerName(lecturer != null ? lecturer.getName() : null)
                .seniorTreasurerLecturerEmail(lecturer != null ? lecturer.getEmail() : null)
                .seniorTreasurerStaffId(lecturerProfile != null ? lecturerProfile.getStaffId() : null)
                .secretaryUserId(secretaryMembership != null ? secretaryMembership.getUserId() : null)
                .secretaryName(secretary != null ? secretary.getName() : null)
                .secretaryStudentNumber(secretaryProfile != null ? secretaryProfile.getStudentNumber() : null)
                .studentTreasurerUserId(treasurerMembership != null ? treasurerMembership.getUserId() : null)
                .studentTreasurerName(studentTreasurer != null ? studentTreasurer.getName() : null)
                .studentTreasurerStudentNumber(studentTreasurerProfile != null ? studentTreasurerProfile.getStudentNumber() : null)
                .status(club.getStatus() != null ? club.getStatus().name() : null)
                .rejectionReason(club.getRejectionReason())
                .memberCount(clubMembershipRepository.countByClubId(club.getId()))
                .createdAt(club.getCreatedAt())
                .build();
    }

    private ClubMemberResponse mapMemberToResponse(ClubMembership membership) {
        User user = membership.getUser() != null ? membership.getUser() : userRepository.findById(membership.getUserId()).orElse(null);
        StudentProfile profile = findStudentProfile(user);
        String resolvedName = profile != null && profile.getFullName() != null ? profile.getFullName() : user != null ? user.getName() : null;

        return ClubMemberResponse.builder()
                .id(membership.getId())
                .clubId(membership.getClubId())
                .userId(membership.getUserId())
                .fullName(resolvedName)
                .userName(resolvedName)
                .userEmail(user != null ? user.getEmail() : null)
                .studentNumber(profile != null ? profile.getStudentNumber() : null)
                .memberRole(membership.getMemberRole() != null ? membership.getMemberRole().name() : null)
                .joinedAt(membership.getJoinedAt())
                .build();
    }

    private StudentProfile findStudentProfile(User user) {
        if (user == null || user.getEmail() == null) {
            return null;
        }
        return studentProfileRepository.findByOfficialEmail(user.getEmail()).orElse(null);
    }

    private LecturerProfile findLecturerProfile(Long userId) {
        if (userId == null) {
            return null;
        }
        return lecturerProfileRepository.findByUserId(userId).orElse(null);
    }
}
