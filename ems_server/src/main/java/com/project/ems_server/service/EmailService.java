package com.project.ems_server.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:EMS}")
    private String appName;

    /**
     * Sends OTP email for registration
     */
    @Async
    public void sendOtpEmail(String email, String otp) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject(appName + " - Registration OTP");

            String htmlContent = buildOtpEmail(otp, "Registration");
            helper.setText(htmlContent, true);

            javaMailSender.send(message);
        } catch (MessagingException e) {
            System.err.println("Failed to send OTP email: " + e.getMessage());
        }
    }

    /**
     * Sends OTP email for password reset
     */
    @Async
    public void sendPasswordResetEmail(String email, String otp) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject(appName + " - Password Reset OTP");

            String htmlContent = buildOtpEmail(otp, "Password Reset");
            helper.setText(htmlContent, true);

            javaMailSender.send(message);
        } catch (MessagingException e) {
            System.err.println("Failed to send password reset email: " + e.getMessage());
        }
    }

    /**
     * Sends event approved notification email to student
     */
    @Async
    public void sendEventApprovedEmail(String email, String eventTitle) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject(appName + " - Event Approved");

            String htmlContent = buildEventNotificationEmail(eventTitle, "approved", null);
            helper.setText(htmlContent, true);

            javaMailSender.send(message);
        } catch (MessagingException e) {
            System.err.println("Failed to send event approved email: " + e.getMessage());
        }
    }

    /**
     * Sends event rejected notification email to student
     */
    @Async
    public void sendEventRejectedEmail(String email, String eventTitle, String reason) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject(appName + " - Event Rejected");

            String htmlContent = buildEventNotificationEmail(eventTitle, "rejected", reason);
            helper.setText(htmlContent, true);

            javaMailSender.send(message);
        } catch (MessagingException e) {
            System.err.println("Failed to send event rejected email: " + e.getMessage());
        }
    }

    /**
     * Sends conflict alert email to admin
     */
    @Async
    public void sendConflictAlertEmail(String adminEmail, String event1Title, String event2Title) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(adminEmail);
            helper.setSubject(appName + " - Event Conflict Alert");

            String htmlContent = buildConflictAlertEmail(event1Title, event2Title);
            helper.setText(htmlContent, true);

            javaMailSender.send(message);
        } catch (MessagingException e) {
            System.err.println("Failed to send conflict alert email: " + e.getMessage());
        }
    }

    /**
     * Builds HTML content for OTP email
     */
    private String buildOtpEmail(String otp, String type) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; background-color: #f4f4f4; }" +
                ".container { max-width: 600px; margin: 50px auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }" +
                ".header { text-align: center; color: #333; }" +
                ".otp-box { background-color: #007bff; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }" +
                ".footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h2>Welcome to " + appName + "</h2>" +
                "</div>" +
                "<p>Hello,</p>" +
                "<p>Your " + type + " OTP is:</p>" +
                "<div class='otp-box'>" + otp + "</div>" +
                "<p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>" +
                "<div class='footer'>" +
                "<p>If you didn't request this, please ignore this email.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }

    /**
     * Builds HTML content for event notification email
     */
    private String buildEventNotificationEmail(String eventTitle, String status, String reason) {
        String statusMessage = status.equals("approved") ? 
                "Your event has been approved!" : 
                "Your event has been rejected.";

        String reasonContent = (reason != null && !reason.isEmpty()) ? 
                "<p><strong>Reason:</strong> " + reason + "</p>" : "";

        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; background-color: #f4f4f4; }" +
                ".container { max-width: 600px; margin: 50px auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }" +
                ".header { text-align: center; color: #333; }" +
                ".status-approved { color: #28a745; font-weight: bold; }" +
                ".status-rejected { color: #dc3545; font-weight: bold; }" +
                ".footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h2>" + appName + " - Event " + (status.equals("approved") ? "Approval" : "Rejection") + " Notification</h2>" +
                "</div>" +
                "<p>Hello,</p>" +
                "<p class='status-" + status + "'>" + statusMessage + "</p>" +
                "<p><strong>Event:</strong> " + eventTitle + "</p>" +
                reasonContent +
                "<p>Thank you for using " + appName + "!</p>" +
                "<div class='footer'>" +
                "<p>Please do not reply to this email.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }

    /**
     * Builds HTML content for conflict alert email
     */
    private String buildConflictAlertEmail(String event1Title, String event2Title) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; background-color: #f4f4f4; }" +
                ".container { max-width: 600px; margin: 50px auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }" +
                ".header { text-align: center; color: #dc3545; }" +
                ".alert-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }" +
                ".footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h2>⚠️ Event Conflict Alert</h2>" +
                "</div>" +
                "<p>Hello Admin,</p>" +
                "<p>A conflict has been detected between two events:</p>" +
                "<div class='alert-box'>" +
                "<p><strong>Event 1:</strong> " + event1Title + "</p>" +
                "<p><strong>Event 2:</strong> " + event2Title + "</p>" +
                "<p>Both events may have overlapping times or same venue. Please review and take action.</p>" +
                "</div>" +
                "<p>Please log in to the admin panel to manage this conflict.</p>" +
                "<div class='footer'>" +
                "<p>This is an automated alert from " + appName + ".</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }
}
