# Supply Chain Sharing — Design

**Date:** 2026-10-10
**Status:** Design presented, pending user review of this spec

## Goal

Close the loop that makes this product a network rather than a single-company tool: let a buyer
source its Scope 3 Category 1 from suppliers' already-signed-off Scope 1 and 2, instead of
estimating it from spend.

Today the platform produces a supplier's verified figure end to end — a bill is read, staged,
accepted, sealed under a SHA-256 digest and exported. Nothing hands that figure to the buyer who
needs it, and nothing splits a supplier's annual total across the customers it sold to. Those two
gaps are what this design fills.

The accounting identity underneath: **a buyer's Scope 3 Category 1 is largely its suppliers'
Scope 1 and 2** — the same tonnes, counted from the other side of one invoice. Category 1 is
cradle-to-gate, so a supplier's Scope 1+2 is the largest directly attributable part of it, not the
whole of it. This feature delivers primary data to replace a spend-based average; it does not
claim to produce a complete Category 1 figure.

## Decisions taken

**Only the number and its attestation cross the tenant boundary.** The buyer receives the
figures, the calculation behind them, the sign-off hash, the signer and the date. It does not
receive the supplier's documents. A TNB bill carries an account number, a service address, a
tariff band and a billing period — commercially sensitive, and none of it is the carbon number.
An assurer who needs the original asks the supplier, as it would today.

**The calculation travels with the figure.** Withholding the activity quantity would be theatre:
emission factors are public reference data, so 977.35 tCO₂e divided by a published 0.585
kgCO₂e/kWh returns the consumption in one step. Hiding what cannot be hidden only costs the buyer
the ability to show an assurer how the number was derived. Each line carries the factor id, the
quantity, the factor value, and the factor's source and year.

**Factor values are copied into the snapshot, not referenced.** When MGTC publishes a 2025 edition
the reference table will change. A disclosure that was signed under the 2024 factor must keep
reporting what was signed, so the snapshot stores the factor value and source it used.

**The supplier publishes a total and a basis; the buyer divides.** The supplier declares "977.35
tCO₂e for FY2025, against 48,000 units produced". A buyer that purchased 5,760 units computes its
own 12% share. Neither side has to disclose anything it would rather not: the supplier never names
its customers or their shares, and the buyer never waits on the supplier to compute. This is the
GHG Protocol's physical-allocation method, and the same shape supports a revenue basis.

**Publishing is a snapshot, not a live read.** A sign-off is already a point-in-time attestation;
the share inherits that semantic. If the supplier re-signs a year, that produces a new snapshot
and the buyer is notified — the figure the buyer cited last quarter does not silently change
underneath its own audit trail. Revocation sets a flag rather than deleting the row, so a buyer
can see that what it cited has been withdrawn.

**The two shared tables deliberately do not extend `TenantOwnedEntity`.** They belong to two
companies at once. Forcing them under a single-tenant Hibernate filter would require disabling
that filter somewhere, and a codebase that has never disabled it should not start now. Instead
every access binds the company id explicitly in the query, the way
`EvidenceChunkRepository.search` already does, with a comment at each site saying why.

## Data model

Four tables. Three migrations.

### `supply_link` — V81

Not tenant-owned; it names two tenants.

| Column | Notes |
|---|---|
| `id` | uuid |
| `buyer_company_id` | uuid, not null — the company that sent the invite |
| `supplier_company_id` | uuid, null until accepted |
| `supplier_email` | the address invited, before a company exists behind it |
| `status` | `PENDING` · `ACTIVE` · `DECLINED` · `REVOKED` |
| `invite_token` | unique, hashed, single use |
| `invited_by_user_id`, `invited_at`, `responded_at` | |

Unique on `(buyer_company_id, supplier_company_id)` where status is `ACTIVE`, so one pair cannot
hold two live links.

A supplier that is not yet on the platform registers through the invite, exactly as a team member
does today — but it lands in **its own new company**, not the buyer's. That is the one line that
separates this from `TeamInvite`, and the reason this cannot be built by extending it.

### `shared_disclosure` — V82

The snapshot. Not tenant-owned; reached only through a `supply_link`.

| Column | Notes |
|---|---|
| `id`, `supply_link_id` | |
| `fiscal_year` | |
| `scope1_tco2e`, `scope2_tco2e` | numeric(18,4) |
| `basis_quantity`, `basis_unit` | e.g. 48000, `units` — the denominator the buyer divides by |
| `sign_off_hash`, `signer_name`, `signed_at` | copied from `sign_off_record` at publish time |
| `published_at`, `revoked_at`, `revocation_reason` | |

A disclosure may only be published for a fiscal year that has an active, non-revoked sign-off. An
unsigned year has nothing to attest.

### `shared_disclosure_line` — V82

One row per emission activity entry behind the totals.

| Column | Notes |
|---|---|
| `disclosure_id`, `scope` | |
| `emission_factor_id`, `quantity`, `activity_unit` | |
| `factor_value`, `factor_source`, `factor_source_year` | copied, not referenced |
| `tco2e` | |

### `scope3_allocation` — V83

Tenant-owned by the **buyer**; extends `TenantOwnedEntity` like everything else.

| Column | Notes |
|---|---|
| `company_id` | the buyer |
| `shared_disclosure_id` | what it drew from |
| `purchased_quantity`, `purchased_unit` | the buyer's own figure |
| `share_fraction` | `purchased_quantity / basis_quantity`, stored for the audit trail |
| `allocated_tco2e` | `(scope1 + scope2) × share_fraction` |
| `ghg_category` | `1` for now; the column exists so categories 2 and 4 can follow |

The allocated figure flows into the buyer's Scope 3 the same way an accepted extraction does —
through `EmissionActivityService`, so sign-off, the assurance hash and the CSI export pick it up
without changes.

## Flow

```
buyer invites            supply_link PENDING ─────────► email with token
supplier accepts         registers its own company, link ACTIVE
supplier signs off FY    sign_off_record exists
supplier publishes       shared_disclosure + lines, snapshot of the signed figures
buyer sees the list      one row per active link that has published
buyer enters quantity    scope3_allocation, share computed and stored
                         ─────────► buyer's Scope 3 Category 1
```

Revocation and re-signing both create a new snapshot and mark the old one; the buyer's existing
allocation keeps pointing at the snapshot it used, and the UI flags that a newer one exists.

## Isolation

This is the first feature to cross the tenant boundary, so the rules are explicit.

- `SupplyLinkRepository` and `SharedDisclosureRepository` take the acting company id as a
  parameter on every method and bind it in the query. There is no method that reads by id alone.
- A buyer may read a `shared_disclosure` only through a link where it is the
  `buyer_company_id` and the status is `ACTIVE`.
- A supplier may write a `shared_disclosure` only through a link where it is the
  `supplier_company_id`.
- Nothing calls `session.disableFilter`. The two tables are outside the filter by design, not by
  exception.

## Testing

Unit tests, in the style of the existing `UnitConverter` and `ProposalValidator` suites:

- allocation arithmetic, including a purchased quantity larger than the basis (which must be
  refused, not silently clamped) and a zero basis
- publishing refused for a fiscal year with no sign-off, and for a revoked one
- snapshot immutability: changing an emission factor after publication does not change a
  published line

One test decides whether this ships:

> **A buyer cannot read a `shared_disclosure` on a link it is not the buyer of.**

Written against the repository, with two companies and two links, asserting an empty result rather
than an exception — a leak that returns rows is the failure mode that matters.

## Out of scope

- Spend-based allocation using EEIO factors. The physical basis is the defensible one; a monetary
  basis can reuse the same `basis_unit` column later.
- Sharing documents. Decided against above.
- Multi-tier supply chains. A supplier's own suppliers are a second network hop and a separate
  design.
- Automatic re-allocation when a supplier republishes. The buyer is notified and chooses.

## Why this is the next thing to build

Every unbuilt item on the deck's roadmap depends on it. The carbon arbitrage engine needs a
network to cross-match within; the sustainability-linked loan payload needs a verified figure that
has reached a counterparty. Without this, the product is a complete single-company pipeline. With
it, it is the thing the pitch describes.
