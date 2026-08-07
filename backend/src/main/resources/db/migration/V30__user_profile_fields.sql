ALTER TABLE app_user
    ADD COLUMN phone VARCHAR(50),
    ADD COLUMN date_of_birth DATE,
    ADD COLUMN address TEXT,
    ADD COLUMN bio TEXT,
    ADD COLUMN avatar_path VARCHAR(500),
    ADD COLUMN avatar_original_name VARCHAR(255);
