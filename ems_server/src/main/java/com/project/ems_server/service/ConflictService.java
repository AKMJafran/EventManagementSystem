package com.project.ems_server.service;

import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.entity.Event;
import com.project.ems_server.entity.EventConflict;
import com.project.ems_server.entity.Notification;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.exception.VenueAlreadyBookedException;
import com.project.ems_server.repository.EventConflictRepository;
import com.project.ems_server.repository.EventRepository;
import com.project.ems_server.repository.NotificationRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConflictService {

    private final EventRepository eventRepository;
    private final EventConflictRepository eventConflictRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /**
     * Detects conflicts between a new event and existing APPROVED events
     * If conflicts are found, saves them to the database and notifies admins
     * 
     * @param newEvent the event request to check for conflicts
     * @return list of conflicting events (can be empty)
     */
    public List<Event> detectConflict(EventRequest newEvent) {
        // Query for APPROVED events with same venue and overlapping time
        List<Event> conflictingEvents = eventRepository.findConflictingEvents(
                newEvent.getVenue(),
                newEvent.getStartTime(),
                newEvent.getEndTime()
        );

        // If conflicts found, save them and notify admins
        if (!conflictingEvents.isEmpty()) {
            // Note: newEvent is not yet persisted, so we can't save EventConflict records yet
            // EventConflict records will be saved in EventService after the event is created
            notifyAdminsOfConflicts(newEvent, conflictingEvents);
        }

        return conflictingEvents;
    }

    /**
     * Strict conflict check that throws exception if conflicts found.
     * Demonstrates custom exception handling in advanced Java.
     */
    public void checkStrictConflict(EventRequest newEvent) throws VenueAlreadyBookedException {
        List<Event> conflicts = detectConflict(newEvent);
        if (!conflicts.isEmpty()) {
            String conflictTitles = conflicts.stream()
                    .map(Event::getTitle)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("Unknown");
            throw new VenueAlreadyBookedException(
                "Venue '" + newEvent.getVenue() + "' is already booked during this time. Conflicting events: " + conflictTitles
            );
        }
    }

    /**
     * Saves conflict records after an event has been created
     * Should be called by EventService after creating a new event
     * 
     * @param newEventId the ID of the newly created event
     * @param conflictingEventIds list of IDs of conflicting events
     */
    public void saveConflictRecords(Long newEventId, List<Long> conflictingEventIds) {
        for (Long conflictingEventId : conflictingEventIds) {
            EventConflict conflict = EventConflict.builder()
                    .eventId(newEventId)
                    .conflictWith(conflictingEventId)
                    .createdAt(LocalDateTime.now())
                    .build();
            eventConflictRepository.save(conflict);
        }
    }

    /**
     * Helper method to notify all admins of conflicts
     */
    private void notifyAdminsOfConflicts(EventRequest newEvent, List<Event> conflictingEvents) {
        // Get all admin users
        List<User> admins = userRepository.findByRole(Role.ADMIN);

        if (admins.isEmpty()) {
            System.out.println("No admins found to notify about conflicts");
            return;
        }

        // Build notification message
        String conflictEventTitles = conflictingEvents.stream()
                .map(Event::getTitle)
                .reduce((a, b) -> a + ", " + b)
                .orElse("Unknown");

        String notificationMessage = String.format(
                "⚠️ EVENT CONFLICT DETECTED\n\n" +
                "New Event: %s\n" +
                "Venue: %s\n" +
                "Time: %s to %s\n\n" +
                "Conflicting with:\n%s",
                newEvent.getTitle(),
                newEvent.getVenue(),
                newEvent.getStartTime(),
                newEvent.getEndTime(),
                conflictEventTitles
        );

        // Notify each admin
        for (User admin : admins) {
            // Create in-app notification
            Notification notification = Notification.builder()
                    .userId(admin.getId())
                    .message(notificationMessage)
                    .type(NotificationType.CONFLICT)
                    .isRead(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);

            // Send email notification
            emailService.sendConflictAlertEmail(
                    admin.getEmail(),
                    newEvent.getTitle(),
                    conflictEventTitles
            );
        }
    }
}
