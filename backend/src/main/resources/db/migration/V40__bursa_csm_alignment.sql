-- Aligns the Bursa Common Sustainability Matters (CSM) taxonomy with Bursa Malaysia's actual list.
-- Bursa's Main Market issuers report 9 common matters: anti-corruption, community/society,
-- diversity, energy management, health & safety, labour practices & standards, supply chain
-- management, data privacy & security, and water. ACE Market issuers report those 9 plus waste
-- and emissions (11 total). V4/V37 diverged from this: the 9-matter (BURSA_MAIN) set included
-- "Climate Change & GHG Emissions" and "Waste Management" instead of "Water" and
-- "Community/Society", and the 11-matter (BURSA_ACE) set had a "Biodiversity & Ecosystem
-- Protection" matter that isn't part of Bursa's CSM list at all.
--
-- As with V37, ids are left untouched to avoid FK churn (matter_id is referenced by
-- indicator_definition and by tenant governance/materiality data) — only names/descriptions are
-- corrected, and the indicator(s) attached to each renamed matter are renamed to match.

-- BURSA_MAIN (9-matter set, ids 'BURSA-ACE-*'): swap Climate Change & GHG Emissions -> Water,
-- and Waste Management -> Community/Society.
UPDATE sustainability_matter
  SET name = 'Water',
      description = 'Monitor freshwater withdrawal volumes, water-stressed operating sites, recycling/reuse rates, and effluent discharge quality.'
  WHERE id = 'BURSA-ACE-1';

UPDATE sustainability_matter
  SET name = 'Community/Society',
      description = 'Track community investment, local engagement programmes, grievance mechanisms, and social impact in the areas where the company operates.'
  WHERE id = 'BURSA-ACE-3';

-- BURSA_ACE (11-matter set, ids 'BURSA-*'): swap Biodiversity & Ecosystem Protection ->
-- Community/Society, so the set is the corrected common 9 plus Waste (BURSA-4) and Emissions
-- (BURSA-1), matching Bursa's ACE Market requirement exactly.
UPDATE sustainability_matter
  SET name = 'Community/Society',
      description = 'Track community investment, local engagement programmes, grievance mechanisms, and social impact in the areas where the company operates.'
  WHERE id = 'BURSA-5';

-- Re-point the indicators that were attached to the renamed matters so their content matches the
-- new theme (renamed in place, not replaced, so existing indicator_value history stays intact).
UPDATE indicator_definition
  SET name = 'Municipal Fresh Water Intake', unit = 'm3', default_target = 1400, default_target_direction = 'DOWN'
  WHERE id = 'IND-BR-12'; -- was "Climate Change physical risks assessed" under the old BURSA-ACE-1

UPDATE indicator_definition
  SET name = 'Corporate Social Investment (CSI)', unit = 'MYR', default_target = 30000, default_target_direction = 'UP'
  WHERE id = 'IND-BR-14'; -- was "Waste Diverted from Landfill" under the old BURSA-ACE-3

UPDATE indicator_definition
  SET name = 'Corporate Social Investment (CSI)', unit = 'MYR', default_target = 30000, default_target_direction = 'UP'
  WHERE id = 'IND-BR-07'; -- was "Operational Sites Near High Conservation Value Areas" under the old BURSA-5
