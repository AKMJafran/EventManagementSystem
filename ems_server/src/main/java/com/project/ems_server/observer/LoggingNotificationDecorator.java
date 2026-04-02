package com.project.ems_server.observer;

import com.project.ems_server.entity.Event;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Concrete Decorator that adds logging to notifications.
 * Demonstrates Decorator pattern in advanced Java.
 */
public class LoggingNotificationDecorator extends NotificationDecorator {

    private static final Logger logger = LoggerFactory.getLogger(LoggingNotificationDecorator.class);

    public LoggingNotificationDecorator(EventObserver observer) {
        super(observer);
    }

    @Override
    protected void logNotification(Event event) {
        logger.info("Sending notification for event: {} with status: {}", event.getTitle(), event.getStatus());
    }

    @Override
    protected void logCompletion(Event event) {
        logger.info("Notification sent successfully for event: {}", event.getTitle());
    }
}