-- Company-level view of platform_activity_log (V63), scoped to the caller's own company.
INSERT INTO permission (key, module, action, label, description, display_order) VALUES
    ('audit_log.view', 'audit_log', 'view', 'View Audit Log', 'View the company''s own signup, plan, support, and export activity history.', 160);
