package com.project.ems_server.factory;

import com.project.ems_server.entity.Event;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.EventType;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Concrete Factory for urgent events that need immediate attention.
 * Demonstrates Abstract Factory pattern with different event types.
 */
@Component
public class UrgentEventFactory implements EventFactoryInterface {

    /**
     * Creates an urgent event with high priority status.
     */
    @Override
    public Event createEvent(String title, String description, Long userId, Long categoryId, String venue,
                           String imageData, LocalDateTime startTime, LocalDateTime endTime, EventType eventType) {
        return Event.builder()
                .title("[URGENT] " + title)
                .description(description + " (Urgent Event - Priority Approval)")
                .userId(userId)
                .categoryId(categoryId)
                .venue(venue)
                .imageData(imageData)
                .startTime(startTime)
                .endTime(endTime)
                .eventType(eventType)
                .status(EventStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
    }

    /**
     * Creates urgent event with custom status.
     */
    @Override
    public Event createEvent(String title, String description, Long userId, Long categoryId, String venue,
                           String imageData, LocalDateTime startTime, LocalDateTime endTime, EventStatus status, EventType eventType) {
        return Event.builder()
                .title("[URGENT] " + title)
                .description(description + " (Urgent Event)")
                .userId(userId)
                .categoryId(categoryId)
                .venue(venue)
                .imageData(imageData)
                .startTime(startTime)
                .endTime(endTime)
                .eventType(eventType)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();
    }
}