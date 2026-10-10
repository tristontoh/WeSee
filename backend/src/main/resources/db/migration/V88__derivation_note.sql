-- What the derivation last said, in the user's words: the arithmetic when it computed, or which
-- inputs it is waiting on when it could not.
--
-- Denormalised on purpose. The alternative was recomputing at read time, which would make a GET
-- write (to persist the explanation) or issue one input-assembly query per indicator per year.
-- This column's only writer is DerivationService.recomputeAllDependents, which already runs
-- whenever any input moves — so it cannot drift from the value beside it.

ALTER TABLE indicator_value ADD COLUMN derivation_note TEXT;
