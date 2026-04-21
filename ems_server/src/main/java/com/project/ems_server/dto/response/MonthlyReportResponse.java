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
    private long urgentEvents;
    private List<EventTypeCountResponse> eventsByType;
    private List<CategoryCountResponse> eventsByCategory;
}
