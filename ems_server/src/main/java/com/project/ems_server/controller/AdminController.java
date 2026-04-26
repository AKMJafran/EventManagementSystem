package com.project.ems_server.controller;

import com.project.ems_server.dto.request.AdminLecturerCreateRequest;
import com.project.ems_server.dto.request.AdminAccountStatusRequest;
import com.project.ems_server.dto.request.AdminStudentCreateRequest;
import com.project.ems_server.dto.request.LecturerProfileBulkItemRequest;
import com.project.ems_server.dto.request.StudentProfileBulkItemRequest;
import com.project.ems_server.dto.response.AdminLecturerResponse;
import com.project.ems_server.dto.response.AdminStudentResponse;
import com.project.ems_server.dto.response.BulkLecturerImportResponse;
import com.project.ems_server.dto.response.BulkStudentImportResponse;
import com.project.ems_server.service.AdminLecturerService;
import com.project.ems_server.service.AdminStudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminStudentService adminStudentService;
    private final AdminLecturerService adminLecturerService;

    // ─── Student Endpoints ───────────────────────────────────────────────

    @PostMapping("/students")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminStudentResponse> createStudent(@Valid @RequestBody AdminStudentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminStudentService.createStudent(request));
    }

    @PostMapping("/students/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BulkStudentImportResponse> bulkImportStudents(@RequestBody List<StudentProfileBulkItemRequest> students) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminStudentService.bulkImportStudents(students));
    }

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT')")
    public ResponseEntity<List<AdminStudentResponse>> getAllStudents() {
        return ResponseEntity.ok(adminStudentService.getAllStudents());
    }

    @GetMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminStudentResponse> getStudent(@PathVariable Long id) {
        return ResponseEntity.ok(adminStudentService.getStudent(id));
    }

    @PutMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminStudentResponse> updateStudent(
            @PathVariable Long id,
            @Valid @RequestBody AdminStudentCreateRequest request) {
        return ResponseEntity.ok(adminStudentService.updateStudent(id, request));
    }

    @DeleteMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateStudent(@PathVariable Long id) {
        adminStudentService.deactivateStudent(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/students/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminStudentResponse> setStudentStatus(
            @PathVariable Long id,
            @Valid @RequestBody AdminAccountStatusRequest request) {
        return ResponseEntity.ok(adminStudentService.setStudentActive(id, Boolean.TRUE.equals(request.getActive())));
    }

    // ─── Lecturer Endpoints ──────────────────────────────────────────────

    @PostMapping("/lecturers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminLecturerResponse> createLecturer(@Valid @RequestBody AdminLecturerCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminLecturerService.createLecturer(request));
    }

    @PostMapping("/lecturers/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BulkLecturerImportResponse> bulkImportLecturers(@RequestBody List<LecturerProfileBulkItemRequest> lecturers) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminLecturerService.bulkImportLecturers(lecturers));
    }

    @GetMapping("/lecturers")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT')")
    public ResponseEntity<List<AdminLecturerResponse>> getAllLecturers() {
        return ResponseEntity.ok(adminLecturerService.getAllLecturers());
    }

    @GetMapping("/lecturers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminLecturerResponse> getLecturer(@PathVariable Long id) {
        return ResponseEntity.ok(adminLecturerService.getLecturer(id));
    }

    @PutMapping("/lecturers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminLecturerResponse> updateLecturer(
            @PathVariable Long id,
            @Valid @RequestBody AdminLecturerCreateRequest request) {
        return ResponseEntity.ok(adminLecturerService.updateLecturer(id, request));
    }

    @DeleteMapping("/lecturers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateLecturer(@PathVariable Long id) {
        adminLecturerService.deactivateLecturer(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/lecturers/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminLecturerResponse> setLecturerStatus(
            @PathVariable Long id,
            @Valid @RequestBody AdminAccountStatusRequest request) {
        return ResponseEntity.ok(adminLecturerService.setLecturerActive(id, Boolean.TRUE.equals(request.getActive())));
    }
}
