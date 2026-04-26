package com.project.ems_server.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReminderResponse {

    private Long eventId;
    private String eventTitle;
    private String status;
    private String venue;
    private String reminderType;
    private String message;
    private Long hoursUntilStart;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;
}
