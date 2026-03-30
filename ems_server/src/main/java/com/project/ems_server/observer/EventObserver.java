package com.project.ems_server.observer;

/**
 * Observer pattern interface for event notifications.
 * Demonstrates behavioral design pattern in advanced Java.
 */
public interface EventObserver {

    /**
     * Called when an event status changes.
     */
    void update(com.project.ems_server.entity.Event event);
}