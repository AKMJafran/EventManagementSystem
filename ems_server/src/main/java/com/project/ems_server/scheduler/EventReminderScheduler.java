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

import java.time.Duration;
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
     * Scheduled task that runs every 15 minutes and sends reminder notifications
     * for approved events starting within the next 24 hours.
     */
    @Scheduled(fixedRate = 900000)
    public void sendEventReminders() {
        try {
            log.info("Starting event reminder scheduler task...");

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime oneDayLater = now.plusDays(1);

            List<Event> upcomingEvents = eventRepository.findUpcomingApprovedEvents(now, oneDayLater);
            log.info("Found {} upcoming events", upcomingEvents.size());

            for (Event event : upcomingEvents) {
                sendRemindersForEvent(event);
            }

            log.info("Event reminder scheduler task completed");
        } catch (Exception e) {
            log.error("Error in event reminder scheduler", e);
        }
    }

    private void sendRemindersForEvent(Event event) {
        try {
            log.info("Processing reminders for event: {} (ID: {})", event.getTitle(), event.getId());

            List<EventAttendee> attendees = eventAttendeeRepository.findByEventId(event.getId());
            log.info("Found {} attendees for event {}", attendees.size(), event.getId());

            sendReminderToOrganizer(event);

            for (EventAttendee attendee : attendees) {
                sendReminderToAttendee(event, attendee);
            }
        } catch (Exception e) {
            log.error("Error processing reminders for event {}", event.getId(), e);
        }
    }

    private void sendReminderToAttendee(Event event, EventAttendee attendee) {
        try {
            User user = userRepository.findById(attendee.getUserId()).orElse(null);
            if (user == null) {
                log.warn("User not found for attendee ID: {}", attendee.getUserId());
                return;
            }

            String title = buildReminderTitle(event);
            String notificationMessage = buildReminderNotificationMessage(event);
            saveReminderNotification(user.getId(), title, notificationMessage);
            emailService.sendEventReminderEmail(user.getEmail(), event.getTitle(), event.getStartTime());

            log.info("Reminder sent to user {} for event {}", user.getEmail(), event.getId());
        } catch (Exception e) {
            log.error("Error sending reminder to attendee for event {}", event.getId(), e);
        }
    }

    private void sendReminderToOrganizer(Event event) {
        userRepository.findById(event.getUserId()).ifPresent(user -> {
            String title = buildReminderTitle(event);
            String notificationMessage = buildReminderNotificationMessage(event);
            saveReminderNotification(user.getId(), title, notificationMessage);
            emailService.sendEventReminderEmail(user.getEmail(), event.getTitle(), event.getStartTime());
        });
    }

    private void saveReminderNotification(Long userId, String title, String notificationMessage) {
        if (notificationRepository.existsByUserIdAndTypeAndTitleAndMessage(
                userId,
                NotificationType.REMINDER,
                title,
                notificationMessage
        )) {
            return;
        }

        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(notificationMessage)
                .type(NotificationType.REMINDER)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);
    }

    private String buildReminderTitle(Event event) {
        long hoursUntilStart = Duration.between(LocalDateTime.now(), event.getStartTime()).toHours();
        return hoursUntilStart <= 1 ? "Event Starts Soon" : "Event Reminder";
    }

    private String buildReminderNotificationMessage(Event event) {
        long hoursUntilStart = Duration.between(LocalDateTime.now(), event.getStartTime()).toHours();
        String reminderWindow = hoursUntilStart <= 1 ? "within the next hour" : "within the next day";

        return String.format(
                "REMINDER: Event '%s' is happening %s.%n%nVenue: %s%nTime: %s",
                event.getTitle(),
                reminderWindow,
                event.getVenue(),
                event.getStartTime()
        );
    }
}
