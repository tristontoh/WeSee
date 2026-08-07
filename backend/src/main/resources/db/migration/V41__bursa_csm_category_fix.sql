-- V40 renamed two matters (formerly "Waste Management" and "Biodiversity & Ecosystem
-- Protection", both ENVIRONMENTAL) to "Community/Society", but left the inherited
-- `category` column unchanged. Community/Society is a SOCIAL matter — this affects the
-- Indicators page's category filter tabs and the materiality matrix's category coloring.
UPDATE sustainability_matter SET category = 'SOCIAL' WHERE id IN ('BURSA-ACE-3', 'BURSA-5');
UPDATE indicator_definition SET category = 'SOCIAL' WHERE id IN ('IND-BR-14', 'IND-BR-07');
