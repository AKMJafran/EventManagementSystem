package com.project.ems_server.dto.request;

import com.project.ems_server.enums.ClubType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubRequest {

    @NotBlank(message = "Club name is required")
    @Size(max = 150, message = "Club name must not exceed 150 characters")
    private String name;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @NotNull(message = "Club type is required")
    private ClubType type;

    @NotNull(message = "Senior treasurer lecturer ID is required")
    private Long seniorTreasurerLecturerId;
}
