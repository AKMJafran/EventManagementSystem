package com.project.ems_server.service;

import com.project.ems_server.dto.request.ConflictResolutionRequest;
import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.dto.response.AnalyticsReportResponse;
import com.project.ems_server.dto.response.BreakdownItemResponse;
import com.project.ems_server.dto.response.CalendarAlertResponse;
import com.project.ems_server.dto.response.CategoryCountResponse;
import com.project.ems_server.dto.response.EventConflictAnalysisResponse;
import com.project.ems_server.dto.response.EventResponse;
import com.project.ems_server.dto.response.EventTypeCountResponse;
import com.project.ems_server.dto.response.MonthlyReportResponse;
import com.project.ems_server.dto.response.OrganizerActivityResponse;
import com.project.ems_server.dto.response.ReminderResponse;
import com.project.ems_server.dto.response.ReportEventDetailResponse;
import com.project.ems_server.dto.response.StudentCalendarFeedResponse;
import com.project.ems_server.dto.response.TrendPointResponse;
import com.project.ems_server.entity.*;
import com.project.ems_server.enums.ConflictSeverity;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.EventType;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.factory.EventAbstractFactory;
import com.project.ems_server.factory.EventFactoryInterface;
import com.project.ems_server.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventAttendeeRepository eventAttendeeRepository;
    private final EventConflictRepository eventConflictRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ConflictService conflictService;
    private final ApprovalService approvalService;
    private final EventAbstractFactory eventAbstractFactory;
    private final FileServerService fileServerService;
    private final NotificationService notificationService;
    private final ClubService clubService;

    /**
     * Creates a new event with PENDING status and records conflicts for admin review.
     */
    @Transactional
    public EventResponse createEvent(EventRequest eventRequest, Long userId, Role requesterRole) {
        if (requesterRole == Role.ADMIN) {
            return createAdminEvent(eventRequest, userId);
        }

        if (requesterRole != Role.STUDENT) {
            throw new RuntimeException("You are not allowed to create events");
        }

        validateEventWindow(eventRequest.getStartTime(), eventRequest.getEndTime());

        Category selectedCategory = categoryRepository.findById(eventRequest.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + eventRequest.getCategoryId()));
        EventType derivedEventType = deriveEventTypeFromCategory(selectedCategory);

        // Use Abstract Factory pattern to create event based on derived event type
        EventFactoryInterface factory = eventAbstractFactory.getFactory(derivedEventType);
        Event event = factory.createEvent(
                eventRequest.getTitle(),
                eventRequest.getDescription(),
                userId,
                eventRequest.getCategoryId(),
                eventRequest.getVenue(),
                eventRequest.getImageId(),
                eventRequest.getStartTime(),
                eventRequest.getEndTime(),
                derivedEventType
        );
        applyEventImage(event, eventRequest, false);

        Event savedEvent = eventRepository.save(event);
        conflictService.refreshConflictRecords(savedEvent, true);
        notifyAdminsOfNewEventRequest(savedEvent);
        return mapToResponse(savedEvent);
    }

    private EventResponse createAdminEvent(EventRequest eventRequest, Long userId) {
        validateEventWindow(eventRequest.getStartTime(), eventRequest.getEndTime());

        Category selectedCategory = categoryRepository.findById(eventRequest.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + eventRequest.getCategoryId()));
        EventType derivedEventType = deriveEventTypeFromCategory(selectedCategory);

        EventFactoryInterface factory = eventAbstractFactory.getFactory(derivedEventType);
        Event event = factory.createEvent(
                eventRequest.getTitle(),
                eventRequest.getDescription(),
                userId,
                eventRequest.getCategoryId(),
                eventRequest.getVenue(),
                eventRequest.getImageId(),
                eventRequest.getStartTime(),
                eventRequest.getEndTime(),
                derivedEventType
        );
        applyEventImage(event, eventRequest, false);

        Event savedEvent = eventRepository.save(event);
        conflictService.ensureNoUnresolvedConflicts(savedEvent);
        approvalService.approveEvent(savedEvent);
        return mapToResponse(savedEvent);
    }

    /**
     * Notifies all admin users when a new event request is created.
     */
    private void notifyAdminsOfNewEventRequest(Event event) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        if (admins.isEmpty()) {
            return;
        }

        String message = String.format(
                "📢 New event request from %s: '%s' at %s (%s to %s). Review required.",
                userRepository.findById(event.getUserId()).map(User::getName).orElse("A student"),
                event.getTitle(),
                event.getVenue(),
                event.getStartTime(),
                event.getEndTime()
        );

        for (User admin : admins) {
            notificationService.createNotification(admin.getId(), "New Event Request", message, NotificationType.GENERAL);
        }
    }

    /**
     * Updates an existing pending event belonging to the requesting student.
     */
    @Transactional
    public EventResponse updateEvent(Long eventId, EventRequest eventRequest, Long userId, Role requesterRole) {
        validateEventWindow(eventRequest.getStartTime(), eventRequest.getEndTime());

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        if (requesterRole == Role.STUDENT) {
            if (!event.getUserId().equals(userId)) {
                throw new RuntimeException("You are not allowed to edit this event");
            }

            if (event.getStatus() != EventStatus.PENDING) {
                throw new RuntimeException("Only pending events can be edited");
            }
        } else if (requesterRole == Role.ADMIN) {
            if (event.getStatus() != EventStatus.PENDING && event.getStatus() != EventStatus.APPROVED) {
                throw new RuntimeException("Only pending or approved events can be edited by admins");
            }
        } else {
            throw new RuntimeException("You are not allowed to edit this event");
        }

        Category selectedCategory = categoryRepository.findById(eventRequest.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + eventRequest.getCategoryId()));
        EventType derivedEventType = deriveEventTypeFromCategory(selectedCategory);

        event.setTitle(eventRequest.getTitle());
        event.setDescription(eventRequest.getDescription());
        event.setCategoryId(eventRequest.getCategoryId());
        event.setVenue(eventRequest.getVenue());
        event.setStartTime(eventRequest.getStartTime());
        event.setEndTime(eventRequest.getEndTime());
        event.setEventType(derivedEventType);
        applyEventImage(event, eventRequest, true);
        event.setRejectReason(null);

        if (requesterRole == Role.STUDENT) {
            event.setStatus(EventStatus.PENDING);
        } else if (requesterRole == Role.ADMIN && event.getStatus() == EventStatus.APPROVED) {
            conflictService.ensureNoUnresolvedConflicts(event);
        }

        Event updatedEvent = eventRepository.save(event);
        conflictService.refreshConflictRecords(updatedEvent, requesterRole == Role.STUDENT);
        return mapToResponse(updatedEvent);
    }

    /**
     * Gets events filtered by status, category, and optional date range.
     */
    public List<EventResponse> getEvents(EventStatus status, Long categoryId, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new RuntimeException("Invalid date range: endDate must be on or after startDate");
        }

        List<Event> events;

        if (startDate != null || endDate != null) {
            LocalDate effectiveStart = startDate != null ? startDate : LocalDate.of(1970, 1, 1);
            LocalDate effectiveEnd = endDate != null ? endDate : LocalDate.of(9999, 12, 31);

            LocalDateTime startDateTime = effectiveStart.atStartOfDay();
            LocalDateTime endDateTime = effectiveEnd.atTime(23, 59, 59);

            events = eventRepository.findByStartTimeBetween(startDateTime, endDateTime);

            if (status != null) {
                events = events.stream()
                        .filter(event -> event.getStatus() == status)
                        .collect(Collectors.toList());
            }

            if (categoryId != null) {
                events = events.stream()
                        .filter(event -> categoryId.equals(event.getCategoryId()))
                        .collect(Collectors.toList());
            }
        } else if (status != null && categoryId != null) {
            events = eventRepository.findByStatusAndCategoryId(status, categoryId);
        } else if (status != null) {
            events = eventRepository.findByStatus(status);
        } else if (categoryId != null) {
            events = eventRepository.findByCategoryId(categoryId);
        } else {
            events = eventRepository.findAll();
        }

        return events.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Demonstrates Streams API: Filters approved events by venue.
     * Shows functional programming and lambda usage in advanced Java.
     */
    public List<EventResponse> getApprovedEventsByVenue(String venue) {
        return eventRepository.findAll().stream()
                .filter(event -> event.getStatus() == EventStatus.APPROVED) // Lambda filter
                .filter(event -> venue.equalsIgnoreCase(event.getVenue())) // Another filter
                .map(this::mapToResponse) // Method reference
                .collect(Collectors.toList());
    }

    /**
     * Gets calendar events within the requested date range.
     */
    public List<EventResponse> getCalendarEvents(LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.plusDays(1).atStartOfDay();
        return eventRepository.findByStatusInAndTimeRangeOverlap(List.of(EventStatus.APPROVED, EventStatus.PENDING), startDateTime, endDateTime).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Builds a monthly report summary for the requested year and month.
     */
    public MonthlyReportResponse getMonthlyReport(int year, int month) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Month must be between 1 and 12");
        }

        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.with(TemporalAdjusters.lastDayOfMonth());
        AnalyticsReportResponse analytics = getAnalyticsReport(from, to, null, null, null, null, null);

        List<EventTypeCountResponse> eventsByType = analytics.getEventsByType().stream()
            .map(item -> EventTypeCountResponse.builder()
                .eventType(item.getLabel())
                .count(item.getCount())
                .build())
            .collect(Collectors.toList());

        List<CategoryCountResponse> eventsByCategory = analytics.getEventsByCategory().stream()
            .map(item -> CategoryCountResponse.builder()
                .categoryName(item.getLabel())
                .count(item.getCount())
                .build())
            .collect(Collectors.toList());

        return MonthlyReportResponse.builder()
                .year(year)
                .month(month)
            .totalEvents(analytics.getTotalEvents())
            .approvedEvents(analytics.getApprovedEvents())
            .pendingEvents(analytics.getPendingEvents())
            .rejectedEvents(analytics.getRejectedEvents())
            .cancelledEvents(analytics.getCancelledEvents())
            .urgentEvents(analytics.getUrgentEvents())
            .completedEvents(analytics.getCompletedEvents())
            .upcomingEvents(analytics.getUpcomingEvents())
            .conflictEvents(analytics.getConflictEvents())
            .totalRegistrations(analytics.getTotalRegistrations())
            .averageRegistrationsPerEvent(analytics.getAverageRegistrationsPerEvent())
            .approvalRate(analytics.getApprovalRate())
            .conflictRate(analytics.getConflictRate())
                .eventsByType(eventsByType)
                .eventsByCategory(eventsByCategory)
            .eventsByStatus(analytics.getEventsByStatus())
            .eventsByVenue(analytics.getEventsByVenue())
            .topOrganizers(analytics.getTopOrganizers())
            .events(analytics.getEvents())
                .build();
    }

        /**
         * Builds an analytics report with optional filters over a date range.
         */
        public AnalyticsReportResponse getAnalyticsReport(
            LocalDate from,
            LocalDate to,
            String status,
            String eventType,
            Long categoryId,
            String venue,
            String organizerName
        ) {
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("End date must not be before start date");
        }

        LocalDateTime startDateTime = from.atStartOfDay();
        LocalDateTime endDateTime = to.atTime(23, 59, 59);

        List<Event> eventsInRange = eventRepository.findByStartTimeBetween(startDateTime, endDateTime);

        Map<Long, Category> categoryMap = categoryRepository.findAll().stream()
            .collect(Collectors.toMap(Category::getId, Function.identity(), (a, b) -> a));
        Map<Long, User> userMap = userRepository.findAll().stream()
            .collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a));

        EventStatus statusFilter = parseStatusFilter(status);
        EventType eventTypeFilter = parseTypeFilter(eventType);

        List<Event> filteredEvents = eventsInRange.stream()
            .filter(event -> statusFilter == null || event.getStatus() == statusFilter)
            .filter(event -> eventTypeFilter == null || event.getEventType() == eventTypeFilter)
            .filter(event -> categoryId == null || categoryId.equals(event.getCategoryId()))
            .filter(event -> venue == null || venue.isBlank() || event.getVenue().equalsIgnoreCase(venue.trim()))
            .filter(event -> {
                if (organizerName == null || organizerName.isBlank()) {
                return true;
                }
                User organizer = userMap.get(event.getUserId());
                if (organizer == null || organizer.getName() == null) {
                return false;
                }
                return organizer.getName().toLowerCase(Locale.ROOT)
                    .contains(organizerName.trim().toLowerCase(Locale.ROOT));
            })
            .collect(Collectors.toList());

        Map<Long, Long> registrationsByEventId = buildRegistrationsMap(filteredEvents);
        Set<Long> conflictEventIds = buildConflictEventIds();
        LocalDateTime now = LocalDateTime.now();

        long totalEvents = filteredEvents.size();
        long approvedEvents = filteredEvents.stream().filter(event -> event.getStatus() == EventStatus.APPROVED).count();
        long pendingEvents = filteredEvents.stream().filter(event -> event.getStatus() == EventStatus.PENDING).count();
        long rejectedEvents = filteredEvents.stream().filter(event -> event.getStatus() == EventStatus.REJECTED).count();
        long cancelledEvents = filteredEvents.stream().filter(event -> event.getStatus() == EventStatus.CANCELLED).count();
        long urgentEvents = filteredEvents.stream().filter(event -> event.getEventType() == EventType.URGENT).count();
        long completedEvents = filteredEvents.stream()
            .filter(event -> event.getStatus() == EventStatus.APPROVED && event.getEndTime().isBefore(now))
            .count();
        long upcomingEvents = filteredEvents.stream()
            .filter(event -> event.getStatus() == EventStatus.APPROVED && event.getStartTime().isAfter(now))
            .count();
        long conflictEvents = filteredEvents.stream().filter(event -> conflictEventIds.contains(event.getId())).count();

        long totalRegistrations = filteredEvents.stream()
            .mapToLong(event -> registrationsByEventId.getOrDefault(event.getId(), 0L))
            .sum();

        List<BreakdownItemResponse> eventsByStatus = filteredEvents.stream()
            .collect(Collectors.groupingBy(event -> event.getStatus().name(), Collectors.counting()))
            .entrySet().stream()
            .map(entry -> BreakdownItemResponse.builder()
                .label(entry.getKey())
                .count(entry.getValue())
                .build())
            .sorted(Comparator.comparingLong(BreakdownItemResponse::getCount).reversed())
            .collect(Collectors.toList());

        List<BreakdownItemResponse> eventsByType = filteredEvents.stream()
            .collect(Collectors.groupingBy(event -> event.getEventType() != null ? event.getEventType().name() : "UNKNOWN", Collectors.counting()))
            .entrySet().stream()
            .map(entry -> BreakdownItemResponse.builder()
                .label(entry.getKey())
                .count(entry.getValue())
                .build())
            .sorted(Comparator.comparingLong(BreakdownItemResponse::getCount).reversed())
            .collect(Collectors.toList());

        List<BreakdownItemResponse> eventsByCategory = filteredEvents.stream()
            .collect(Collectors.groupingBy(event -> categoryMap.getOrDefault(event.getCategoryId(), new Category()).getName(), Collectors.counting()))
            .entrySet().stream()
            .map(entry -> BreakdownItemResponse.builder()
                .label(entry.getKey() != null ? entry.getKey() : "Unknown")
                .count(entry.getValue())
                .build())
            .sorted(Comparator.comparingLong(BreakdownItemResponse::getCount).reversed())
            .collect(Collectors.toList());

        List<BreakdownItemResponse> eventsByVenue = filteredEvents.stream()
            .collect(Collectors.groupingBy(Event::getVenue, Collectors.counting()))
            .entrySet().stream()
            .map(entry -> BreakdownItemResponse.builder()
                .label(entry.getKey() != null ? entry.getKey() : "Unknown")
                .count(entry.getValue())
                .build())
            .sorted(Comparator.comparingLong(BreakdownItemResponse::getCount).reversed())
            .limit(10)
            .collect(Collectors.toList());

        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        List<TrendPointResponse> dailyTrend = filteredEvents.stream()
            .collect(Collectors.groupingBy(event -> event.getStartTime().toLocalDate(), Collectors.counting()))
            .entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> TrendPointResponse.builder()
                .label(entry.getKey().format(dayFormatter))
                .count(entry.getValue())
                .build())
            .collect(Collectors.toList());

        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMM yyyy");
        List<TrendPointResponse> monthlyTrend = filteredEvents.stream()
            .collect(Collectors.groupingBy(event -> YearMonth.from(event.getStartTime()), Collectors.counting()))
            .entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> TrendPointResponse.builder()
                .label(entry.getKey().format(monthFormatter))
                .count(entry.getValue())
                .build())
            .collect(Collectors.toList());

        Map<Long, List<Event>> eventsByOrganizer = filteredEvents.stream()
            .collect(Collectors.groupingBy(Event::getUserId));
        List<OrganizerActivityResponse> topOrganizers = new ArrayList<>();
        for (Map.Entry<Long, List<Event>> entry : eventsByOrganizer.entrySet()) {
            Long organizerId = entry.getKey();
            List<Event> organizerEvents = entry.getValue();
            User organizer = userMap.get(organizerId);

            long organizerRegistrations = organizerEvents.stream()
                .mapToLong(event -> registrationsByEventId.getOrDefault(event.getId(), 0L))
                .sum();

            topOrganizers.add(OrganizerActivityResponse.builder()
                .organizerId(organizerId)
                .organizerName(organizer != null ? organizer.getName() : "Unknown")
                .totalEvents(organizerEvents.size())
                .approvedEvents(organizerEvents.stream().filter(event -> event.getStatus() == EventStatus.APPROVED).count())
                .pendingEvents(organizerEvents.stream().filter(event -> event.getStatus() == EventStatus.PENDING).count())
                .rejectedEvents(organizerEvents.stream().filter(event -> event.getStatus() == EventStatus.REJECTED).count())
                .cancelledEvents(organizerEvents.stream().filter(event -> event.getStatus() == EventStatus.CANCELLED).count())
                .totalRegistrations(organizerRegistrations)
                .build());
        }
        topOrganizers.sort(Comparator.comparingLong(OrganizerActivityResponse::getTotalEvents).reversed());
        if (topOrganizers.size() > 10) {
            topOrganizers = topOrganizers.subList(0, 10);
        }

        List<ReportEventDetailResponse> eventDetails = filteredEvents.stream()
            .sorted(Comparator.comparing(Event::getStartTime).reversed())
            .map(event -> {
                Category category = categoryMap.get(event.getCategoryId());
                User organizer = userMap.get(event.getUserId());
                return ReportEventDetailResponse.builder()
                    .id(event.getId())
                    .title(event.getTitle())
                    .organizerName(organizer != null ? organizer.getName() : "Unknown")
                    .categoryName(category != null ? category.getName() : "Unknown")
                    .venue(event.getVenue())
                    .status(event.getStatus().name())
                    .eventType(event.getEventType() != null ? event.getEventType().name() : "UNKNOWN")
                    .startTime(event.getStartTime())
                    .endTime(event.getEndTime())
                    .registrations(registrationsByEventId.getOrDefault(event.getId(), 0L))
                    .hasConflict(conflictEventIds.contains(event.getId()))
                    .build();
            })
            .collect(Collectors.toList());

        return AnalyticsReportResponse.builder()
            .periodStart(from)
            .periodEnd(to)
            .totalEvents(totalEvents)
            .approvedEvents(approvedEvents)
            .pendingEvents(pendingEvents)
            .rejectedEvents(rejectedEvents)
            .cancelledEvents(cancelledEvents)
            .urgentEvents(urgentEvents)
            .completedEvents(completedEvents)
            .upcomingEvents(upcomingEvents)
            .conflictEvents(conflictEvents)
            .totalRegistrations(totalRegistrations)
            .averageRegistrationsPerEvent(totalEvents == 0 ? 0.0 : (double) totalRegistrations / totalEvents)
            .approvalRate(toPercentage(approvedEvents, totalEvents))
            .conflictRate(toPercentage(conflictEvents, totalEvents))
            .eventsByStatus(eventsByStatus)
            .eventsByType(eventsByType)
            .eventsByCategory(eventsByCategory)
            .eventsByVenue(eventsByVenue)
            .dailyTrend(dailyTrend)
            .monthlyTrend(monthlyTrend)
            .topOrganizers(topOrganizers)
            .events(eventDetails)
            .build();
        }

        private EventStatus parseStatusFilter(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return EventStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        }

        private EventType parseTypeFilter(String eventType) {
        if (eventType == null || eventType.isBlank()) {
            return null;
        }
        return EventType.valueOf(eventType.trim().toUpperCase(Locale.ROOT));
        }

        private Set<Long> buildConflictEventIds() {
        Set<Long> ids = new HashSet<>();
        for (EventConflict conflict : eventConflictRepository.findAll()) {
            if (conflict.getEventId() != null) {
            ids.add(conflict.getEventId());
            }
            if (conflict.getConflictWith() != null) {
            ids.add(conflict.getConflictWith());
            }
        }
        return ids;
        }

        private Map<Long, Long> buildRegistrationsMap(List<Event> events) {
        if (events.isEmpty()) {
            return new HashMap<>();
        }

        Set<Long> eventIds = events.stream().map(Event::getId).collect(Collectors.toSet());
        return eventAttendeeRepository.findAll().stream()
            .filter(attendee -> eventIds.contains(attendee.getEventId()))
            .collect(Collectors.groupingBy(EventAttendee::getEventId, Collectors.counting()));
        }

        private double toPercentage(long part, long total) {
        if (total == 0) {
            return 0.0;
        }
        return Math.round((((double) part / total) * 100.0) * 100.0) / 100.0;
        }

    /**
     * Gets a single event by ID
     */
    public EventResponse getEventById(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        return mapToResponse(event);
    }

    public EventConflictAnalysisResponse getApprovalCheck(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        return conflictService.analyzeEvent(event);
    }

    /**
     * Approves an event and notifies observers.
     */
    public void approveEvent(Long eventId, Long adminId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        ensurePendingStatus(event, "approved");
        conflictService.ensureNoUnresolvedConflicts(event);
        approvalService.approveEvent(event);
    }

    /**
     * Rejects an event and notifies observers.
     */
    public void rejectEvent(Long eventId, String reason, Long adminId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        ensurePendingStatus(event, "rejected");

        String normalizedReason = normalizeDecisionReason(reason);

        approvalService.rejectEvent(event, normalizedReason);
        conflictService.refreshConflictRecords(event, false);
    }

    /**
     * Gets all conflicts
     */
    public List<EventConflictAnalysisResponse> getConflicts() {
        return eventRepository.findByStatus(EventStatus.PENDING).stream()
                .map(conflictService::analyzeEvent)
                .filter(analysis -> !ConflictSeverity.NO_CONFLICT.name().equals(analysis.getConflictStatus()))
                .collect(Collectors.toList());
    }

    private void ensurePendingStatus(Event event, String action) {
        if (event.getStatus() != EventStatus.PENDING) {
            throw new RuntimeException("Only pending events can be " + action);
        }
    }

    private String normalizeDecisionReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new RuntimeException("Reason is required");
        }

        return reason.trim();
    }

    public EventResponse resolveConflict(Long eventId, ConflictResolutionRequest request, Long adminId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        String newVenue = (request.getVenue() == null || request.getVenue().isBlank())
                ? event.getVenue()
                : request.getVenue().trim();

        if ((request.getStartTime() == null) != (request.getEndTime() == null)) {
            throw new RuntimeException("Both startTime and endTime are required when changing the date or time");
        }

        if ((request.getVenue() == null || request.getVenue().isBlank())
                && request.getStartTime() == null
                && request.getEndTime() == null) {
            throw new RuntimeException("Provide a new venue or a new date/time to resolve the conflict");
        }

        LocalDateTime newStartTime = request.getStartTime() != null ? request.getStartTime() : event.getStartTime();
        LocalDateTime newEndTime = request.getEndTime() != null ? request.getEndTime() : event.getEndTime();

        validateEventWindow(newStartTime, newEndTime);

        EventRequest probeRequest = EventRequest.builder()
                .title(event.getTitle())
                .description(event.getDescription())
                .categoryId(event.getCategoryId())
                .venue(newVenue)
                .startTime(newStartTime)
                .endTime(newEndTime)
                .imageId(event.getImageId())
                .build();

        EventConflictAnalysisResponse analysis = conflictService.analyzeRequest(
                probeRequest,
                event.getId(),
                event.getUserId(),
                event.getStatus()
        );

        if (ConflictSeverity.HARD_CONFLICT.name().equals(analysis.getConflictStatus())) {
            String conflictTitles = analysis.getConflicts().stream()
                    .map(conflict -> conflict.getConflictingEventTitle())
                    .collect(Collectors.joining(", "));
            throw new RuntimeException("Hard conflict still exists with: " + conflictTitles);
        }

        event.setVenue(newVenue);
        event.setStartTime(newStartTime);
        event.setEndTime(newEndTime);
        event.setStatus(EventStatus.PENDING);

        Event savedEvent = eventRepository.save(event);
        conflictService.refreshConflictRecords(savedEvent, false);
        notifyStudentOfAlternativeSchedule(savedEvent, request.getAdminMessage());
        return mapToResponse(savedEvent);
    }

    /**
     * Adds a user as an attendee to an event
     */
    public void attendEvent(Long eventId, Long userId) {
        // Verify event exists
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        // Verify user exists
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found with id: " + userId);
        }

        // Check if user is already attending
        if (eventAttendeeRepository.findByEventIdAndUserId(eventId, userId).isPresent()) {
            throw new RuntimeException("User is already attending this event");
        }

        // Check if event is approved
        if (event.getStatus() != EventStatus.APPROVED) {
            throw new RuntimeException("Cannot attend an event that is not approved");
        }

        // Add attendee
        EventAttendee attendee = EventAttendee.builder()
                .eventId(eventId)
                .userId(userId)
                .createdAt(LocalDateTime.now())
                .build();

        eventAttendeeRepository.save(attendee);
    }

    @Transactional
    public void cancelEvent(Long eventId, Long requesterId, Role requesterRole) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        boolean isAdmin = requesterRole == Role.ADMIN;
        if (!isAdmin && !event.getUserId().equals(requesterId)) {
            throw new RuntimeException("You are not allowed to cancel this event");
        }

        if (event.getStatus() != EventStatus.PENDING && event.getStatus() != EventStatus.APPROVED) {
            throw new RuntimeException("Only pending or approved events can be cancelled");
        }

        event.setStatus(EventStatus.CANCELLED);
        eventRepository.save(event);
        conflictService.refreshConflictRecords(event, false);
    }

    /**
 * Gets all events created by a specific user
 */
public List<EventResponse> getEventsByUserId(Long userId) {
    return eventRepository.findByUserId(userId)
            .stream()
            .map(event -> mapToResponse(event, userId, false, "MY_REQUEST"))
            .collect(Collectors.toList());
}

    public StudentCalendarFeedResponse getStudentCalendarFeed(Long userId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.plusDays(1).atStartOfDay();

        Map<Long, EventResponse> calendarEvents = new HashMap<>();

        eventRepository.findByStatusInAndTimeRangeOverlap(List.of(EventStatus.APPROVED), startDateTime, endDateTime)
                .forEach(event -> calendarEvents.put(event.getId(), mapToResponse(event, userId, isAttending(event.getId(), userId), "APPROVED_EVENT")));

        eventRepository.findByUserId(userId).stream()
                .filter(event -> event.getStartTime().isBefore(endDateTime) && event.getEndTime().isAfter(startDateTime))
                .forEach(event -> calendarEvents.put(event.getId(), mapToResponse(event, userId, isAttending(event.getId(), userId), "MY_REQUEST")));

        for (EventAttendee attendee : eventAttendeeRepository.findByUserId(userId)) {
            eventRepository.findById(attendee.getEventId())
                    .filter(event -> event.getStartTime().isBefore(endDateTime) && event.getEndTime().isAfter(startDateTime))
                    .ifPresent(event -> calendarEvents.put(event.getId(), mapToResponse(event, userId, true, "REGISTERED_EVENT")));
        }

        List<Event> involvementEvents = new ArrayList<>(eventRepository.findByUserId(userId));
        for (EventAttendee attendee : eventAttendeeRepository.findByUserId(userId)) {
            eventRepository.findById(attendee.getEventId()).ifPresent(involvementEvents::add);
        }

        return StudentCalendarFeedResponse.builder()
                .events(calendarEvents.values().stream()
                        .sorted(Comparator.comparing(EventResponse::getStartTime))
                        .toList())
                .reminders(buildReminders(involvementEvents))
                .overlapAlerts(buildOverlapAlerts(involvementEvents))
                .build();
    }

    private void validateEventWindow(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new RuntimeException("Start time and end time are required");
        }

        if (!endTime.isAfter(startTime)) {
            throw new RuntimeException("End time must be after start time");
        }
    }

    private EventType deriveEventTypeFromCategory(Category category) {
        Category parentCategory = category.getParentId() == null
                ? category
                : categoryRepository.findById(category.getParentId())
                        .orElseThrow(() -> new RuntimeException("Parent category not found for category id: " + category.getId()));

        String categoryName = parentCategory.getName() != null ? parentCategory.getName().trim().toUpperCase(Locale.ROOT) : "";

        return switch (categoryName) {
            case "CULTURAL" -> EventType.CULTURAL;
            case "TECHNICAL" -> EventType.TECHNICAL;
            case "ACADEMIC" -> EventType.ACADEMIC;
            case "SPORTS" -> EventType.SPORTS;
            default -> throw new RuntimeException("Unsupported category for event type mapping: " + parentCategory.getName());
        };
    }

    private List<ReminderResponse> buildReminders(List<Event> events) {
        LocalDateTime now = LocalDateTime.now();
        Map<Long, Event> uniqueEvents = events.stream()
                .collect(Collectors.toMap(Event::getId, event -> event, (first, second) -> first));

        return uniqueEvents.values().stream()
                .filter(event -> event.getStatus() == EventStatus.APPROVED || event.getStatus() == EventStatus.PENDING)
                .filter(event -> event.getStartTime().isAfter(now.minusHours(1)))
                .filter(event -> event.getStartTime().isBefore(now.plusDays(7)))
                .sorted(Comparator.comparing(Event::getStartTime))
                .map(event -> ReminderResponse.builder()
                        .eventId(event.getId())
                        .eventTitle(event.getTitle())
                        .status(event.getStatus().name())
                        .venue(event.getVenue())
                        .reminderType(event.getStatus() == EventStatus.PENDING ? "PENDING_REVIEW" : "UPCOMING_EVENT")
                        .message(buildReminderMessage(event, now))
                        .hoursUntilStart(ChronoUnit.HOURS.between(now, event.getStartTime()))
                        .startTime(event.getStartTime())
                        .build())
                .toList();
    }

    private String buildReminderMessage(Event event, LocalDateTime now) {
        if (event.getStatus() == EventStatus.PENDING) {
            return "Your request is still pending review. Check for conflicts or admin feedback before the event date.";
        }

        long hoursUntilStart = ChronoUnit.HOURS.between(now, event.getStartTime());
        if (hoursUntilStart <= 24) {
            return "Starts within the next day. Review venue and preparation details.";
        }
        return "Upcoming approved event on your calendar.";
    }

    private List<CalendarAlertResponse> buildOverlapAlerts(List<Event> events) {
        Map<Long, Event> uniqueEvents = events.stream()
                .collect(Collectors.toMap(Event::getId, event -> event, (first, second) -> first));

        List<Event> relevantEvents = uniqueEvents.values().stream()
                .filter(event -> event.getStatus() == EventStatus.APPROVED || event.getStatus() == EventStatus.PENDING)
                .sorted(Comparator.comparing(Event::getStartTime))
                .collect(Collectors.toList());

        List<CalendarAlertResponse> alerts = new ArrayList<>();
        Set<String> seenPairs = new HashSet<>();

        for (int index = 0; index < relevantEvents.size(); index++) {
            for (int inner = index + 1; inner < relevantEvents.size(); inner++) {
                Event first = relevantEvents.get(index);
                Event second = relevantEvents.get(inner);
                if (!first.getStartTime().isBefore(second.getEndTime()) || !first.getEndTime().isAfter(second.getStartTime())) {
                    continue;
                }

                String pairKey = first.getId() + ":" + second.getId();
                if (!seenPairs.add(pairKey)) {
                    continue;
                }

                alerts.add(CalendarAlertResponse.builder()
                        .primaryEventId(first.getId())
                        .relatedEventId(second.getId())
                        .severity(ConflictSeverity.HARD_CONFLICT.name())
                        .summary(String.format("'%s' overlaps with '%s' on your calendar.", first.getTitle(), second.getTitle()))
                        .primaryEventTitle(first.getTitle())
                        .relatedEventTitle(second.getTitle())
                        .startTime(first.getStartTime().isAfter(second.getStartTime()) ? first.getStartTime() : second.getStartTime())
                        .endTime(first.getEndTime().isBefore(second.getEndTime()) ? first.getEndTime() : second.getEndTime())
                        .build());
                }
        }

        return alerts;
    }

    private boolean isAttending(Long eventId, Long userId) {
        return eventAttendeeRepository.findByEventIdAndUserId(eventId, userId).isPresent();
    }

    private void notifyStudentOfAlternativeSchedule(Event event, String adminMessage) {
        String message = String.format(
                "Admin proposed an alternative schedule for '%s'. New venue: %s. New time: %s to %s.%s",
                event.getTitle(),
                event.getVenue(),
                event.getStartTime(),
                event.getEndTime(),
                adminMessage != null && !adminMessage.isBlank() ? " Note: " + adminMessage.trim() : ""
        );

        notificationService.createNotification(
                event.getUserId(),
                "Alternative Schedule Proposed",
                message,
                NotificationType.GENERAL
        );
    }

    private void applyEventImage(Event event, EventRequest eventRequest, boolean preserveExistingWhenMissing) {
        if (Boolean.TRUE.equals(eventRequest.getRemoveImage())) {
            event.setImageId(null);
            event.setImageOriginalFilename(null);
            event.setImageContentType(null);
            event.setImageUploadedAt(null);
            event.setImageChecksum(null);
            return;
        }

        boolean hasIncomingImage = eventRequest.getImageId() != null && !eventRequest.getImageId().isBlank();
        if (!hasIncomingImage && preserveExistingWhenMissing) {
            return;
        }

        String currentImageId = event.getImageId();
        event.setImageId(hasIncomingImage ? eventRequest.getImageId() : null);
        event.setImageOriginalFilename(resolveImageField(eventRequest.getImageOriginalFilename(), preserveExistingWhenMissing, currentImageId, eventRequest.getImageId(), event.getImageOriginalFilename()));
        event.setImageContentType(resolveImageField(eventRequest.getImageContentType(), preserveExistingWhenMissing, currentImageId, eventRequest.getImageId(), event.getImageContentType()));
        event.setImageUploadedAt(resolveImageField(eventRequest.getImageUploadedAt(), preserveExistingWhenMissing, currentImageId, eventRequest.getImageId(), event.getImageUploadedAt()));
        event.setImageChecksum(resolveImageField(eventRequest.getImageChecksum(), preserveExistingWhenMissing, currentImageId, eventRequest.getImageId(), event.getImageChecksum()));
    }

    private <T> T resolveImageField(T incomingValue, boolean preserveExistingWhenMissing, String currentImageId, String requestedImageId, T existingValue) {
        if (incomingValue != null) {
            return incomingValue;
        }

        if (preserveExistingWhenMissing && currentImageId != null && currentImageId.equals(requestedImageId)) {
            return existingValue;
        }

        return null;
    }

    /**
     * Maps Event entity to EventResponse
     */
    private EventResponse mapToResponse(Event event) {
        return mapToResponse(event, null, false, null);
    }

    private EventResponse mapToResponse(Event event, Long currentUserId, boolean attending, String calendarLabel) {
        User creator = userRepository.findById(event.getUserId()).orElse(null);
        Category category = categoryRepository.findById(event.getCategoryId()).orElse(null);
        EventConflictAnalysisResponse analysis = conflictService.analyzeEvent(event);

        String imageUrl = fileServerService.buildFileAccessUrl(event.getImageId());

        return EventResponse.builder()
                .id(event.getId())
                .userId(event.getUserId())
                .categoryId(event.getCategoryId())
                .imageId(event.getImageId())
                .imageOriginalFilename(event.getImageOriginalFilename())
                .imageContentType(event.getImageContentType())
                .imageUploadedAt(event.getImageUploadedAt())
                .imageChecksum(event.getImageChecksum())
                .title(event.getTitle())
                .description(event.getDescription())
                .imageUrl(imageUrl)
                .venue(event.getVenue())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .status(event.getStatus().name())
                .eventType(event.getEventType() != null ? event.getEventType().name() : null)
                .hasConflict(!ConflictSeverity.NO_CONFLICT.name().equals(analysis.getConflictStatus()))
                .categoryName(category != null ? category.getName() : "Unknown")
                .createdByName(creator != null ? creator.getName() : "Unknown")
                .rejectReason(event.getRejectReason())
                .conflictStatus(analysis.getConflictStatus())
                .conflictDetails(analysis.getConflicts())
                .calendarLabel(calendarLabel)
                .ownedByCurrentUser(currentUserId != null && currentUserId.equals(event.getUserId()))
                .attending(attending)
                .build();
    }
}
