-- Scope 3 categories were purely free-text/tenant-defined, with no mapping to the GHG Protocol
-- Corporate Value Chain (Scope 3) Standard's 15 standard categories — so Category 15 (financed
-- emissions), mandatory for asset managers/banks/insurers, got no special treatment. Adds a
-- nullable standard_category_number (1-15) so newly-seeded categories can be identified as
-- standard vs. tenant-custom; existing freeform categories are left as NULL (still fully
-- supported — companies can still add extra categories beyond the 15 if relevant).
ALTER TABLE scope3_category ADD COLUMN standard_category_number INTEGER CHECK (standard_category_number BETWEEN 1 AND 15);
