package com.project.ems_server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VenueAvailabilityResponse {

    private Long id;

    private String name;

    private Integer capacity;

    private String location;

    private Boolean active;

    private Boolean available;

    private String status;

    private Long reservedEventId;

    private String reservedEventTitle;
}
