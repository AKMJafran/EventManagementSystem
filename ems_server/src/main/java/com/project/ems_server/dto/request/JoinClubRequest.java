package com.project.ems_server.dto.request;

import com.project.ems_server.enums.ClubMemberRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinClubRequest {

    private ClubMemberRole role;
}
