package com.project.ems_server.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LecturerProfileBulkItemRequest {

    private String staffId;

    private String email;

    private String name;

    private String department;

    private String designation;
}
