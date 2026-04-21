package com.project.ems_server.controller;

import com.project.ems_server.entity.User;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.enums.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/students")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllStudents() {
        List<User> students = userRepository.findByRole(Role.STUDENT);
        return ResponseEntity.ok(students);
    }
}