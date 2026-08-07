-- Corrects three data bugs in the Bursa reference data seeded by V4, found while auditing the
-- app against the SRS/PRD/BRD. Bursa's Listing Requirements (amended 23 Dec 2024) require Main
-- Market issuers to report 9 common matters and ACE Market issuers to report 11.

-- Bug 1: matter_set was assigned backwards. The 11-matter block (id prefix 'BURSA-') was labelled
-- BURSA_MAIN and the 9-matter block (id prefix 'BURSA-ACE-') was labelled BURSA_ACE — i.e. Main
-- Market issuers were shown 11 matters and ACE Market issuers were shown 9, the exact inverse of
-- the requirement. Swap the labels; ids are left untouched to avoid any FK churn (matter_id is
-- referenced by indicator_definition and by tenant governance/materiality data).
UPDATE sustainability_matter SET matter_set = 'BURSA_ACE' WHERE id LIKE 'BURSA-%' AND id NOT LIKE 'BURSA-ACE-%';
UPDATE sustainability_matter SET matter_set = 'BURSA_MAIN' WHERE id LIKE 'BURSA-ACE-%';

-- Bug 2: 3 of the 4 seeded Bursa indicators were attached to the wrong matter.
UPDATE indicator_definition SET matter_id = 'BURSA-3' WHERE id = 'IND-BR-02'; -- Water Withdrawal: was under Energy Efficiency (BURSA-2), belongs under Water Conservation
UPDATE indicator_definition SET matter_id = 'BURSA-8' WHERE id = 'IND-BR-03'; -- Female Board Representation: was under Waste & Circularity (BURSA-4), belongs under Board & Workforce Diversity
UPDATE indicator_definition SET matter_id = 'BURSA-9' WHERE id = 'IND-BR-04'; -- LTIR: was under Biodiversity (BURSA-5), belongs under Occupational Safety & Health

-- Bug 3: most Bursa matters had zero indicator definitions, so tenants had a matter listed for
-- materiality/governance but no field to actually enter the disclosure data for it. The
-- BURSA-ACE-* matter set (formerly mislabelled) had none at all. Add one indicator per
-- previously-uncovered matter so every Bursa matter in both sets has at least one.

-- Remaining uncovered matters from the (now correctly BURSA_ACE-labelled) 11-matter set:
INSERT INTO indicator_definition (id, name, unit, matter_id, category, is_sector_specific, default_target, default_target_direction) VALUES
('IND-BR-05', 'Energy Intensity per Revenue', 'MWh/RM mil', 'BURSA-2', 'ENVIRONMENTAL', FALSE, 120.0, 'DOWN'),
('IND-BR-06', 'Waste Diverted from Landfill', '%', 'BURSA-4', 'ENVIRONMENTAL', FALSE, 50.0, 'UP'),
('IND-BR-07', 'Operational Sites Near High Conservation Value Areas', '% sites', 'BURSA-5', 'ENVIRONMENTAL', FALSE, 0.0, 'DOWN'),
('IND-BR-08', 'Employees Trained on Anti-Corruption Policy', '%', 'BURSA-6', 'GOVERNANCE', FALSE, 100.0, 'UP'),
('IND-BR-09', 'Data Breach Incidents Reported', 'Cases', 'BURSA-7', 'GOVERNANCE', FALSE, 0.0, 'DOWN'),
('IND-BR-10', 'Human Rights Grievances Recorded', 'Cases', 'BURSA-10', 'SOCIAL', FALSE, 0.0, 'DOWN'),
('IND-BR-11', 'Tier-1 Suppliers Assessed for ESG Compliance', '%', 'BURSA-11', 'ENVIRONMENTAL', FALSE, 80.0, 'UP');

-- All 9 matters of the (now correctly BURSA_MAIN-labelled) 9-matter set had zero indicators:
INSERT INTO indicator_definition (id, name, unit, matter_id, category, is_sector_specific, default_target, default_target_direction) VALUES
('IND-BR-12', 'Climate Change physical risks assessed', '% sites', 'BURSA-ACE-1', 'ENVIRONMENTAL', FALSE, 100.0, 'UP'),
('IND-BR-13', 'Energy Intensity per Revenue', 'MWh/RM mil', 'BURSA-ACE-2', 'ENVIRONMENTAL', FALSE, 120.0, 'DOWN'),
('IND-BR-14', 'Waste Diverted from Landfill', '%', 'BURSA-ACE-3', 'ENVIRONMENTAL', FALSE, 50.0, 'UP'),
('IND-BR-15', 'Employees Trained on Anti-Corruption Policy', '%', 'BURSA-ACE-4', 'GOVERNANCE', FALSE, 100.0, 'UP'),
('IND-BR-16', 'Data Breach Incidents Reported', 'Cases', 'BURSA-ACE-5', 'GOVERNANCE', FALSE, 0.0, 'DOWN'),
('IND-BR-17', 'Female Board Representation Ratio', '%', 'BURSA-ACE-6', 'SOCIAL', FALSE, 30.0, 'UP'),
('IND-BR-18', 'Lost Time Incident Rate (LTIR)', 'Rate', 'BURSA-ACE-7', 'SOCIAL', FALSE, 0.0, 'DOWN'),
('IND-BR-19', 'Human Rights Grievances Recorded', 'Cases', 'BURSA-ACE-8', 'SOCIAL', FALSE, 0.0, 'DOWN'),
('IND-BR-20', 'Tier-1 Suppliers Assessed for ESG Compliance', '%', 'BURSA-ACE-9', 'ENVIRONMENTAL', FALSE, 80.0, 'UP');
