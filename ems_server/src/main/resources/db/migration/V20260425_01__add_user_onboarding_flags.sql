ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_first_login BIT(1) NOT NULL DEFAULT b'0';

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BIT(1) NOT NULL DEFAULT b'1';

UPDATE users
SET is_first_login = b'0'
WHERE is_first_login IS NULL;

UPDATE users
SET is_active = b'1'
WHERE is_active IS NULL;
