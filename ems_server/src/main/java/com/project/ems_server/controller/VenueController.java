package com.project.ems_server.controller;

import com.project.ems_server.dto.response.VenueAvailabilityResponse;
import com.project.ems_server.entity.Venue;
import com.project.ems_server.service.VenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/venues")
@RequiredArgsConstructor
public class VenueController {

    private final VenueService venueService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT', 'LECTURER')")
    public ResponseEntity<List<Venue>> getAllVenues() {
        List<Venue> venues = venueService.getAllVenues();
        return ResponseEntity.ok(venues);
    }

    @GetMapping("/availability")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT', 'LECTURER')")
    public ResponseEntity<List<VenueAvailabilityResponse>> getVenueAvailability(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(required = false) Long excludeEventId) {
        return ResponseEntity.ok(venueService.getVenueAvailability(startTime, endTime, excludeEventId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Venue> createVenue(@RequestBody Venue venue) {
        Venue createdVenue = venueService.createVenue(venue);
        return ResponseEntity.ok(createdVenue);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Venue> updateVenue(@PathVariable Long id, @RequestBody Venue venue) {
        Venue updatedVenue = venueService.updateVenue(id, venue);
        return ResponseEntity.ok(updatedVenue);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteVenue(@PathVariable Long id) {
        venueService.deleteVenue(id);
        return ResponseEntity.noContent().build();
    }
}
