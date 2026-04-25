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
public class StudentCalendarFeedResponse {

    private List<EventResponse> events;
    private List<ReminderResponse> reminders;
    private List<CalendarAlertResponse> overlapAlerts;
}
