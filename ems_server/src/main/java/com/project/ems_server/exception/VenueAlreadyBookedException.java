package com.project.ems_server.exception;

/**
 * Custom exception for venue booking conflicts.
 * Demonstrates exception handling in advanced Java.
 */
public class VenueAlreadyBookedException extends RuntimeException {

    public VenueAlreadyBookedException(String message) {
        super(message);
    }

    public VenueAlreadyBookedException(String message, Throwable cause) {
        super(message, cause);
    }
}