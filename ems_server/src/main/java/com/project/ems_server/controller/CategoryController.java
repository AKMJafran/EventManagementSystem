package com.project.ems_server.controller;

import com.project.ems_server.dto.request.CategoryRequest;
import com.project.ems_server.dto.response.CategoryResponse;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final UserRepository userRepository;

    /**
     * Creates a main category (admin only)
     * POST /categories
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryResponse> createMainCategory(
            @Valid @RequestBody CategoryRequest categoryRequest,
            Authentication authentication) {
        
        Long adminId = extractUserIdFromAuthentication(authentication);
        CategoryResponse response = categoryService.createMainCategory(categoryRequest, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Gets all main categories with nested sub-categories
     * GET /categories
     */
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllMainCategories() {
        List<CategoryResponse> categories = categoryService.getAllMainCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * Creates a sub-category under a parent category (admin only)
     * POST /categories/{id}/sub
     */
    @PostMapping("/{id}/sub")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryResponse> createSubCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest categoryRequest,
            Authentication authentication) {
        
        Long adminId = extractUserIdFromAuthentication(authentication);
        CategoryResponse response = categoryService.createSubCategory(categoryRequest, id, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Gets all sub-categories of a parent category
     * GET /categories/{id}/sub
     */
    @GetMapping("/{id}/sub")
    public ResponseEntity<List<CategoryResponse>> getSubCategories(@PathVariable Long id) {
        List<CategoryResponse> subCategories = categoryService.getSubCategories(id);
        return ResponseEntity.ok(subCategories);
    }

    /**
     * Deletes a category (admin only)
     * DELETE /categories/{id}
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Helper method to extract user ID from Authentication
     * Gets the email from principal and looks up the user to get their ID
     */
    private Long extractUserIdFromAuthentication(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(user -> user.getId())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
}
