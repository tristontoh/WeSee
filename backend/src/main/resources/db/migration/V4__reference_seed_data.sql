-- Seed reference data extracted verbatim from the existing frontend mocks so the backend
-- matches what the UI already expects.

-- SEDG matters (6) — SME Starter/Growth
INSERT INTO sustainability_matter (id, name, category, description, matter_set) VALUES
('SEDG-1', 'Energy Consumption & GHG Footprint', 'ENVIRONMENTAL', 'Track and report scope 1 & 2 energy values (fuel combustion, commercial grid electrical inputs) to compute carbon equivalents.', 'SEDG'),
('SEDG-2', 'Water Management', 'ENVIRONMENTAL', 'Monitor conservation, overall clean freshwater withdrawals, operational recycling efficiencies, and wastewater effluents.', 'SEDG'),
('SEDG-3', 'Waste & Materials Management', 'ENVIRONMENTAL', 'Track volume metrics for solid hazardous/non-hazardous waste, recycling diversion rates, and materials circularity loops.', 'SEDG'),
('SEDG-4', 'Labor Standards & Human Rights', 'SOCIAL', 'Ensure fair compensation benchmarks, limit excessive overtime, eradicate child or forced labor, and align with statutory labor codes.', 'SEDG'),
('SEDG-5', 'Occupational Health & Safety (OHS)', 'SOCIAL', 'Proactively limit workplace physical injuries, secure statutory hazard safety certifications, and track safety drill indexes.', 'SEDG'),
('SEDG-6', 'Business Ethics & Anti-Corruption', 'GOVERNANCE', 'Secure active compliance parameters with Section 17A MACC provisions, mandate anti-corruption pledges, and audit governance rules.', 'SEDG');

-- Bursa Main Market matters (11) — Issuer-Ready + Main Market
INSERT INTO sustainability_matter (id, name, category, description, matter_set) VALUES
('BURSA-1', 'Climate Change & GHG Emissions', 'ENVIRONMENTAL', 'Rigorous disclosure of Scope 1, 2, and 3 emissions. Track regulatory decarbonization milestones aligned with NSRF criteria.', 'BURSA_MAIN'),
('BURSA-2', 'Energy Efficiency', 'ENVIRONMENTAL', 'Maximize energy intensity reductions, adopt clean thermal/electricity generation, and integrate smart grids.', 'BURSA_MAIN'),
('BURSA-3', 'Water Conservation', 'ENVIRONMENTAL', 'Optimize industrial water balance schemas. Protect water-stressed regional aquifers of operations.', 'BURSA_MAIN'),
('BURSA-4', 'Waste & Circularity', 'ENVIRONMENTAL', 'Eradicate direct landfill loads, secure verified hazardous disposal routes, and implement circular design frameworks.', 'BURSA_MAIN'),
('BURSA-5', 'Biodiversity & Ecosystem Protection', 'ENVIRONMENTAL', 'Map operational footprints near vulnerable habitats, high conservation value (HCV) areas, and track local biodiversity.', 'BURSA_MAIN'),
('BURSA-6', 'Anti-Corruption Frameworks', 'GOVERNANCE', 'Robust whistleblowing channels, strict independent anti-corruption auditing, and executive pledges aligning MACC Act Section 17A.', 'BURSA_MAIN'),
('BURSA-7', 'Data Privacy & Cyber Security', 'GOVERNANCE', 'Audit compliance regarding Personal Data Protection Act (PDPA) frameworks, user data encryption, and cyber penetration records.', 'BURSA_MAIN'),
('BURSA-8', 'Board & Workforce Diversity', 'SOCIAL', 'Facilitate inclusive opportunities, gender quotas (including the Bursa 30% female director mandate), and wage parity audits.', 'BURSA_MAIN'),
('BURSA-9', 'Occupational Safety & Health (OSH)', 'SOCIAL', 'Track Lost Time Injury Frequency Rates (LTIFR), safety training hours, and maintain statutory ISO 45001 certification standards.', 'BURSA_MAIN'),
('BURSA-10', 'Labor Practices & Human Rights', 'SOCIAL', 'Safeguard freedom of association, eliminate forced labor indicators, ensure fair minimum wage adherence, and audit employee retention.', 'BURSA_MAIN'),
('BURSA-11', 'Supply Chain Sustainability Management', 'ENVIRONMENTAL', 'Conduct environmental and social audits of suppliers. Map Scope 3 supply chain risks and emissions tracking.', 'BURSA_MAIN');

-- Bursa ACE Market matters (9) — Issuer-Ready + ACE Market
INSERT INTO sustainability_matter (id, name, category, description, matter_set) VALUES
('BURSA-ACE-1', 'Climate Change & GHG Emissions', 'ENVIRONMENTAL', 'Trace and log operational Scope 1 and Scope 2 emissions profiles matching listing regulations.', 'BURSA_ACE'),
('BURSA-ACE-2', 'Energy Management', 'ENVIRONMENTAL', 'Enhance operational fuel efficiency and monitor commercial grid electricity intensity indexes.', 'BURSA_ACE'),
('BURSA-ACE-3', 'Waste Management', 'ENVIRONMENTAL', 'Trace circularity parameters, recycling volumes, and safe commercial disposal tracking.', 'BURSA_ACE'),
('BURSA-ACE-4', 'Anti-Corruption Frameworks', 'GOVERNANCE', 'Secure company pledges, publish anti-corruption guidelines, and track compliance reviews.', 'BURSA_ACE'),
('BURSA-ACE-5', 'Data Privacy & Cyber Security', 'GOVERNANCE', 'Audit databases for PDPA standards compliance and train employee groups in cybersecurity.', 'BURSA_ACE'),
('BURSA-ACE-6', 'Board & Workforce Diversity', 'SOCIAL', 'Acknowledge listing directives to boost gender, age, and cultural diversity in board and employee divisions.', 'BURSA_ACE'),
('BURSA-ACE-7', 'Occupational Safety & Health', 'SOCIAL', 'Log and reduce reportable work hazards, accident rates, and support healthy work operations.', 'BURSA_ACE'),
('BURSA-ACE-8', 'Labor Standards', 'SOCIAL', 'Mandate human rights and fair wage standards, prevent child or forced labor, and audit worker welfare.', 'BURSA_ACE'),
('BURSA-ACE-9', 'Supply Chain Management', 'ENVIRONMENTAL', 'Map basic environmental and social compliance of primary tier-1 suppliers and logistics partners.', 'BURSA_ACE');

-- Synthetic sector matter (Manufacturing pilot, opt-in add-on)
INSERT INTO sustainability_matter (id, name, category, description, matter_set) VALUES
('SECTOR-MFG', 'Sector Disclosures: Manufacturing Scope', 'ENVIRONMENTAL', 'Targeted sector metrics detailing packaging workflows, VOC emissions and resource yields.', 'SECTOR');

-- SEDG-mapped indicators (12)
INSERT INTO indicator_definition (id, name, unit, matter_id, category, is_sector_specific, default_target, default_target_direction) VALUES
('IND-ENG-01', 'Total Electricity Consumed', 'MWh', 'SEDG-1', 'ENVIRONMENTAL', FALSE, 350.0, 'DOWN'),
('IND-ENG-02', 'Scope 1 Direct GHG Footprint', 'tCO2e', 'SEDG-1', 'ENVIRONMENTAL', FALSE, 48.0, 'DOWN'),
('IND-ENG-03', 'Scope 2 Indirect Grid Footprint', 'tCO2e', 'SEDG-1', 'ENVIRONMENTAL', FALSE, 210.0, 'DOWN'),
('IND-WAT-01', 'Municipal Fresh Water Intake', 'm3', 'SEDG-2', 'ENVIRONMENTAL', FALSE, 1400, 'DOWN'),
('IND-WAT-02', 'Recycled Water Conservation Efficiency', '%', 'SEDG-2', 'ENVIRONMENTAL', FALSE, 30.0, 'UP'),
('IND-WST-01', 'Scheduled Hazardous Waste Generated', 'Tonnes', 'SEDG-3', 'ENVIRONMENTAL', FALSE, 2.5, 'DOWN'),
('IND-WST-02', 'Solid Non-Hazardous Waste Landfilled', 'Tonnes', 'SEDG-3', 'ENVIRONMENTAL', FALSE, 30.0, 'DOWN'),
('IND-LAB-01', 'Average Training Hours per Employee', 'Hours', 'SEDG-4', 'SOCIAL', FALSE, 35.0, 'UP'),
('IND-LAB-02', 'Annual Employee Voluntary Turnover', '%', 'SEDG-4', 'SOCIAL', FALSE, 10.0, 'DOWN'),
('IND-COM-01', 'Corporate Social Investments (CSI)', 'MYR', 'SEDG-5', 'SOCIAL', FALSE, 30000, 'UP'),
('IND-GOV-01', 'Employees Briefed on Anti-Corruption', '%', 'SEDG-6', 'GOVERNANCE', FALSE, 100.0, 'UP'),
('IND-GOV-02', 'Whistleblowing Incidents Audited', 'Cases', 'SEDG-6', 'GOVERNANCE', FALSE, 0, 'DOWN');

-- Bursa-mapped indicators (4)
INSERT INTO indicator_definition (id, name, unit, matter_id, category, is_sector_specific, default_target, default_target_direction) VALUES
('IND-BR-01', 'Climate Change physical risks assessed', '% sites', 'BURSA-1', 'ENVIRONMENTAL', FALSE, 100.0, 'UP'),
('IND-BR-02', 'Total Water Withdrawal in High Stress Areas', 'm3', 'BURSA-2', 'ENVIRONMENTAL', FALSE, 0, 'DOWN'),
('IND-BR-03', 'Female Board Representation Ratio', '%', 'BURSA-4', 'SOCIAL', FALSE, 30.0, 'UP'),
('IND-BR-04', 'Lost Time Incident Rate (LTIR)', 'Rate', 'BURSA-5', 'SOCIAL', FALSE, 0.0, 'DOWN');

-- Manufacturing sector-specific indicators (3)
INSERT INTO indicator_definition (id, name, unit, matter_id, category, is_sector_specific, sector_code, default_target, default_target_direction) VALUES
('IND-SEC-MFG-01', 'Raw Material Conversion Efficiency', '%', 'SECTOR-MFG', 'ENVIRONMENTAL', TRUE, 'MANUFACTURING', 95.0, 'UP'),
('IND-SEC-MFG-02', 'Volatile Organic Compound (VOC) Emissions', 'kg', 'SECTOR-MFG', 'ENVIRONMENTAL', TRUE, 'MANUFACTURING', 90.0, 'DOWN'),
('IND-SEC-MFG-03', 'Packaged Waste Directed to Reusable Loops', 'Tonnes', 'SECTOR-MFG', 'ENVIRONMENTAL', TRUE, 'MANUFACTURING', 25.0, 'UP');

-- Feature flags, mirroring the frontend's PlanContext.FEATURE_REGISTRY
INSERT INTO feature_flag (feature_key, min_plan, visible_only_at_min_plan) VALUES
('dashboard', 'STARTER', FALSE),
('materiality', 'STARTER', FALSE),
('indicators', 'STARTER', FALSE),
('reports', 'STARTER', FALSE),
('team', 'STARTER', FALSE),
('billing', 'STARTER', FALSE),
('settings', 'STARTER', FALSE),
('governance', 'GROWTH', FALSE),
('targets', 'GROWTH', FALSE),
('ifrs-s1-s2', 'ISSUER_READY', TRUE),
('climate-module', 'ISSUER_READY', TRUE),
('assurance-workspace', 'ISSUER_READY', TRUE),
('csi-export', 'ISSUER_READY', TRUE);

-- Matter-set resolution rules
INSERT INTO matter_set_rule (matter_set, min_plan, market_classification) VALUES
('SEDG', 'STARTER', 'SME'),
('BURSA_MAIN', 'ISSUER_READY', 'MAIN_MARKET'),
('BURSA_ACE', 'ISSUER_READY', 'ACE_MARKET'),
('SECTOR', 'GROWTH', NULL);

-- Transition relief (SRS FR-6.4): 2 fiscal years Main Market, 3 fiscal years ACE Market
INSERT INTO transition_relief_rule (market_classification, relief_years) VALUES
('MAIN_MARKET', 2),
('ACE_MARKET', 3);
