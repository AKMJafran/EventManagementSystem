package com.project.ems_server.exception;

import org.springframework.http.HttpStatus;

public class FileServerException extends RuntimeException {

    private final HttpStatus status;
    private final String details;

    public FileServerException(HttpStatus status, String message, String details) {
        super(message);
        this.status = status;
        this.details = details;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getDetails() {
        return details;
    }
}