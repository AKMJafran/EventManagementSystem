package com.project.ems_server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkStudentImportFailureResponse {

    private Integer rowNumber;

    private String studentNumber;

    private String officialEmail;

    private String reason;
}
