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
public class ClubResponse {

    private Long id;
    private String name;
    private String description;
    private String type;
    private Long presidentId;
    private String presidentName;
    private String presidentEmail;
    private Long seniorTreasurerLecturerId;
    private String seniorTreasurerLecturerName;
    private String seniorTreasurerLecturerEmail;
    private String status;
    private String rejectionReason;
    private long memberCount;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
