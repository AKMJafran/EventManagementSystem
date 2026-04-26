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
public class AdminLecturerResponse {

    private Long id;

    private Long profileId;

    private String name;

    private String email;

    private String staffId;

    private String department;

    private String designation;

    private Boolean isActive;

    private Boolean isFirstLogin;

    private String role;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
