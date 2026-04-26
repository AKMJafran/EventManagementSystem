package com.project.ems_server.util;

import com.project.ems_server.enums.ClubMemberRole;
import com.project.ems_server.enums.ClubType;

import java.util.ArrayList;
import java.util.List;

public final class ClubRoleConfig {

    private ClubRoleConfig() {
    }

    public static List<ClubMemberRole> getAvailableRoles(ClubType clubType) {
        List<ClubMemberRole> common = List.of(
                ClubMemberRole.PRESIDENT,
                ClubMemberRole.VICE_PRESIDENT,
                ClubMemberRole.SECRETARY,
                ClubMemberRole.TREASURER,
                ClubMemberRole.EDITOR,
                ClubMemberRole.GENERAL_MEMBER
        );

        List<ClubMemberRole> specific = switch (clubType) {
            case TECHNICAL -> List.of(
                    ClubMemberRole.TECHNICAL_COORDINATOR,
                    ClubMemberRole.MEDIA_COORDINATOR,
                    ClubMemberRole.EVENT_COORDINATOR
            );
            case CULTURAL -> List.of(
                    ClubMemberRole.EVENT_COORDINATOR,
                    ClubMemberRole.MEDIA_COORDINATOR
            );
            case SPORTS -> List.of(
                    ClubMemberRole.EVENT_COORDINATOR,
                    ClubMemberRole.SPORTS_COORDINATOR
            );
            case ACADEMIC -> List.of(
                    ClubMemberRole.ACADEMIC_COORDINATOR,
                    ClubMemberRole.TECHNICAL_COORDINATOR,
                    ClubMemberRole.EVENT_COORDINATOR
            );
        };

        List<ClubMemberRole> allRoles = new ArrayList<>(common);
        allRoles.addAll(specific);
        return allRoles;
    }

    public static List<ClubMemberRole> getSingleOccupancyRoles() {
        return List.of(
                ClubMemberRole.PRESIDENT,
                ClubMemberRole.VICE_PRESIDENT,
                ClubMemberRole.SECRETARY,
                ClubMemberRole.TREASURER,
                ClubMemberRole.EDITOR,
                ClubMemberRole.EVENT_COORDINATOR,
                ClubMemberRole.SPORTS_COORDINATOR,
                ClubMemberRole.TECHNICAL_COORDINATOR,
                ClubMemberRole.ACADEMIC_COORDINATOR,
                ClubMemberRole.MEDIA_COORDINATOR
        );
    }

    public static String getDisplayName(ClubMemberRole role) {
        return switch (role) {
            case PRESIDENT -> "President";
            case VICE_PRESIDENT -> "Vice President";
            case SECRETARY -> "Secretary";
            case TREASURER -> "Treasurer / Junior Treasurer";
            case EDITOR -> "Editor";
            case EVENT_COORDINATOR -> "Event Coordinator";
            case SPORTS_COORDINATOR -> "Sports Coordinator";
            case TECHNICAL_COORDINATOR -> "Technical Coordinator";
            case ACADEMIC_COORDINATOR -> "Academic Coordinator";
            case MEDIA_COORDINATOR -> "Media / Social Media Coordinator";
            case GENERAL_MEMBER -> "General Member";
        };
    }
}
