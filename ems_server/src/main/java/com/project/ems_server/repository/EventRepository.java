package com.project.ems_server.repository;

import com.project.ems_server.entity.Event;
import com.project.ems_server.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByUserId(Long userId);
    
    List<Event> findByStatus(EventStatus status);
    
    List<Event> findByCategoryId(Long categoryId);
    
    List<Event> findByStatusAndCategoryId(EventStatus status, Long categoryId);
    
    @Query("SELECT e FROM Event e WHERE e.venue = :venue AND e.status = 'APPROVED' " +
           "AND e.startTime < :endTime AND e.endTime > :startTime")
    List<Event> findConflictingEvents(@Param("venue") String venue,
                                      @Param("startTime") LocalDateTime startTime,
                                      @Param("endTime") LocalDateTime endTime);

    @Query("SELECT e FROM Event e WHERE e.status IN :statuses " +
           "AND e.startTime < :endTime AND e.endTime > :startTime " +
           "AND (:excludeId IS NULL OR e.id <> :excludeId)")
    List<Event> findActiveEventsWithTimeOverlap(@Param("startTime") LocalDateTime startTime,
                                                @Param("endTime") LocalDateTime endTime,
                                                @Param("statuses") Collection<EventStatus> statuses,
                                                @Param("excludeId") Long excludeId);

    @Query("SELECT e FROM Event e WHERE LOWER(e.venue) = LOWER(:venue) " +
           "AND e.status IN :statuses " +
           "AND e.startTime < :dayEnd AND e.endTime > :dayStart " +
           "AND (:excludeId IS NULL OR e.id <> :excludeId)")
    List<Event> findActiveEventsAtVenueOnDate(@Param("venue") String venue,
                                              @Param("dayStart") LocalDateTime dayStart,
                                              @Param("dayEnd") LocalDateTime dayEnd,
                                              @Param("statuses") Collection<EventStatus> statuses,
                                              @Param("excludeId") Long excludeId);
    
    @Query("SELECT e FROM Event e WHERE e.status = 'APPROVED' " +
           "AND e.startTime >= :now AND e.startTime <= :oneHourLater")
    List<Event> findUpcomingApprovedEvents(@Param("now") LocalDateTime now,
                                           @Param("oneHourLater") LocalDateTime oneHourLater);

    List<Event> findByStartTimeBetween(LocalDateTime startTime, LocalDateTime endTime);
}
