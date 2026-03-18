package com.project.ems_server.service;

import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.dto.response.EventResponse;
import com.project.ems_server.entity.*;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.NotificationType;
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
    private final NotificationRepository notificationRepository;
    private final ConflictService conflictService;
    private final EmailService emailService;

    /**
     * Creates a new event with PENDING status and detects conflicts
     */
    public EventResponse createEvent(EventRequest eventRequest, Long userId) {
        // Verify category exists
        if (!categoryRepository.existsById(eventRequest.getCategoryId())) {
            throw new RuntimeException("Category not found with id: " + eventRequest.getCategoryId());
        }

        // Detect conflicts
        List<Event> conflictingEvents = conflictService.detectConflict(eventRequest);

        // Create event with PENDING status
        Event event = Event.builder()
                .title(eventRequest.getTitle())
                .description(eventRequest.getDescription())
                .userId(userId)
                .categoryId(eventRequest.getCategoryId())
                .venue(eventRequest.getVenue())
                .startTime(eventRequest.getStartTime())
                .endTime(eventRequest.getEndTime())
                .status(EventStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        Event savedEvent = eventRepository.save(event);

        // Save conflict records if conflicts exist
        if (!conflictingEvents.isEmpty()) {
            conflictService.saveConflictRecords(
                    savedEvent.getId(),
                    conflictingEvents.stream().map(Event::getId).collect(Collectors.toList())
            );
        }

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
     * Gets a single event by ID
     */
    public EventResponse getEventById(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        return mapToResponse(event);
    }

    /**
     * Approves an event and notifies the student
     */
    public void approveEvent(Long eventId, Long adminId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        // Set status to APPROVED
        event.setStatus(EventStatus.APPROVED);
        eventRepository.save(event);

        // Get student user
        User student = userRepository.findById(event.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + event.getUserId()));

        // Create in-app notification
        String notificationMessage = String.format(
                "✅ Your event '%s' has been approved!",
                event.getTitle()
        );
        Notification notification = Notification.builder()
                .userId(student.getId())
                .message(notificationMessage)
                .type(NotificationType.EVENT_APPROVED)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        // Send email notification
        emailService.sendEventApprovedEmail(student.getEmail(), event.getTitle());
    }

    /**
     * Rejects an event and notifies the student
     */
    public void rejectEvent(Long eventId, String reason, Long adminId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        // Set status to REJECTED and store reason
        event.setStatus(EventStatus.REJECTED);
        event.setRejectReason(reason);
        eventRepository.save(event);

        // Get student user
        User student = userRepository.findById(event.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + event.getUserId()));

        // Create in-app notification
        String notificationMessage = String.format(
                "❌ Your event '%s' has been rejected.\n\nReason: %s",
                event.getTitle(),
                reason
        );
        Notification notification = Notification.builder()
                .userId(student.getId())
                .message(notificationMessage)
                .type(NotificationType.EVENT_REJECTED)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        // Send email notification
        emailService.sendEventRejectedEmail(student.getEmail(), event.getTitle(), reason);
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
                .categoryName(category != null ? category.getName() : "Unknown")
                .createdByName(creator != null ? creator.getName() : "Unknown")
                .rejectReason(event.getRejectReason())
                .build();
    }
}
