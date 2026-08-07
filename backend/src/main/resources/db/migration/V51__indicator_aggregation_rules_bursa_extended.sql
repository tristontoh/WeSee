-- V50 only classified the 19 indicators present in the original V4 seed data. Later migrations
-- (Bursa Main Market / ACE Market alignment) added a fuller Bursa catalog — IND-BR-05..11
-- (BURSA-1..11, Main Market) and IND-BR-12..20 (BURSA-ACE-1..9, ACE Market), a parallel set
-- mirroring the same metrics — that were missed and silently left on the safe DIRECT_ANNUAL
-- default. Classify them the same way their same-named counterparts were classified in V50.

UPDATE indicator_definition SET aggregation_rule = 'SUM' WHERE id IN
    ('IND-BR-07',  -- Corporate Social Investment (CSI), MYR — matches IND-COM-01
     'IND-BR-12',  -- Municipal Fresh Water Intake, m3 — matches IND-WAT-01
     'IND-BR-14'); -- Corporate Social Investment (CSI), MYR (ACE) — matches IND-BR-07

UPDATE indicator_definition SET aggregation_rule = 'LATEST' WHERE id IN
    ('IND-BR-08',  -- Employees Trained on Anti-Corruption Policy, % — matches IND-GOV-01
     'IND-BR-11',  -- Tier-1 Suppliers Assessed for ESG Compliance, % — cumulative coverage snapshot
     'IND-BR-15',  -- Employees Trained on Anti-Corruption Policy, % (ACE) — matches IND-BR-08
     'IND-BR-17',  -- Female Board Representation Ratio, % (ACE) — matches IND-BR-03
     'IND-BR-20'); -- Tier-1 Suppliers Assessed for ESG Compliance, % (ACE) — matches IND-BR-11

UPDATE indicator_definition SET aggregation_rule = 'AVERAGE' WHERE id IN
    ('IND-BR-05',  -- Energy Intensity per Revenue, MWh/RM mil — compound ratio, closest fit
     'IND-BR-06',  -- Waste Diverted from Landfill, % — rate metric
     'IND-BR-13',  -- Energy Intensity per Revenue (ACE) — matches IND-BR-05
     'IND-BR-18'); -- Lost Time Incident Rate (LTIR) (ACE) — matches IND-BR-04

UPDATE indicator_definition SET aggregation_rule = 'COUNT' WHERE id IN
    ('IND-BR-09',  -- Data Breach Incidents Reported, Cases — event metric
     'IND-BR-10',  -- Human Rights Grievances Recorded, Cases — event metric
     'IND-BR-16',  -- Data Breach Incidents Reported (ACE) — matches IND-BR-09
     'IND-BR-19'); -- Human Rights Grievances Recorded (ACE) — matches IND-BR-10
