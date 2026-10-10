# Derived Indicators — Design

**Date:** 2026-10-10
**Status:** Design presented, pending user review of this spec

## Goal

Turn the platform's ratio indicators from numbers a human worked out elsewhere into numbers the
platform computes, from inputs it holds, with the arithmetic on screen.

Today every ratio in the catalogue is a free-text field. `IND-WAT-02`, "Recycled Water
Conservation Efficiency", holds **103%**. Nothing rejected it, because nothing knew what it was
supposed to be. That is the whole problem in one row: the product's claim is verified numbers, and
on fifteen of its sixteen formulas it is a spreadsheet with a login.

This spec computes them. It depends entirely on the denominator layer spec — without revenue,
headcount, hours worked and the board roster, there is nothing to divide by and no part of this
can be built.

## The extension point already exists

`indicator_definition.aggregation_rule` decides, per definition, how the annual value is produced:
`SUM`, `LATEST`, `AVERAGE` and `COUNT` compute it from monthly entries, `DIRECT_ANNUAL` takes it
as typed. `IndicatorService.setValue` already refuses a manual write when the rule is not
`DIRECT_ANNUAL`:

> "This indicator's annual value is computed from monthly entries — use the monthly entry endpoint
> instead"

So the design is a fifth value, `DERIVED`, on an enum that already carries this exact meaning.
Adding it brings the read-only behaviour, the API refusal, the `is_computed` provenance flag and
the DTO plumbing along with it, instead of inventing a parallel mechanism beside one that works.
That is the single most important decision in this spec, and it is a decision to write less code.

## Decisions taken

**A derivation is reference data, not code.** Each derived definition names a formula key; a Java
registry maps the key to its inputs and its arithmetic. The formula is not a string the platform
parses at runtime — an expression evaluator would be a new attack surface and a new class of
silent wrong answers, for seventeen formulas that change about once a decade. A registry of named,
unit-tested functions is both safer and easier to read.

**A derived indicator with a missing input computes nothing and says what is missing.** Not zero,
not the prior year, not a partial ratio over the inputs that happen to be present. The UI shows
"waiting on: average headcount (FY2025)" and links to the field. A silently defaulted denominator
would produce a plausible number that flows through sign-off into a signed disclosure, which is
precisely the failure this product exists to prevent.

**Existing typed values are preserved, not overwritten.** The migration does not delete the 103%.
It marks the definition `DERIVED`, keeps the stored value, and flags it `SUPERSEDED_MANUAL` until
the inputs exist and a real computation replaces it. A user who signed off FY2024 against a typed
figure keeps the figure they signed; they do not open the app to find history silently rewritten.
The flag is what makes the problem visible rather than erasing the evidence of it.

**Derived values recompute on input change, and recomputation invalidates approval.** This is the
rule `recomputeAnnualValue` already applies to monthly corrections: a changed value drops back to
`DRAFT` and clears the approver. A derived figure is no different. If a sign-off exists for the
fiscal year, the recomputation is recorded and the sign-off is marked stale rather than silently
re-blessed.

**Twenty definitions share thirteen derivations.** The catalogue carries `IND-BR-01` and `IND-BR-12`
with identical names, as it does for BR-03/17, BR-04/18, BR-05/13, BR-06/14, BR-08/15 and
BR-11/20 — the Bursa Main and ACE matter sets each list the same metric. One formula key serves
both copies. The duplication lives in the catalogue, not in the arithmetic.

## Data model

One migration, **V87**, after the denominator layer's V84–V86.

```sql
ALTER TABLE indicator_definition ADD COLUMN derivation_key VARCHAR(50);
ALTER TABLE indicator_value   ADD COLUMN derivation_state VARCHAR(20);
```

`aggregation_rule`'s check constraint gains `DERIVED`. `derivation_key` is non-null exactly when
the rule is `DERIVED`, enforced by a table check so the two cannot disagree.

`derivation_state` on the value: `COMPUTED`, `AWAITING_INPUTS`, or `SUPERSEDED_MANUAL`. Null for
every non-derived indicator, which is almost all of them.

The same migration sets `aggregation_rule = 'DERIVED'` and the `derivation_key` on the affected
definitions, and sets `derivation_state = 'SUPERSEDED_MANUAL'` on their existing values.

## The derivations

Each row is one entry in the registry. "Inputs" names indicators by id and denominator figures by
`figure_key`; `board_member` means the roster tables.

| Key | Serves | Formula | Inputs |
|---|---|---|---|
| `ENERGY_INTENSITY_REVENUE` | BR-05, BR-13 | electricity ÷ revenue | `IND-ENG-01`, `REVENUE` |
| `CARBON_INTENSITY_REVENUE` | *new definition* | (Scope 1 + Scope 2) ÷ revenue | `IND-ENG-02`, `IND-ENG-03`, `REVENUE` |
| `FEMALE_BOARD_RATIO` | BR-03, BR-17 | female directors ÷ directors × 100 | `board_member` |
| `LOST_TIME_INCIDENT_RATE` | BR-04, BR-18 | injuries × 200,000 ÷ hours worked | `LOST_TIME_INJURIES`, `TOTAL_HOURS_WORKED` |
| `WASTE_DIVERTED_RATE` | BR-06, BR-14 | (generated − landfilled) ÷ generated × 100 | `IND-WST-01`, `IND-WST-02` |
| `ANTICORRUPTION_TRAINING_RATE` | BR-08, BR-15, GOV-01 | trained ÷ headcount × 100 | `EMPLOYEES_TRAINED_ANTICORRUPTION`, `AVERAGE_HEADCOUNT` |
| `SUPPLIER_ASSESSMENT_RATE` | BR-11, BR-20 | assessed ÷ tier-1 suppliers × 100 | `TIER1_SUPPLIERS_ASSESSED`, `TIER1_SUPPLIERS` |
| `CLIMATE_RISK_SITE_COVERAGE` | BR-01, BR-12 | assessed sites ÷ sites × 100 | `SITES_CLIMATE_RISK_ASSESSED`, `OPERATIONAL_SITES` |
| `HCV_SITE_PROXIMITY` | BR-07 | sites near HCV ÷ sites × 100 | `SITES_NEAR_HIGH_CONSERVATION_VALUE`, `OPERATIONAL_SITES` |
| `TRAINING_HOURS_PER_EMPLOYEE` | LAB-01 | training hours ÷ headcount | `TOTAL_TRAINING_HOURS`, `AVERAGE_HEADCOUNT` |
| `VOLUNTARY_TURNOVER_RATE` | LAB-02 | departures ÷ headcount × 100 | `EMPLOYEE_DEPARTURES`, `AVERAGE_HEADCOUNT` |
| `WATER_RECYCLING_RATE` | WAT-02 | recycled ÷ (recycled + intake) × 100 | `RECYCLED_WATER_VOLUME`, `IND-WAT-01` |
| `MATERIAL_CONVERSION_RATE` | SEC-MFG-01 | converted ÷ input × 100 | `RAW_MATERIAL_CONVERTED`, `RAW_MATERIAL_INPUT` |

`CARBON_INTENSITY_REVENUE` has no definition in the catalogue today; the migration adds one, since
it is the headline intensity metric every framework asks for and the inputs are the two figures
the platform is already best at producing.

Indicators that stay as they are: `IND-ENG-01/02/03`, `IND-WAT-01`, `IND-WST-01/02`,
`IND-SEC-MFG-02/03`, `IND-COM-01`, `IND-GOV-02`, `IND-BR-02/09/10/16/19`. These are counts and
measured quantities, not ratios. Nothing is gained by deriving a number somebody read off a meter.

## Arithmetic rules

One place, applied by every derivation, because inconsistency here is how a ratio becomes 103%.

- **A zero or null denominator yields no value**, state `AWAITING_INPUTS`. Never infinity, never
  zero, never a divide-by-zero exception reaching the user.
- **Percentages are clamped to [0, 100] by refusal, not by truncation.** A computation outside the
  range means an input is wrong; the platform reports which inputs produced it rather than
  quietly returning 100. This is the specific defect `IND-WAT-02` demonstrates.
- **`BigDecimal` throughout, with a declared scale and `RoundingMode.HALF_UP`**, matching
  `UnitConverter`. Rates carry 4 decimal places, percentages 2.
- **Units are checked, not assumed.** Energy intensity is MWh per RM million; if the electricity
  indicator is read in a different unit the conversion goes through `UnitConverter`, which already
  owns this.

## Provenance

A derived value's audit entry records the formula key, each input's id, value and fiscal year, and
the result — the same shape `indicator_audit_entry` already uses for an extracted value, where
`source_doc_name` and `source_quote` say where a number came from. For a derived figure the source
is the computation, and it is written down with the same specificity: an assurer reading the audit
trail sees `977.35 ÷ 48.0 = 20.36` with both inputs named, not "computed".

The indicator detail screen shows the same thing to the user: the formula, the inputs with links
to where each was entered, and the result. An input that moves shows the recomputation in history.

## Testing

Unit tests on the registry, in the style of `UnitConverter` and `ProposalValidator` — pure
functions, no Spring context:

- each of the thirteen derivations against a worked example
- zero denominator yields `AWAITING_INPUTS` for every derivation, with no exception
- a percentage computing above 100 is refused and names its inputs
- rounding at the declared scale, including a half-up boundary

Service-level:

- a manual write to a `DERIVED` indicator is refused, the way a `SUM` indicator's already is
- changing an input recomputes the value, drops it to `DRAFT`, and clears the approver
- a value marked `SUPERSEDED_MANUAL` keeps its stored number until the inputs exist
- an indicator missing one of two inputs reports *which* one

One test decides whether this ships:

> **`IND-WAT-02` cannot hold 103% once it is derived.**

Written with recycled volume exceeding intake, asserting a refusal that names both inputs — not a
clamped 100, which would hide the bad data instead of surfacing it.

## Out of scope

- A user-editable formula builder. The registry is reference data maintained in code; a formula
  editor is a different product.
- Deriving anything from the supply chain spec's shared disclosures. That data arrives through
  `EmissionActivityService` into Scope 3 and reaches these formulas as an ordinary input.
- Backfilling historical derived values. Prior years stay `SUPERSEDED_MANUAL` until someone enters
  their denominators.
- The ESG composite score. A weighted total over indicators of different units and directions is a
  number without a definition; a disclosure-completeness metric would be the honest version, and
  it is not part of this work.

## Dependency

Depends on the denominator layer spec in full. Independent of supply chain sharing.
