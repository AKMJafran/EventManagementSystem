package com.project.ems_server.entity;

import com.project.ems_server.enums.ClubStatus;
import com.project.ems_server.enums.ClubType;
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
@Table(
        name = "clubs",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_club_name", columnNames = "name")
        }
)
public class Club {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ClubType type;

    @Column(name = "president_id", nullable = false)
    private Long presidentId;

    @ManyToOne
    @JoinColumn(name = "president_id", insertable = false, updatable = false)
    private User president;

    @Column(name = "senior_treasurer_lecturer_id", nullable = false)
    private Long seniorTreasurerLecturerId;

    @ManyToOne
    @JoinColumn(name = "senior_treasurer_lecturer_id", insertable = false, updatable = false)
    private User seniorTreasurerLecturer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ClubStatus status;

    @Column(length = 500)
    private String rejectionReason;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = ClubStatus.PENDING_TREASURER;
        }
    }
}
