package com.project.ems_server.service;

import com.project.ems_server.dto.response.VenueAvailabilityResponse;
import com.project.ems_server.entity.Event;
import com.project.ems_server.entity.Venue;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.repository.EventRepository;
import com.project.ems_server.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VenueService {

    private final VenueRepository venueRepository;
    private final EventRepository eventRepository;

    public List<Venue> getAllVenues() {
        return venueRepository.findAll().stream()
                .sorted((left, right) -> left.getName().compareToIgnoreCase(right.getName()))
                .toList();
    }

    public Optional<Venue> getVenueById(Long id) {
        return venueRepository.findById(id);
    }

    public Venue createVenue(Venue venue) {
        validateVenuePayload(venue, null);
        venue.setName(normalize(venue.getName()));
        venue.setLocation(normalize(venue.getLocation()));
        if (venue.getActive() == null) {
            venue.setActive(true);
        }
        return venueRepository.save(venue);
    }

    public Venue updateVenue(Long id, Venue venueDetails) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venue not found"));
        validateVenuePayload(venueDetails, id);
        venue.setName(normalize(venueDetails.getName()));
        venue.setCapacity(venueDetails.getCapacity());
        venue.setLocation(normalize(venueDetails.getLocation()));
        venue.setActive(Boolean.TRUE.equals(venueDetails.getActive()));
        return venueRepository.save(venue);
    }

    public void deleteVenue(Long id) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venue not found"));
        venueRepository.delete(venue);
    }

    public List<VenueAvailabilityResponse> getVenueAvailability(
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludeEventId
    ) {
        boolean hasSchedule = startTime != null && endTime != null;
        if ((startTime == null) != (endTime == null)) {
            throw new RuntimeException("Both startTime and endTime are required when checking venue availability");
        }
        if (hasSchedule && !endTime.isAfter(startTime)) {
            throw new RuntimeException("End time must be after start time");
        }

        return getAllVenues().stream()
                .map(venue -> mapAvailability(venue, startTime, endTime, excludeEventId))
                .toList();
    }

    public Venue requireVenueByName(String venueName) {
        String normalizedVenueName = normalize(venueName);
        if (normalizedVenueName.isBlank()) {
            throw new RuntimeException("Venue is required");
        }

        return venueRepository.findByNameIgnoreCase(normalizedVenueName)
                .orElseThrow(() -> new RuntimeException("Selected venue does not exist"));
    }

    private VenueAvailabilityResponse mapAvailability(
            Venue venue,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludeEventId
    ) {
        if (!Boolean.TRUE.equals(venue.getActive())) {
            return VenueAvailabilityResponse.builder()
                    .id(venue.getId())
                    .name(venue.getName())
                    .capacity(venue.getCapacity())
                    .location(venue.getLocation())
                    .active(false)
                    .available(false)
                    .status("INACTIVE")
                    .build();
        }

        if (startTime == null || endTime == null) {
            return VenueAvailabilityResponse.builder()
                    .id(venue.getId())
                    .name(venue.getName())
                    .capacity(venue.getCapacity())
                    .location(venue.getLocation())
                    .active(true)
                    .available(true)
                    .status("AVAILABLE")
                    .build();
        }

        List<Event> conflicts = eventRepository.findConflictingEvents(venue.getName(), startTime, endTime).stream()
                .filter(event -> excludeEventId == null || !excludeEventId.equals(event.getId()))
                .toList();

        Event blockingEvent = conflicts.stream()
                .filter(event -> event.getStatus() == EventStatus.APPROVED)
                .findFirst()
                .orElse(conflicts.stream().findFirst().orElse(null));

        boolean available = blockingEvent == null;

        return VenueAvailabilityResponse.builder()
                .id(venue.getId())
                .name(venue.getName())
                .capacity(venue.getCapacity())
                .location(venue.getLocation())
                .active(true)
                .available(available)
                .status(available ? "AVAILABLE" : "RESERVED")
                .reservedEventId(blockingEvent != null ? blockingEvent.getId() : null)
                .reservedEventTitle(blockingEvent != null ? blockingEvent.getTitle() : null)
                .build();
    }

    private void validateVenuePayload(Venue venue, Long currentVenueId) {
        if (venue == null) {
            throw new RuntimeException("Venue details are required");
        }

        String name = normalize(venue.getName());
        String location = normalize(venue.getLocation());

        if (name.isBlank()) {
            throw new RuntimeException("Venue name is required");
        }
        if (location.isBlank()) {
            throw new RuntimeException("Venue location is required");
        }
        if (venue.getCapacity() == null || venue.getCapacity() <= 0) {
            throw new RuntimeException("Venue capacity must be greater than zero");
        }

        venueRepository.findByNameIgnoreCase(name)
                .filter(existing -> currentVenueId == null || !existing.getId().equals(currentVenueId))
                .ifPresent(existing -> {
                    throw new RuntimeException("Venue name already exists");
                });
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s{2,}", " ");
    }
}
