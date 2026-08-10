# M3a — Indicators & Emission Activity

**Date:** 2026-08-10
**Status:** Approved, ready for implementation planning
**Milestone:** 3a of 6 (see [M1 spec](2026-08-08-m1-foundation-auth-design.md) for the decomposition)

## Problem

A company can now sign in, onboard, and manage its team — but it still cannot enter a single piece
of ESG data. Indicators are the core data-entry surface of the platform, 13 endpoints deep, and
have **no UI at all**.

## Why M3 was split

The original M3 (`indicators` + `climate`, 30 endpoints) straddles a plan boundary. Verified
against the running backend with a STARTER account:

| Endpoint | Status |
|---|---|
| `GET /indicators` | **200** — 12 indicators seeded |
| `GET /climate/activity/factors` | **200** — 8 factors |
| `POST /climate/activity/entries` | **200** |
| `POST /climate/activity/entries/apply` | **200** |
| `GET /climate/emissions` | **403** |
| `GET /ifrs/s2` | **403** |

`EmissionsController` and `IfrsController` carry **class-level** `@PreAuthorize("@planGate.check(…)")`
for `climate-module` and `ifrs-s1-s2`, both `ISSUER_READY`. Both flags are
`visibleOnlyAtMinPlan = true`, so for STARTER and GROWTH they are hidden entirely, not locked.

M3a therefore covers only what every plan can use. The scope 1/2/3 dashboard and IFRS S1/S2 become
**M3b**, gated behind `ISSUER_READY`.

## Deliverable

Enter, target, approve, and evidence ESG indicator data; log emission activity and apply it to a
scope. Everything usable on a STARTER plan.

## Scope

| Capability | Endpoints |
|---|---|
| Indicators | `GET /indicators`, `GET /indicators/{id}` |
| Value entry | `PATCH /indicators/{id}/values/{fiscalYear}`, `PATCH /indicators/{id}/monthly/{fiscalYear}/{month}` |
| Targets | `PATCH /indicators/{id}/target` |
| Approval | `PATCH /indicators/{id}/values/{fiscalYear}/approve` — `COMPANY_ADMIN` only |
| Evidence | `POST`/`GET /indicators/audit-entries/{id}/evidence` |
| Emission activity | `GET /climate/activity/factors`, `GET`/`POST`/`DELETE /climate/activity/entries`, `POST /climate/activity/entries/apply` |

**Out of scope (M3b):** `GET /climate/emissions`, scope 1/2/3 writes, all of `/ifrs`.

## Data contracts

```
IndicatorResponse {
  id, name, unit, matterId, category, sectorSpecific, sectorCode?,
  effectiveTarget, effectiveTargetDirection, enabled, aggregationRule,
  values: IndicatorValuePointDto[],
  monthlyValues: IndicatorMonthlyValueDto[],
  history: AuditEntryDto[]
}
IndicatorValuePointDto   { fiscalYear, value, status, approvedByName, approvedAt, isComputed, monthsReported }
IndicatorMonthlyValueDto { fiscalYear, month, value, enteredBy, enteredAt, sourceDocName, sourceDocPath }
AuditEntryDto            { fiscalYear, month, value, enteredBy, enteredAt, sourceDocName, sourceDocPath, comment }

EmissionFactorResponse        { id, name, scope, activityUnit, factorValue, source, sourceYear }
EmissionActivityEntryResponse { id, fiscalYear, emissionFactorId, emissionFactorName, quantity, calculatedTco2e }
```

Requests: `SetIndicatorValueRequest { value (≥0, required), sourceDocName, comment }`;
`SetIndicatorTargetRequest { target, targetDirection }`;
`AddActivityEntryRequest { fiscalYear, factorId, quantity (>0) }`.

Enums: `IndicatorValueStatus` = `DRAFT | APPROVED`; `AggregationRule` =
`SUM | LATEST | AVERAGE | COUNT | DIRECT_ANNUAL`; `TargetDirection` = `UP | DOWN`;
`SustainabilityMatterCategory` = `ENVIRONMENTAL | SOCIAL | GOVERNANCE`;
`EmissionScope` = `SCOPE_1 | SCOPE_2 | SCOPE_3`.

## The entry-mode rule

**`aggregationRule` decides how a value is entered, and the backend enforces it with a 409.**

- `DIRECT_ANNUAL` → annual endpoint only. Posting monthly returns
  *"This indicator is entered as a direct annual figure, not monthly"*.
- Everything else (`SUM`, `LATEST`, `AVERAGE`, `COUNT`) → monthly endpoint only. Posting annual
  returns *"This indicator's annual value is computed from monthly entries — use the monthly entry
  endpoint instead"*.

This is not a user preference. The UI must render one mode or the other from `aggregationRule` and
never offer both, or every wrong-mode save becomes a 409 the user cannot act on.

For computed indicators, `IndicatorValuePointDto.isComputed` is true and `monthsReported` says how
many of twelve months are filled — both are shown so the user understands why the annual figure is
what it is.

**No seeded indicator uses `DIRECT_ANNUAL`.** Measured across the 12 a STARTER company receives:

| aggregationRule | count |
|---|---|
| `SUM` | 8 |
| `AVERAGE` | 2 |
| `LATEST` | 1 |
| `COUNT` | 1 |
| `DIRECT_ANNUAL` | **0** |

The annual-entry path must still be built — a platform admin can create a `DIRECT_ANNUAL` indicator
at any time via `POST /admin/reference/indicators` — but it cannot be exercised end-to-end against
seeded data. It is covered by a unit test on the mode-selection logic instead of a Playwright spec,
and that gap is recorded rather than papered over.

Category distribution is `ENVIRONMENTAL` 7, `SOCIAL` 3, `GOVERNANCE` 2, so all three groups render
with real content.

## Screens

### Indicators (new, `/indicators`)

Master list grouped by `category` (Environmental / Social / Governance), each row showing name,
unit, current-year value, status, and target. Selecting one opens a detail panel with:

- **Annual entry** for `DIRECT_ANNUAL`, or a **twelve-month grid** otherwise
- Target with direction, via `PATCH /{id}/target`
- **Approve** — `COMPANY_ADMIN` only; hidden for other roles since the endpoint is role-gated
- Audit trail from `history` (AuditEntryDto[]), with evidence upload per entry

Fiscal year is a page-level selector defaulting to the current year.

### Emission activity (new, `/activity`)

Pick a factor, enter a quantity, see `calculatedTco2e` per entry and a client-side total. Delete
entries. Apply a fiscal year's entries to a scope.

The eight seeded factors are Malaysian and real — e.g. diesel stationary combustion at 2.68 kg
CO₂e/litre, Peninsular grid electricity at 0.585 kg CO₂e/kWh — so each is labelled with its
`source` and `sourceYear`.

**A known asymmetry:** `POST /entries/apply` succeeds on STARTER (verified: 200) and writes scope
totals, but `GET /climate/emissions` is `ISSUER_READY`-only, so a STARTER user cannot read back the
aggregate they just wrote. The screen therefore confirms what was applied and totals the entries
itself rather than pretending to show scope totals. The full picture arrives with M3b.

## Navigation

Both screens join the workspace and compliance-hub nav sets. Neither is plan-gated —
`indicators` is a `STARTER` feature flag and activity has no flag, so `PlanGateService.state()`
returns `visible` for both at every plan.

The existing **Upload Center**, **Extraction Review**, and **Trust Score** entries have no backend
whatsoever — the ESG platform does no document extraction, which was the old carbon gateway's job.
They are left in place and untouched by M3a; deciding their fate is a separate call, flagged rather
than made here.

## Error handling

Reuses M1's interceptor and `toApiError`. Two cases need screen-level treatment:

- **409 Conflict** on a wrong-mode save. The UI should make this unreachable, but if it happens the
  backend's message is rendered verbatim — it explains exactly which endpoint to use.
- **403 with a token** on approve → the user is not a `COMPANY_ADMIN`. The button is hidden for
  those roles, so this is a fallback, not the primary path.

## Testing

**Playwright** (live backend, STARTER account):

- indicators list renders all 12 seeded indicators, grouped by category
- a computed indicator shows the month grid and no annual field (all 12 seeded indicators are computed)
- saving a monthly value updates the computed annual and `monthsReported`
- setting a target persists and displays with its direction
- approve is absent for a non-admin role
- activity: add an entry → `calculatedTco2e` appears; delete removes it
- activity: apply to a scope reports success

**Jasmine:** entry-mode selection from `aggregationRule`; client-side tCO₂e totalling; fiscal-year
default.

## Out of scope

- `GET /climate/emissions`, scope 1/2/3 writes, `/ifrs/**` → M3b (`ISSUER_READY`)
- Upload Center, Extraction Review, Trust Score — no backend exists
- Materiality, governance, targets module → M4
