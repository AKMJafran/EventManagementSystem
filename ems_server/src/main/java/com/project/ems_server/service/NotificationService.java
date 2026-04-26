package com.project.ems_server.service;

import com.project.ems_server.dto.request.NotificationCreateRequest;
import com.project.ems_server.dto.response.NotificationResponse;
import com.project.ems_server.entity.Notification;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.enums.Role;
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
     * Creates and saves a new notification using the default title for the type.
     */
    public NotificationResponse createNotification(Long userId, String message, NotificationType type) {
        return createNotification(userId, buildDefaultTitle(type), message, type);
    }

    /**
     * Creates and saves a new notification with a custom title.
     */
    public NotificationResponse createNotification(Long userId, String title, String message, NotificationType type) {
        User recipient = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Notification notification = Notification.builder()
                .userId(userId)
                .title(normalizeTitle(title, type))
                .message(message.trim())
                .type(type)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification savedNotification = notificationRepository.save(notification);
        savedNotification.setUser(recipient);
        return mapToResponse(savedNotification);
    }

    /**
     * Gets all notifications for a user sorted by creation date (newest first).
     */
    public List<NotificationResponse> getUserNotifications(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Gets all notifications across the system for admin monitoring.
     */
    public List<NotificationResponse> getAllNotificationsForAdmin() {
        return notificationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Sends notifications based on the target audience selected by the admin.
     */
    public long createNotifications(NotificationCreateRequest request) {
        NotificationType type = parseNotificationType(request.getType());
        String targetAudience = normalizeTargetAudience(request.getTargetAudience());

        if ("SPECIFIC_USER".equals(targetAudience) && request.getUserId() == null) {
            throw new RuntimeException("Invalid target audience: userId is required for specific user notifications");
        }

        List<User> recipients = switch (targetAudience) {
            case "ALL_USERS" -> userRepository.findAll();
            case "ALL_STUDENTS" -> userRepository.findByRole(Role.STUDENT);
            case "ALL_ADMINS" -> userRepository.findByRole(Role.ADMIN);
            case "SPECIFIC_USER" -> List.of(
                    userRepository.findById(request.getUserId())
                            .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()))
            );
            default -> throw new RuntimeException("Invalid target audience");
        };

        if (recipients.isEmpty()) {
            throw new RuntimeException("No recipients found for the selected target audience");
        }

        List<Notification> notifications = recipients.stream()
                .map(user -> Notification.builder()
                        .userId(user.getId())
                        .title(normalizeTitle(request.getTitle(), type))
                        .message(request.getMessage().trim())
                        .type(type)
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build())
                .collect(Collectors.toList());

        return notificationRepository.saveAll(notifications).size();
    }

    /**
     * Marks a single notification as read.
     */
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + notificationId));

        if (!notification.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Notification does not belong to this user");
        }

        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notificationRepository.save(notification);
        }
    }

    /**
     * Marks all notifications as read for a user.
     */
    public void markAllAsRead(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(notification -> notification.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }

    /**
     * Gets count of unread notifications for a user.
     */
    public long getUnreadCount(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Maps Notification entity to NotificationResponse.
     */
    private NotificationResponse mapToResponse(Notification notification) {
        User recipient = notification.getUser();
        if (recipient == null) {
            recipient = userRepository.findById(notification.getUserId()).orElse(null);
        }

        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .title(resolveTitle(notification))
                .message(notification.getMessage())
                .type(notification.getType().name())
                .isRead(notification.getIsRead())
                .recipientName(recipient != null ? recipient.getName() : "Unknown")
                .recipientEmail(recipient != null ? recipient.getEmail() : null)
                .recipientRole(recipient != null && recipient.getRole() != null ? recipient.getRole().name() : null)
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private NotificationType parseNotificationType(String type) {
        try {
            return NotificationType.valueOf(type.trim().toUpperCase());
        } catch (Exception ex) {
            throw new RuntimeException("Invalid notification type");
        }
    }

    private String normalizeTargetAudience(String targetAudience) {
        if (targetAudience == null || targetAudience.isBlank()) {
            throw new RuntimeException("Invalid target audience");
        }
        return targetAudience.trim().toUpperCase();
    }

    private String normalizeTitle(String title, NotificationType type) {
        if (title == null || title.isBlank()) {
            return buildDefaultTitle(type);
        }
        return title.trim();
    }

    private String resolveTitle(Notification notification) {
        if (notification.getTitle() != null && !notification.getTitle().isBlank()) {
            return notification.getTitle();
        }
        return buildDefaultTitle(notification.getType());
    }

    private String buildDefaultTitle(NotificationType type) {
        if (type == null) {
            return "Notification";
        }

        return switch (type) {
            case EVENT_APPROVED -> "Event Approved";
            case EVENT_REJECTED -> "Event Rejected";
            case CONFLICT -> "Conflict Alert";
            case REMINDER -> "Event Reminder";
            case GENERAL -> "General Notification";
        };
    }
}
