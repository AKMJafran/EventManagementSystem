package com.project.ems_server.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    
    private Long id;

    private Long userId;

    private String title;
    
    private String message;
    
    private String type;
    
    private Boolean isRead;

    private String recipientName;

    private String recipientEmail;

    private String recipientRole;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
