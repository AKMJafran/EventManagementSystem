package com.project.ems_server.repository;

import com.project.ems_server.entity.ClubMembership;
import com.project.ems_server.enums.ClubMemberRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClubMembershipRepository extends JpaRepository<ClubMembership, Long> {

    long countByClubId(Long clubId);

    boolean existsByClubIdAndUserId(Long clubId, Long userId);

    Optional<ClubMembership> findByClubIdAndUserId(Long clubId, Long userId);

    Optional<ClubMembership> findByClubIdAndMemberRole(Long clubId, ClubMemberRole memberRole);

    List<ClubMembership> findByClubIdOrderByJoinedAtAsc(Long clubId);
}
