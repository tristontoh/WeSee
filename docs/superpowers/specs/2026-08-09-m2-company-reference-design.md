# M2 — Company & Reference Data

**Date:** 2026-08-09
**Status:** Approved, ready for implementation planning
**Milestone:** 2 of 6 (see [M1 spec](2026-08-08-m1-foundation-auth-design.md) for the full decomposition)

## Problem

M1 established auth, session, and plan gating. Everything a company *is* — its sector, market,
size, plan, team, and group structure — is still mock data. Onboarding shows six invented sectors;
Settings shows a hardcoded plan; there is no way to add a teammate at all.

## Deliverable

Onboard a company, manage its profile and plan, run its team, and navigate a group hierarchy,
all against real endpoints.

## Scope

M2 covers the **company-facing** surface of the `tenant` and `reference` modules:

| Capability | Endpoints |
|---|---|
| Onboarding | `PATCH /auth/onboarding`, `GET /reference/sectors` |
| Company profile | `GET /company`, `PATCH /company/profile` |
| Plan & pricing | `PATCH /company/plan`, `GET /reference/plan-pricing` |
| Team management | `GET`/`POST /company/users`, `PATCH /company/users/{id}/role`, `PATCH /company/users/{id}/active`, `GET`/`POST /company/invites`, `POST /company/invites/{id}/resend`, `DELETE /company/invites/{id}` |
| Group & subsidiaries | `GET /company/group`, `POST /company/subsidiaries`, `DELETE /company/subsidiaries/{id}`, `POST /company/switch/{id}` |
| Reference data | `GET /reference/matters`, `/matters/applicable`, `/indicators`, `/indicators/applicable` |

**Out of scope:** the `/api/v1/admin/*` controllers that live in these same Java packages
(`TenantAdminController`, `PlanPricingController`, `ReferenceAdminController`). They are
platform-admin surfaces and belong to M6. Account profile and password changes in Settings are
also M6 — M2 wires only the company-scoped sections of that screen.

## Architecture

Two new services following M1's feature-scoped pattern. The interceptor, `SessionService`, and
`PlanGateService` are reused unchanged.

```
frontend/src/app/core/
├── company/
│   └── company-api.service.ts     profile, plan, users, invites, group
└── reference/
    └── reference-api.service.ts   sectors, matters, indicators, plan-pricing
```

New screens:

```
frontend/src/app/screens/company/
├── team/team.component.ts         members, invites, roles
└── group/group.component.ts       subsidiaries, switching
```

## Data contracts

Copied from the backend records so the plan can be written without re-deriving them.

```
CompanyResponse   { id, name, sectorCode, sizeBand, marketClassification,
                    subscriptionPlan, sectorModuleEnabled, onboardingCompleted }
SectorResponse    { code, name }
PlanPricingResponse { plan, monthlyPrice }
TenantUserResponse  { id, name, email, role, active, createdAt }
CreateTenantUserResponse { id, name, email, role, active, createdAt, temporaryPassword }
TeamInviteResponse  { id, name, email, role, invitedByName, createdAt, expiresAt, expired, inviteUrl }
CompanyGroupMemberResponse { id, name, sectorCode, marketClassification, subscriptionPlan, current }
```

Enums: `MarketClassification` = `SME | MAIN_MARKET | ACE_MARKET`; `CompanySizeBand` =
`MICRO | SMALL | MEDIUM | LARGE`.

Request bodies: `OnboardingRequest { market (required), sectorCode, frameworks[], priorities[] }`;
`UpdateCompanyProfileRequest { sectorCode, sizeBand, sectorModuleEnabled }`;
`UpdatePlanRequest { plan }`; `CreateTenantUserRequest { name, email, role }`;
`CreateSubsidiaryRequest { name }`.

Note `UpdateCompanyProfileRequest` does **not** accept `name` or `marketClassification` — company
name is set at registration and market only at onboarding. The profile form must not offer them.

## Screens

### Onboarding

The current screen picks from six invented sectors (`electronics`, `palm`, …) and contains two
controls with no backend: a "Gemini API token" validator and a "connect buyer" invite. Both are
removed, on the same reasoning as M1's Google/Apple buttons — a control that can never work is
worse than no control.

Replaced with:

- Sectors loaded from `GET /reference/sectors`. The backend seeds **eight** codes
  (`AGRICULTURE_PLANTATION`, `CONSTRUCTION_PROPERTY`, `CONSUMER_RETAIL`, `ENERGY_OIL_GAS`,
  `FINANCIAL_SERVICES`, `HEALTHCARE_PHARMA`, `MANUFACTURING`, `TECHNOLOGY_SOFTWARE`), none matching
  the mock keys. A `code → icon` map covers these eight with a generic fallback, because a platform
  admin can add sectors at runtime via `POST /admin/reference/…`.
- A **market** selector — `OnboardingRequest.market` is `@NotNull`, so onboarding cannot succeed
  without it and the current screen has no such control.
- Submit `PATCH /auth/onboarding`, which returns a fresh `MeResponse`; the session is updated from
  it directly.

### Settings

Wire two sections; leave the rest mocked for M6.

- **Company profile** — `sectorCode` and `sizeBand` via `PATCH /company/profile`.
- **Plan** — current plan from the session, prices from `GET /reference/plan-pricing`, change via
  `PATCH /company/plan`. A plan change alters `MeResponse.plan`, so the session must be refreshed
  and the nav may change (see [M1 §3](2026-08-08-m1-foundation-auth-design.md)).

### Team (new)

Members list with role and active state, plus pending invites. Actions: add user, invite user,
change role, activate/deactivate, resend invite, revoke invite.

**Both creation paths return a secret that is shown exactly once.** `POST /company/users` returns a
`temporaryPassword`; `POST /company/invites` returns an `inviteUrl`. With SMTP unconfigured — the
default in development — these are the only way the new person gets access. Each must appear in a
copyable panel stating plainly that it will not be shown again.

Role options are limited to `COMPANY_ADMIN`, `COMPANY_CONTRIBUTOR`, and `CONSULTANT`. The platform
roles are not assignable from a company screen.

### Group (new)

Lists group members from `GET /company/group`, flagging the current one. Create a subsidiary,
delete a subsidiary, and switch the active company.

## Company switching

`POST /company/switch/{id}` returns a `CompanyGroupMemberResponse`, **not a new token** — which
initially looks like it would leave the JWT's `companyId` claim stale. It does not, because
`JwtAuthenticationFilter` resolves the company from the database on every request:

```java
var companyId = user.getCompany() != null ? user.getCompany().getId() : null;
```

The JWT's `companyId` claim is decorative; the database is authoritative. A switch therefore takes
effect on the very next request with no re-login.

The client must still call `GET /auth/me` afterwards, because the cached `MeResponse` — company
name, sector, and **plan** — is now stale. Since a subsidiary may sit on a different plan, this can
change which navigation renders. Skipping the refresh would leave the user on the wrong nav with
the wrong plan gates.

## Navigation

Team and Group are added to the workspace and compliance-hub nav sets in `core/nav.ts`. Neither has
a `feature_flag` entry, so `PlanGateService.state()` returns `visible` for them at any plan —
matching the backend, which leaves unlisted features open.

Role visibility differs between the two, because the backend guards them differently:

| Endpoint | Guard |
|---|---|
| `GET /company`, `GET /company/users` | open to any company member |
| `PATCH /company/profile` | `COMPANY_ADMIN` *(was open — see below)* |
| `PATCH /company/plan` | `COMPANY_ADMIN` |
| all `/company/users` writes, all `/company/invites` | `COMPANY_ADMIN` |
| `GET /company/group`, all `/subsidiaries`, `/switch` | `COMPANY_ADMIN` |

- **Team** is readable by any company member (`GET /users` is open), so the nav entry is shown to
  all company roles, with every mutating control hidden unless the session role is `COMPANY_ADMIN`.
- **Group** is entirely `COMPANY_ADMIN`-gated, including its list endpoint, so the nav entry is
  hidden for other roles rather than shown failing.

### A backend authorization gap — since fixed

`PATCH /company/profile` originally carried no `@PreAuthorize`, so any authenticated company
member — including a `CONSULTANT` — could change the company's sector code and size band, while
every sibling mutation on that controller was `COMPANY_ADMIN`-guarded.

M2 shipped with the profile form read-only for non-admins, but recorded that this was a
client-side courtesy rather than a security control, and flagged the endpoint for a follow-up.

**Resolved on 2026-08-15**: `@PreAuthorize("hasRole('COMPANY_ADMIN')")` was added to the endpoint.
Verified against the running backend with a real `CONSULTANT` account — the call returns 403 where
it previously returned 200, while read access (`GET /company`, `GET /indicators`) is unaffected.
The read-only form now mirrors the backend rather than compensating for it.

## Error handling

Reuses M1's `toApiError` and interceptor unchanged. Two cases need screen-level messages:

- `403` with a token on a `/company/*` write → the user is not a `COMPANY_ADMIN`. Surface it; do
  not log them out (M1's rule already covers this).
- Deleting a subsidiary that still has users or data returns a `400`/`409` with a message — render
  the backend's message rather than inventing one.

## Testing

**Playwright** (against the live backend):

- onboarding: pick sector + market → submit → `onboardingCompleted` true, lands on dashboard
- onboarding rejects submission with no market selected
- settings: change plan → session refreshes → nav reflects the new plan
- team: add user → temporary password shown once
- team: invite → invite URL shown; revoke removes it from the list
- team: change a member's role → list reflects it
- group: create subsidiary → appears in list; switch → session and nav follow

**Jasmine:** sector `code → icon` mapping including the unknown-code fallback; role-option
filtering; plan-price formatting.

## Out of scope

- `/api/v1/admin/*` surfaces → M6
- Account name, password, avatar, notification preferences in Settings → M6
- `company/email-settings` → M6
- The 14 screens still on mocks that neither `tenant` nor `reference` can serve
