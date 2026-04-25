package com.project.ems_server.repository;

import com.project.ems_server.entity.EventConflict;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventConflictRepository extends JpaRepository<EventConflict, Long> {
    List<EventConflict> findByEventId(Long eventId);
    List<EventConflict> findByEventIdOrConflictWith(Long eventId, Long conflictWith);
    boolean existsByEventIdOrConflictWith(Long eventId, Long conflictWith);
    boolean existsByEventIdAndConflictWith(Long eventId, Long conflictWith);
    void deleteByEventIdOrConflictWith(Long eventId, Long conflictWith);
}
