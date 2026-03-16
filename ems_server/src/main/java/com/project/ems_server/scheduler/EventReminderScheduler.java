package com.project.ems_server.scheduler;

import com.project.ems_server.entity.Event;
import com.project.ems_server.entity.EventAttendee;
import com.project.ems_server.entity.Notification;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.repository.EventAttendeeRepository;
import com.project.ems_server.repository.EventRepository;
import com.project.ems_server.repository.NotificationRepository;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventReminderScheduler {

    private final EventRepository eventRepository;
    private final EventAttendeeRepository eventAttendeeRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /**
     * Scheduled task that runs every 15 minutes (900000 ms)
     * Finds events starting within the next 1 hour and sends reminders to attendees
     */
    @Scheduled(fixedRate = 900000)
    public void sendEventReminders() {
        try {
            log.info("Starting event reminder scheduler task...");

            // Get current time and time 1 hour from now
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime oneHourLater = now.plusHours(1);

            // Find all APPROVED events starting within the next hour
            List<Event> upcomingEvents = eventRepository.findUpcomingApprovedEvents(now, oneHourLater);
            log.info("Found {} upcoming events", upcomingEvents.size());

            // Process each upcoming event
            for (Event event : upcomingEvents) {
                sendRemindersForEvent(event);
            }

            log.info("Event reminder scheduler task completed");
        } catch (Exception e) {
            log.error("Error in event reminder scheduler", e);
        }
    }

    /**
     * Sends reminders to all attendees of a specific event
     */
    private void sendRemindersForEvent(Event event) {
        try {
            log.info("Processing reminders for event: {} (ID: {})", event.getTitle(), event.getId());

            // Get all attendees for this event
            List<EventAttendee> attendees = eventAttendeeRepository.findByEventId(event.getId());
            log.info("Found {} attendees for event {}", attendees.size(), event.getId());

            // Send reminder to each attendee
            for (EventAttendee attendee : attendees) {
                sendReminderToAttendee(event, attendee);
            }
        } catch (Exception e) {
            log.error("Error processing reminders for event {}", event.getId(), e);
        }
    }

    /**
     * Sends reminder to a single attendee
     */
    private void sendReminderToAttendee(Event event, EventAttendee attendee) {
        try {
            // Get attendee user details
            User user = userRepository.findById(attendee.getUserId())
                    .orElse(null);

            if (user == null) {
                log.warn("User not found for attendee ID: {}", attendee.getUserId());
                return;
            }

            // Create in-app notification message
            String notificationMessage = buildReminderNotificationMessage(event);

            // Save in-app notification
            Notification notification = Notification.builder()
                    .userId(user.getId())
                    .message(notificationMessage)
                    .type(NotificationType.REMINDER)
                    .isRead(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);

            // Send email reminder
            emailService.sendEventReminderEmail(user.getEmail(), event.getTitle(), event.getStartTime());

            log.info("Reminder sent to user {} for event {}", user.getEmail(), event.getId());
        } catch (Exception e) {
            log.error("Error sending reminder to attendee for event {}", event.getId(), e);
        }
    }

    /**
     * Builds notification message for event reminder
     */
    private String buildReminderNotificationMessage(Event event) {
        return String.format(
                "🔔 REMINDER: Event '%s' is happening soon!\n\n" +
                "Venue: %s\n" +
                "Time: %s",
                event.getTitle(),
                event.getVenue(),
                event.getStartTime()
        );
    }
}
