package com.project.ems_server.repository;

import com.project.ems_server.entity.Club;
import com.project.ems_server.enums.ClubStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClubRepository extends JpaRepository<Club, Long> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByPresidentIdAndStatusIn(Long presidentId, Collection<ClubStatus> statuses);

    boolean existsByPresidentIdAndStatus(Long presidentId, ClubStatus status);

    List<Club> findByStatusOrderByNameAsc(ClubStatus status);

    List<Club> findBySeniorTreasurerLecturerIdOrderByCreatedAtDesc(Long seniorTreasurerLecturerId);

    Optional<Club> findTopByPresidentIdOrderByCreatedAtDesc(Long presidentId);

    Optional<Club> findTopByPresidentIdAndStatusInOrderByCreatedAtDesc(Long presidentId, Collection<ClubStatus> statuses);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
