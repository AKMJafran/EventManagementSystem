package com.project.ems_server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyReportResponse {
    private int year;
    private int month;
    private long totalEvents;
    private long approvedEvents;
    private long pendingEvents;
    private long rejectedEvents;
    private long cancelledEvents;
    private long urgentEvents;
    private long completedEvents;
    private long upcomingEvents;
    private long conflictEvents;
    private long totalRegistrations;
    private double averageRegistrationsPerEvent;
    private double approvalRate;
    private double conflictRate;
    private List<EventTypeCountResponse> eventsByType;
    private List<CategoryCountResponse> eventsByCategory;
    private List<BreakdownItemResponse> eventsByStatus;
    private List<BreakdownItemResponse> eventsByVenue;
    private List<OrganizerActivityResponse> topOrganizers;
    private List<ReportEventDetailResponse> events;
}
