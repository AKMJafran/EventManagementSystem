package com.project.ems_server.observer;

/**
 * Decorator pattern for notification observers.
 * Adds logging functionality to existing observers.
 */
public abstract class NotificationDecorator implements EventObserver {

    protected EventObserver decoratedObserver;

    public NotificationDecorator(EventObserver observer) {
        this.decoratedObserver = observer;
    }

    @Override
    public void update(Event event) {
        // Pre-processing: log before notification
        logNotification(event);

        // Delegate to decorated observer
        decoratedObserver.update(event);

        // Post-processing: log after notification
        logCompletion(event);
    }

    protected abstract void logNotification(Event event);
    protected abstract void logCompletion(Event event);
}