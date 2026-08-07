-- Extended profile fields for app_user, editable by the user themselves via /api/v1/users/me.
-- 1:1 with app_user; a row is created lazily on first profile update, not at registration.

CREATE TABLE user_details (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES app_user (id) ON DELETE CASCADE,
    phone VARCHAR(30),
    job_title VARCHAR(150),
    department VARCHAR(150),
    bio TEXT,
    avatar_color VARCHAR(7) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
