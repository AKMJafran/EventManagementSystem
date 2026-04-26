package com.project.ems_server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkLecturerImportFailureResponse {

    private Integer rowNumber;

    private String staffId;

    private String email;

    private String reason;
}
