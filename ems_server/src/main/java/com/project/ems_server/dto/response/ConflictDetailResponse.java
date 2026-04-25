package com.project.ems_server.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictDetailResponse {

    private Long conflictingEventId;
    private String conflictingEventTitle;
    private String conflictingEventStatus;
    private String conflictingVenue;
    private String conflictType;
    private String severity;
    private String summary;
    private boolean sameVenue;
    private boolean sameOrganizer;
    private boolean approvedEventTakesPriority;
    private Long overlapMinutes;
    private Long turnaroundMinutes;
    private List<String> reasons;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime conflictingStartTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime conflictingEndTime;
}
