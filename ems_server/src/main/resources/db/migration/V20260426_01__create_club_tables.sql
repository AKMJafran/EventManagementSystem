CREATE TABLE IF NOT EXISTS clubs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    type VARCHAR(50) NOT NULL,
    president_id BIGINT NOT NULL,
    senior_treasurer_lecturer_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    rejection_reason VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT pk_clubs PRIMARY KEY (id),
    CONSTRAINT uk_club_name UNIQUE (name),
    CONSTRAINT fk_clubs_president FOREIGN KEY (president_id) REFERENCES users (id),
    CONSTRAINT fk_clubs_senior_treasurer FOREIGN KEY (senior_treasurer_lecturer_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS club_memberships (
    id BIGINT NOT NULL AUTO_INCREMENT,
    club_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    member_role VARCHAR(50) NOT NULL,
    joined_at DATETIME NOT NULL,
    CONSTRAINT pk_club_memberships PRIMARY KEY (id),
    CONSTRAINT uk_club_membership_club_user UNIQUE (club_id, user_id),
    CONSTRAINT fk_club_memberships_club FOREIGN KEY (club_id) REFERENCES clubs (id),
    CONSTRAINT fk_club_memberships_user FOREIGN KEY (user_id) REFERENCES users (id)
);
