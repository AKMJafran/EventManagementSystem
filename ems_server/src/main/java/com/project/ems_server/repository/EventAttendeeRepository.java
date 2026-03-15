package com.project.ems_server.repository;

import com.project.ems_server.entity.EventAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventAttendeeRepository extends JpaRepository<EventAttendee, Long> {
    List<EventAttendee> findByEventId(Long eventId);
    
    List<EventAttendee> findByUserId(Long userId);
}
