package com.project.ems_server.repository;

import com.project.ems_server.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByStudentNumber(String studentNumber);

    Optional<StudentProfile> findByOfficialEmail(String officialEmail);

    boolean existsByStudentNumber(String studentNumber);

    boolean existsByOfficialEmail(String officialEmail);
}
