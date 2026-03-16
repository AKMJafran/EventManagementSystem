package com.project.ems_server.service;

import com.project.ems_server.dto.response.NotificationResponse;
import com.project.ems_server.entity.Notification;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.repository.NotificationRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Creates and saves a new notification
     */
    public NotificationResponse createNotification(Long userId, String message, NotificationType type) {
        // Verify user exists
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Notification notification = Notification.builder()
                .userId(userId)
                .message(message)
                .type(type)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification savedNotification = notificationRepository.save(notification);
        return mapToResponse(savedNotification);
    }

    /**
     * Gets all notifications for a user sorted by creation date (newest first)
     */
    public List<NotificationResponse> getUserNotifications(Long userId) {
        // Verify user exists
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return notifications.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Marks a single notification as read
     */
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + notificationId));

        // Verify the notification belongs to the user
        if (!notification.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Notification does not belong to this user");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    /**
     * Marks all notifications as read for a user
     */
    public void markAllAsRead(Long userId) {
        // Verify user exists
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(notification -> notification.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }

    /**
     * Gets count of unread notifications for a user
     */
    public long getUnreadCount(Long userId) {
        // Verify user exists
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Maps Notification entity to NotificationResponse
     */
    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType().name())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
