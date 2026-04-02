package com.project.ems_server.factory;

import com.project.ems_server.entity.Event;
import com.project.ems_server.enums.EventStatus;

import java.time.LocalDateTime;

/**
 * Abstract Factory pattern for event creation.
 * Defines the interface for creating different types of events.
 */
public interface EventFactoryInterface {

    /**
     * Creates an event based on type.
     */
    Event createEvent(String title, String description, Long userId, Long categoryId, String venue,
                     LocalDateTime startTime, LocalDateTime endTime);

    /**
     * Creates an event with custom status.
     */
    Event createEvent(String title, String description, Long userId, Long categoryId, String venue,
                     LocalDateTime startTime, LocalDateTime endTime, EventStatus status);
}