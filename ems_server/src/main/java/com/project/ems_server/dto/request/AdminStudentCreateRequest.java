package com.project.ems_server.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStudentCreateRequest {

    @NotBlank(message = "studentNumber is required")
    private String studentNumber;

    @NotBlank(message = "officialEmail is required")
    @Email(message = "officialEmail should be valid")
    private String officialEmail;

    @NotBlank(message = "fullName is required")
    private String fullName;

    @NotBlank(message = "department is required")
    private String department;

    @NotNull(message = "batchYear is required")
    @Min(value = 2000, message = "batchYear must be a valid year")
    @Max(value = 2100, message = "batchYear must be a valid year")
    private Integer batchYear;
}
