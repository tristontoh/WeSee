ALTER TABLE ifrs_s2_disclosure ADD COLUMN linked_target_id UUID REFERENCES performance_target (id) ON DELETE SET NULL;
