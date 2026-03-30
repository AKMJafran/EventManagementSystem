package com.project.ems_server.observer;

import com.project.ems_server.entity.Event;
import com.project.ems_server.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Concrete observer for email notifications.
 * Implements EventObserver to send emails on event updates.
 */
@Component
@RequiredArgsConstructor
public class EmailNotificationObserver implements EventObserver {

    private final EmailService emailService;

    @Override
    public void update(Event event) {
        // Send email based on event status
        switch (event.getStatus()) {
            case APPROVED:
                emailService.sendEventApprovedEmail(event.getUser().getEmail(), event.getTitle());
                break;
            case REJECTED:
                emailService.sendEventRejectedEmail(event.getUser().getEmail(), event.getTitle(),
                    event.getRejectReason() != null ? event.getRejectReason() : "No reason provided");
                break;
            default:
                // Other notifications if needed
                break;
        }
    }
}