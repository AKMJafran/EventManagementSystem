package com.project.ems_server.service;

import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.dto.response.ConflictDetailResponse;
import com.project.ems_server.dto.response.EventConflictAnalysisResponse;
import com.project.ems_server.entity.Event;
import com.project.ems_server.entity.EventConflict;
import com.project.ems_server.entity.Notification;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.ConflictSeverity;
import com.project.ems_server.enums.ConflictType;
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

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ConflictService {

    private static final List<EventStatus> ACTIVE_STATUSES = List.of(EventStatus.PENDING, EventStatus.APPROVED);
    private static final long VENUE_TURNAROUND_MINUTES = 30;

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
        List<Event> conflictingEvents = analyzeRequest(newEvent, null, null, EventStatus.PENDING).getConflicts().stream()
                .map(conflict -> eventRepository.findById(conflict.getConflictingEventId()).orElse(null))
                .filter(Objects::nonNull)
                .toList();

        if (!conflictingEvents.isEmpty()) {
            notifyAdminsOfConflicts(newEvent, conflictingEvents);
        }

        return conflictingEvents;
    }

    public List<Event> detectConflict(EventRequest eventRequest, Long excludeEventId) {
        return analyzeRequest(eventRequest, excludeEventId, null, EventStatus.PENDING).getConflicts().stream()
                .map(conflict -> eventRepository.findById(conflict.getConflictingEventId()).orElse(null))
                .filter(Objects::nonNull)
                .toList();
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

        EventConflictAnalysisResponse analysis = analyzeEvent(event);
        List<Event> conflictingEvents = analysis.getConflicts().stream()
                .map(detail -> eventRepository.findById(detail.getConflictingEventId()).orElse(null))
                .filter(Objects::nonNull)
                .toList();

        saveConflictRecords(event.getId(), conflictingEvents.stream().map(Event::getId).toList());

        if (notifyAdmins && !conflictingEvents.isEmpty()) {
            notifyAdminsOfConflicts(event, conflictingEvents);
        }

        return conflictingEvents;
    }

    public void ensureNoUnresolvedConflicts(Event event) {
        EventConflictAnalysisResponse analysis = analyzeEvent(event);
        refreshConflictRecords(event, false);
        if (ConflictSeverity.HARD_CONFLICT.name().equals(analysis.getConflictStatus())) {
            throw new RuntimeException("This event has a hard conflict. Reassign the date, time, or venue before approval.");
        }
    }

    public boolean eventsConflict(Event firstEvent, Event secondEvent) {
        if (firstEvent == null || secondEvent == null) {
            return false;
        }

        if (!ACTIVE_STATUSES.contains(firstEvent.getStatus()) || !ACTIVE_STATUSES.contains(secondEvent.getStatus())) {
            return false;
        }

        return buildConflictDetail(firstEvent, secondEvent) != null;
    }

    public EventConflictAnalysisResponse analyzeEvent(Event event) {
        if (event == null) {
            return buildAnalysis(null, null, null, null, null, null, List.of());
        }
        if (!ACTIVE_STATUSES.contains(event.getStatus())) {
            return buildAnalysis(event.getId(), event.getTitle(), event.getStatus(), event.getVenue(), event.getStartTime(), event.getEndTime(), List.of());
        }

        List<ConflictDetailResponse> conflicts = buildConflictDetails(
                event.getVenue(),
                event.getStartTime(),
                event.getEndTime(),
                event.getId(),
                event.getUserId(),
                event.getStatus(),
                event.getTitle()
        );
        return buildAnalysis(event.getId(), event.getTitle(), event.getStatus(), event.getVenue(), event.getStartTime(), event.getEndTime(), conflicts);
    }

    public EventConflictAnalysisResponse analyzeRequest(
            EventRequest eventRequest,
            Long excludeEventId,
            Long userId,
            EventStatus currentStatus
    ) {
        if (currentStatus != null && !ACTIVE_STATUSES.contains(currentStatus)) {
            return buildAnalysis(
                    excludeEventId,
                    eventRequest.getTitle(),
                    currentStatus,
                    eventRequest.getVenue(),
                    eventRequest.getStartTime(),
                    eventRequest.getEndTime(),
                    List.of()
            );
        }

        List<ConflictDetailResponse> conflicts = buildConflictDetails(
                eventRequest.getVenue(),
                eventRequest.getStartTime(),
                eventRequest.getEndTime(),
                excludeEventId,
                userId,
                currentStatus,
                eventRequest.getTitle()
        );
        return buildAnalysis(
                excludeEventId,
                eventRequest.getTitle(),
                currentStatus,
                eventRequest.getVenue(),
                eventRequest.getStartTime(),
                eventRequest.getEndTime(),
                conflicts
        );
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

    private List<ConflictDetailResponse> buildConflictDetails(
            String venue,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludeId,
            Long userId,
            EventStatus currentStatus,
            String title
    ) {
        return findConflicts(venue, startTime, endTime, excludeId).stream()
                .map(conflictingEvent -> buildConflictDetail(
                        Event.builder()
                                .id(excludeId)
                                .title(title)
                                .venue(venue)
                                .startTime(startTime)
                                .endTime(endTime)
                                .userId(userId)
                                .status(currentStatus)
                                .build(),
                        conflictingEvent
                ))
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparing((ConflictDetailResponse detail) -> severityWeight(detail.getSeverity())).reversed()
                        .thenComparing(ConflictDetailResponse::getConflictingStartTime))
                .toList();
    }

    private ConflictDetailResponse buildConflictDetail(Event source, Event conflictingEvent) {
        boolean sameVenue = hasSameVenue(source, conflictingEvent);
        boolean timeOverlap = overlaps(source.getStartTime(), source.getEndTime(), conflictingEvent.getStartTime(), conflictingEvent.getEndTime());
        boolean sameOrganizer = source.getUserId() != null
                && source.getUserId().equals(conflictingEvent.getUserId())
                && timeOverlap;
        boolean sameTitle = source.getTitle() != null
                && conflictingEvent.getTitle() != null
                && source.getTitle().trim().equalsIgnoreCase(conflictingEvent.getTitle().trim());

        Long overlapMinutes = timeOverlap
                ? Duration.between(
                max(source.getStartTime(), conflictingEvent.getStartTime()),
                min(source.getEndTime(), conflictingEvent.getEndTime())
        ).toMinutes()
                : null;

        Long turnaroundMinutes = null;
        if (sameVenue && !timeOverlap && shareAnyCalendarDate(source, conflictingEvent)) {
            turnaroundMinutes = calculateTurnaroundMinutes(source, conflictingEvent);
        }

        List<String> reasons = new ArrayList<>();
        ConflictType primaryType = null;
        ConflictSeverity severity = ConflictSeverity.NO_CONFLICT;

        if (sameVenue && timeOverlap) {
            reasons.add("Same venue is already booked for an overlapping time window.");
            primaryType = ConflictType.VENUE_TIME_COLLISION;
            severity = conflictingEvent.getStatus() == EventStatus.APPROVED
                    ? ConflictSeverity.HARD_CONFLICT
                    : ConflictSeverity.POTENTIAL_CONFLICT;
        }

        if (sameOrganizer) {
            reasons.add("The same student/organizer has another event during this time.");
            primaryType = primaryType != null ? primaryType : ConflictType.ORGANIZER_TIME_COLLISION;
            severity = ConflictSeverity.HARD_CONFLICT;
        }

        if (sameVenue && turnaroundMinutes != null && turnaroundMinutes < VENUE_TURNAROUND_MINUTES) {
            reasons.add("The same venue has less than 30 minutes of turnaround time between events.");
            primaryType = primaryType != null ? primaryType : ConflictType.VENUE_TURNAROUND_RISK;
            if (severity == ConflictSeverity.NO_CONFLICT) {
                severity = ConflictSeverity.POTENTIAL_CONFLICT;
            }
        }

        if (!timeOverlap && sameTitle && source.getUserId() != null && source.getUserId().equals(conflictingEvent.getUserId())) {
            reasons.add("This looks like a duplicate request by the same organizer.");
            primaryType = primaryType != null ? primaryType : ConflictType.DUPLICATE_REQUEST;
            if (severity == ConflictSeverity.NO_CONFLICT) {
                severity = ConflictSeverity.POTENTIAL_CONFLICT;
            }
        }

        if (reasons.isEmpty() || severity == ConflictSeverity.NO_CONFLICT) {
            return null;
        }

        String summary = buildConflictSummary(conflictingEvent, sameVenue, sameOrganizer, overlapMinutes, turnaroundMinutes, severity);

        return ConflictDetailResponse.builder()
                .conflictingEventId(conflictingEvent.getId())
                .conflictingEventTitle(conflictingEvent.getTitle())
                .conflictingEventStatus(conflictingEvent.getStatus() != null ? conflictingEvent.getStatus().name() : null)
                .conflictingVenue(conflictingEvent.getVenue())
                .conflictType(primaryType != null ? primaryType.name() : null)
                .severity(severity.name())
                .summary(summary)
                .sameVenue(sameVenue)
                .sameOrganizer(sameOrganizer)
                .approvedEventTakesPriority(conflictingEvent.getStatus() == EventStatus.APPROVED)
                .overlapMinutes(overlapMinutes)
                .turnaroundMinutes(turnaroundMinutes)
                .reasons(reasons)
                .conflictingStartTime(conflictingEvent.getStartTime())
                .conflictingEndTime(conflictingEvent.getEndTime())
                .build();
    }

    private EventConflictAnalysisResponse buildAnalysis(
            Long eventId,
            String title,
            EventStatus currentStatus,
            String venue,
            LocalDateTime startTime,
            LocalDateTime endTime,
            List<ConflictDetailResponse> conflicts
    ) {
        int hardConflictCount = (int) conflicts.stream()
                .filter(conflict -> ConflictSeverity.HARD_CONFLICT.name().equals(conflict.getSeverity()))
                .count();
        int softConflictCount = (int) conflicts.stream()
                .filter(conflict -> ConflictSeverity.POTENTIAL_CONFLICT.name().equals(conflict.getSeverity()))
                .count();

        ConflictSeverity overall = hardConflictCount > 0
                ? ConflictSeverity.HARD_CONFLICT
                : softConflictCount > 0
                ? ConflictSeverity.POTENTIAL_CONFLICT
                : ConflictSeverity.NO_CONFLICT;

        return EventConflictAnalysisResponse.builder()
                .eventId(eventId)
                .eventTitle(title)
                .eventStatus(currentStatus != null ? currentStatus.name() : null)
                .venue(venue)
                .conflictStatus(overall.name())
                .canApprove(overall != ConflictSeverity.HARD_CONFLICT)
                .actionRequired(overall != ConflictSeverity.NO_CONFLICT)
                .hardConflictCount(hardConflictCount)
                .softConflictCount(softConflictCount)
                .recommendation(buildRecommendation(overall))
                .conflicts(conflicts)
                .startTime(startTime)
                .endTime(endTime)
                .build();
    }

    private boolean shareAnyCalendarDate(Event firstEvent, Event secondEvent) {
        LocalDate firstStartDate = firstEvent.getStartTime().toLocalDate();
        LocalDate firstEndDate = firstEvent.getEndTime().toLocalDate();
        LocalDate secondStartDate = secondEvent.getStartTime().toLocalDate();
        LocalDate secondEndDate = secondEvent.getEndTime().toLocalDate();

        return !firstEndDate.isBefore(secondStartDate) && !secondEndDate.isBefore(firstStartDate);
    }

    private boolean overlaps(
            LocalDateTime firstStart,
            LocalDateTime firstEnd,
            LocalDateTime secondStart,
            LocalDateTime secondEnd
    ) {
        return firstStart.isBefore(secondEnd) && firstEnd.isAfter(secondStart);
    }

    private boolean hasSameVenue(Event firstEvent, Event secondEvent) {
        return firstEvent.getVenue() != null
                && secondEvent.getVenue() != null
                && firstEvent.getVenue().trim().equalsIgnoreCase(secondEvent.getVenue().trim());
    }

    private Long calculateTurnaroundMinutes(Event source, Event conflictingEvent) {
        if (source.getEndTime().isBefore(conflictingEvent.getStartTime())) {
            return Duration.between(source.getEndTime(), conflictingEvent.getStartTime()).toMinutes();
        }
        if (conflictingEvent.getEndTime().isBefore(source.getStartTime())) {
            return Duration.between(conflictingEvent.getEndTime(), source.getStartTime()).toMinutes();
        }
        return 0L;
    }

    private LocalDateTime max(LocalDateTime first, LocalDateTime second) {
        return first.isAfter(second) ? first : second;
    }

    private LocalDateTime min(LocalDateTime first, LocalDateTime second) {
        return first.isBefore(second) ? first : second;
    }

    private int severityWeight(String severity) {
        if (ConflictSeverity.HARD_CONFLICT.name().equals(severity)) {
            return 2;
        }
        if (ConflictSeverity.POTENTIAL_CONFLICT.name().equals(severity)) {
            return 1;
        }
        return 0;
    }

    private String buildRecommendation(ConflictSeverity overall) {
        return switch (overall) {
            case HARD_CONFLICT -> "Approval should be blocked until the event is rescheduled or rejected.";
            case POTENTIAL_CONFLICT -> "Admin can approve with caution, or propose an alternative slot to reduce operational risk.";
            case NO_CONFLICT -> "No blocking conflicts detected. Event is ready for approval.";
        };
    }

    private String buildConflictSummary(
            Event conflictingEvent,
            boolean sameVenue,
            boolean sameOrganizer,
            Long overlapMinutes,
            Long turnaroundMinutes,
            ConflictSeverity severity
    ) {
        if (sameVenue && overlapMinutes != null && overlapMinutes > 0) {
            return String.format(
                    "%s conflicts with venue booking '%s' for %d minutes.",
                    severity == ConflictSeverity.HARD_CONFLICT ? "Hard conflict" : "Potential conflict",
                    conflictingEvent.getTitle(),
                    overlapMinutes
            );
        }
        if (sameOrganizer) {
            return String.format("Organizer overlap with '%s' during the same time window.", conflictingEvent.getTitle());
        }
        if (turnaroundMinutes != null) {
            return String.format(
                    "Only %d minutes separate this venue booking from '%s'.",
                    turnaroundMinutes,
                    conflictingEvent.getTitle()
            );
        }
        return String.format("Potential scheduling conflict with '%s'.", conflictingEvent.getTitle());
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
