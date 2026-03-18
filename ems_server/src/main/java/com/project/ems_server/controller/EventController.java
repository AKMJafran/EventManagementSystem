package com.project.ems_server.controller;

import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.dto.response.EventResponse;
import com.project.ems_server.entity.EventConflict;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final UserRepository userRepository;

    /**
     * Creates a new event (student only)
     * POST /events
     */
    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody EventRequest eventRequest,
            Authentication authentication) {
        
        Long userId = extractUserIdFromAuthentication(authentication);
        EventResponse response = eventService.createEvent(eventRequest, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Gets events with optional status and category filters
     * GET /events?status=APPROVED&categoryId=1
     */
    @GetMapping
    public ResponseEntity<List<EventResponse>> getEvents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId) {
        
        EventStatus eventStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                eventStatus = EventStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }

        List<EventResponse> events = eventService.getEvents(eventStatus, categoryId);
        return ResponseEntity.ok(events);
    }
    
    /**
 * Gets events created by the logged-in student
 * GET /events/user/my-events
 */
@GetMapping("/user/my-events")
@PreAuthorize("hasRole('STUDENT')")
public ResponseEntity<List<EventResponse>> getMyEvents(Authentication authentication) {
    Long userId = extractUserIdFromAuthentication(authentication);
    List<EventResponse> events = eventService.getEventsByUserId(userId);
    return ResponseEntity.ok(events);
}

    /**
     * Gets a single event by ID
     * GET /events/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id) {
        EventResponse event = eventService.getEventById(id);
        return ResponseEntity.ok(event);
    }

    /**
     * Approves an event (admin only)
     * PATCH /events/{id}/approve
     */
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> approveEvent(
            @PathVariable Long id,
            Authentication authentication) {
        
        Long adminId = extractUserIdFromAuthentication(authentication);
        eventService.approveEvent(id, adminId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Rejects an event (admin only)
     * PATCH /events/{id}/reject
     */
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> rejectEvent(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        
        String reason = request.get("reason");
        if (reason == null || reason.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        Long adminId = extractUserIdFromAuthentication(authentication);
        eventService.rejectEvent(id, reason, adminId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Gets all conflicts (admin only)
     * GET /admin/conflicts
     */
    @GetMapping("/admin/conflicts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<EventConflict>> getConflicts() {
        List<EventConflict> conflicts = eventService.getConflicts();
        return ResponseEntity.ok(conflicts);
    }

    /**
     * Adds user as attendee to an event (student only)
     * POST /events/{id}/attend
     */
    @PostMapping("/{id}/attend")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> attendEvent(
            @PathVariable Long id,
            Authentication authentication) {
        
        Long userId = extractUserIdFromAuthentication(authentication);
        eventService.attendEvent(id, userId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * Helper method to extract user ID from Authentication
     */
    private Long extractUserIdFromAuthentication(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(user -> user.getId())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
}
