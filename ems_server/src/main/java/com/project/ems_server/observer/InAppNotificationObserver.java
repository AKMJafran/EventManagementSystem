package com.project.ems_server.observer;

import com.project.ems_server.entity.Event;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Concrete observer for in-app notifications.
 */
@Component
@RequiredArgsConstructor
public class InAppNotificationObserver implements EventObserver {

    private final NotificationService notificationService;

    @Override
    public void update(Event event) {
        switch (event.getStatus()) {
            case APPROVED:
                notificationService.createNotification(
                        event.getUserId(),
                        "Event Approved",
                        String.format("Your event '%s' has been approved!", event.getTitle()),
                        NotificationType.EVENT_APPROVED
                );
                break;
            case REJECTED:
                notificationService.createNotification(
                        event.getUserId(),
                        "Event Rejected",
                        String.format(
                                "Your event '%s' has been rejected. Reason: %s",
                                event.getTitle(),
                                event.getRejectReason() != null ? event.getRejectReason() : "No reason provided"
                        ),
                        NotificationType.EVENT_REJECTED
                );
                break;
            default:
                break;
        }
    }
}
