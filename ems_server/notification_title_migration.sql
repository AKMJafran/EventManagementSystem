ALTER TABLE notifications
ADD COLUMN title VARCHAR(255) NULL AFTER user_id;

UPDATE notifications
SET title = CASE type
    WHEN 'EVENT_APPROVED' THEN 'Event Approved'
    WHEN 'EVENT_REJECTED' THEN 'Event Rejected'
    WHEN 'CONFLICT' THEN 'Conflict Alert'
    WHEN 'REMINDER' THEN 'Event Reminder'
    ELSE 'General Notification'
END
WHERE title IS NULL OR title = '';
