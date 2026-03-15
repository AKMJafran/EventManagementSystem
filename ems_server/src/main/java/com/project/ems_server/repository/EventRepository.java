package com.project.ems_server.repository;

import com.project.ems_server.entity.Event;
import com.project.ems_server.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByUserId(Long userId);
    
    List<Event> findByStatus(EventStatus status);
    
    @Query("SELECT e FROM Event e WHERE e.venue = :venue AND e.status = 'APPROVED' " +
           "AND e.startTime < :endTime AND e.endTime > :startTime")
    List<Event> findConflictingEvents(@Param("venue") String venue,
                                      @Param("startTime") LocalDateTime startTime,
                                      @Param("endTime") LocalDateTime endTime);
}
