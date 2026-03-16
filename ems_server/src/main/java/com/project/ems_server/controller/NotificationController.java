package com.project.ems_server.controller;

import com.project.ems_server.dto.response.NotificationResponse;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /**
     * Gets all notifications for the authenticated user
     * GET /notifications
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getUserNotifications(Authentication authentication) {
        Long userId = extractUserIdFromAuthentication(authentication);
        List<NotificationResponse> notifications = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Marks a single notification as read
     * PATCH /notifications/{id}/read
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            Authentication authentication) {
        
        Long userId = extractUserIdFromAuthentication(authentication);
        notificationService.markAsRead(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Marks all notifications as read for the authenticated user
     * PATCH /notifications/read-all
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
        Long userId = extractUserIdFromAuthentication(authentication);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Gets the count of unread notifications for the authenticated user
     * GET /notifications/count
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        Long userId = extractUserIdFromAuthentication(authentication);
        long unreadCount = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", unreadCount));
    }

    /**
     * Helper method to extract user ID from Authentication
     */
    private Long extractUserIdFromAuthentication(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(user -> user.getId())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
}
