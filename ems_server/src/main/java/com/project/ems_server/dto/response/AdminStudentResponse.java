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
public class AdminStudentResponse {

    private Long id;

    private Long profileId;

    private String studentNumber;

    private String officialEmail;

    private String fullName;

    private String department;

    private Integer batchYear;

    private Boolean isRegistered;

    private Boolean isVerified;

    private Boolean isActive;

    private Boolean isFirstLogin;

    private String role;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
