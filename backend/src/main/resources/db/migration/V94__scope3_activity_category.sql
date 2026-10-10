-- A Scope 3 activity entry could not say which of the fifteen categories it belonged to, so
-- nothing could read it into a reported figure. The codebase already said as much, in
-- EmissionActivityService.applyToScope: "Scope 3 has multiple categories, apply manually."
--
-- The consequence, which predates the supply-chain work: the catalogue seeds three Scope 3
-- factors (business air travel domestic and international, road freight) that any user can pick
-- on the Activity screen. Those entries appear in the activity list, are counted in no reported
-- figure, and vanish from the Emissions screen with nothing saying why.
--
-- Giving the entry its category is what the table was missing. Scope 1 and 2 need no such column
-- because each is a single series; Scope 3 is fifteen.

ALTER TABLE emission_activity_entry
    ADD COLUMN scope3_category_id UUID REFERENCES scope3_category (id) ON DELETE RESTRICT;

CREATE INDEX idx_activity_entry_scope3_category
    ON emission_activity_entry (scope3_category_id)
    WHERE scope3_category_id IS NOT NULL;

-- Nothing to backfill: no tenant has ever created one, precisely because the screen gave them no
-- way to say where it belonged.
