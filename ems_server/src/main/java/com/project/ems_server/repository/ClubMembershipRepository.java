package com.project.ems_server.repository;

import com.project.ems_server.entity.ClubMembership;
import com.project.ems_server.enums.ClubMemberRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClubMembershipRepository extends JpaRepository<ClubMembership, Long> {

    long countByClubId(Long clubId);

    boolean existsByClubIdAndUserId(Long clubId, Long userId);

    Optional<ClubMembership> findByClubIdAndUserId(Long clubId, Long userId);

    boolean existsByClubIdAndMemberRole(Long clubId, ClubMemberRole memberRole);

    Optional<ClubMembership> findByClubIdAndMemberRole(Long clubId, ClubMemberRole memberRole);

    List<ClubMembership> findByClubIdOrderByJoinedAtAsc(Long clubId);

    void deleteByClubIdAndUserId(Long clubId, Long userId);

    void deleteByClubIdAndMemberRoleIn(Long clubId, Collection<ClubMemberRole> memberRoles);
}
