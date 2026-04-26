package com.project.ems_server.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LecturerProfileUpdateRequest {

    @NotBlank(message = "name is required")
    private String name;

    @NotBlank(message = "designation is required")
    private String designation;
}
