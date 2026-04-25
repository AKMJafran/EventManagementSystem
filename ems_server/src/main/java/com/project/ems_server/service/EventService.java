package com.project.ems_server.service;

import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.dto.response.AnalyticsReportResponse;
import com.project.ems_server.dto.response.BreakdownItemResponse;
import com.project.ems_server.dto.response.CategoryCountResponse;
import com.project.ems_server.dto.response.EventResponse;
import com.project.ems_server.dto.response.EventTypeCountResponse;
import com.project.ems_server.dto.response.MonthlyReportResponse;
import com.project.ems_server.dto.response.OrganizerActivityResponse;
import com.project.ems_server.dto.response.ReportEventDetailResponse;
import com.project.ems_server.dto.response.TrendPointResponse;
import com.project.ems_server.entity.*;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.EventType;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.factory.EventAbstractFactory;
import com.project.ems_server.factory.EventFactoryInterface;
import com.project.ems_server.repository.*;
import com.project.ems_server.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
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

    /**
     * Creates a new event with PENDING status and blocks conflicting bookings.
     */
    public EventResponse createEvent(EventRequest eventRequest, Long userId) {
        // Verify category exists
        if (!categoryRepository.existsById(eventRequest.getCategoryId())) {
            throw new RuntimeException("Category not found with id: " + eventRequest.getCategoryId());
        }

        // Block conflicting bookings before saving the event
        conflictService.checkStrictConflict(eventRequest);

        // Use Abstract Factory pattern to create event based on event type
        EventFactoryInterface factory = eventAbstractFactory.getFactory(eventRequest.getEventType());
        Event event = factory.createEvent(
                eventRequest.getTitle(),
                eventRequest.getDescription(),
                userId,
                eventRequest.getCategoryId(),
                eventRequest.getVenue(),
                eventRequest.getImageId(),
                eventRequest.getStartTime(),
                eventRequest.getEndTime(),
                eventRequest.getEventType()
        );

        Event savedEvent = eventRepository.save(event);
        notifyAdminsOfNewEventRequest(savedEvent);
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
    public EventResponse updateEvent(Long eventId, EventRequest eventRequest, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        if (!event.getUserId().equals(userId)) {
            throw new RuntimeException("You are not allowed to edit this event");
        }

        if (event.getStatus() != EventStatus.PENDING) {
            throw new RuntimeException("Only pending events can be edited");
        }

        if (!categoryRepository.existsById(eventRequest.getCategoryId())) {
            throw new RuntimeException("Category not found with id: " + eventRequest.getCategoryId());
        }

        boolean dateOrVenueChanged = !event.getVenue().equals(eventRequest.getVenue())
                || !event.getStartTime().equals(eventRequest.getStartTime())
                || !event.getEndTime().equals(eventRequest.getEndTime());

        if (dateOrVenueChanged) {
            conflictService.checkStrictConflict(eventRequest);
        }

        event.setTitle(eventRequest.getTitle());
        event.setDescription(eventRequest.getDescription());
        event.setCategoryId(eventRequest.getCategoryId());
        event.setVenue(eventRequest.getVenue());
        event.setStartTime(eventRequest.getStartTime());
        event.setEndTime(eventRequest.getEndTime());
        event.setEventType(eventRequest.getEventType());
        event.setImageId(eventRequest.getImageId() != null ? eventRequest.getImageId() : event.getImageId());
        event.setStatus(EventStatus.PENDING);
        event.setRejectReason(null);

        Event updatedEvent = eventRepository.save(event);
        return mapToResponse(updatedEvent);
    }

    /**
     * Gets events filtered by status and/or category
     */
    public List<EventResponse> getEvents(EventStatus status, Long categoryId) {
        List<Event> events;

        if (status != null && categoryId != null) {
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
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        return eventRepository.findByStartTimeBetween(startDateTime, endDateTime).stream()
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

    /**
     * Approves an event and notifies observers.
     */
    public void approveEvent(Long eventId, Long adminId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        approvalService.approveEvent(event);
    }

    /**
     * Rejects an event and notifies observers.
     */
    public void rejectEvent(Long eventId, String reason, Long adminId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        approvalService.rejectEvent(event, reason);
    }

    /**
     * Gets all conflicts
     */
    public List<EventConflict> getConflicts() {

        return eventConflictRepository.findAll();
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

    /**
 * Gets all events created by a specific user
 */
public List<EventResponse> getEventsByUserId(Long userId) {
    return eventRepository.findByUserId(userId)
            .stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
}

    /**
     * Maps Event entity to EventResponse
     */
    private EventResponse mapToResponse(Event event) {
        User creator = userRepository.findById(event.getUserId()).orElse(null);
        Category category = categoryRepository.findById(event.getCategoryId()).orElse(null);

        String imageUrl = null;
        if (event.getImageId() != null && !event.getImageId().isEmpty()) {
            imageUrl = fileServerService.requestFileLink(event.getImageId());
        }

        return EventResponse.builder()
                .id(event.getId())
                .userId(event.getUserId())
                .categoryId(event.getCategoryId())
                .imageId(event.getImageId())
                .title(event.getTitle())
                .description(event.getDescription())
                .imageUrl(imageUrl)
                .venue(event.getVenue())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .status(event.getStatus().name())
                .eventType(event.getEventType() != null ? event.getEventType().name() : null)
                .hasConflict(eventConflictRepository.existsByEventIdOrConflictWith(event.getId(), event.getId()))
                .categoryName(category != null ? category.getName() : "Unknown")
                .createdByName(creator != null ? creator.getName() : "Unknown")
                .rejectReason(event.getRejectReason())
                .build();
    }
}
