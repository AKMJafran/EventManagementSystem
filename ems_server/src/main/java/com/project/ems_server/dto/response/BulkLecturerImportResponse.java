package com.project.ems_server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkLecturerImportResponse {

    private Integer total;

    private Integer success;

    private Integer failed;

    private List<BulkLecturerImportFailureResponse> failures;
}
