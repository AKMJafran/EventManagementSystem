package com.project.ems_server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_number", nullable = false, unique = true, length = 50)
    private String studentNumber;

    @Column(name = "official_email", nullable = false, unique = true, length = 255)
    private String officialEmail;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(nullable = false, length = 10)
    private String department;

    @Column(name = "batch_year", nullable = false)
    private Integer batchYear;

    @Column(name = "is_registered", nullable = false)
    private Boolean isRegistered;

    @PrePersist
    protected void onCreate() {
        if (isRegistered == null) {
            isRegistered = false;
        }
    }
}