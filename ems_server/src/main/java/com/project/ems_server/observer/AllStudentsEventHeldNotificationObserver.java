package com.project.ems_server.observer;

import com.project.ems_server.entity.Event;
import com.project.ems_server.entity.User;
import com.project.ems_server.enums.EventStatus;
import com.project.ems_server.enums.NotificationType;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Sends a notification to all students when an event is approved and will be held.
 */
@Component
@RequiredArgsConstructor
public class AllStudentsEventHeldNotificationObserver implements EventObserver {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @Override
    public void update(Event event) {
        if (event.getStatus() == EventStatus.APPROVED) {
            List<User> students = userRepository.findByRole(Role.STUDENT);
            if (students.isEmpty()) {
                return;
            }

            String eventTitle = event.getTitle();
            String venue = event.getVenue();
            String schedule = String.format("%s to %s", event.getStartTime(), event.getEndTime());
            String notificationMessage = String.format(
                    "🎉 Event '%s' has been approved and will be held at %s (%s). Check the calendar for details.",
                    eventTitle,
                    venue,
                    schedule
            );

            for (User student : students) {
                if (student.getId().equals(event.getUserId())) {
                    continue; // the creator already receives a dedicated approval notification
                }
                notificationService.createNotification(student.getId(), notificationMessage, NotificationType.GENERAL);
            }
        }
    }
}
