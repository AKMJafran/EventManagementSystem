package com.project.ems_server.controller;

import com.project.ems_server.dto.request.AdminStudentCreateRequest;
import com.project.ems_server.dto.request.StudentProfileBulkItemRequest;
import com.project.ems_server.dto.response.AdminStudentResponse;
import com.project.ems_server.dto.response.BulkStudentImportResponse;
import com.project.ems_server.service.AdminStudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminStudentService adminStudentService;

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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AdminStudentResponse>> getAllStudents() {
        return ResponseEntity.ok(adminStudentService.getAllStudents());
    }

    @GetMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminStudentResponse> getStudent(@PathVariable Long id) {
        return ResponseEntity.ok(adminStudentService.getStudent(id));
    }

    @DeleteMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateStudent(@PathVariable Long id) {
        adminStudentService.deactivateStudent(id);
        return ResponseEntity.noContent().build();
    }
}
