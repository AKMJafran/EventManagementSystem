package com.project.ems_server.service;

import com.project.ems_server.dto.request.LoginRequest;
import com.project.ems_server.dto.request.RegisterRequest;
import com.project.ems_server.dto.request.ResetPasswordRequest;
import com.project.ems_server.dto.request.VerifyOtpRequest;
import com.project.ems_server.dto.response.AuthResponse;
import com.project.ems_server.entity.RefreshToken;
import com.project.ems_server.entity.StudentProfile;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.OtpType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.RefreshTokenRepository;
import com.project.ems_server.repository.StudentProfileRepository;
import com.project.ems_server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Locale;

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

    /**
     * Registers a new user with isVerified=false and sends OTP email
     */
    public void register(RegisterRequest registerRequest) {
        String normalizedStudentNumber = registerRequest.getStudentNumber().trim();
        String normalizedEmail = registerRequest.getEmail().trim().toLowerCase(Locale.ROOT);

        // Check if user already exists
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new RuntimeException("Invalid registration: email is already in use.");
        }

        StudentProfile studentProfile = studentProfileRepository.findByStudentNumber(normalizedStudentNumber)
                .orElseThrow(() -> new RuntimeException("Invalid registration: student number is not pre-approved."));

        if (!studentProfile.getOfficialEmail().equalsIgnoreCase(normalizedEmail)) {
            throw new RuntimeException("Invalid registration: email does not match official university email.");
        }

        if (Boolean.TRUE.equals(studentProfile.getIsRegistered())) {
            throw new RuntimeException("Invalid registration: this student number is already registered.");
        }

        // Create new user
        User user = User.builder()
                .name(registerRequest.getName())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .role(Role.STUDENT)
                .isVerified(false)
                .build();

        userRepository.save(user);
        studentProfile.setIsRegistered(true);
        studentProfileRepository.save(studentProfile);

        // Generate and send OTP
        String otp = otpService.generateOtp();
        otpService.saveOtp(normalizedEmail, otp, OtpType.REGISTER);
        emailService.sendOtpEmail(normalizedEmail, otp);
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
        String profileUrl = user.getProfilePictureId() != null ? fileServerService.requestFileLink(user.getProfilePictureId()) : null;
        String accessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole().name(), user.getName(), profileUrl);
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

        String profileUrl = user.getProfilePictureId() != null ? fileServerService.requestFileLink(user.getProfilePictureId()) : null;
        String newAccessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole().name(), user.getName(), profileUrl);

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
        if (userRepository.findByEmail(email).isEmpty()) {
            throw new RuntimeException("User not found with email: " + email);
        }

        // Generate and send OTP
        String otp = otpService.generateOtp();
        otpService.saveOtp(email, otp, OtpType.RESET_PASSWORD);
        emailService.sendPasswordResetEmail(email, otp);
    }

    /**
     * Generates and sends OTP for registration verification
     */
    public void resendRegisterOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        if (user.getIsVerified()) {
            throw new RuntimeException("Account already verified.");
        }

        String otp = otpService.generateOtp();
        otpService.saveOtp(email, otp, OtpType.REGISTER);
        emailService.sendOtpEmail(email, otp);
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
