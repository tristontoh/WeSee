-- Permission keys for the new AI-assisted drafting/Q&A feature: bring-your-own-key configuration,
-- everyday use of drafting/assistant features, and the admin-editable prompt template library.
-- ai.use is deliberately separate from ai.manage so a company can grant a Contributor the ability
-- to use AI drafting without ever exposing the API key configuration to them.

INSERT INTO permission (key, module, action, label, description, display_order) VALUES
    ('ai.view', 'ai', 'view', 'View AI Settings', 'View the AI provider configuration and usage dashboard.', 140),
    ('ai.manage', 'ai', 'manage', 'Manage AI Settings', 'Configure the company''s AI provider and API key.', 141),
    ('ai.use', 'ai', 'use', 'Use AI Features', 'Use AI-assisted drafting and the Q&A assistant.', 142),

    ('prompts.view', 'prompts', 'view', 'View Prompt Templates', 'View the AI prompt template library.', 150),
    ('prompts.manage', 'prompts', 'manage', 'Manage Prompt Templates', 'Edit and reset AI prompt templates.', 151);
