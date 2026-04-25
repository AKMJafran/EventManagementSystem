package com.project.ems_server.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentProfileBulkItemRequest {

    private String studentNumber;

    private String officialEmail;

    private String fullName;

    private String department;

    private Integer batchYear;
}
