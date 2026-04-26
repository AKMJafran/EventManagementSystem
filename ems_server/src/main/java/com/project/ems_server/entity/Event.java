package com.project.ems_server.entity;

import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.EventType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "events")
public class Event {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @ManyToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    
    @Column(name = "category_id", nullable = false)
    private Long categoryId;
    
    @ManyToOne
    @JoinColumn(name = "category_id", insertable = false, updatable = false)
    private Category category;
    
    @Column(nullable = false)
    private String venue;
    
    @Column(nullable = false)
    private LocalDateTime startTime;
    
    @Column(nullable = false)
    private LocalDateTime endTime;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private EventType eventType;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status;
    
    @Column(columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "image_id", length = 255)
    private String imageId;

    @Column(name = "image_original_filename", length = 255)
    private String imageOriginalFilename;

    @Column(name = "image_content_type", length = 100)
    private String imageContentType;

    @Column(name = "image_uploaded_at")
    private LocalDateTime imageUploadedAt;

    @Column(name = "image_checksum", length = 64)
    private String imageChecksum;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = EventStatus.PENDING;
        }
    }
}
