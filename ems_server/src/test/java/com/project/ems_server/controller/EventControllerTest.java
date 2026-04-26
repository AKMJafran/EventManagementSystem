package com.project.ems_server.controller;

import com.project.ems_server.dto.response.AnalyticsReportResponse;
import com.project.ems_server.dto.response.EventResponse;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.EventService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EventControllerTest {

    @Test
    void getCalendarEventsReturnsOkWithValidRange() {
        EventService eventService = mock(EventService.class);
        UserRepository userRepository = mock(UserRepository.class);

        EventController controller = new EventController(eventService, userRepository);

        LocalDate start = LocalDate.of(2026, 3, 31);
        LocalDate end = LocalDate.of(2026, 4, 29);

        EventResponse event = EventResponse.builder()
                .id(1L)
                .title("Spring Workshop")
                .venue("Main Hall")
                .status("APPROVED")
                .startTime(LocalDateTime.of(2026, 3, 31, 10, 0, 0))
                .endTime(LocalDateTime.of(2026, 3, 31, 12, 0, 0))
                .build();

        when(eventService.getCalendarEvents(start, end)).thenReturn(List.of(event));

        var response = controller.getCalendarEvents(start, end);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());
        assertEquals("Spring Workshop", response.getBody().get(0).getTitle());
    }

    @Test
    void getCalendarEventsReturnsBadRequestWhenEndBeforeStart() {
        EventService eventService = mock(EventService.class);
        UserRepository userRepository = mock(UserRepository.class);
        EventController controller = new EventController(eventService, userRepository);

        LocalDate start = LocalDate.of(2026, 4, 29);
        LocalDate end = LocalDate.of(2026, 3, 31);

        var response = controller.getCalendarEvents(start, end);

        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody() == null || response.getBody().isEmpty());
    }

    @Test
    void getAnalyticsReportReturnsOkWithValidRange() {
        EventService eventService = mock(EventService.class);
        UserRepository userRepository = mock(UserRepository.class);
        EventController controller = new EventController(eventService, userRepository);

        LocalDate from = LocalDate.of(2026, 4, 1);
        LocalDate to = LocalDate.of(2026, 4, 30);

        AnalyticsReportResponse report = AnalyticsReportResponse.builder()
                .periodStart(from)
                .periodEnd(to)
                .totalEvents(12)
                .approvedEvents(8)
                .build();

        when(eventService.getAnalyticsReport(from, to, "APPROVED", "TECHNICAL", null, null, null)).thenReturn(report);

        var response = controller.getAnalyticsReport(from, to, "APPROVED", "TECHNICAL", null, null, null);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(12, response.getBody().getTotalEvents());
        assertEquals(8, response.getBody().getApprovedEvents());
    }

    @Test
    void getAnalyticsReportReturnsBadRequestWhenEndBeforeStart() {
        EventService eventService = mock(EventService.class);
        UserRepository userRepository = mock(UserRepository.class);
        EventController controller = new EventController(eventService, userRepository);

        LocalDate from = LocalDate.of(2026, 4, 30);
        LocalDate to = LocalDate.of(2026, 4, 1);

        var response = controller.getAnalyticsReport(from, to, null, null, null, null, null);

        assertEquals(400, response.getStatusCode().value());
    }
}
