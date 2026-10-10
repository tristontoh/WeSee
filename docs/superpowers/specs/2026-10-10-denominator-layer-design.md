# The Denominator Layer — Design

**Date:** 2026-10-10
**Status:** Design presented, pending user review of this spec

## Goal

Fifteen of the sixteen ESG formulas the platform should compute are ratios, and the platform
holds none of their denominators. `company` has no revenue, no production output, no headcount, no
hours worked, no board roster and no share register. Those formulas are not unimplemented — they
are **structurally impossible**, and no amount of work on the indicator module changes that until
the data exists.

This spec adds that data and nothing else. It computes no formulas; the derived indicators that
use it are the subject of the next spec, which depends on this one.

One piece of evidence for why this matters: `IND-WAT-02`, "Recycled Water Conservation
Efficiency", currently holds **103%**. A computed ratio of recycled water over total withdrawal
cannot exceed 100. A typed field can. Every ratio indicator in the product today is a number
somebody worked out elsewhere and keyed in, and the platform cannot tell a correct one from a
typo.

## Decisions taken

**Denominators are per fiscal year, not company attributes.** Revenue, headcount and output change
annually, and a 2025 intensity computed against a 2026 revenue is simply wrong. Nothing here hangs
off `company` as a column.

**Scalar figures go in one narrow table keyed by a typed enum.** There are roughly ten of them,
each "one number for one company in one year, with a unit". A column per figure would mean a
migration for every new denominator and a widening table; a key/value table with a Java enum for
the key keeps type safety where it matters, lets the UI render a form from the enum, and adds new
figures without touching the schema.

**Board roster and share register are lists, not figures, and get their own tables.** Director
independence, gender and meeting attendance are properties of people; the share register is
properties of holdings. Flattening either into scalars would lose exactly the detail the formulas
need.

**Nothing here is estimated or defaulted.** A missing denominator means the dependent indicator
stays manual and visibly unverified. A denominator the platform guessed would propagate silently
into a signed-off disclosure, which is the failure this product exists to prevent.

## Data model

Three migrations.

### `company_annual_figure` — V84

Tenant-owned. Unique on `(company_id, fiscal_year, figure_key)`.

| Column | Notes |
|---|---|
| `company_id`, `fiscal_year` | |
| `figure_key` | varchar(40), backed by a Java enum |
| `value` | numeric(18,4) |
| `unit` | varchar(30) — stored, so a report can show it |
| `source_note` | optional free text: "audited FY2025 accounts, note 4" |

Initial enum, with the formulas each one unlocks:

| `figure_key` | Unit | Feeds |
|---|---|---|
| `REVENUE` | RM million | carbon intensity, energy intensity |
| `PRODUCTION_OUTPUT` | units | carbon intensity (physical basis), Scope 3 allocation basis |
| `AVERAGE_HEADCOUNT` | people | turnover, training hours, anti-corruption coverage, ESOS coverage |
| `EMPLOYEE_DEPARTURES` | people | voluntary turnover |
| `FEMALE_HEADCOUNT` | people | workforce diversity |
| `TOTAL_HOURS_WORKED` | hours | LTIR |
| `LOST_TIME_INJURIES` | cases | LTIR |
| `TOTAL_TRAINING_HOURS` | hours | average training hours per employee |
| `EMPLOYEES_TRAINED_ANTICORRUPTION` | people | anti-corruption training coverage |
| `EMPLOYEES_AWARDED_EQUITY` | people | ESOS coverage |
| `OPERATIONAL_SITES` | sites | the denominator of both site-based ratios |
| `SITES_CLIMATE_RISK_ASSESSED` | sites | physical climate risk coverage |
| `SITES_NEAR_HIGH_CONSERVATION_VALUE` | sites | biodiversity proximity |
| `TIER1_SUPPLIERS` | suppliers | supplier assessment coverage |
| `TIER1_SUPPLIERS_ASSESSED` | suppliers | supplier assessment coverage |
| `RECYCLED_WATER_VOLUME` | m³ | water recycling rate |
| `RAW_MATERIAL_INPUT` | tonnes | raw material conversion efficiency |
| `RAW_MATERIAL_CONVERTED` | tonnes | raw material conversion efficiency |

Two figures that look like they belong here are deliberately absent. **Total energy** is not a
figure, because `IND-ENG-01` already records electricity in MWh and a second home for the same
quantity is two numbers that can disagree. **Total waste** is not a figure, because `IND-WST-01`
and `IND-WST-02` already carry generated and landfilled tonnage. Where an indicator already holds
a number, the derivation reads the indicator; this table holds only what the platform has nowhere
else.

`PRODUCTION_OUTPUT` is deliberately the same figure the supply chain spec uses as its allocation
basis. One number, entered once, serving both.

### `board_member` and `board_meeting` — V85

Tenant-owned.

`board_member`: `company_id`, `fiscal_year`, `name`, `role_title`, `independent` (boolean),
`gender` (varchar(20), nullable — not every jurisdiction requires it and a nullable column says so
honestly), `appointed_at`, `resigned_at`.

`board_meeting`: `company_id`, `fiscal_year`, `held_on`, `kind`.

`board_meeting_attendance`: `meeting_id`, `board_member_id`, `attended` (boolean).

Director attendance needs meetings-held-during-tenure, not meetings-held-in-the-year, which is why
`appointed_at` and `resigned_at` are on the member rather than a simple count being stored.

### `share_capital` and `shareholding` — V86

Tenant-owned.

`share_capital`: `company_id`, `fiscal_year`, `total_outstanding_shares`,
`public_held_shares`, `bumiputera_held_shares`.

`shareholding`: `company_id`, `fiscal_year`, `holder_name`, `shares_held`, `rank` — the top
holders, kept as rows so "top 5" is a query rather than a stored total that goes stale when the
sixth holder overtakes the fifth.

## What the UI needs

One screen, grouped the way a reporting team already divides the work:

- **Financial and operational** — revenue, production output, raw material input and converted
- **Workforce** — headcount, departures, female headcount, hours worked, injuries, training
  hours, employees trained, equity awards
- **Sites and suppliers** — total sites, sites assessed, sites near conservation areas, tier-1
  supplier counts
- **Water** — recycled volume
- **Board** — the roster, with independence and gender per director, and an attendance grid
- **Share register** — capital structure and the top holders

Each field shows which indicators it unlocks, and an indicator that is still missing a denominator
says which figure it is waiting for. That connection is the point: a reporting team fills these in
because it can see what each one switches on.

## Testing

- the enum round-trips: every `figure_key` the Java enum defines is accepted and read back
- unique constraint holds: a second `REVENUE` for the same company-year is refused, not duplicated
- a board member appointed mid-year counts only meetings held during tenure
- "top 5" returns five rows ordered by holding when six holders exist, and all of them when fewer

No formula is tested here, because no formula is computed here.

## Out of scope

- Computing anything. That is the derived-indicators spec.
- Importing these figures from documents. The extraction pipeline could read a set of audited
  accounts later; that is a third design and it should not block this one.
- Historical backfill. Existing fiscal years stay empty until someone enters them.

## Dependency

Blocks the derived-indicators spec entirely. Nothing in that spec can compute without this one.
Independent of the supply chain sharing spec, except that both want `PRODUCTION_OUTPUT`, so
whichever lands first defines it.
