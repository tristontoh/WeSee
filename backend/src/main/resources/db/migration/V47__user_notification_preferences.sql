-- Per-user notification preferences, editable via /api/v1/users/me/notification-preferences.
-- 1:1 with app_user; a row is created lazily on first update, not at registration.

CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES app_user (id) ON DELETE CASCADE,
    report_deadline_reminders BOOLEAN NOT NULL DEFAULT true,
    team_activity_alerts BOOLEAN NOT NULL DEFAULT true,
    compliance_alerts BOOLEAN NOT NULL DEFAULT true,
    weekly_digest BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
