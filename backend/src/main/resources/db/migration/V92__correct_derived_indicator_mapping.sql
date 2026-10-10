-- V87 got four indicators wrong, and three of them would have printed a percentage under a unit
-- that is not a percentage. That is the exact failure the derived-indicator work exists to
-- prevent, so this corrects it before it can reach anyone.
--
-- The cause: V87's mapping was written from the indicator catalogue as V4/V37 left it, and V40
-- had since repurposed three of those ids in place. V51 says so in its own comments, which were
-- not read:
--
--   IND-BR-07  is Corporate Social Investment (CSI), MYR  -- V87 marked it a % of sites
--   IND-BR-12  is Municipal Fresh Water Intake, m3        -- V87 marked it a % of sites
--   IND-BR-14  is Corporate Social Investment (CSI), MYR  -- V87 marked it a % diverted
--
-- Restore the rules V51 gave them.
UPDATE indicator_definition SET aggregation_rule = 'SUM', derivation_key = NULL
 WHERE id IN ('IND-BR-07', 'IND-BR-12', 'IND-BR-14');

-- IND-BR-06 (Waste Diverted from Landfill, %) really is a ratio, but it cannot be computed from
-- what the platform holds. WASTE_DIVERTED_RATE subtracted IND-WST-02 (Solid NON-HAZARDOUS Waste
-- Landfilled) from IND-WST-01 (Scheduled HAZARDOUS Waste Generated) — two disjoint streams, so
-- the subtraction means nothing in either direction. A real diversion rate needs total waste
-- generated, which nothing records. Leave it entered by hand until that input exists: a figure
-- someone typed is honest about being typed, and a computed one would not be.
UPDATE indicator_definition SET aggregation_rule = 'AVERAGE', derivation_key = NULL
 WHERE id = 'IND-BR-06';

-- Those four values were flagged SUPERSEDED_MANUAL by V87 on the way past. They are ordinary
-- entered values again.
UPDATE indicator_value v
   SET derivation_state = NULL, derivation_note = NULL
  FROM indicator_definition d
 WHERE d.id = v.indicator_definition_id
   AND d.aggregation_rule <> 'DERIVED'
   AND v.derivation_state IS NOT NULL;

-- HCV_SITE_PROXIMITY is gone from the registry with this change: V40 deleted the only "sites near
-- high conservation value areas" indicator, so the formula had nothing left to serve. It was
-- pointed at IND-BR-07 purely by the same stale mapping.
