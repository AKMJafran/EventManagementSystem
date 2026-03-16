package com.project.ems_server.repository;

import com.project.ems_server.entity.OtpVerification;
import com.project.ems_server.enums.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findByEmailAndOtpAndIsUsedFalse(String email, String otp);
    
    Optional<OtpVerification> findByEmailAndTypeAndIsUsedFalse(String email, OtpType type);
    

    void deleteByEmail(String email);
}
