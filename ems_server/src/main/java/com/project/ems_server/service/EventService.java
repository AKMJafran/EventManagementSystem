package com.project.ems_server.service;

import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.dto.response.EventResponse;
import com.project.ems_server.entity.*;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.EventType;
import com.project.ems_server.factory.EventAbstractFactory;
import com.project.ems_server.factory.EventFactoryInterface;
import com.project.ems_server.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
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
                eventRequest.getStartTime(),
                eventRequest.getEndTime(),
                eventRequest.getEventType()
        );

        Event savedEvent = eventRepository.save(event);
        return mapToResponse(savedEvent);
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

        return EventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
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
