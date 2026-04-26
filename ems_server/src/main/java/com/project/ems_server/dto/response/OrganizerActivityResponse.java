package com.project.ems_server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerActivityResponse {
    private Long organizerId;
    private String organizerName;
    private long totalEvents;
    private long approvedEvents;
    private long pendingEvents;
    private long rejectedEvents;
    private long cancelledEvents;
    private long totalRegistrations;
}
