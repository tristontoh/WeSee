-- Ratio indicators stop being free-text fields. IND-WAT-02 currently holds 103% for a percentage
-- that cannot exceed 100 — that is what a ratio looks like when nothing checks its inputs.
--
-- The extension point already existed: aggregation_rule decides per definition whether an annual
-- value is typed or computed, and IndicatorService.setValue already refuses manual writes to a
-- computed indicator. This adds a fifth value to that enum rather than a parallel mechanism.
--
-- Existing typed values are NOT overwritten. They keep their number and are flagged
-- SUPERSEDED_MANUAL, so a user who signed off a year against a typed figure still sees what they
-- signed. The 103% is evidence of the problem; erasing it would hide what this change fixes.

-- V50 created this constraint inline, so Postgres named it. Widen it rather than leave DERIVED
-- rejected at the database even though the Java enum allows it.
ALTER TABLE indicator_definition DROP CONSTRAINT indicator_definition_aggregation_rule_check;
ALTER TABLE indicator_definition ADD CONSTRAINT indicator_definition_aggregation_rule_check
    CHECK (aggregation_rule IN ('SUM', 'LATEST', 'AVERAGE', 'COUNT', 'DIRECT_ANNUAL', 'DERIVED'));

ALTER TABLE indicator_definition ADD COLUMN derivation_key VARCHAR(50);

ALTER TABLE indicator_definition ADD CONSTRAINT indicator_definition_derivation_consistent CHECK (
    (aggregation_rule = 'DERIVED' AND derivation_key IS NOT NULL)
    OR (aggregation_rule <> 'DERIVED' AND derivation_key IS NULL)
);

ALTER TABLE indicator_value ADD COLUMN derivation_state VARCHAR(20)
    CHECK (derivation_state IN ('COMPUTED', 'AWAITING_INPUTS', 'SUPERSEDED_MANUAL'));

-- Carbon intensity has no definition in the catalogue, and it is the headline intensity metric
-- every framework asks for. Its two inputs are the figures this platform is already best at
-- producing, so it costs one row to add and nothing to maintain.
INSERT INTO indicator_definition
    (id, name, unit, matter_id, category, is_sector_specific, aggregation_rule, derivation_key)
SELECT 'IND-ENG-04', 'Carbon Intensity per Revenue', 'tCO2e/RM mil',
       d.matter_id, d.category, FALSE, 'DERIVED', 'CARBON_INTENSITY_REVENUE'
FROM indicator_definition d
WHERE d.id = 'IND-ENG-02';

-- The twelve derivations over existing definitions. BR-01/BR-12, BR-03/BR-17 and the rest are the
-- same metric listed once for Bursa Main and once for ACE; one formula key serves both copies.
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'ENERGY_INTENSITY_REVENUE'     WHERE id IN ('IND-BR-05', 'IND-BR-13');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'FEMALE_BOARD_RATIO'           WHERE id IN ('IND-BR-03', 'IND-BR-17');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'LOST_TIME_INCIDENT_RATE'      WHERE id IN ('IND-BR-04', 'IND-BR-18');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'WASTE_DIVERTED_RATE'          WHERE id IN ('IND-BR-06', 'IND-BR-14');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'ANTICORRUPTION_TRAINING_RATE' WHERE id IN ('IND-BR-08', 'IND-BR-15', 'IND-GOV-01');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'SUPPLIER_ASSESSMENT_RATE'     WHERE id IN ('IND-BR-11', 'IND-BR-20');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'CLIMATE_RISK_SITE_COVERAGE'   WHERE id IN ('IND-BR-01', 'IND-BR-12');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'HCV_SITE_PROXIMITY'           WHERE id = 'IND-BR-07';
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'TRAINING_HOURS_PER_EMPLOYEE'  WHERE id = 'IND-LAB-01';
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'VOLUNTARY_TURNOVER_RATE'      WHERE id = 'IND-LAB-02';
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'WATER_RECYCLING_RATE'         WHERE id = 'IND-WAT-02';
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'MATERIAL_CONVERSION_RATE'     WHERE id = 'IND-SEC-MFG-01';

-- Every value already stored against a now-derived indicator keeps its number and says so.
UPDATE indicator_value v
SET derivation_state = 'SUPERSEDED_MANUAL'
FROM indicator_definition d
WHERE d.id = v.indicator_definition_id
  AND d.aggregation_rule = 'DERIVED';
