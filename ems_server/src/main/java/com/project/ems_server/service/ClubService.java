package com.project.ems_server.service;

import com.project.ems_server.dto.request.ClubDecisionRequest;
import com.project.ems_server.dto.request.ClubRequest;
import com.project.ems_server.dto.response.ClubAvailableRoleResponse;
import com.project.ems_server.dto.response.ClubMemberResponse;
import com.project.ems_server.dto.response.ClubMemberRoleSummary;
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
import com.project.ems_server.util.ClubRoleConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    @Transactional
    public ClubResponse updateClub(Long clubId, ClubRequest request, Long presidentId) {
        Club club = getClubEntity(clubId);

        if (!club.getPresidentId().equals(presidentId)) {
            throw new RuntimeException("Only the president can edit this club");
        }

        if (club.getStatus() != ClubStatus.PENDING_TREASURER && club.getStatus() != ClubStatus.PENDING_DEAN) {
            throw new RuntimeException("Club can only be edited while in pending approval state");
        }

        User lecturer = getUserById(request.getSeniorTreasurerLecturerId());
        validateLecturerTreasurer(lecturer);
        User secretary = getUserById(request.getSecretaryUserId());
        validateExecutiveStudent(secretary, "Secretary");
        User studentTreasurer = getUserById(request.getTreasurerUserId());
        validateExecutiveStudent(studentTreasurer, "Student treasurer");
        validateExecutiveAssignments(presidentId, secretary.getId(), studentTreasurer.getId());

        String clubName = request.getName().trim();
        if (!club.getName().equalsIgnoreCase(clubName) && clubRepository.existsByNameIgnoreCaseAndIdNot(clubName, clubId)) {
            throw new RuntimeException("Club already exists with name: " + clubName);
        }

        club.setName(clubName);
        club.setDescription(normalizeNullableText(request.getDescription()));
        club.setType(request.getType());
        club.setSeniorTreasurerLecturerId(lecturer.getId());
        club.setStatus(ClubStatus.PENDING_TREASURER);
        club.setRejectionReason(null);

        Club savedClub = clubRepository.save(club);

        clubMembershipRepository.deleteByClubIdAndMemberRoleIn(
                savedClub.getId(),
                List.of(ClubMemberRole.SECRETARY, ClubMemberRole.TREASURER)
        );

        saveMembership(savedClub.getId(), secretary.getId(), ClubMemberRole.SECRETARY);
        saveMembership(savedClub.getId(), studentTreasurer.getId(), ClubMemberRole.TREASURER);

        User president = getUserById(presidentId);
        notificationService.createNotification(
                lecturer.getId(),
                "Club Registration Updated — Awaiting Treasurer Approval",
                String.format(
                        "%s updated the club '%s' and assigned you as Senior Treasurer. Please review the request.",
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

        if (!clubMembershipRepository.existsByClubIdAndUserId(savedClub.getId(), savedClub.getPresidentId())) {
            saveMembership(savedClub.getId(), savedClub.getPresidentId(), ClubMemberRole.PRESIDENT);
        }

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
    public void joinClub(Long clubId, Long userId, ClubMemberRole requestedRole) {
        Club club = getClubEntity(clubId);
        User user = getUserById(userId);
        validateStudentMember(user);

        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new RuntimeException("Only active clubs can accept new members");
        }

        if (clubMembershipRepository.existsByClubIdAndUserId(clubId, userId) || club.getPresidentId().equals(userId)) {
            throw new RuntimeException("You are already a member of this club");
        }

        ClubMemberRole role = requestedRole != null ? requestedRole : ClubMemberRole.GENERAL_MEMBER;

        if (!getAvailableRolesForClub(club).contains(role)) {
            String clubTypeName = club.getType() != null ? club.getType().name() : "this";
            throw new RuntimeException("This role is not available for " + clubTypeName + " clubs");
        }

        if (ClubRoleConfig.getSingleOccupancyRoles().contains(role) && isRoleTaken(club, role)) {
            throw new RuntimeException("The role " + ClubRoleConfig.getDisplayName(role) + " is already filled in this club");
        }

        clubMembershipRepository.save(ClubMembership.builder()
                .clubId(clubId)
                .userId(userId)
                .memberRole(role)
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
    public List<ClubAvailableRoleResponse> getAvailableRoles(Long clubId) {
        Club club = getClubEntity(clubId);

        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new RuntimeException("Only active clubs can accept new members");
        }

        List<ClubAvailableRoleResponse> roles = new ArrayList<>();
        for (ClubMemberRole role : getAvailableRolesForClub(club)) {
            RoleOccupant occupant = findRoleOccupant(club, role);
            roles.add(ClubAvailableRoleResponse.builder()
                    .role(role.name())
                    .displayName(ClubRoleConfig.getDisplayName(role))
                    .available(occupant == null)
                    .takenBy(occupant != null ? occupant.memberName() : null)
                    .build());
        }

        return roles;
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

    private List<ClubMemberRole> getAvailableRolesForClub(Club club) {
        if (club == null || club.getType() == null) {
            return List.of(
                    ClubMemberRole.PRESIDENT,
                    ClubMemberRole.VICE_PRESIDENT,
                    ClubMemberRole.SECRETARY,
                    ClubMemberRole.TREASURER,
                    ClubMemberRole.EDITOR,
                    ClubMemberRole.GENERAL_MEMBER
            );
        }

        return ClubRoleConfig.getAvailableRoles(club.getType());
    }

    private ClubResponse mapToResponse(Club club) {
        User president = club.getPresident() != null ? club.getPresident() : userRepository.findById(club.getPresidentId()).orElse(null);
        User lecturer = club.getSeniorTreasurerLecturer() != null
                ? club.getSeniorTreasurerLecturer()
                : userRepository.findById(club.getSeniorTreasurerLecturerId()).orElse(null);
        StudentProfile presidentProfile = findStudentProfile(president);
        LecturerProfile lecturerProfile = findLecturerProfile(club.getSeniorTreasurerLecturerId());
        List<ClubMembership> memberships = clubMembershipRepository.findByClubIdOrderByJoinedAtAsc(club.getId());
        Map<ClubMemberRole, ClubMembership> membershipsByRole = new HashMap<>();
        Map<Long, User> usersById = new HashMap<>();
        Map<Long, StudentProfile> studentProfilesByUserId = new HashMap<>();

        if (president != null) {
            usersById.put(president.getId(), president);
            studentProfilesByUserId.put(president.getId(), presidentProfile);
        }

        for (ClubMembership membership : memberships) {
            membershipsByRole.putIfAbsent(membership.getMemberRole(), membership);
            User member = membership.getUser() != null
                    ? membership.getUser()
                    : userRepository.findById(membership.getUserId()).orElse(null);
            if (member != null) {
                usersById.put(member.getId(), member);
                studentProfilesByUserId.put(member.getId(), findStudentProfile(member));
            }
        }

        ClubMembership secretaryMembership = membershipsByRole.get(ClubMemberRole.SECRETARY);
        ClubMembership treasurerMembership = membershipsByRole.get(ClubMemberRole.TREASURER);
        User secretary = secretaryMembership != null ? usersById.get(secretaryMembership.getUserId()) : null;
        User studentTreasurer = treasurerMembership != null ? usersById.get(treasurerMembership.getUserId()) : null;
        StudentProfile secretaryProfile = secretaryMembership != null ? studentProfilesByUserId.get(secretaryMembership.getUserId()) : null;
        StudentProfile studentTreasurerProfile = treasurerMembership != null ? studentProfilesByUserId.get(treasurerMembership.getUserId()) : null;
        boolean hasPresidentMembership = membershipsByRole.containsKey(ClubMemberRole.PRESIDENT);
        long displayedMemberCount = memberships.size() + (!hasPresidentMembership && club.getPresidentId() != null ? 1 : 0);

        return ClubResponse.builder()
                .id(club.getId())
                .name(club.getName())
                .description(club.getDescription())
                .type(club.getType() != null ? club.getType().name() : null)
                .presidentId(club.getPresidentId())
                .presidentName(resolveMemberName(president, presidentProfile))
                .presidentEmail(president != null ? president.getEmail() : null)
                .presidentStudentNumber(presidentProfile != null ? presidentProfile.getStudentNumber() : null)
                .seniorTreasurerLecturerId(club.getSeniorTreasurerLecturerId())
                .seniorTreasurerLecturerName(lecturer != null ? lecturer.getName() : null)
                .seniorTreasurerLecturerEmail(lecturer != null ? lecturer.getEmail() : null)
                .seniorTreasurerStaffId(lecturerProfile != null ? lecturerProfile.getStaffId() : null)
                .secretaryUserId(secretaryMembership != null ? secretaryMembership.getUserId() : null)
                .secretaryName(resolveMemberName(secretary, secretaryProfile))
                .secretaryStudentNumber(secretaryProfile != null ? secretaryProfile.getStudentNumber() : null)
                .studentTreasurerUserId(treasurerMembership != null ? treasurerMembership.getUserId() : null)
                .studentTreasurerName(resolveMemberName(studentTreasurer, studentTreasurerProfile))
                .studentTreasurerStudentNumber(studentTreasurerProfile != null ? studentTreasurerProfile.getStudentNumber() : null)
                .status(club.getStatus() != null ? club.getStatus().name() : null)
                .rejectionReason(club.getRejectionReason())
                .memberCount(displayedMemberCount)
                .executiveCommittee(buildExecutiveCommittee(club, president, presidentProfile, membershipsByRole, usersById, studentProfilesByUserId))
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
                .displayName(membership.getMemberRole() != null ? ClubRoleConfig.getDisplayName(membership.getMemberRole()) : null)
                .joinedAt(membership.getJoinedAt())
                .build();
    }

    private List<ClubMemberRoleSummary> buildExecutiveCommittee(
            Club club,
            User president,
            StudentProfile presidentProfile,
            Map<ClubMemberRole, ClubMembership> membershipsByRole,
            Map<Long, User> usersById,
            Map<Long, StudentProfile> studentProfilesByUserId) {
        List<ClubMemberRoleSummary> summaries = new ArrayList<>();

        for (ClubMemberRole role : getAvailableRolesForClub(club)) {
            if (role == ClubMemberRole.GENERAL_MEMBER) {
                continue;
            }

            if (role == ClubMemberRole.PRESIDENT) {
                if (president != null) {
                    summaries.add(buildRoleSummary(role, resolveMemberName(president, presidentProfile), presidentProfile));
                }
                continue;
            }

            ClubMembership membership = membershipsByRole.get(role);
            if (membership == null) {
                continue;
            }

            User user = usersById.get(membership.getUserId());
            StudentProfile profile = studentProfilesByUserId.get(membership.getUserId());
            summaries.add(buildRoleSummary(role, resolveMemberName(user, profile), profile));
        }

        return summaries;
    }

    private ClubMemberRoleSummary buildRoleSummary(ClubMemberRole role, String memberName, StudentProfile profile) {
        return ClubMemberRoleSummary.builder()
                .role(role.name())
                .displayName(ClubRoleConfig.getDisplayName(role))
                .memberName(memberName)
                .memberStudentNumber(profile != null ? profile.getStudentNumber() : null)
                .build();
    }

    private boolean isRoleTaken(Club club, ClubMemberRole role) {
        if (role == ClubMemberRole.PRESIDENT) {
            return club.getPresidentId() != null;
        }
        return clubMembershipRepository.existsByClubIdAndMemberRole(club.getId(), role);
    }

    private RoleOccupant findRoleOccupant(Club club, ClubMemberRole role) {
        if (role == ClubMemberRole.PRESIDENT && club.getPresidentId() != null) {
            User president = club.getPresident() != null
                    ? club.getPresident()
                    : userRepository.findById(club.getPresidentId()).orElse(null);
            StudentProfile profile = findStudentProfile(president);
            return new RoleOccupant(resolveMemberName(president, profile), profile != null ? profile.getStudentNumber() : null);
        }

        ClubMembership membership = clubMembershipRepository.findByClubIdAndMemberRole(club.getId(), role).orElse(null);
        if (membership == null) {
            return null;
        }

        User user = membership.getUser() != null
                ? membership.getUser()
                : userRepository.findById(membership.getUserId()).orElse(null);
        StudentProfile profile = findStudentProfile(user);
        return new RoleOccupant(resolveMemberName(user, profile), profile != null ? profile.getStudentNumber() : null);
    }

    private String resolveMemberName(User user, StudentProfile profile) {
        if (profile != null && profile.getFullName() != null && !profile.getFullName().isBlank()) {
            return profile.getFullName();
        }
        return user != null ? user.getName() : null;
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

    private record RoleOccupant(String memberName, String studentNumber) {
    }
}
