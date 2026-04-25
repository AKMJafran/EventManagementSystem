package com.project.ems_server.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictResolutionRequest {

    private String venue;

    private LocalDateTime startTime;

    private LocalDateTime endTime;
}
