package com.project.ems_server.service;

import com.project.ems_server.dto.request.AdminStudentCreateRequest;
import com.project.ems_server.dto.request.StudentProfileBulkItemRequest;
import com.project.ems_server.dto.response.AdminStudentResponse;
import com.project.ems_server.dto.response.BulkStudentImportFailureResponse;
import com.project.ems_server.dto.response.BulkStudentImportResponse;
import com.project.ems_server.entity.StudentProfile;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.RefreshTokenRepository;
import com.project.ems_server.repository.StudentProfileRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminStudentService {

    private static final Set<String> ALLOWED_DEPARTMENTS = Set.of("ICT", "ET", "BST");
    private static final String TEMPORARY_PASSWORD = "FoT@1234";

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final TransactionTemplate transactionTemplate;

    public AdminStudentResponse createStudent(AdminStudentCreateRequest request) {
        StudentSeedData data = normalizeStudentData(
                request.getStudentNumber(),
                request.getOfficialEmail(),
                request.getFullName(),
                request.getDepartment(),
                request.getBatchYear(),
                () -> "Invalid student request."
        );

        ensureUniqueStudent(data.studentNumber(), data.officialEmail());
        return createStudentAccount(data);
    }

    public BulkStudentImportResponse bulkImportStudents(List<StudentProfileBulkItemRequest> students) {
        if (students == null || students.isEmpty()) {
            throw new RuntimeException("Invalid request: student list cannot be empty.");
        }

        List<BulkStudentImportFailureResponse> failures = new ArrayList<>();
        Set<String> payloadStudentNumbers = new HashSet<>();
        Set<String> payloadOfficialEmails = new HashSet<>();
        int successCount = 0;

        for (int index = 0; index < students.size(); index++) {
            StudentProfileBulkItemRequest student = students.get(index);
            int rowNumber = index + 1;
            String studentNumber = normalizeNullable(student != null ? student.getStudentNumber() : null);
            String officialEmail = normalizeEmail(student != null ? student.getOfficialEmail() : null);

            try {
                StudentSeedData data = normalizeStudentData(
                        student != null ? student.getStudentNumber() : null,
                        student != null ? student.getOfficialEmail() : null,
                        student != null ? student.getFullName() : null,
                        student != null ? student.getDepartment() : null,
                        student != null ? student.getBatchYear() : null,
                        () -> "Invalid data in row " + rowNumber + "."
                );

                if (!payloadStudentNumbers.add(data.studentNumber())) {
                    throw new RuntimeException("Duplicate student number in payload.");
                }

                if (!payloadOfficialEmails.add(data.officialEmail())) {
                    throw new RuntimeException("Duplicate official email in payload.");
                }

                ensureUniqueStudent(data.studentNumber(), data.officialEmail());
                createStudentAccount(data);
                successCount++;
            } catch (RuntimeException exception) {
                failures.add(BulkStudentImportFailureResponse.builder()
                        .rowNumber(rowNumber)
                        .studentNumber(studentNumber)
                        .officialEmail(officialEmail)
                        .reason(exception.getMessage())
                        .build());
            }
        }

        return BulkStudentImportResponse.builder()
                .total(students.size())
                .success(successCount)
                .failed(failures.size())
                .failures(failures)
                .build();
    }

    public List<AdminStudentResponse> getAllStudents() {
        Map<String, StudentProfile> profilesByEmail = studentProfileRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        profile -> profile.getOfficialEmail().toLowerCase(Locale.ROOT),
                        profile -> profile,
                        (left, right) -> left
                ));

        return userRepository.findByRole(Role.STUDENT)
                .stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(LocalDateTime::compareTo)).reversed())
                .map(user -> mapToResponse(user, profilesByEmail.get(user.getEmail().toLowerCase(Locale.ROOT))))
                .toList();
    }

    public AdminStudentResponse getStudent(Long userId) {
        User user = userRepository.findById(userId)
                .filter(existing -> existing.getRole() == Role.STUDENT)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        StudentProfile profile = studentProfileRepository.findByOfficialEmail(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        return mapToResponse(user, profile);
    }

    public AdminStudentResponse updateStudent(Long userId, AdminStudentCreateRequest request) {
        User user = userRepository.findById(userId)
                .filter(existing -> existing.getRole() == Role.STUDENT)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        StudentProfile profile = studentProfileRepository.findByOfficialEmail(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        StudentSeedData data = normalizeStudentData(
                request.getStudentNumber(),
                request.getOfficialEmail(),
                request.getFullName(),
                request.getDepartment(),
                request.getBatchYear(),
                () -> "Invalid student request."
        );

        userRepository.findByEmail(data.officialEmail())
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new RuntimeException("User already exists with email: " + data.officialEmail());
                });

        studentProfileRepository.findByStudentNumber(data.studentNumber())
                .filter(existing -> !existing.getId().equals(profile.getId()))
                .ifPresent(existing -> {
                    throw new RuntimeException("Student number already exists: " + data.studentNumber());
                });

        studentProfileRepository.findByOfficialEmail(data.officialEmail())
                .filter(existing -> !existing.getId().equals(profile.getId()))
                .ifPresent(existing -> {
                    throw new RuntimeException("Official email already exists: " + data.officialEmail());
                });

        user.setName(data.fullName());
        user.setEmail(data.officialEmail());
        userRepository.save(user);

        profile.setStudentNumber(data.studentNumber());
        profile.setOfficialEmail(data.officialEmail());
        profile.setFullName(data.fullName());
        profile.setDepartment(data.department());
        profile.setBatchYear(data.batchYear());
        studentProfileRepository.save(profile);

        return mapToResponse(user, profile);
    }

    public void deactivateStudent(Long userId) {
        User user = userRepository.findById(userId)
                .filter(existing -> existing.getRole() == Role.STUDENT)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            return;
        }

        user.setIsActive(false);
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    public AdminStudentResponse setStudentActive(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .filter(existing -> existing.getRole() == Role.STUDENT)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        user.setIsActive(active);
        userRepository.save(user);

        if (!active) {
            refreshTokenRepository.deleteByUserId(user.getId());
        }

        StudentProfile profile = studentProfileRepository.findByOfficialEmail(user.getEmail()).orElse(null);
        return mapToResponse(user, profile);
    }

    private AdminStudentResponse createStudentAccount(StudentSeedData data) {
        return transactionTemplate.execute(status -> {
            User user = userRepository.save(User.builder()
                    .name(data.fullName())
                    .email(data.officialEmail())
                    .password(passwordEncoder.encode(TEMPORARY_PASSWORD))
                    .role(Role.STUDENT)
                    .isVerified(true)
                    .isFirstLogin(true)
                    .isActive(true)
                    .build());

            StudentProfile profile = studentProfileRepository.save(StudentProfile.builder()
                    .studentNumber(data.studentNumber())
                    .officialEmail(data.officialEmail())
                    .fullName(data.fullName())
                    .department(data.department())
                    .batchYear(data.batchYear())
                    .isRegistered(true)
                    .build());

            emailService.sendStudentWelcomeEmail(data.officialEmail(), data.fullName(), TEMPORARY_PASSWORD);
            return mapToResponse(user, profile);
        });
    }

    private void ensureUniqueStudent(String studentNumber, String officialEmail) {
        if (userRepository.existsByEmail(officialEmail)) {
            throw new RuntimeException("User already exists with email: " + officialEmail);
        }

        if (studentProfileRepository.existsByStudentNumber(studentNumber)) {
            throw new RuntimeException("Student number already exists: " + studentNumber);
        }

        if (studentProfileRepository.existsByOfficialEmail(officialEmail)) {
            throw new RuntimeException("Official email already exists: " + officialEmail);
        }
    }

    private StudentSeedData normalizeStudentData(
            String studentNumber,
            String officialEmail,
            String fullName,
            String department,
            Integer batchYear,
            Supplier<String> defaultMessageSupplier
    ) {
        String normalizedStudentNumber = normalizeNullable(studentNumber);
        String normalizedOfficialEmail = normalizeEmail(officialEmail);
        String normalizedFullName = normalizeNullable(fullName);
        String normalizedDepartment = normalizeNullable(department).toUpperCase(Locale.ROOT);

        List<String> errors = new ArrayList<>();
        if (normalizedStudentNumber.isBlank()) {
            errors.add("studentNumber is required");
        }
        if (normalizedOfficialEmail.isBlank()) {
            errors.add("officialEmail is required");
        } else if (!normalizedOfficialEmail.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            errors.add("officialEmail should be valid");
        }
        if (normalizedFullName.isBlank()) {
            errors.add("fullName is required");
        }
        if (normalizedDepartment.isBlank()) {
            errors.add("department is required");
        } else if (!ALLOWED_DEPARTMENTS.contains(normalizedDepartment)) {
            errors.add("department must be one of ICT, ET, BST");
        }
        if (batchYear == null) {
            errors.add("batchYear is required");
        } else if (batchYear < 2000 || batchYear > 2100) {
            errors.add("batchYear must be a valid year");
        }

        if (!errors.isEmpty()) {
            throw new RuntimeException(defaultMessageSupplier.get() + " " + String.join(", ", errors));
        }

        return new StudentSeedData(
                normalizedStudentNumber,
                normalizedOfficialEmail,
                normalizedFullName,
                normalizedDepartment,
                batchYear
        );
    }

    private String normalizeNullable(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeEmail(String email) {
        return normalizeNullable(email).toLowerCase(Locale.ROOT);
    }

    private AdminStudentResponse mapToResponse(User user, StudentProfile profile) {
        return AdminStudentResponse.builder()
                .id(user.getId())
                .profileId(profile != null ? profile.getId() : null)
                .studentNumber(profile != null ? profile.getStudentNumber() : null)
                .officialEmail(user.getEmail())
                .fullName(profile != null && profile.getFullName() != null ? profile.getFullName() : user.getName())
                .department(profile != null ? profile.getDepartment() : null)
                .batchYear(profile != null ? profile.getBatchYear() : null)
                .isRegistered(profile != null ? profile.getIsRegistered() : null)
                .isVerified(user.getIsVerified())
                .isActive(user.getIsActive())
                .isFirstLogin(user.getIsFirstLogin())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }

    private record StudentSeedData(
            String studentNumber,
            String officialEmail,
            String fullName,
            String department,
            Integer batchYear
    ) {
    }
}
