package com.project.ems_server.controller;

import com.project.ems_server.dto.request.ConflictResolutionRequest;
import com.project.ems_server.dto.request.EventDecisionRequest;
import com.project.ems_server.dto.request.EventRequest;
import com.project.ems_server.dto.response.AnalyticsReportResponse;
import com.project.ems_server.dto.response.EventConflictAnalysisResponse;
import com.project.ems_server.dto.response.EventResponse;
import com.project.ems_server.dto.response.MonthlyReportResponse;
import com.project.ems_server.dto.response.StudentCalendarFeedResponse;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final UserRepository userRepository;

    /**
     * Creates a new event for a student request or an admin-published faculty event.
     * POST /events
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody EventRequest eventRequest,
            Authentication authentication) {

        User user = extractUserFromAuthentication(authentication);
        EventResponse response = eventService.createEvent(eventRequest, user.getId(), user.getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Updates an existing event.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable Long id,
            @Valid @RequestBody EventRequest eventRequest,
            Authentication authentication) {

        User user = extractUserFromAuthentication(authentication);
        EventResponse response = eventService.updateEvent(id, eventRequest, user.getId(), user.getRole());
        return ResponseEntity.ok(response);
    }

    /**
         * Gets events with optional status, category, and date filters
         * GET /events?status=APPROVED&categoryId=1&startDate=2026-04-01&endDate=2026-04-30
     */
    @GetMapping
    public ResponseEntity<List<EventResponse>> getEvents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        EventStatus eventStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                eventStatus = EventStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }

        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new RuntimeException("Invalid date range: endDate must be on or after startDate");
        }

        List<EventResponse> events = eventService.getEvents(eventStatus, categoryId, startDate, endDate);
        return ResponseEntity.ok(events);
    }

    /**
     * Gets events for a date range.
     */
    @GetMapping("/calendar")
    public ResponseEntity<List<EventResponse>> getCalendarEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        if (end.isBefore(start)) {
            return ResponseEntity.badRequest().build();
        }
        List<EventResponse> events = eventService.getCalendarEvents(start, end);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/student/calendar-feed")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentCalendarFeedResponse> getStudentCalendarFeed(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            Authentication authentication) {
        if (end.isBefore(start)) {
            return ResponseEntity.badRequest().build();
        }

        Long userId = extractUserIdFromAuthentication(authentication);
        return ResponseEntity.ok(eventService.getStudentCalendarFeed(userId, start, end));
    }

    /**
     * Gets monthly event report.
     */
    @GetMapping("/reports/monthly")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MonthlyReportResponse> getMonthlyReport(
            @RequestParam int year,
            @RequestParam int month) {
        if (month < 1 || month > 12) {
            return ResponseEntity.badRequest().build();
        }
        MonthlyReportResponse report = eventService.getMonthlyReport(year, month);
        return ResponseEntity.ok(report);
    }

    /**
     * Gets analytics report with optional filters.
     */
    @GetMapping("/reports/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AnalyticsReportResponse> getAnalyticsReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String venue,
            @RequestParam(required = false) String organizerName) {

        if (to.isBefore(from)) {
            return ResponseEntity.badRequest().build();
        }

        try {
            AnalyticsReportResponse report = eventService.getAnalyticsReport(
                    from, to, status, eventType, categoryId, venue, organizerName
            );
            return ResponseEntity.ok(report);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
 * Gets events created by the logged-in student
 * GET /events/user/my-events
 */
@GetMapping("/user/my-events")
@PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'ADMIN')")
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

    @GetMapping("/{id}/approval-check")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EventConflictAnalysisResponse> getApprovalCheck(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getApprovalCheck(id));
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
            @Valid @RequestBody(required = false) EventDecisionRequest request,
            Authentication authentication) {

        String reason = request != null ? request.getReason() : null;
        if (reason == null || reason.isBlank()) {
            throw new RuntimeException("Reason is required");
        }

        Long adminId = extractUserIdFromAuthentication(authentication);
        eventService.rejectEvent(id, reason.trim(), adminId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Gets all conflicts (admin only)
     * GET /admin/conflicts
     */
    @GetMapping("/admin/conflicts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<EventConflictAnalysisResponse>> getConflicts() {
        List<EventConflictAnalysisResponse> conflicts = eventService.getConflicts();
        return ResponseEntity.ok(conflicts);
    }

    /**
     * Resolves a conflict by reassigning date/time or venue (admin only)
     * PATCH /events/{id}/resolve-conflict
     */
    @PatchMapping("/{id}/resolve-conflict")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EventResponse> resolveConflict(
            @PathVariable Long id,
            @RequestBody ConflictResolutionRequest request,
            Authentication authentication) {

        Long adminId = extractUserIdFromAuthentication(authentication);
        EventResponse response = eventService.resolveConflict(id, request, adminId);
        return ResponseEntity.ok(response);
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

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Void> cancelEvent(
            @PathVariable Long id,
            Authentication authentication) {

        User user = extractUserFromAuthentication(authentication);
        eventService.cancelEvent(id, user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }

    /**
     * Helper method to extract user ID from Authentication
     */
    private Long extractUserIdFromAuthentication(Authentication authentication) {
        return extractUserFromAuthentication(authentication).getId();
    }

    private User extractUserFromAuthentication(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
}
