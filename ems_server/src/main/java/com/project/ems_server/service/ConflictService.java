package com.project.ems_server.service;

import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.entity.Event;
import com.project.ems_server.entity.EventConflict;
import com.project.ems_server.entity.Notification;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.exception.VenueAlreadyBookedException;
import com.project.ems_server.repository.EventConflictRepository;
import com.project.ems_server.repository.EventRepository;
import com.project.ems_server.repository.NotificationRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ConflictService {

    private static final List<EventStatus> ACTIVE_STATUSES = List.of(EventStatus.PENDING, EventStatus.APPROVED);

    private final EventRepository eventRepository;
    private final EventConflictRepository eventConflictRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /**
     * Detects conflicts between a new event and active events.
     * Conflicts exist when two events overlap in time or use the same venue on the same date.
     */
    public List<Event> detectConflict(EventRequest newEvent) {
        List<Event> conflictingEvents = findConflicts(
                newEvent.getVenue(),
                newEvent.getStartTime(),
                newEvent.getEndTime(),
                null
        );

        if (!conflictingEvents.isEmpty()) {
            notifyAdminsOfConflicts(newEvent, conflictingEvents);
        }

        return conflictingEvents;
    }

    public List<Event> detectConflict(EventRequest eventRequest, Long excludeEventId) {
        return findConflicts(
                eventRequest.getVenue(),
                eventRequest.getStartTime(),
                eventRequest.getEndTime(),
                excludeEventId
        );
    }

    /**
     * Strict conflict check kept for compatibility with existing callers.
     */
    public void checkStrictConflict(EventRequest newEvent) throws VenueAlreadyBookedException {
        List<Event> conflicts = detectConflict(newEvent);
        if (!conflicts.isEmpty()) {
            String conflictTitles = conflicts.stream()
                    .map(Event::getTitle)
                    .collect(Collectors.joining(", "));
            throw new VenueAlreadyBookedException(
                    "Venue or time is already in conflict. Conflicting events: " + conflictTitles
            );
        }
    }

    public List<Event> refreshConflictRecords(Event event, boolean notifyAdmins) {
        eventConflictRepository.deleteByEventIdOrConflictWith(event.getId(), event.getId());

        if (!ACTIVE_STATUSES.contains(event.getStatus())) {
            return List.of();
        }

        List<Event> conflictingEvents = findConflicts(
                event.getVenue(),
                event.getStartTime(),
                event.getEndTime(),
                event.getId()
        );

        saveConflictRecords(event.getId(), conflictingEvents.stream().map(Event::getId).toList());

        if (notifyAdmins && !conflictingEvents.isEmpty()) {
            notifyAdminsOfConflicts(event, conflictingEvents);
        }

        return conflictingEvents;
    }

    public void ensureNoUnresolvedConflicts(Event event) {
        refreshConflictRecords(event, false);
        if (eventConflictRepository.existsByEventIdOrConflictWith(event.getId(), event.getId())) {
            throw new RuntimeException("This event still has conflicts. Reassign the date or venue before approval.");
        }
    }

    public boolean eventsConflict(Event firstEvent, Event secondEvent) {
        if (firstEvent == null || secondEvent == null) {
            return false;
        }

        if (!ACTIVE_STATUSES.contains(firstEvent.getStatus()) || !ACTIVE_STATUSES.contains(secondEvent.getStatus())) {
            return false;
        }

        boolean overlappingTime = firstEvent.getStartTime().isBefore(secondEvent.getEndTime())
                && firstEvent.getEndTime().isAfter(secondEvent.getStartTime());

        boolean sameVenueOnSharedDate = firstEvent.getVenue() != null
                && secondEvent.getVenue() != null
                && firstEvent.getVenue().equalsIgnoreCase(secondEvent.getVenue())
                && shareAnyCalendarDate(firstEvent, secondEvent);

        return overlappingTime || sameVenueOnSharedDate;
    }

    public void saveConflictRecords(Long newEventId, List<Long> conflictingEventIds) {
        for (Long conflictingEventId : conflictingEventIds) {
            boolean alreadyExists = eventConflictRepository.existsByEventIdAndConflictWith(newEventId, conflictingEventId)
                    || eventConflictRepository.existsByEventIdAndConflictWith(conflictingEventId, newEventId);
            if (alreadyExists) {
                continue;
            }

            EventConflict conflict = EventConflict.builder()
                    .eventId(newEventId)
                    .conflictWith(conflictingEventId)
                    .createdAt(LocalDateTime.now())
                    .build();
            eventConflictRepository.save(conflict);
        }
    }

    private List<Event> findConflicts(String venue, LocalDateTime startTime, LocalDateTime endTime, Long excludeId) {
        LocalDate eventDate = startTime.toLocalDate();
        LocalDateTime dayStart = eventDate.atStartOfDay();
        LocalDateTime dayEnd = eventDate.plusDays(1).atStartOfDay();

        List<Event> timeConflicts = eventRepository.findActiveEventsWithTimeOverlap(
                startTime,
                endTime,
                ACTIVE_STATUSES,
                excludeId
        );

        List<Event> venueConflicts = eventRepository.findActiveEventsAtVenueOnDate(
                venue,
                dayStart,
                dayEnd,
                ACTIVE_STATUSES,
                excludeId
        );

        Map<Long, Event> uniqueConflicts = Stream.concat(timeConflicts.stream(), venueConflicts.stream())
                .collect(Collectors.toMap(Event::getId, event -> event, (first, second) -> first, LinkedHashMap::new));

        return List.copyOf(uniqueConflicts.values());
    }

    private boolean shareAnyCalendarDate(Event firstEvent, Event secondEvent) {
        LocalDate firstStartDate = firstEvent.getStartTime().toLocalDate();
        LocalDate firstEndDate = firstEvent.getEndTime().toLocalDate();
        LocalDate secondStartDate = secondEvent.getStartTime().toLocalDate();
        LocalDate secondEndDate = secondEvent.getEndTime().toLocalDate();

        return !firstEndDate.isBefore(secondStartDate) && !secondEndDate.isBefore(firstStartDate);
    }

    private void notifyAdminsOfConflicts(EventRequest newEvent, List<Event> conflictingEvents) {
        notifyAdminsOfConflicts(
                newEvent.getTitle(),
                newEvent.getVenue(),
                newEvent.getStartTime(),
                newEvent.getEndTime(),
                conflictingEvents
        );
    }

    private void notifyAdminsOfConflicts(Event event, List<Event> conflictingEvents) {
        notifyAdminsOfConflicts(
                event.getTitle(),
                event.getVenue(),
                event.getStartTime(),
                event.getEndTime(),
                conflictingEvents
        );
    }

    private void notifyAdminsOfConflicts(
            String title,
            String venue,
            LocalDateTime startTime,
            LocalDateTime endTime,
            List<Event> conflictingEvents
    ) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);

        if (admins.isEmpty()) {
            System.out.println("No admins found to notify about conflicts");
            return;
        }

        String conflictEventTitles = conflictingEvents.stream()
                .map(Event::getTitle)
                .collect(Collectors.joining(", "));

        String notificationMessage = String.format(
                "Event conflict detected.%n%nEvent: %s%nVenue: %s%nTime: %s to %s%n%nConflicts with:%n%s",
                title,
                venue,
                startTime,
                endTime,
                conflictEventTitles
        );

        for (User admin : admins) {
            Notification notification = Notification.builder()
                    .userId(admin.getId())
                    .title("Conflict Alert")
                    .message(notificationMessage)
                    .type(NotificationType.CONFLICT)
                    .isRead(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);

            emailService.sendConflictAlertEmail(
                    admin.getEmail(),
                    title,
                    conflictEventTitles
            );
        }
    }
}
