# M2 — Company & Reference Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock company data with the real `tenant` and `reference` APIs — onboarding, company profile, plan, team management, and the group hierarchy.

**Architecture:** Two new feature-scoped services (`company-api`, `reference-api`) following M1's pattern, reusing the interceptor, `SessionService`, and `PlanGateService` unchanged. Two new screens (Team, Group) plus rewiring of Onboarding and the company-scoped parts of Settings.

**Tech Stack:** Angular 19 (standalone, signals, `inject()`), RxJS 7.8, Playwright, Jasmine/Karma, Spring Boot 3.3.5 backend.

## Global Constraints

- API base is `API_BASE` from `core/http/api-base.ts` (`http://localhost:8080/api/v1`). Never hardcode a URL.
- All components `standalone: true`, using `inject()` and signals. Match existing style: 2-space indent, single quotes.
- Karma needs `CHROME_BIN` set to Playwright's Chromium; there is no system Chrome:
  `export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"`
- Run all `git` commands from the repo root `/Users/liltris/Desktop/WeSee`, not from `frontend/`.
- `MarketClassification` = `SME | MAIN_MARKET | ACE_MARKET`. `CompanySizeBand` = `MICRO | SMALL | MEDIUM | LARGE`.
- Company-assignable roles are only `COMPANY_ADMIN`, `COMPANY_CONTRIBUTOR`, `CONSULTANT`.
- `UpdateCompanyProfileRequest` accepts **only** `sectorCode`, `sizeBand`, `sectorModuleEnabled` — never `name` or `marketClassification`.
- After any call that changes plan or active company, refresh the session via `GET /auth/me`, because nav derives from plan.

---

### Task 1: Reference API service and sector icons

**Files:**
- Create: `frontend/src/app/core/reference/reference.model.ts`
- Create: `frontend/src/app/core/reference/sector-icons.ts`
- Create: `frontend/src/app/core/reference/sector-icons.spec.ts`
- Create: `frontend/src/app/core/reference/reference-api.service.ts`

**Interfaces:**
- Consumes: `API_BASE`, `SubscriptionPlan` from `core/auth/session.model`
- Produces: `SectorResponse`, `PlanPricingResponse`, `MatterResponse`, `IndicatorDefinitionResponse`, `sectorIcon(code)`, `ReferenceApiService`

- [ ] **Step 1: Write `reference.model.ts`**

```typescript
import { SubscriptionPlan } from '../auth/session.model';

export interface SectorResponse {
  code: string;
  name: string;
}

export interface PlanPricingResponse {
  plan: SubscriptionPlan;
  monthlyPrice: number;
}

export interface MatterResponse {
  id: string;
  name: string;
  category: string;
  description: string;
  matterSet: string;
}

export interface IndicatorDefinitionResponse {
  id: string;
  name: string;
  unit: string;
  matterId: string;
  category: string;
  sectorSpecific: boolean;
  sectorCode: string | null;
}
```

- [ ] **Step 2: Write the failing icon test**

Create `sector-icons.spec.ts`:

```typescript
import { sectorIcon, FALLBACK_ICON } from './sector-icons';

describe('sectorIcon', () => {
  it('returns a distinct icon for each seeded sector code', () => {
    const codes = [
      'AGRICULTURE_PLANTATION', 'CONSTRUCTION_PROPERTY', 'CONSUMER_RETAIL',
      'ENERGY_OIL_GAS', 'FINANCIAL_SERVICES', 'HEALTHCARE_PHARMA',
      'MANUFACTURING', 'TECHNOLOGY_SOFTWARE',
    ];
    const icons = codes.map(sectorIcon);
    icons.forEach((i) => expect(i).not.toBe(FALLBACK_ICON));
    expect(new Set(icons).size).toBe(codes.length);
  });

  it('falls back for a code the platform admin added later', () => {
    expect(sectorIcon('SOMETHING_NEW')).toBe(FALLBACK_ICON);
  });

  it('falls back for an empty or null code', () => {
    expect(sectorIcon('')).toBe(FALLBACK_ICON);
    expect(sectorIcon(null as unknown as string)).toBe(FALLBACK_ICON);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd frontend && export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless
```
Expected: FAIL — `Cannot find module './sector-icons'`.

- [ ] **Step 4: Write `sector-icons.ts`**

```typescript
/** Generic building glyph, used for any sector code we do not have art for. */
export const FALLBACK_ICON = 'M3 21h18M5 21V7l7-4 7 4v14M10 21v-6h4v6';

/**
 * The backend seeds eight sectors, but a platform admin can add more at runtime via
 * POST /admin/reference/…, so unknown codes must degrade rather than render blank.
 */
const ICONS: Record<string, string> = {
  AGRICULTURE_PLANTATION: 'M12 22V8M12 8c0-3 2-5 5-5-1 3-2 5-5 5zM12 8c0-3-2-5-5-5 1 3 2 5 5 5z',
  CONSTRUCTION_PROPERTY: 'M2 20h20M4 20V8l8-5 8 5v12M9 20v-6h6v6',
  CONSUMER_RETAIL: 'M6 2L3 6v14h18V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  ENERGY_OIL_GAS: 'M13 2L3 14h8l-1 8 10-12h-8z',
  FINANCIAL_SERVICES: 'M3 21h18M4 21V10M20 21V10M12 3L2 9h20zM8 21V10M16 21V10',
  HEALTHCARE_PHARMA: 'M12 4v16M4 12h16',
  MANUFACTURING: 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m14 0h2M3 15h2m14 0h2M6 6h12v12H6z',
  TECHNOLOGY_SOFTWARE: 'M8 6l-6 6 6 6M16 6l6 6-6 6',
};

export function sectorIcon(code: string): string {
  return (code && ICONS[code]) || FALLBACK_ICON;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run the same command as Step 3.
Expected: PASS — 3 new specs, 26 total.

- [ ] **Step 6: Write `reference-api.service.ts`**

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import {
  IndicatorDefinitionResponse,
  MatterResponse,
  PlanPricingResponse,
  SectorResponse,
} from './reference.model';

@Injectable({ providedIn: 'root' })
export class ReferenceApiService {
  private http = inject(HttpClient);

  sectors(): Observable<SectorResponse[]> {
    return this.http.get<SectorResponse[]>(`${API_BASE}/reference/sectors`);
  }

  planPricing(): Observable<PlanPricingResponse[]> {
    return this.http.get<PlanPricingResponse[]>(`${API_BASE}/reference/plan-pricing`);
  }

  matters(): Observable<MatterResponse[]> {
    return this.http.get<MatterResponse[]>(`${API_BASE}/reference/matters`);
  }

  /** Narrowed to the company's sector and market — used by M4's materiality screens. */
  applicableMatters(): Observable<MatterResponse[]> {
    return this.http.get<MatterResponse[]>(`${API_BASE}/reference/matters/applicable`);
  }

  indicators(): Observable<IndicatorDefinitionResponse[]> {
    return this.http.get<IndicatorDefinitionResponse[]>(`${API_BASE}/reference/indicators`);
  }

  applicableIndicators(): Observable<IndicatorDefinitionResponse[]> {
    return this.http.get<IndicatorDefinitionResponse[]>(`${API_BASE}/reference/indicators/applicable`);
  }
}
```

- [ ] **Step 7: Verify the build**

```bash
cd frontend && npx ng build --configuration development
```
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/src/app/core/reference
git commit -m "feat(reference): add reference API service and sector icon mapping"
```

---

### Task 2: Company API service

**Files:**
- Create: `frontend/src/app/core/company/company.model.ts`
- Create: `frontend/src/app/core/company/company-api.service.ts`

**Interfaces:**
- Consumes: `API_BASE`, `Role`/`SubscriptionPlan` from `core/auth/session.model`
- Produces: `CompanyApiService` plus the company DTO types

- [ ] **Step 1: Write `company.model.ts`**

```typescript
import { Role, SubscriptionPlan } from '../auth/session.model';

export type MarketClassification = 'SME' | 'MAIN_MARKET' | 'ACE_MARKET';
export type CompanySizeBand = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE';

/** Roles a company admin may assign. Platform roles are deliberately excluded. */
export const ASSIGNABLE_ROLES: Role[] = ['COMPANY_ADMIN', 'COMPANY_CONTRIBUTOR', 'CONSULTANT'];

export const MARKETS: { value: MarketClassification; label: string }[] = [
  { value: 'SME', label: 'SME' },
  { value: 'MAIN_MARKET', label: 'Main Market' },
  { value: 'ACE_MARKET', label: 'ACE Market' },
];

export const SIZE_BANDS: { value: CompanySizeBand; label: string }[] = [
  { value: 'MICRO', label: 'Micro' },
  { value: 'SMALL', label: 'Small' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LARGE', label: 'Large' },
];

export interface CompanyResponse {
  id: string;
  name: string;
  sectorCode: string | null;
  sizeBand: CompanySizeBand | null;
  marketClassification: MarketClassification | null;
  subscriptionPlan: SubscriptionPlan;
  sectorModuleEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface TenantUserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

/** Carries a one-time secret: with SMTP off this is the only way the user gets in. */
export interface CreateTenantUserResponse extends TenantUserResponse {
  temporaryPassword: string;
}

/** Also carries a one-time secret — inviteUrl. */
export interface TeamInviteResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  inviteUrl: string;
}

export interface CompanyGroupMemberResponse {
  id: string;
  name: string;
  sectorCode: string | null;
  marketClassification: MarketClassification | null;
  subscriptionPlan: SubscriptionPlan;
  current: boolean;
}

export interface UpdateCompanyProfileRequest {
  sectorCode?: string;
  sizeBand?: CompanySizeBand;
  sectorModuleEnabled?: boolean;
}
```

- [ ] **Step 2: Write `company-api.service.ts`**

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { Role, SubscriptionPlan } from '../auth/session.model';
import {
  CompanyGroupMemberResponse,
  CompanyResponse,
  CreateTenantUserResponse,
  TeamInviteResponse,
  TenantUserResponse,
  UpdateCompanyProfileRequest,
} from './company.model';

@Injectable({ providedIn: 'root' })
export class CompanyApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/company`;

  get(): Observable<CompanyResponse> {
    return this.http.get<CompanyResponse>(this.base);
  }

  updateProfile(body: UpdateCompanyProfileRequest): Observable<CompanyResponse> {
    return this.http.patch<CompanyResponse>(`${this.base}/profile`, body);
  }

  updatePlan(plan: SubscriptionPlan): Observable<CompanyResponse> {
    return this.http.patch<CompanyResponse>(`${this.base}/plan`, { plan });
  }

  // --- team ---

  listUsers(): Observable<TenantUserResponse[]> {
    return this.http.get<TenantUserResponse[]>(`${this.base}/users`);
  }

  createUser(name: string, email: string, role: Role): Observable<CreateTenantUserResponse> {
    return this.http.post<CreateTenantUserResponse>(`${this.base}/users`, { name, email, role });
  }

  updateUserRole(userId: string, role: Role): Observable<TenantUserResponse> {
    return this.http.patch<TenantUserResponse>(`${this.base}/users/${userId}/role`, { role });
  }

  /** `active` is a query parameter here, not a body field. */
  setUserActive(userId: string, active: boolean): Observable<TenantUserResponse> {
    return this.http.patch<TenantUserResponse>(`${this.base}/users/${userId}/active`, null, {
      params: { active },
    });
  }

  // --- invites ---

  listInvites(): Observable<TeamInviteResponse[]> {
    return this.http.get<TeamInviteResponse[]>(`${this.base}/invites`);
  }

  createInvite(name: string, email: string, role: Role): Observable<TeamInviteResponse> {
    return this.http.post<TeamInviteResponse>(`${this.base}/invites`, { name, email, role });
  }

  resendInvite(inviteId: string): Observable<TeamInviteResponse> {
    return this.http.post<TeamInviteResponse>(`${this.base}/invites/${inviteId}/resend`, {});
  }

  revokeInvite(inviteId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/invites/${inviteId}`);
  }

  // --- group ---

  group(): Observable<CompanyGroupMemberResponse[]> {
    return this.http.get<CompanyGroupMemberResponse[]>(`${this.base}/group`);
  }

  createSubsidiary(name: string): Observable<CompanyGroupMemberResponse> {
    return this.http.post<CompanyGroupMemberResponse>(`${this.base}/subsidiaries`, { name });
  }

  deleteSubsidiary(companyId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/subsidiaries/${companyId}`);
  }

  /**
   * Reassigns the caller's company server-side. No new token is issued and none is needed —
   * JwtAuthenticationFilter resolves the company from the database on every request, so the
   * switch takes effect immediately. The caller must still refresh the session via /auth/me
   * because the cached MeResponse (including plan, which drives nav) is now stale.
   */
  switchTo(companyId: string): Observable<CompanyGroupMemberResponse> {
    return this.http.post<CompanyGroupMemberResponse>(`${this.base}/switch/${companyId}`, {});
  }
}
```

- [ ] **Step 3: Verify the build**

```bash
cd frontend && npx ng build --configuration development
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/src/app/core/company
git commit -m "feat(company): add company API service covering profile, plan, team, and group"
```

---

### Task 3: Session refresh helper

Plan changes and company switches both invalidate the cached session. Both screens need the same
refresh, so it lives in one place rather than being duplicated.

**Files:**
- Modify: `frontend/src/app/core/auth/session.service.ts`
- Modify: `frontend/src/app/core/auth/session.service.spec.ts`

**Interfaces:**
- Produces: `SessionService.applyUser(user: MeResponse): void`

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('SessionService', …)` block in `session.service.spec.ts`:

```typescript
  it('applyUser() replaces the cached user while keeping the token', () => {
    svc.setSession('tok', user({ plan: 'STARTER' }));
    svc.applyUser(user({ plan: 'ISSUER_READY' }));
    expect(svc.token()).toBe('tok');
    expect(svc.plan()).toBe('ISSUER_READY');
    expect(svc.navKey()).toBe('compliance-hub');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless
```
Expected: FAIL — `svc.applyUser is not a function`.

- [ ] **Step 3: Add `applyUser` to `SessionService`**

Insert immediately after `setSession`:

```typescript
  /**
   * Replaces the cached user without touching the token. Used after a plan change or a company
   * switch, both of which alter MeResponse — including `plan`, which drives navigation.
   */
  applyUser(user: MeResponse) {
    this.userSignal.set(user);
    writeString(USER_KEY, JSON.stringify(user));
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Same command as Step 2.
Expected: PASS — 27 total.

- [ ] **Step 5: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/src/app/core/auth
git commit -m "feat(auth): add applyUser for refreshing a session after plan or company changes"
```

---

### Task 4: Onboarding against real sectors and markets

**Files:**
- Modify: `frontend/src/app/screens/workspace/onboarding/onboarding.component.ts`

**Interfaces:**
- Consumes: `ReferenceApiService`, `AuthApiService`, `SessionService`, `sectorIcon`, `MARKETS`
- Produces: a working onboarding submit

- [ ] **Step 1: Add the onboarding call to `AuthApiService`**

Append to `frontend/src/app/core/auth/auth-api.service.ts`:

```typescript
  /** Returns a fresh MeResponse; the session should be updated from it. */
  completeOnboarding(body: {
    market: string;
    sectorCode: string | null;
    frameworks: string[];
    priorities: string[];
  }): Observable<MeResponse> {
    return this.http.patch<MeResponse>(`${API_BASE}/auth/onboarding`, body);
  }
```

- [ ] **Step 2: Replace the `OnboardingComponent` class body**

The current class uses the `SECTORS` mock, a fake Gemini-token validator, and a fake buyer invite.
Replace the whole class with:

```typescript
export class OnboardingComponent implements OnInit {
  private ui = inject(UiService);
  private router = inject(Router);
  private reference = inject(ReferenceApiService);
  private auth = inject(AuthApiService);
  private session = inject(SessionService);

  markets = MARKETS;
  selectedSector = signal<string>('');
  selectedMarket = signal<string>('');
  loading = signal(false);
  saving = signal(false);
  error = signal('');

  private raw = signal<SectorResponse[]>([]);

  sectors = computed(() =>
    this.raw().map((s) => {
      const active = s.code === this.selectedSector();
      return {
        key: s.code,
        label: s.name,
        d: sectorIcon(s.code),
        border: active ? '#4C96B3' : '#E5E8E1',
        bg: active ? '#E7F0F2' : '#fff',
        fg: active ? '#4C96B3' : '#33413A',
      };
    }),
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.reference.sectors().subscribe({
      next: (list) => {
        this.raw.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  finish() {
    // market is @NotNull on OnboardingRequest, so the backend rejects a blank one.
    if (!this.selectedMarket()) {
      this.error.set('Choose which market your company is listed on.');
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');

    this.auth
      .completeOnboarding({
        market: this.selectedMarket(),
        sectorCode: this.selectedSector() || null,
        frameworks: [],
        priorities: [],
      })
      .subscribe({
        next: (me) => {
          this.session.applyUser(me);
          this.saving.set(false);
          this.ui.showToast('Setup complete.');
          this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(toApiError(err).message);
        },
      });
  }
}
```

Replace the imports at the top of the file with:

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../../core/ui.service';
import { ReferenceApiService } from '../../../core/reference/reference-api.service';
import { SectorResponse } from '../../../core/reference/reference.model';
import { sectorIcon } from '../../../core/reference/sector-icons';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { MARKETS } from '../../../core/company/company.model';
import { toApiError } from '../../../core/http/api-error';
```

- [ ] **Step 3: Update the template**

Delete the API-token block (the row containing `validateToken()` and the masked `AIza…` key) and
the buyer-invite block (the button calling `connectBuyer()`), including their section headings.

Add a market selector before the "Finish setup" button:

```html
        <div style="margin-top:26px;">
          <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:10px;">MARKET</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button *ngFor="let m of markets" (click)="selectedMarket.set(m.value)" type="button"
              [style.border-color]="selectedMarket() === m.value ? '#4C96B3' : '#E5E8E1'"
              [style.background]="selectedMarket() === m.value ? '#E7F0F2' : '#fff'"
              [style.color]="selectedMarket() === m.value ? '#4C96B3' : '#33413A'"
              style="padding:10px 18px;border-radius:11px;border-width:1px;border-style:solid;cursor:pointer;font-size:13.5px;font-weight:600;font-family:inherit;">
              {{ m.label }}
            </button>
          </div>
        </div>

        <div *ngIf="error()" style="margin-top:16px;font-size:12.5px;color:#8C3A2E;background:#FBEAE7;border:1px solid #F0C4BC;padding:10px 13px;border-radius:11px;">{{ error() }}</div>
```

Change the finish button to call `finish()` and reflect saving state:

```html
          <button (click)="finish()" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Finish setup' }}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>
```

- [ ] **Step 4: Verify the build and tests**

```bash
cd frontend && npx ng build --configuration development
export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless
```
Expected: build succeeds; 27 specs pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/src/app/screens/workspace/onboarding frontend/src/app/core/auth/auth-api.service.ts
git commit -m "feat(onboarding): use real sectors and add the required market selector"
```

---

### Task 5: Settings — company profile and plan

**Files:**
- Modify: `frontend/src/app/screens/settings/settings.component.ts`

**Interfaces:**
- Consumes: `CompanyApiService`, `ReferenceApiService`, `SessionService`, `AuthApiService`
- Produces: working sector/size-band editing and plan change

- [ ] **Step 1: Add company state to the component class**

Add these injections and signals to `SettingsComponent`:

```typescript
  private companyApi = inject(CompanyApiService);
  private referenceApi = inject(ReferenceApiService);
  private authApi = inject(AuthApiService);
  private session = inject(SessionService);

  sizeBands = SIZE_BANDS;
  company = signal<CompanyResponse | null>(null);
  sectors = signal<SectorResponse[]>([]);
  pricing = signal<PlanPricingResponse[]>([]);
  savingProfile = signal(false);
  savingPlan = signal(false);
  companyError = signal('');

  /** PATCH /company/profile has no @PreAuthorize, but every sibling mutation is
   * COMPANY_ADMIN-only, so the form is read-only for other roles to match intent. */
  canEditCompany = computed(() => this.session.role() === 'COMPANY_ADMIN');

  currentPlan = computed(() => this.session.plan());
  planPrice = computed(() => {
    const p = this.pricing().find((x) => x.plan === this.currentPlan());
    return p ? `RM${Number(p.monthlyPrice).toFixed(2)} / month` : '—';
  });
```

- [ ] **Step 2: Load company data on init**

Add to the component (or extend the existing `ngOnInit`):

```typescript
  ngOnInit(): void {
    this.companyApi.get().subscribe({
      next: (c) => this.company.set(c),
      error: (err) => this.companyError.set(toApiError(err).message),
    });
    this.referenceApi.sectors().subscribe({ next: (s) => this.sectors.set(s), error: () => {} });
    this.referenceApi.planPricing().subscribe({ next: (p) => this.pricing.set(p), error: () => {} });
  }
```

If the class already implements `OnInit` with a body, merge these calls into it rather than adding
a second method.

- [ ] **Step 3: Add the save handlers**

```typescript
  saveProfile(sectorCode: string, sizeBand: string) {
    if (this.savingProfile()) return;
    this.savingProfile.set(true);
    this.companyError.set('');
    this.companyApi
      .updateProfile({ sectorCode, sizeBand: sizeBand as CompanySizeBand })
      .subscribe({
        next: (c) => {
          this.company.set(c);
          this.savingProfile.set(false);
          this.ui.showToast('Company profile saved.');
        },
        error: (err) => {
          this.savingProfile.set(false);
          this.companyError.set(toApiError(err).message);
        },
      });
  }

  changePlan(plan: SubscriptionPlan) {
    if (this.savingPlan() || plan === this.currentPlan()) return;
    this.savingPlan.set(true);
    this.companyError.set('');
    this.companyApi.updatePlan(plan).subscribe({
      next: (c) => {
        this.company.set(c);
        // Plan drives navigation, so the cached session must follow.
        this.authApi.me().subscribe({
          next: (me) => {
            this.session.applyUser(me);
            this.savingPlan.set(false);
            this.ui.showToast(`Plan changed to ${plan}.`);
          },
          error: () => this.savingPlan.set(false),
        });
      },
      error: (err) => {
        this.savingPlan.set(false);
        this.companyError.set(toApiError(err).message);
      },
    });
  }
```

- [ ] **Step 4: Add the imports**

```typescript
import { CompanyApiService } from '../../core/company/company-api.service';
import { CompanySizeBand, CompanyResponse, SIZE_BANDS } from '../../core/company/company.model';
import { ReferenceApiService } from '../../core/reference/reference-api.service';
import { PlanPricingResponse, SectorResponse } from '../../core/reference/reference.model';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { SessionService } from '../../core/auth/session.service';
import { SubscriptionPlan } from '../../core/auth/session.model';
import { toApiError } from '../../core/http/api-error';
```

- [ ] **Step 5: Replace the hardcoded plan markup**

Replace the literal `Workspace Starter` line with the live plan and price:

```html
            <div style="font-size:13px;font-weight:600;margin-bottom:2px;">{{ currentPlan() || '—' }}</div>
            <div style="font-size:12px;color:#8A968F;">{{ planPrice() }}</div>
```

Add a company section with sector and size band, and plan buttons:

```html
      <div style="margin-top:26px;">
        <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;">COMPANY</div>
        <div style="font-size:14px;font-weight:600;color:#1B2B24;margin-bottom:12px;">{{ company()?.name || '—' }}</div>

        <label style="font-size:12.5px;font-weight:600;color:#33413A;display:block;margin-bottom:6px;">Sector</label>
        <select #sectorSel [value]="company()?.sectorCode || ''" [disabled]="!canEditCompany()" style="width:100%;height:42px;border-radius:11px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:14px;background:#fff;">
          <option value="">Not set</option>
          <option *ngFor="let s of sectors()" [value]="s.code">{{ s.name }}</option>
        </select>

        <label style="font-size:12.5px;font-weight:600;color:#33413A;display:block;margin:14px 0 6px;">Company size</label>
        <select #sizeSel [value]="company()?.sizeBand || ''" [disabled]="!canEditCompany()" style="width:100%;height:42px;border-radius:11px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:14px;background:#fff;">
          <option value="">Not set</option>
          <option *ngFor="let b of sizeBands" [value]="b.value">{{ b.label }}</option>
        </select>

        <button *ngIf="canEditCompany()" (click)="saveProfile(sectorSel.value, sizeSel.value)" [disabled]="savingProfile()" style="margin-top:14px;height:42px;padding:0 18px;border-radius:11px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13.5px;font-family:inherit;">{{ savingProfile() ? 'Saving…' : 'Save company profile' }}</button>

        <div *ngIf="canEditCompany()" style="margin-top:22px;">
          <div style="font-size:12.5px;font-weight:600;color:#33413A;margin-bottom:8px;">Change plan</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button *ngFor="let p of pricing()" (click)="changePlan(p.plan)" [disabled]="savingPlan() || p.plan === currentPlan()"
              [style.background]="p.plan === currentPlan() ? '#E7F0F2' : '#fff'"
              style="padding:9px 14px;border-radius:10px;border:1px solid #E5E8E1;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;color:#33413A;">
              {{ p.plan }}
            </button>
          </div>
        </div>

        <div *ngIf="companyError()" style="margin-top:14px;font-size:12.5px;color:#8C3A2E;background:#FBEAE7;border:1px solid #F0C4BC;padding:10px 13px;border-radius:11px;">{{ companyError() }}</div>
      </div>
```

- [ ] **Step 6: Verify build and tests**

```bash
cd frontend && npx ng build --configuration development
export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless
```
Expected: build succeeds; 27 specs pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/src/app/screens/settings
git commit -m "feat(settings): wire company profile and plan to the real API"
```

---

### Task 6: Team screen

**Files:**
- Create: `frontend/src/app/screens/company/team/team.component.ts`

**Interfaces:**
- Consumes: `CompanyApiService`, `SessionService`, `ASSIGNABLE_ROLES`, `toApiError`
- Produces: `TeamComponent` at route `/team`

- [ ] **Step 1: Write the component**

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CompanyApiService } from '../../../core/company/company-api.service';
import { ASSIGNABLE_ROLES, TeamInviteResponse, TenantUserResponse } from '../../../core/company/company.model';
import { Role } from '../../../core/auth/session.model';
import { SessionService } from '../../../core/auth/session.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:18px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:40px;border-radius:10px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:13.5px;';
const BTN = 'height:40px;padding:0 16px;border-radius:10px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:28px 30px;font-family:'Inter Tight',system-ui,sans-serif;color:#1B2B24;">
      <h1 style="font-family:'Sora',sans-serif;font-size:26px;font-weight:600;margin:0 0 4px;">Team</h1>
      <p style="color:#8A968F;font-size:14px;margin:0 0 22px;">People with access to {{ session.user()?.companyName || 'your company' }}.</p>

      <!-- one-time secret -->
      <div *ngIf="secret()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:18px;margin-bottom:18px;">
        <div style="font-weight:600;font-size:13.5px;margin-bottom:6px;">{{ secret()!.title }}</div>
        <div style="font-size:12.5px;color:#7A6A3A;margin-bottom:10px;">Copy this now — it will not be shown again.</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <code style="flex:1;background:#fff;border:1px solid #EADFC0;border-radius:9px;padding:10px 12px;font-size:12.5px;overflow-x:auto;white-space:nowrap;">{{ secret()!.value }}</code>
          <button (click)="dismissSecret()" style="height:38px;padding:0 14px;border-radius:9px;border:1px solid #EADFC0;background:#fff;cursor:pointer;font-family:inherit;font-size:13px;">Done</button>
        </div>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:18px;font-size:13px;">{{ error() }}</div>

      <!-- add member -->
      <div *ngIf="canManage()" [style]="card">
        <div [style]="h">ADD SOMEONE</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <input #nm placeholder="Full name" [style]="input" style="flex:1;min-width:150px;">
          <input #em placeholder="email@company.com" [style]="input" style="flex:1;min-width:180px;">
          <select #rl [style]="input">
            <option *ngFor="let r of roles" [value]="r">{{ label(r) }}</option>
          </select>
          <button (click)="addUser(nm.value, em.value, rl.value)" [style]="btn" [disabled]="busy()">Create user</button>
          <button (click)="invite(nm.value, em.value, rl.value)" [style]="btn" style="background:#fff;color:#4C96B3;border:1px solid #BFD8DD;" [disabled]="busy()">Send invite</button>
        </div>
      </div>

      <!-- members -->
      <div [style]="card">
        <div [style]="h">MEMBERS ({{ users().length }})</div>
        <div *ngFor="let u of users()" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;">{{ u.name }}</div>
            <div style="font-size:12.5px;color:#8A968F;">{{ u.email }}</div>
          </div>
          <span *ngIf="!u.active" style="font-size:11px;font-weight:600;color:#B36A5E;background:#FBEAE7;padding:3px 9px;border-radius:10px;">Inactive</span>
          <select *ngIf="canManage()" [value]="u.role" (change)="changeRole(u, $any($event.target).value)" [style]="input" style="height:34px;">
            <option *ngFor="let r of roles" [value]="r">{{ label(r) }}</option>
          </select>
          <span *ngIf="!canManage()" style="font-size:12.5px;color:#64726B;">{{ label(u.role) }}</span>
          <button *ngIf="canManage()" (click)="toggleActive(u)" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">{{ u.active ? 'Deactivate' : 'Activate' }}</button>
        </div>
        <div *ngIf="!users().length" style="color:#8A968F;font-size:13.5px;">No members yet.</div>
      </div>

      <!-- invites -->
      <div *ngIf="canManage()" [style]="card">
        <div [style]="h">PENDING INVITES ({{ invites().length }})</div>
        <div *ngFor="let i of invites()" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;">{{ i.name }}</div>
            <div style="font-size:12.5px;color:#8A968F;">{{ i.email }} · {{ label(i.role) }}</div>
          </div>
          <span *ngIf="i.expired" style="font-size:11px;font-weight:600;color:#B36A5E;background:#FBEAE7;padding:3px 9px;border-radius:10px;">Expired</span>
          <button (click)="resend(i)" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">Resend</button>
          <button (click)="revoke(i)" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Revoke</button>
        </div>
        <div *ngIf="!invites().length" style="color:#8A968F;font-size:13.5px;">No pending invites.</div>
      </div>
    </div>
  `,
})
export class TeamComponent implements OnInit {
  private api = inject(CompanyApiService);
  session = inject(SessionService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  roles = ASSIGNABLE_ROLES;

  users = signal<TenantUserResponse[]>([]);
  invites = signal<TeamInviteResponse[]>([]);
  busy = signal(false);
  error = signal('');
  secret = signal<{ title: string; value: string } | null>(null);

  /** GET /company/users is open to any member, but every write is COMPANY_ADMIN-only. */
  canManage = computed(() => this.session.role() === 'COMPANY_ADMIN');

  ngOnInit(): void {
    this.loadUsers();
    if (this.canManage()) this.loadInvites();
  }

  label(r: Role): string {
    return r.replace('COMPANY_', '').replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  }

  private loadUsers() {
    this.api.listUsers().subscribe({
      next: (u) => this.users.set(u),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  private loadInvites() {
    this.api.listInvites().subscribe({
      next: (i) => this.invites.set(i),
      error: () => {},
    });
  }

  addUser(name: string, email: string, role: string) {
    if (!name.trim() || !email.trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.createUser(name.trim(), email.trim(), role as Role).subscribe({
      next: (u) => {
        this.busy.set(false);
        // Only chance to show this — with SMTP off it is the user's sole way in.
        this.secret.set({ title: `Temporary password for ${u.email}`, value: u.temporaryPassword });
        this.loadUsers();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  invite(name: string, email: string, role: string) {
    if (!name.trim() || !email.trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.createInvite(name.trim(), email.trim(), role as Role).subscribe({
      next: (i) => {
        this.busy.set(false);
        this.secret.set({ title: `Invite link for ${i.email}`, value: i.inviteUrl });
        this.loadInvites();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  changeRole(u: TenantUserResponse, role: string) {
    this.api.updateUserRole(u.id, role as Role).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  toggleActive(u: TenantUserResponse) {
    this.api.setUserActive(u.id, !u.active).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  resend(i: TeamInviteResponse) {
    this.api.resendInvite(i.id).subscribe({
      next: (fresh) => {
        this.secret.set({ title: `Invite link for ${fresh.email}`, value: fresh.inviteUrl });
        this.loadInvites();
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  revoke(i: TeamInviteResponse) {
    this.api.revokeInvite(i.id).subscribe({
      next: () => this.loadInvites(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  dismissSecret() {
    this.secret.set(null);
  }
}
```

- [ ] **Step 2: Verify the build**

```bash
cd frontend && npx ng build --configuration development
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/src/app/screens/company/team
git commit -m "feat(team): add team management screen with one-time secret handling"
```

---

### Task 7: Group screen, routes, and navigation

**Files:**
- Create: `frontend/src/app/screens/company/group/group.component.ts`
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/core/nav.ts`
- Modify: `frontend/src/app/core/app-state.service.ts`

**Interfaces:**
- Produces: `/team` and `/group` routes, role-filtered nav entries

- [ ] **Step 1: Write the group component**

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CompanyApiService } from '../../../core/company/company-api.service';
import { CompanyGroupMemberResponse } from '../../../core/company/company.model';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:18px;';
const INPUT = 'height:40px;border-radius:10px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:13.5px;';
const BTN = 'height:40px;padding:0 16px;border-radius:10px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:28px 30px;font-family:'Inter Tight',system-ui,sans-serif;color:#1B2B24;">
      <h1 style="font-family:'Sora',sans-serif;font-size:26px;font-weight:600;margin:0 0 4px;">Group structure</h1>
      <p style="color:#8A968F;font-size:14px;margin:0 0 22px;">Companies in your group. Switching changes which company you are working in.</p>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:18px;font-size:13px;">{{ error() }}</div>

      <div [style]="card">
        <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;">ADD SUBSIDIARY</div>
        <div style="display:flex;gap:10px;">
          <input #sub placeholder="Subsidiary name" [style]="input" style="flex:1;">
          <button (click)="create(sub.value); sub.value=''" [style]="btn" [disabled]="busy()">Create</button>
        </div>
      </div>

      <div [style]="card">
        <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;">COMPANIES ({{ members().length }})</div>
        <div *ngFor="let m of members()" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;">{{ m.name }}</div>
            <div style="font-size:12.5px;color:#8A968F;">{{ m.subscriptionPlan }}<span *ngIf="m.sectorCode"> · {{ m.sectorCode }}</span></div>
          </div>
          <span *ngIf="m.current" style="font-size:11px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:4px 10px;border-radius:11px;">Current</span>
          <button *ngIf="!m.current" (click)="switchTo(m)" [disabled]="busy()" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #BFD8DD;background:#fff;color:#4C96B3;cursor:pointer;font-size:12.5px;font-weight:600;font-family:inherit;">Switch</button>
          <button *ngIf="!m.current" (click)="remove(m)" [disabled]="busy()" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Delete</button>
        </div>
        <div *ngIf="!members().length" style="color:#8A968F;font-size:13.5px;">No group members.</div>
      </div>
    </div>
  `,
})
export class GroupComponent implements OnInit {
  private api = inject(CompanyApiService);
  private authApi = inject(AuthApiService);
  private session = inject(SessionService);
  private ui = inject(UiService);

  card = CARD;
  input = INPUT;
  btn = BTN;

  members = signal<CompanyGroupMemberResponse[]>([]);
  busy = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.api.group().subscribe({
      next: (m) => this.members.set(m),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  create(name: string) {
    if (!name.trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.createSubsidiary(name.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  switchTo(m: CompanyGroupMemberResponse) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.switchTo(m.id).subscribe({
      next: () => {
        // The switch is already in effect server-side; refresh the cached session because
        // plan may differ per company and plan drives which nav renders.
        this.authApi.me().subscribe({
          next: (me) => {
            this.session.applyUser(me);
            this.busy.set(false);
            this.ui.showToast(`Now working in ${m.name}.`);
            this.load();
          },
          error: () => this.busy.set(false),
        });
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  remove(m: CompanyGroupMemberResponse) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.deleteSubsidiary(m.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        // The backend explains why (users or data still attached) — show its message.
        this.error.set(toApiError(err).message);
      },
    });
  }
}
```

- [ ] **Step 2: Add the routes**

In `app.routes.ts`, add inside the `ShellComponent` children array, after the `settings` route:

```typescript
      { path: 'team', loadComponent: () => import('./screens/company/team/team.component').then((m) => m.TeamComponent) },
      { path: 'group', loadComponent: () => import('./screens/company/group/group.component').then((m) => m.GroupComponent) },
```

- [ ] **Step 3: Add role-aware nav entries**

In `core/nav.ts`, extend the interface and add entries:

```typescript
export interface NavItem {
  key: string;
  label: string;
  path: string;
  d: string;
  /** Hidden unless the session role is COMPANY_ADMIN. */
  adminOnly?: boolean;
}
```

Append to the `workspace` array and to the `'compliance-hub'` array (both get the same two items):

```typescript
    { key: 'team', label: 'Team', path: '/team', d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    { key: 'group', label: 'Group', path: '/group', d: 'M3 3h7v7H3zM14 14h7v7h-7zM7 10v4h10', adminOnly: true },
```

- [ ] **Step 4: Filter nav by role**

In `core/app-state.service.ts`, replace the `navItems` computed:

```typescript
  navItems = computed(() => {
    const isAdmin = this.auth.role() === 'COMPANY_ADMIN';
    // Group is entirely COMPANY_ADMIN-gated on the backend, including its list endpoint,
    // so hide it rather than render a section that will 403.
    return NAV[this.tenant()].filter((n) => !n.adminOnly || isAdmin);
  });
```

- [ ] **Step 5: Verify build and tests**

```bash
cd frontend && npx ng build --configuration development
export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless
```
Expected: build succeeds; 27 specs pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/src/app/screens/company frontend/src/app/app.routes.ts frontend/src/app/core/nav.ts frontend/src/app/core/app-state.service.ts
git commit -m "feat(group): add group hierarchy screen with company switching and role-aware nav"
```

---

### Task 8: Playwright coverage

**Files:**
- Create: `frontend/e2e/company.spec.ts`
- Modify: `frontend/e2e/fixtures.ts`

**Interfaces:**
- Consumes: the running app on 4210 and backend on 8080

- [ ] **Step 1: Add a verified-company-admin fixture**

Append to `e2e/fixtures.ts`:

```typescript
import { Page } from '@playwright/test';
import { Client } from 'pg';

/** Verifies a freshly registered user by reading its token straight from Postgres,
 * because development has no SMTP configured. */
export async function verifyUser(email: string): Promise<void> {
  const db = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'root', database: 'wesee_esg' });
  await db.connect();
  const r = await db.query(
    `select t.token from email_verification_token t
       join app_user u on u.id = t.user_id
      where u.email = $1 order by t.created_at desc limit 1`,
    [email],
  );
  await db.end();
  if (!r.rows.length) throw new Error(`no verification token for ${email}`);
  const res = await fetch(`${API}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: r.rows[0].token }),
  });
  if (!res.ok) throw new Error(`verify-email failed: ${res.status}`);
}

/** Registers, verifies, and signs in a fresh COMPANY_ADMIN through the UI. */
export async function loginAsNewCompanyAdmin(page: Page, email: string, password = 'E2ePassw0rd!'): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });
}
```

Install the Postgres client:

```bash
cd frontend && npm install --save-dev pg @types/pg
```

- [ ] **Step 2: Write the specs**

```typescript
import { expect, test } from '@playwright/test';
import { loginAsNewCompanyAdmin, registerUser, uniqueEmail, verifyUser } from './fixtures';

async function freshAdmin(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail('company');
  await registerUser(request, email);
  await verifyUser(email);
  await loginAsNewCompanyAdmin(page, email);
  return email;
}

test('onboarding lists real sectors from the backend', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/onboarding');
  await expect(page.getByText('Manufacturing & Heavy Industry')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Technology & Software Services')).toBeVisible();
});

test('onboarding refuses to submit without a market', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/onboarding');
  await page.getByRole('button', { name: /Finish setup/i }).click();
  await expect(page.getByText(/Choose which market/i)).toBeVisible();
});

test('onboarding completes with sector and market', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/onboarding');
  await page.getByText('Manufacturing & Heavy Industry').click();
  await page.getByRole('button', { name: 'SME', exact: true }).click();
  await page.getByRole('button', { name: /Finish setup/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test('team screen lists the founding admin', async ({ page, request }) => {
  const email = await freshAdmin(page, request);
  await page.goto('/team');
  await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
});

test('creating a user shows a temporary password exactly once', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/team');
  const member = uniqueEmail('member');
  await page.locator('input[placeholder="Full name"]').fill('New Member');
  await page.locator('input[placeholder="email@company.com"]').fill(member);
  await page.getByRole('button', { name: 'Create user' }).click();

  await expect(page.getByText(/Temporary password for/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/will not be shown again/i)).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText(/Temporary password for/i)).toHaveCount(0);
  await expect(page.getByText(member)).toBeVisible();
});

test('inviting someone surfaces a copyable invite link', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/team');
  await page.locator('input[placeholder="Full name"]').fill('Invited Person');
  await page.locator('input[placeholder="email@company.com"]').fill(uniqueEmail('invitee'));
  await page.getByRole('button', { name: 'Send invite' }).click();

  await expect(page.getByText(/Invite link for/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('code')).toContainText('http');
});

test('creating a subsidiary lists it in the group', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/group');
  await page.locator('input[placeholder="Subsidiary name"]').fill('E2E Subsidiary');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('E2E Subsidiary')).toBeVisible({ timeout: 15_000 });
});

test('switching company changes the active company', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/group');
  await page.locator('input[placeholder="Subsidiary name"]').fill('Switch Target');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Switch Target')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Switch' }).first().click();
  await expect(page.getByText(/Now working in/i)).toBeVisible({ timeout: 15_000 });
});

test('settings shows the live plan and its price', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/settings');
  await expect(page.getByText('STARTER')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/RM\d/)).toBeVisible();
});
```

- [ ] **Step 3: Run the suite**

Backend must be running on 8080.

```bash
cd frontend && npx playwright test
```
Expected: 18 passed (9 from M1 plus 9 new).

- [ ] **Step 4: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/e2e frontend/package.json frontend/package-lock.json
git commit -m "test(e2e): cover onboarding, team, group, and plan flows"
```

---

## Verification

```bash
cd frontend
export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless   # 27 unit specs
npx ng build --configuration development              # clean
npx playwright test                                   # 18 E2E specs
grep -rn "SECTORS" src/app/screens                    # no matches — mock sectors gone
```
