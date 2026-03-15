package com.project.ems_server.repository;

import com.project.ems_server.entity.EventConflict;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventConflictRepository extends JpaRepository<EventConflict, Long> {
    List<EventConflict> findByEventId(Long eventId);
}
