CREATE TABLE IF NOT EXISTS student_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_number VARCHAR(50) NOT NULL UNIQUE,
    official_email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(10) NOT NULL,
    batch_year INT NOT NULL,
    is_registered BOOLEAN NOT NULL DEFAULT FALSE
);
