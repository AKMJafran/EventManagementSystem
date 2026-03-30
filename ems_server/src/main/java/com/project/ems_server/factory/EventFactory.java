package com.project.ems_server.factory;

import com.project.ems_server.entity.Event;
import com.project.ems_server.enums.EventStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Factory pattern implementation for creating Event instances.
 * Demonstrates design pattern usage in advanced Java.
 */
@Component
public class EventFactory {

    /**
     * Creates an Event instance with default settings based on category.
     * This shows loose coupling and centralized event creation.
     */
    public Event createEvent(String title, String description, Long userId, Long categoryId, String venue,
                           LocalDateTime startTime, LocalDateTime endTime) {
        return Event.builder()
                .title(title)
                .description(description)
                .userId(userId)
                .categoryId(categoryId)
                .venue(venue)
                .startTime(startTime)
                .endTime(endTime)
                .status(EventStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
    }

    /**
     * Overloaded method for creating events with custom status (for admins).
     */
    public Event createEvent(String title, String description, Long userId, Long categoryId, String venue,
                           LocalDateTime startTime, LocalDateTime endTime, EventStatus status) {
        return Event.builder()
                .title(title)
                .description(description)
                .userId(userId)
                .categoryId(categoryId)
                .venue(venue)
                .startTime(startTime)
                .endTime(endTime)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();
    }
}