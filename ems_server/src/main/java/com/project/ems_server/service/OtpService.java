package com.project.ems_server.service;

import com.project.ems_server.entity.OtpVerification;
import com.project.ems_server.enums.OtpType;
import com.project.ems_server.repository.OtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpRepository otpRepository;

    /**
     * Generates a random 6-digit OTP string
     */
    public String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    /**
     * Saves OTP to the database with 10 minute expiry
     */
    @Transactional
    public void saveOtp(String email, String otp, OtpType type) {
        // Delete any existing OTP for this email to avoid duplicates
        otpRepository.deleteByEmail(email);

        OtpVerification otpVerification = OtpVerification.builder()
                .email(email)
                .otp(otp)
                .type(type)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .isUsed(false)
                .build();

        otpRepository.save(otpVerification);
    }

    /**
     * Validates OTP from the database, marks it as used, and throws exception if invalid/expired
     */
    public void validateOtp(String email, String otp, OtpType type) {
        OtpVerification otpVerification = otpRepository.findByEmailAndOtpAndIsUsedFalse(email, otp)
                .orElseThrow(() -> new RuntimeException("Invalid OTP"));

        if (!otpVerification.getType().equals(type)) {
            throw new RuntimeException("OTP type mismatch");
        }

        if (LocalDateTime.now().isAfter(otpVerification.getExpiresAt())) {
            throw new RuntimeException("OTP has expired");
        }

        // Mark OTP as used
        otpVerification.setIsUsed(true);
        otpRepository.save(otpVerification);
    }
}
