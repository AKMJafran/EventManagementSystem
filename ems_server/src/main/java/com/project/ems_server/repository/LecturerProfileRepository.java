package com.project.ems_server.repository;

import com.project.ems_server.entity.LecturerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LecturerProfileRepository extends JpaRepository<LecturerProfile, Long> {

    Optional<LecturerProfile> findByUserId(Long userId);

    Optional<LecturerProfile> findByStaffId(String staffId);

    boolean existsByStaffId(String staffId);
}
