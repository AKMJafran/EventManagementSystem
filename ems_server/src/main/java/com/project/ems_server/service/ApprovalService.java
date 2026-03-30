package com.project.ems_server.service;

import com.project.ems_server.entity.Event;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.observer.EventObserver;
import com.project.ems_server.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Singleton pattern implementation for event approval service.
 * Ensures only one instance handles approvals (Dean authority).
 */
@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final EventRepository eventRepository;
    private final List<EventObserver> observers; // Injected observers

    // Singleton instance (Spring manages this, but demonstrating pattern)
    private static ApprovalService instance;

    // Note: In Spring context, this is not needed as @Service makes it singleton.
    // This demonstrates the pattern conceptually.

    /**
     * Approves an event and notifies observers.
     * Shows business logic encapsulation and observer pattern.
     */
    public void approveEvent(Event event) {
        event.setStatus(EventStatus.APPROVED);
        eventRepository.save(event);
        notifyObservers(event);
    }

    /**
     * Rejects an event with reason and notifies observers.
     */
    public void rejectEvent(Event event, String reason) {
        event.setStatus(EventStatus.REJECTED);
        event.setRejectReason(reason);
        eventRepository.save(event);
        notifyObservers(event);
    }

    /**
     * Notifies all registered observers of event changes.
     */
    private void notifyObservers(Event event) {
        for (EventObserver observer : observers) {
            observer.update(event);
        }
    }
}