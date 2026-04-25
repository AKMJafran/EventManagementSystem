package com.project.ems_server.controller;

import com.project.ems_server.dto.request.StudentProfileBulkItemRequest;
import com.project.ems_server.entity.StudentProfile;
import com.project.ems_server.repository.StudentProfileRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private static final Set<String> ALLOWED_DEPARTMENTS = Set.of("ICT", "ET", "BST");

    private final StudentProfileRepository studentProfileRepository;

    @PostMapping("/students/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> bulkImportStudents(@Valid @RequestBody List<@Valid StudentProfileBulkItemRequest> students) {
        if (students == null || students.isEmpty()) {
            throw new RuntimeException("Invalid request: student list cannot be empty.");
        }

        Set<String> payloadStudentNumbers = new HashSet<>();
        Set<String> payloadOfficialEmails = new HashSet<>();
        List<StudentProfile> profiles = new ArrayList<>();

        for (StudentProfileBulkItemRequest student : students) {
            String normalizedStudentNumber = student.getStudentNumber().trim();
            String normalizedEmail = student.getOfficialEmail().trim().toLowerCase(Locale.ROOT);
            String normalizedDepartment = student.getDepartment().trim().toUpperCase(Locale.ROOT);

            if (!ALLOWED_DEPARTMENTS.contains(normalizedDepartment)) {
                throw new RuntimeException("Invalid department '" + student.getDepartment() + "'. Allowed values are ICT, ET, BST.");
            }

            if (!payloadStudentNumbers.add(normalizedStudentNumber)) {
                throw new RuntimeException("Invalid request: duplicate student number in payload: " + normalizedStudentNumber);
            }

            if (!payloadOfficialEmails.add(normalizedEmail)) {
                throw new RuntimeException("Invalid request: duplicate official email in payload: " + normalizedEmail);
            }

            if (studentProfileRepository.existsByStudentNumber(normalizedStudentNumber)) {
                throw new RuntimeException("Invalid request: student number already exists: " + normalizedStudentNumber);
            }

            if (studentProfileRepository.existsByOfficialEmail(normalizedEmail)) {
                throw new RuntimeException("Invalid request: official email already exists: " + normalizedEmail);
            }

            profiles.add(StudentProfile.builder()
                    .studentNumber(normalizedStudentNumber)
                    .officialEmail(normalizedEmail)
                    .fullName(student.getFullName().trim())
                    .department(normalizedDepartment)
                    .batchYear(student.getBatchYear())
                    .isRegistered(false)
                    .build());
        }

        studentProfileRepository.saveAll(profiles);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Successfully imported " + profiles.size() + " student profiles.");
    }
}
