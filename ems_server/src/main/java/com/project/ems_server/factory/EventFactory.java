package com.project.ems_server.factory;

import com.project.ems_server.entity.Event;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.EventType;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Concrete Factory implementation for standard events.
 * Implements Abstract Factory pattern.
 */
@Component
public class EventFactory implements EventFactoryInterface {

    /**
     * Creates an Event instance with default settings based on category.
     * This shows loose coupling and centralized event creation.
     */
    @Override
    public Event createEvent(String title, String description, Long userId, Long categoryId, String venue,
                           LocalDateTime startTime, LocalDateTime endTime, EventType eventType) {
        return Event.builder()
                .title(title)
                .description(description)
                .userId(userId)
                .categoryId(categoryId)
                .venue(venue)
                .startTime(startTime)
                .endTime(endTime)
                .eventType(eventType)
                .status(EventStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
    }

    /**
     * Overloaded method for creating events with custom status (for admins).
     */
    @Override
    public Event createEvent(String title, String description, Long userId, Long categoryId, String venue,
                           LocalDateTime startTime, LocalDateTime endTime, EventStatus status, EventType eventType) {
        return Event.builder()
                .title(title)
                .description(description)
                .userId(userId)
                .categoryId(categoryId)
                .venue(venue)
                .startTime(startTime)
                .endTime(endTime)
                .eventType(eventType)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();
    }
}