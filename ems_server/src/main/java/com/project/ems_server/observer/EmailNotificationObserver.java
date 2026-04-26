package com.project.ems_server.observer;

import com.project.ems_server.entity.Event;
import com.project.ems_server.entity.User;
import com.project.ems_server.repository.UserRepository;
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
    private final UserRepository userRepository;

    @Override
    public void update(Event event) {
        User user = userRepository.findById(event.getUserId()).orElse(null);
        if (user == null) {
            return;
        }

        // Send email based on event status
        switch (event.getStatus()) {
            case APPROVED:
                emailService.sendEventApprovedEmail(user.getEmail(), event.getTitle());
                break;
            case REJECTED:
                emailService.sendEventRejectedEmail(user.getEmail(), event.getTitle(),
                    event.getRejectReason() != null ? event.getRejectReason() : "No reason provided");
                break;
            default:
                // Other notifications if needed
                break;
        }
    }
}