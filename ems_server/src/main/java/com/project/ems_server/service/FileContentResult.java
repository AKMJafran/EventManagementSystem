package com.project.ems_server.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class FileContentResult {
    private byte[] content;
    private String contentType;
    private String contentDisposition;
}
