package com.project.ems_server.service;

import com.project.ems_server.dto.request.ChangePasswordRequest;
import com.project.ems_server.dto.request.LoginRequest;
import com.project.ems_server.dto.request.ResetPasswordRequest;
import com.project.ems_server.dto.response.AuthResponse;
import com.project.ems_server.entity.RefreshToken;
import com.project.ems_server.entity.StudentProfile;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.OtpType;
import com.project.ems_server.repository.RefreshTokenRepository;
import com.project.ems_server.repository.StudentProfileRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpService otpService;
    private final EmailService emailService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final FileServerService fileServerService;

    public AuthResponse login(LoginRequest loginRequest) {
        String identifier = loginRequest.getEmail().trim();

        // Try to find user by email first, then by student registration number
        User user = userRepository.findByEmail(identifier)
                .orElseGet(() -> {
                    StudentProfile profile = studentProfileRepository.findByStudentNumber(identifier)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    return userRepository.findByEmail(profile.getOfficialEmail())
                            .orElseThrow(() -> new RuntimeException("User not found"));
                });

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("Account is inactive. Please contact an administrator.");
        }

        // Always authenticate with the user's actual email
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getEmail(),
                        loginRequest.getPassword()
                )
        );

        if (!Boolean.TRUE.equals(user.getIsVerified())) {
            throw new RuntimeException("User email not verified. Please verify your email first.");
        }

        String profileUrl = user.getProfilePictureId() != null
                ? fileServerService.buildFileAccessUrl(user.getProfilePictureId())
                : null;
        String accessToken = jwtService.generateAccessToken(
                user.getEmail(),
                user.getRole().name(),
                user.getName(),
                profileUrl
        );
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        refreshTokenRepository.save(RefreshToken.builder()
                .userId(user.getId())
                .token(refreshToken)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .email(user.getEmail())
                .mustChangePassword(Boolean.TRUE.equals(user.getIsFirstLogin()))
                .build();
    }

    public AuthResponse refreshToken(String token) {
        if (!jwtService.validateToken(token)) {
            throw new RuntimeException("Invalid refresh token");
        }

        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Refresh token not found in database"));

        if (LocalDateTime.now().isAfter(refreshToken.getExpiresAt())) {
            refreshTokenRepository.delete(refreshToken);
            throw new RuntimeException("Refresh token has expired");
        }

        String email = jwtService.extractEmail(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            refreshTokenRepository.delete(refreshToken);
            throw new RuntimeException("Account is inactive. Please contact an administrator.");
        }

        String profileUrl = user.getProfilePictureId() != null
                ? fileServerService.buildFileAccessUrl(user.getProfilePictureId())
                : null;
        String newAccessToken = jwtService.generateAccessToken(
                user.getEmail(),
                user.getRole().name(),
                user.getName(),
                profileUrl
        );

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(token)
                .role(user.getRole().name())
                .email(user.getEmail())
                .mustChangePassword(Boolean.TRUE.equals(user.getIsFirstLogin()))
                .build();
    }

    public void sendResetOtp(String email) {
        if (userRepository.findByEmail(email).isEmpty()) {
            throw new RuntimeException("User not found with email: " + email);
        }

        String otp = otpService.generateOtp();
        otpService.saveOtp(email, otp, OtpType.RESET_PASSWORD);
        emailService.sendPasswordResetEmail(email, otp);
    }

    public void resetPassword(ResetPasswordRequest resetPasswordRequest) {
        otpService.validateOtp(resetPasswordRequest.getEmail(), resetPasswordRequest.getOtp(), OtpType.RESET_PASSWORD);

        User user = userRepository.findByEmail(resetPasswordRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(resetPasswordRequest.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    public void changePassword(String email, ChangePasswordRequest changePasswordRequest) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("Account is inactive. Please contact an administrator.");
        }

        if (!passwordEncoder.matches(changePasswordRequest.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        if (!changePasswordRequest.getNewPassword().equals(changePasswordRequest.getConfirmPassword())) {
            throw new RuntimeException("New password and confirmation password do not match");
        }

        if (changePasswordRequest.getNewPassword().equals(changePasswordRequest.getCurrentPassword())) {
            throw new RuntimeException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(changePasswordRequest.getNewPassword()));
        user.setIsFirstLogin(false);
        userRepository.save(user);
    }
}
