# M3b — Emissions Dashboard (Scope 1/2/3)

**Date:** 2026-08-12
**Status:** Approved, ready for implementation planning
**Milestone:** 3b of 6 — see [M3a spec](2026-08-10-m3a-indicators-activity-design.md)

## Problem

The Emissions Dashboard is the most prominent screen in the workspace and it is entirely fake. It
renders hardcoded design values (184.2 / 97.6 / 432.8 tCO₂e) from a local fallback, calls nothing,
and its "Recalculate" button now says a milestone will bring it later.

## Scope

The `climate-module` half of the original M3. IFRS S1/S2 is deferred to **M3c** — S2 alone has 20
narrative fields, S1 has 8 plus business segments and risk/opportunity items, which is a milestone
of its own rather than a tail on this one.

| Capability | Endpoint |
|---|---|
| Read all scopes for a year | `GET /climate/emissions?fiscalYear=` |
| Scope 1 total | `PUT /climate/emissions/scope1/{fiscalYear}` |
| Scope 2 total | `PUT /climate/emissions/scope2/{fiscalYear}` |
| Scope 3 category value | `PUT /climate/emissions/scope3/categories/{categoryId}/values/{fiscalYear}` |
| Add custom scope 3 category | `POST /climate/emissions/scope3/categories` |
| Remove a scope 3 category | `DELETE /climate/emissions/scope3/categories/{categoryId}` |

All verified working against the running backend on an `ISSUER_READY` account.

## Data contracts

```
EmissionsResponse {
  scope1: EmissionPointDto[],
  scope2: EmissionPointDto[],
  scope3: Scope3CategoryResponse[]
}
EmissionPointDto        { fiscalYear, value }
Scope3CategoryResponse  { id, name, tooltip, standardCategoryNumber, mandatory, values: Scope3ValuePointDto[] }
Scope3ValuePointDto     { fiscalYear, value, transitionRelief }
```

Requests: `SetEmissionValueRequest { value }` (≥0, required);
`CreateScope3CategoryRequest { name (required), tooltip }`.

The backend seeds the **15 GHG Protocol scope 3 categories**, each with
`standardCategoryNumber` 1–15 and a `tooltip` explaining what it covers. None are `mandatory` by
default. Custom categories can be added and have no `standardCategoryNumber`.

## The plan-gating consequence

`EmissionsController` carries a class-level `@PreAuthorize("@planGate.check('climate-module'))`,
and `climate-module` is `ISSUER_READY` with `visibleOnlyAtMinPlan = true`. So the moment this
screen reads real data, **a STARTER or GROWTH company gets a 403 on the screen it currently lands
on after login.**

Three changes follow, and none is optional:

1. **The dashboard nav entry is gated on `climate-module`, not on `dashboard`.** The backend has a
   `dashboard` feature flag at `STARTER`, but the data behind this screen is guarded by
   `climate-module` — so gating on `dashboard` would show a nav item that 403s. Because
   `climate-module` is `visibleOnlyAtMinPlan = true`, the entry is **hidden**, not locked.

2. **The dashboard must also join the compliance-hub nav.** This is the part that is exactly
   backwards today. M1's plan-derived navigation gives `ISSUER_READY` companies the
   *compliance-hub* nav, and gives everyone else the *workspace* nav. But the Emissions Dashboard
   lives only in the workspace nav — so the one tier that can use it is the one tier that cannot
   see it, and the tiers that can see it get a 403. The entry therefore goes into **both** nav
   sets, gated on `climate-module`, which resolves to: hidden for workspace-tier companies, visible
   for compliance-hub-tier ones.

3. **The post-login landing route becomes plan-dependent.** `LoginComponent.establish()` currently
   sends every workspace user to `/dashboard`. For a company below `ISSUER_READY` that route now
   leads to a 403. Those companies land on `/indicators` instead — the screen M3a built, which
   every plan can use.

Without all three, the most common signup path in the product ends at an error page.

### A note on gating before flags load

`PlanGateService` fetches the feature matrix after login, so for a moment the nav renders with no
flags. `state()` currently returns `visible` for any unknown key, which would flash the dashboard
entry to companies that cannot use it. `state()` therefore returns `hidden` until the matrix has
loaded. This only affects nav items that declare a `feature`; ungated items never call it.

## Screens

### Emissions Dashboard (`/dashboard`, rewired)

The existing layout already models exactly this data — three scope figures, percentage split, and a
conic-gradient donut — so the visual design is kept and the numbers become real:

- Scope 1, 2, and 3 totals for the selected fiscal year, with the donut driven by the real split
- Scope 1 and 2 are directly editable (single value per year)
- Scope 3 lists its categories with per-category values, totalling into the scope 3 figure
- Add and remove custom scope 3 categories
- Fiscal-year selector, matching M3a's pattern

`CarbonOverview`, the local interface M1 left behind as a placeholder, is deleted — the real
`EmissionsResponse` replaces it. The `CAT_BARS` mock and the "Recalculate" file picker go with it,
since document ingestion has no backend.

**Select bindings use `[selected]` per option, never `[value]` on the `<select>`** — the bug fixed
at the end of M3a. Any new dropdown here follows that rule.

### Carbon Overview (`/compliance-hub/overview`)

Out of scope. It is a compliance-hub screen showing supplier-side carbon, which this backend does
not model, and folding it in would mean inventing data. Left on mocks and flagged.

## Error handling

Reuses M1's interceptor and `toApiError` unchanged. One case matters:

- **403 with a token** on `GET /climate/emissions` means the plan was downgraded mid-session. The
  screen renders an upgrade message rather than an error, because the nav gating should have
  prevented arrival — this is the fallback for a stale session.

## Testing

**Playwright**, against the live backend. Fixtures must upgrade a fresh company to `ISSUER_READY`
via `PATCH /company/plan` before exercising the screen — a new fixture, since every existing E2E
account is `STARTER`.

- an `ISSUER_READY` company sees the Emissions Dashboard nav entry; a `STARTER` company does not
- a `STARTER` company landing after login goes to `/indicators`, not `/dashboard`
- setting scope 1 and scope 2 values displays them and updates the total
- setting a scope 3 category value updates the scope 3 total
- adding a custom scope 3 category lists it; deleting removes it

**Jasmine:** scope totalling and percentage split from an `EmissionsResponse`, including the
empty-data case where every scope is `[]`.

## Out of scope

- IFRS S1/S2 → **M3c** (11 endpoints, 28+ fields)
- Carbon Overview, Upload Center, Extraction Review, Trust Score — no backend
- `transitionRelief` on scope 3 values is read but not editable; the rule that sets it lives in
  `transition_relief_rule` and has no write endpoint in this controller
