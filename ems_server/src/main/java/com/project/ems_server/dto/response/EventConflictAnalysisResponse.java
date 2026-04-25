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
public class EventConflictAnalysisResponse {

    private Long eventId;
    private String eventTitle;
    private String eventStatus;
    private String venue;
    private String conflictStatus;
    private boolean canApprove;
    private boolean actionRequired;
    private int hardConflictCount;
    private int softConflictCount;
    private String recommendation;
    private List<ConflictDetailResponse> conflicts;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;
}
