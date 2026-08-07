-- IFRS S2 mandates 7 cross-industry metrics; only GHG emissions and (as free text) internal
-- carbon price existed. Adds structured fields for the other 5, plus promotes carbon pricing to a
-- structured value+currency (the existing `carbon_pricing` free-text column is kept as the
-- required "how it is applied in decision-making" narrative that accompanies the price).
ALTER TABLE ifrs_s2_disclosure ADD COLUMN transition_risk_asset_pct NUMERIC(5,2);
ALTER TABLE ifrs_s2_disclosure ADD COLUMN physical_risk_asset_pct NUMERIC(5,2);
ALTER TABLE ifrs_s2_disclosure ADD COLUMN climate_opportunity_asset_pct NUMERIC(5,2);
ALTER TABLE ifrs_s2_disclosure ADD COLUMN climate_capex NUMERIC(18,2);
ALTER TABLE ifrs_s2_disclosure ADD COLUMN climate_capex_currency VARCHAR(10) CHECK (climate_capex_currency IN ('MYR', 'USD', 'EUR'));
ALTER TABLE ifrs_s2_disclosure ADD COLUMN executive_remuneration_linked BOOLEAN;
ALTER TABLE ifrs_s2_disclosure ADD COLUMN executive_remuneration_description TEXT;
ALTER TABLE ifrs_s2_disclosure ADD COLUMN carbon_price_value NUMERIC(10,2);
ALTER TABLE ifrs_s2_disclosure ADD COLUMN carbon_price_currency VARCHAR(10) CHECK (carbon_price_currency IN ('MYR', 'USD', 'EUR'));
