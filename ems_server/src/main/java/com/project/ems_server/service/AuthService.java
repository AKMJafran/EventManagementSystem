package com.project.ems_server.service;

import com.project.ems_server.dto.request.LoginRequest;
import com.project.ems_server.dto.request.RegisterRequest;
import com.project.ems_server.dto.request.ResetPasswordRequest;
import com.project.ems_server.dto.request.VerifyOtpRequest;
import com.project.ems_server.dto.response.AuthResponse;
import com.project.ems_server.entity.RefreshToken;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.OtpType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.RefreshTokenRepository;
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
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpService otpService;
    private final EmailService emailService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    /**
     * Registers a new user with isVerified=false and sends OTP email
     */
    public void register(RegisterRequest registerRequest) {
        // Check if user already exists
        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            throw new RuntimeException("User already exists with email: " + registerRequest.getEmail());
        }

        // Create new user
        User user = User.builder()
                .name(registerRequest.getName())
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .role(Role.STUDENT)
                .isVerified(false)
                .build();

        userRepository.save(user);

        // Generate and send OTP
        String otp = otpService.generateOtp();
        otpService.saveOtp(registerRequest.getEmail(), otp, OtpType.REGISTER);
        emailService.sendOtpEmail(registerRequest.getEmail(), otp);
    }

    /**
     * Verifies OTP and sets isVerified=true
     */
    public void verifyOtp(VerifyOtpRequest verifyOtpRequest) {
        // Validate OTP
        otpService.validateOtp(verifyOtpRequest.getEmail(), verifyOtpRequest.getOtp(), OtpType.REGISTER);

        // Find user and set verified
        User user = userRepository.findByEmail(verifyOtpRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setIsVerified(true);
        userRepository.save(user);
    }

    /**
     * Authenticates user and generates JWT tokens
     */
    public AuthResponse login(LoginRequest loginRequest) {
        // Authenticate user
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        // Find user
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if verified
        if (!user.getIsVerified()) {
            throw new RuntimeException("User email not verified. Please verify your email first.");
        }

        // Generate tokens
        String accessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        // Save refresh token to DB
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .userId(user.getId())
                .token(refreshToken)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .email(user.getEmail())
                .build();
    }

    /**
     * Validates refresh token and issues new access token
     */
    public AuthResponse refreshToken(String token) {
        // Validate refresh token
        if (!jwtService.validateToken(token)) {
            throw new RuntimeException("Invalid refresh token");
        }

        // Find token in DB
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Refresh token not found in database"));

        // Check if expired
        if (LocalDateTime.now().isAfter(refreshToken.getExpiresAt())) {
            refreshTokenRepository.delete(refreshToken);
            throw new RuntimeException("Refresh token has expired");
        }

        // Extract email and generate new access token
        String email = jwtService.extractEmail(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newAccessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(token)
                .role(user.getRole().name())
                .email(user.getEmail())
                .build();
    }

    /**
     * Generates and sends OTP for password reset
     */
    public void sendResetOtp(String email) {
        // Check if user exists
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        // Generate and send OTP
        String otp = otpService.generateOtp();
        otpService.saveOtp(email, otp, OtpType.RESET_PASSWORD);
        emailService.sendPasswordResetEmail(email, otp);
    }

    /**
     * Validates OTP and updates password
     */
    public void resetPassword(ResetPasswordRequest resetPasswordRequest) {
        // Validate OTP
        otpService.validateOtp(resetPasswordRequest.getEmail(), resetPasswordRequest.getOtp(), OtpType.RESET_PASSWORD);

        // Find user and update password
        User user = userRepository.findByEmail(resetPasswordRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(resetPasswordRequest.getNewPassword()));
        userRepository.save(user);

        // Delete all existing refresh tokens for this user
        refreshTokenRepository.deleteByUserId(user.getId());
    }
}
