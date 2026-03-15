package com.project.ems_server.controller;

import com.project.ems_server.dto.request.LoginRequest;
import com.project.ems_server.dto.request.RegisterRequest;
import com.project.ems_server.dto.request.ResetPasswordRequest;
import com.project.ems_server.dto.request.VerifyOtpRequest;
import com.project.ems_server.dto.response.AuthResponse;
import com.project.ems_server.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Register endpoint
     */
    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.register(registerRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body("User registered successfully. Please verify your email using the OTP sent to your email.");
    }

    /**
     * Verify OTP endpoint
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(@Valid @RequestBody VerifyOtpRequest verifyOtpRequest) {
        authService.verifyOtp(verifyOtpRequest);
        return ResponseEntity.ok("Email verified successfully. You can now login.");
    }

    /**
     * Login endpoint
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        AuthResponse authResponse = authService.login(loginRequest);
        return ResponseEntity.ok(authResponse);
    }

    /**
     * Refresh token endpoint
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshToken(@RequestHeader("Authorization") String token) {
        // Extract token from "Bearer {token}"
        String jwtToken = token.substring("Bearer ".length());
        AuthResponse authResponse = authService.refreshToken(jwtToken);
        return ResponseEntity.ok(authResponse);
    }

    /**
     * Send reset OTP endpoint
     */
    @PostMapping("/send-reset-otp")
    public ResponseEntity<String> sendResetOtp(@RequestParam String email) {
        authService.sendResetOtp(email);
        return ResponseEntity.ok("OTP sent to your email for password reset.");
    }

    /**
     * Reset password endpoint
     */
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest resetPasswordRequest) {
        authService.resetPassword(resetPasswordRequest);
        return ResponseEntity.ok("Password reset successfully. Please login with your new password.");
    }
}
