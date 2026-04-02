package com.project.ems_server.factory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Abstract Factory for event creation.
 * Decides which concrete factory to use based on event type.
 */
@Component
public class EventAbstractFactory {

    @Autowired
    private EventFactory standardFactory;

    @Autowired
    private UrgentEventFactory urgentFactory;

    /**
     * Returns the appropriate factory based on urgency.
     */
    public EventFactoryInterface getFactory(boolean isUrgent) {
        return isUrgent ? urgentFactory : standardFactory;
    }
}