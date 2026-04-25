START TRANSACTION;

SET @admin_id := (
    SELECT id
    FROM users
    WHERE role = 'ADMIN'
    ORDER BY id
    LIMIT 1
);

-- Requires at least one ADMIN user because categories.created_by is non-null.
-- If your admin user id is different and the query above returns NULL, set @admin_id manually.

DELETE FROM categories;
ALTER TABLE categories AUTO_INCREMENT = 1;

INSERT INTO categories (name, parent_id, created_by, created_at)
VALUES ('Cultural', NULL, @admin_id, NOW());
SET @cultural_id := LAST_INSERT_ID();

INSERT INTO categories (name, parent_id, created_by, created_at)
VALUES ('Technical', NULL, @admin_id, NOW());
SET @technical_id := LAST_INSERT_ID();

INSERT INTO categories (name, parent_id, created_by, created_at)
VALUES ('Academic', NULL, @admin_id, NOW());
SET @academic_id := LAST_INSERT_ID();

INSERT INTO categories (name, parent_id, created_by, created_at)
VALUES ('Sports', NULL, @admin_id, NOW());
SET @sports_id := LAST_INSERT_ID();

INSERT INTO categories (name, parent_id, created_by, created_at) VALUES
('Music', @cultural_id, @admin_id, NOW()),
('Dance', @cultural_id, @admin_id, NOW()),
('Drama', @cultural_id, @admin_id, NOW()),
('Art Exhibition', @cultural_id, @admin_id, NOW()),
('Talent Show', @cultural_id, @admin_id, NOW());

INSERT INTO categories (name, parent_id, created_by, created_at) VALUES
('Hackathon', @technical_id, @admin_id, NOW()),
('Workshop', @technical_id, @admin_id, NOW()),
('Competition', @technical_id, @admin_id, NOW()),
('Exhibition', @technical_id, @admin_id, NOW());

INSERT INTO categories (name, parent_id, created_by, created_at) VALUES
('Seminar', @academic_id, @admin_id, NOW()),
('Guest Lecture', @academic_id, @admin_id, NOW()),
('Research Conference', @academic_id, @admin_id, NOW()),
('Academic Session', @academic_id, @admin_id, NOW());

INSERT INTO categories (name, parent_id, created_by, created_at) VALUES
('Football', @sports_id, @admin_id, NOW()),
('Cricket', @sports_id, @admin_id, NOW()),
('Basketball', @sports_id, @admin_id, NOW()),
('Badminton', @sports_id, @admin_id, NOW()),
('Athletics', @sports_id, @admin_id, NOW());

COMMIT;
