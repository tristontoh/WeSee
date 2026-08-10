# M3a — Indicators & Emission Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a company its first real ESG data-entry surface — indicator values, targets, approval, evidence — plus an emission-activity calculator, all usable on a STARTER plan.

**Architecture:** Two feature-scoped services (`indicators-api`, `activity-api`) following the M1/M2 pattern, plus two new screens. The interceptor, session, and plan gate are reused unchanged.

**Tech Stack:** Angular 19 (standalone, signals, `inject()`), RxJS 7.8, Playwright, Jasmine/Karma, Spring Boot 3.3.5 backend.

## Global Constraints

- API base is `API_BASE` from `core/http/api-base.ts`. Never hardcode a URL.
- Components are `standalone: true`, use `inject()` and signals, 2-space indent, single quotes.
- Karma needs `CHROME_BIN` set to Playwright's Chromium (no system Chrome exists):
  `export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"`
- Run `git` from the repo root `/Users/liltris/Desktop/WeSee`, not from `frontend/`.
- **Entry mode is decided by `aggregationRule`, never by the user.** `DIRECT_ANNUAL` → annual endpoint; every other rule → monthly endpoint. The backend rejects the wrong one with a 409.
- Approve is `COMPANY_ADMIN`-only — hide the control for other roles.
- `EmissionScope` values are `SCOPE_1`, `SCOPE_2`, `SCOPE_3` (underscored).

---

### Task 1: Indicators API service and entry-mode logic

**Files:**
- Create: `frontend/src/app/core/indicators/indicators.model.ts`
- Create: `frontend/src/app/core/indicators/entry-mode.ts`
- Create: `frontend/src/app/core/indicators/entry-mode.spec.ts`
- Create: `frontend/src/app/core/indicators/indicators-api.service.ts`

**Interfaces:**
- Consumes: `API_BASE`
- Produces: `IndicatorResponse` et al, `entryMode(rule)`, `IndicatorsApiService`

- [ ] **Step 1: Write `indicators.model.ts`**

```typescript
export type IndicatorCategory = 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE';
export type AggregationRule = 'SUM' | 'LATEST' | 'AVERAGE' | 'COUNT' | 'DIRECT_ANNUAL';
export type TargetDirection = 'UP' | 'DOWN';
export type IndicatorValueStatus = 'DRAFT' | 'APPROVED';

export interface IndicatorValuePointDto {
  fiscalYear: number;
  value: number;
  status: IndicatorValueStatus;
  approvedByName: string | null;
  approvedAt: string | null;
  isComputed: boolean;
  monthsReported: number;
}

export interface IndicatorMonthlyValueDto {
  fiscalYear: number;
  month: number;
  value: number;
  enteredBy: string | null;
  enteredAt: string | null;
  sourceDocName: string | null;
  sourceDocPath: string | null;
}

export interface AuditEntryDto {
  fiscalYear: number;
  month: number | null;
  value: number;
  enteredBy: string | null;
  enteredAt: string | null;
  sourceDocName: string | null;
  sourceDocPath: string | null;
  comment: string | null;
}

export interface IndicatorResponse {
  id: string;
  name: string;
  unit: string;
  matterId: string;
  category: IndicatorCategory;
  sectorSpecific: boolean;
  /** Omitted from the JSON when null. */
  sectorCode?: string | null;
  effectiveTarget: number | null;
  effectiveTargetDirection: TargetDirection | null;
  enabled: boolean;
  aggregationRule: AggregationRule;
  values: IndicatorValuePointDto[];
  monthlyValues: IndicatorMonthlyValueDto[];
  history: AuditEntryDto[];
}

export const CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  ENVIRONMENTAL: 'Environmental',
  SOCIAL: 'Social',
  GOVERNANCE: 'Governance',
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
```

- [ ] **Step 2: Write the failing entry-mode test**

Create `entry-mode.spec.ts`:

```typescript
import { entryMode, currentFiscalYear } from './entry-mode';

describe('entryMode', () => {
  it('sends DIRECT_ANNUAL indicators to the annual endpoint', () => {
    expect(entryMode('DIRECT_ANNUAL')).toBe('annual');
  });

  it('sends every computed rule to the monthly endpoint', () => {
    expect(entryMode('SUM')).toBe('monthly');
    expect(entryMode('AVERAGE')).toBe('monthly');
    expect(entryMode('LATEST')).toBe('monthly');
    expect(entryMode('COUNT')).toBe('monthly');
  });
});

describe('currentFiscalYear', () => {
  it('returns a four-digit year', () => {
    const y = currentFiscalYear();
    expect(y).toBeGreaterThan(2000);
    expect(y).toBeLessThan(3000);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd frontend && export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless
```
Expected: FAIL — `Cannot find module './entry-mode'`.

- [ ] **Step 4: Write `entry-mode.ts`**

```typescript
import { AggregationRule } from './indicators.model';

export type EntryMode = 'annual' | 'monthly';

/**
 * Which endpoint accepts a value for this indicator. The backend enforces this with a 409:
 * DIRECT_ANNUAL rejects monthly writes, and every other rule rejects annual writes, because
 * their annual figure is computed from the twelve months. So this is never a user choice.
 */
export function entryMode(rule: AggregationRule): EntryMode {
  return rule === 'DIRECT_ANNUAL' ? 'annual' : 'monthly';
}

export function currentFiscalYear(): number {
  return new Date().getFullYear();
}
```

- [ ] **Step 5: Run the test to verify it passes**

Same command as Step 3.
Expected: PASS — 3 new specs, 30 total.

- [ ] **Step 6: Write `indicators-api.service.ts`**

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { AuditEntryDto, IndicatorResponse, TargetDirection } from './indicators.model';

@Injectable({ providedIn: 'root' })
export class IndicatorsApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/indicators`;

  list(): Observable<IndicatorResponse[]> {
    return this.http.get<IndicatorResponse[]>(this.base);
  }

  get(indicatorId: string): Observable<IndicatorResponse> {
    return this.http.get<IndicatorResponse>(`${this.base}/${indicatorId}`);
  }

  /** DIRECT_ANNUAL indicators only — others return 409. */
  setAnnualValue(
    indicatorId: string,
    fiscalYear: number,
    value: number,
    sourceDocName?: string,
    comment?: string,
  ): Observable<IndicatorResponse> {
    return this.http.patch<IndicatorResponse>(`${this.base}/${indicatorId}/values/${fiscalYear}`, {
      value,
      sourceDocName: sourceDocName ?? null,
      comment: comment ?? null,
    });
  }

  /** Computed indicators only — DIRECT_ANNUAL returns 409. */
  setMonthlyValue(
    indicatorId: string,
    fiscalYear: number,
    month: number,
    value: number,
    sourceDocName?: string,
    comment?: string,
  ): Observable<IndicatorResponse> {
    return this.http.patch<IndicatorResponse>(
      `${this.base}/${indicatorId}/monthly/${fiscalYear}/${month}`,
      { value, sourceDocName: sourceDocName ?? null, comment: comment ?? null },
    );
  }

  setTarget(indicatorId: string, target: number, targetDirection: TargetDirection): Observable<IndicatorResponse> {
    return this.http.patch<IndicatorResponse>(`${this.base}/${indicatorId}/target`, { target, targetDirection });
  }

  /** COMPANY_ADMIN only. */
  approve(indicatorId: string, fiscalYear: number): Observable<IndicatorResponse> {
    return this.http.patch<IndicatorResponse>(`${this.base}/${indicatorId}/values/${fiscalYear}/approve`, {});
  }

  uploadEvidence(auditEntryId: string, file: File): Observable<AuditEntryDto> {
    const form = new FormData();
    form.append('file', file);
    // Content-Type is left unset so the browser adds the multipart boundary.
    return this.http.post<AuditEntryDto>(`${this.base}/audit-entries/${auditEntryId}/evidence`, form);
  }

  evidenceUrl(auditEntryId: string): string {
    return `${this.base}/audit-entries/${auditEntryId}/evidence`;
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
git add frontend/src/app/core/indicators
git commit -m "feat(indicators): add indicators API service and entry-mode logic"
```

---

### Task 2: Emission activity API service

**Files:**
- Create: `frontend/src/app/core/activity/activity.model.ts`
- Create: `frontend/src/app/core/activity/activity-api.service.ts`

**Interfaces:**
- Produces: `EmissionFactorResponse`, `EmissionActivityEntryResponse`, `ActivityApiService`

- [ ] **Step 1: Write `activity.model.ts`**

```typescript
export type EmissionScope = 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';

export const SCOPES: { value: EmissionScope; label: string }[] = [
  { value: 'SCOPE_1', label: 'Scope 1' },
  { value: 'SCOPE_2', label: 'Scope 2' },
  { value: 'SCOPE_3', label: 'Scope 3' },
];

export interface EmissionFactorResponse {
  id: string;
  name: string;
  scope: EmissionScope;
  activityUnit: string;
  factorValue: number;
  source: string;
  sourceYear: number;
}

export interface EmissionActivityEntryResponse {
  id: string;
  fiscalYear: number;
  emissionFactorId: string;
  emissionFactorName: string;
  quantity: number;
  calculatedTco2e: number;
}
```

- [ ] **Step 2: Write `activity-api.service.ts`**

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { EmissionActivityEntryResponse, EmissionFactorResponse, EmissionScope } from './activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/climate/activity`;

  factors(): Observable<EmissionFactorResponse[]> {
    return this.http.get<EmissionFactorResponse[]>(`${this.base}/factors`);
  }

  entries(fiscalYear: number): Observable<EmissionActivityEntryResponse[]> {
    return this.http.get<EmissionActivityEntryResponse[]>(`${this.base}/entries`, {
      params: { fiscalYear },
    });
  }

  addEntry(fiscalYear: number, factorId: string, quantity: number): Observable<EmissionActivityEntryResponse> {
    return this.http.post<EmissionActivityEntryResponse>(`${this.base}/entries`, {
      fiscalYear,
      factorId,
      quantity,
    });
  }

  deleteEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/entries/${id}`);
  }

  /**
   * Writes the year's entries into scope totals. Succeeds on STARTER, but the resulting
   * totals are only readable via GET /climate/emissions, which is ISSUER_READY-only — so the
   * caller confirms what was applied rather than reading it back. Returns EmissionsResponse,
   * typed as unknown here because M3a never renders it.
   */
  applyToScope(fiscalYear: number, scope: EmissionScope): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/entries/apply`, null, {
      params: { fiscalYear, scope },
    });
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
git add frontend/src/app/core/activity
git commit -m "feat(activity): add emission activity API service"
```

---

### Task 3: Indicators screen

**Files:**
- Create: `frontend/src/app/screens/workspace/indicators/indicators.component.ts`

**Interfaces:**
- Consumes: `IndicatorsApiService`, `SessionService`, `entryMode`, `MONTHS`, `CATEGORY_LABELS`, `toApiError`
- Produces: `IndicatorsComponent` at `/indicators`

- [ ] **Step 1: Write the component**

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { IndicatorsApiService } from '../../../core/indicators/indicators-api.service';
import {
  CATEGORY_LABELS,
  IndicatorCategory,
  IndicatorResponse,
  MONTHS,
  TargetDirection,
} from '../../../core/indicators/indicators.model';
import { currentFiscalYear, entryMode } from '../../../core/indicators/entry-mode';
import { SessionService } from '../../../core/auth/session.service';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:20px;margin-bottom:16px;';
const INPUT = 'height:36px;border-radius:9px;border:1px solid #E5E8E1;padding:0 10px;font-family:inherit;font-size:13px;background:#fff;';
const BTN = 'height:36px;padding:0 14px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:12.5px;font-family:inherit;';

@Component({
  selector: 'app-indicators',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:1000px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;">
        <div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Indicators</h1>
          <p style="color:#64726B;margin:0;font-size:14px;">{{ indicators().length }} indicators apply to your sector and market.</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12.5px;color:#8A968F;font-weight:600;">Fiscal year</span>
          <select [value]="year()" (change)="setYear($any($event.target).value)" [style]="input">
            <option *ngFor="let y of years" [value]="y">{{ y }}</option>
          </select>
        </div>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>
      <div *ngIf="loading()" style="color:#8A968F;font-size:13.5px;">Loading indicators…</div>

      <div *ngFor="let group of grouped()" style="margin-bottom:26px;">
        <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:10px;">{{ group.label.toUpperCase() }} ({{ group.items.length }})</div>

        <div *ngFor="let ind of group.items" [style]="card">
          <div style="display:flex;align-items:flex-start;gap:14px;cursor:pointer;" (click)="toggle(ind.id)">
            <div style="flex:1;min-width:0;">
              <div style="font-size:14.5px;font-weight:600;">{{ ind.name }}</div>
              <div style="font-size:12.5px;color:#8A968F;margin-top:2px;">
                {{ ind.id }} · {{ ind.unit }} · {{ ind.aggregationRule }}
                <span *ngIf="ind.sectorSpecific"> · sector-specific</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:16px;font-weight:600;font-family:'Work Sans',monospace;">{{ annualOf(ind) }}</div>
              <div style="font-size:11.5px;color:#8A968F;">{{ statusOf(ind) }}</div>
            </div>
            <div *ngIf="ind.effectiveTarget != null" style="text-align:right;min-width:96px;">
              <div style="font-size:12.5px;color:#64726B;">Target {{ ind.effectiveTarget }}</div>
              <div style="font-size:11.5px;color:#8A968F;">{{ ind.effectiveTargetDirection === 'DOWN' ? '↓ lower is better' : '↑ higher is better' }}</div>
            </div>
          </div>

          <!-- detail -->
          <div *ngIf="open() === ind.id" style="margin-top:18px;border-top:1px solid #F2F4F0;padding-top:16px;">
            <!-- monthly grid -->
            <div *ngIf="modeOf(ind) === 'monthly'">
              <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:10px;">MONTHLY ENTRY · {{ year() }}</div>
              <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">
                <div *ngFor="let m of months; let i = index">
                  <div style="font-size:11px;color:#8A968F;margin-bottom:3px;">{{ m }}</div>
                  <input [value]="monthValue(ind, i + 1)" (blur)="saveMonth(ind, i + 1, $any($event.target).value)" inputmode="decimal" [style]="input" style="width:100%;">
                </div>
              </div>
              <div style="font-size:12px;color:#8A968F;margin-top:10px;">
                Annual value is computed ({{ ind.aggregationRule }}) from {{ monthsReported(ind) }} of 12 months.
              </div>
            </div>

            <!-- annual entry -->
            <div *ngIf="modeOf(ind) === 'annual'">
              <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:10px;">ANNUAL ENTRY · {{ year() }}</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <input #annual [value]="annualRaw(ind)" inputmode="decimal" [style]="input" style="width:180px;">
                <button (click)="saveAnnual(ind, annual.value)" [style]="btn">Save</button>
              </div>
            </div>

            <!-- target -->
            <div style="margin-top:18px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <span style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;">TARGET</span>
              <input #tgt [value]="ind.effectiveTarget ?? ''" inputmode="decimal" [style]="input" style="width:120px;">
              <select #dir [value]="ind.effectiveTargetDirection || 'DOWN'" [style]="input">
                <option value="DOWN">Lower is better</option>
                <option value="UP">Higher is better</option>
              </select>
              <button (click)="saveTarget(ind, tgt.value, dir.value)" [style]="btn" style="background:#fff;color:#4C96B3;border:1px solid #BFD8DD;">Set target</button>

              <button *ngIf="canApprove() && !isApproved(ind)" (click)="approve(ind)" [style]="btn" style="margin-left:auto;">Approve {{ year() }}</button>
              <span *ngIf="isApproved(ind)" style="margin-left:auto;font-size:11px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:4px 10px;border-radius:11px;">Approved</span>
            </div>

            <!-- history -->
            <div *ngIf="ind.history.length" style="margin-top:18px;">
              <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:8px;">HISTORY</div>
              <div *ngFor="let h of ind.history.slice(0, 6)" style="display:flex;gap:10px;font-size:12.5px;color:#64726B;padding:5px 0;border-bottom:1px solid #F6F7F4;">
                <span style="width:96px;">{{ h.fiscalYear }}<span *ngIf="h.month"> · {{ months[h.month - 1] }}</span></span>
                <span style="font-family:'Work Sans',monospace;width:80px;">{{ h.value }}</span>
                <span style="flex:1;">{{ h.enteredBy || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class IndicatorsComponent implements OnInit {
  private api = inject(IndicatorsApiService);
  private session = inject(SessionService);
  private ui = inject(UiService);

  card = CARD;
  input = INPUT;
  btn = BTN;
  months = MONTHS;

  indicators = signal<IndicatorResponse[]>([]);
  loading = signal(false);
  error = signal('');
  open = signal<string | null>(null);
  year = signal(currentFiscalYear());

  years = [currentFiscalYear() - 2, currentFiscalYear() - 1, currentFiscalYear(), currentFiscalYear() + 1];

  canApprove = computed(() => this.session.role() === 'COMPANY_ADMIN');

  grouped = computed(() => {
    const order: IndicatorCategory[] = ['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE'];
    return order
      .map((c) => ({ label: CATEGORY_LABELS[c], items: this.indicators().filter((i) => i.category === c) }))
      .filter((g) => g.items.length);
  });

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (list) => {
        this.indicators.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  private replace(updated: IndicatorResponse) {
    this.indicators.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
  }

  setYear(v: string) {
    this.year.set(Number(v));
  }

  toggle(id: string) {
    this.open.update((cur) => (cur === id ? null : id));
  }

  modeOf(ind: IndicatorResponse) {
    return entryMode(ind.aggregationRule);
  }

  private point(ind: IndicatorResponse) {
    return ind.values.find((v) => v.fiscalYear === this.year());
  }

  annualOf(ind: IndicatorResponse): string {
    const p = this.point(ind);
    return p ? `${p.value}` : '—';
  }

  annualRaw(ind: IndicatorResponse): string {
    const p = this.point(ind);
    return p ? `${p.value}` : '';
  }

  statusOf(ind: IndicatorResponse): string {
    const p = this.point(ind);
    if (!p) return 'No data';
    return p.status === 'APPROVED' ? `Approved by ${p.approvedByName ?? '—'}` : 'Draft';
  }

  isApproved(ind: IndicatorResponse): boolean {
    return this.point(ind)?.status === 'APPROVED';
  }

  monthsReported(ind: IndicatorResponse): number {
    return this.point(ind)?.monthsReported ?? 0;
  }

  monthValue(ind: IndicatorResponse, month: number): string {
    const m = ind.monthlyValues.find((v) => v.fiscalYear === this.year() && v.month === month);
    return m ? `${m.value}` : '';
  }

  saveMonth(ind: IndicatorResponse, month: number, raw: string) {
    const value = Number(raw);
    if (raw.trim() === '' || Number.isNaN(value)) return;
    this.error.set('');
    this.api.setMonthlyValue(ind.id, this.year(), month, value).subscribe({
      next: (updated) => this.replace(updated),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  saveAnnual(ind: IndicatorResponse, raw: string) {
    const value = Number(raw);
    if (raw.trim() === '' || Number.isNaN(value)) return;
    this.error.set('');
    this.api.setAnnualValue(ind.id, this.year(), value).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.ui.showToast('Saved.');
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  saveTarget(ind: IndicatorResponse, raw: string, dir: string) {
    const target = Number(raw);
    if (raw.trim() === '' || Number.isNaN(target)) return;
    this.error.set('');
    this.api.setTarget(ind.id, target, dir as TargetDirection).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.ui.showToast('Target set.');
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  approve(ind: IndicatorResponse) {
    this.error.set('');
    this.api.approve(ind.id, this.year()).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.ui.showToast(`${ind.name} approved for ${this.year()}.`);
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
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
git add frontend/src/app/screens/workspace/indicators
git commit -m "feat(indicators): add indicators screen with mode-aware value entry"
```

---

### Task 4: Emission activity screen

**Files:**
- Create: `frontend/src/app/screens/workspace/activity/activity.component.ts`

**Interfaces:**
- Consumes: `ActivityApiService`, `SCOPES`, `currentFiscalYear`, `toApiError`
- Produces: `ActivityComponent` at `/activity`

- [ ] **Step 1: Write the component**

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivityApiService } from '../../../core/activity/activity-api.service';
import {
  EmissionActivityEntryResponse,
  EmissionFactorResponse,
  EmissionScope,
  SCOPES,
} from '../../../core/activity/activity.model';
import { currentFiscalYear } from '../../../core/indicators/entry-mode';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:40px;border-radius:10px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:40px;padding:0 16px;border-radius:10px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:940px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;">
        <div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Emission activity</h1>
          <p style="color:#64726B;margin:0;font-size:14px;">Log activity data and convert it to tCO₂e using published Malaysian factors.</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12.5px;color:#8A968F;font-weight:600;">Fiscal year</span>
          <select [value]="year()" (change)="setYear($any($event.target).value)" [style]="input">
            <option *ngFor="let y of years" [value]="y">{{ y }}</option>
          </select>
        </div>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <div [style]="card">
        <div [style]="h">ADD ACTIVITY</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <select #fac [style]="input" style="flex:2;min-width:260px;">
            <option *ngFor="let f of factors()" [value]="f.id">{{ f.name }} — {{ f.factorValue }} kg/{{ f.activityUnit }}</option>
          </select>
          <input #qty placeholder="Quantity" inputmode="decimal" [style]="input" style="flex:1;min-width:120px;">
          <button (click)="add(fac.value, qty.value); qty.value = ''" [style]="btn" [disabled]="busy()">Add entry</button>
        </div>
        <div *ngIf="selectedFactorHint(fac.value) as hint" style="font-size:12px;color:#8A968F;margin-top:10px;">{{ hint }}</div>
      </div>

      <div [style]="card">
        <div [style]="h">ENTRIES · {{ year() }} ({{ entries().length }})</div>
        <div *ngFor="let e of entries()" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;">{{ e.emissionFactorName }}</div>
            <div style="font-size:12.5px;color:#8A968F;">Quantity {{ e.quantity }}</div>
          </div>
          <div style="font-family:'Work Sans',monospace;font-size:14px;font-weight:600;">{{ e.calculatedTco2e }} tCO₂e</div>
          <button (click)="remove(e)" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Delete</button>
        </div>
        <div *ngIf="!entries().length" style="color:#8A968F;font-size:13.5px;">No entries for {{ year() }}.</div>
        <div *ngIf="entries().length" style="display:flex;justify-content:flex-end;gap:10px;align-items:baseline;margin-top:14px;">
          <span style="font-size:12.5px;color:#8A968F;font-weight:600;">TOTAL</span>
          <span style="font-family:'Work Sans',monospace;font-size:20px;font-weight:600;">{{ total() }} tCO₂e</span>
        </div>
      </div>

      <div [style]="card">
        <div [style]="h">APPLY TO A SCOPE</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <select #sc [style]="input">
            <option *ngFor="let s of scopes" [value]="s.value">{{ s.label }}</option>
          </select>
          <button (click)="apply(sc.value)" [style]="btn" [disabled]="busy() || !entries().length">Apply {{ year() }} entries</button>
        </div>
        <div style="font-size:12px;color:#8A968F;margin-top:10px;line-height:1.5;">
          Applying writes these entries into your scope totals. Viewing the combined scope 1/2/3
          picture needs the Issuer Ready plan, so the totals above are computed here from your entries.
        </div>
      </div>
    </div>
  `,
})
export class ActivityComponent implements OnInit {
  private api = inject(ActivityApiService);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  scopes = SCOPES;

  factors = signal<EmissionFactorResponse[]>([]);
  entries = signal<EmissionActivityEntryResponse[]>([]);
  year = signal(currentFiscalYear());
  busy = signal(false);
  error = signal('');

  years = [currentFiscalYear() - 2, currentFiscalYear() - 1, currentFiscalYear(), currentFiscalYear() + 1];

  total = computed(() =>
    this.entries()
      .reduce((sum, e) => sum + Number(e.calculatedTco2e || 0), 0)
      .toFixed(3),
  );

  ngOnInit(): void {
    this.api.factors().subscribe({
      next: (f) => this.factors.set(f),
      error: (err) => this.error.set(toApiError(err).message),
    });
    this.loadEntries();
  }

  private loadEntries() {
    this.api.entries(this.year()).subscribe({
      next: (e) => this.entries.set(e),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  setYear(v: string) {
    this.year.set(Number(v));
    this.loadEntries();
  }

  selectedFactorHint(factorId: string): string {
    const f = this.factors().find((x) => x.id === factorId);
    return f ? `${f.scope.replace('_', ' ')} · ${f.source} ${f.sourceYear}` : '';
  }

  add(factorId: string, raw: string) {
    const quantity = Number(raw);
    if (!factorId || raw.trim() === '' || Number.isNaN(quantity) || quantity <= 0) {
      this.error.set('Enter a quantity greater than zero.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api.addEntry(this.year(), factorId, quantity).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadEntries();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  remove(e: EmissionActivityEntryResponse) {
    this.api.deleteEntry(e.id).subscribe({
      next: () => this.loadEntries(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  apply(scope: string) {
    this.busy.set(true);
    this.error.set('');
    this.api.applyToScope(this.year(), scope as EmissionScope).subscribe({
      next: () => {
        this.busy.set(false);
        this.ui.showToast(`Applied ${this.entries().length} entries to ${scope.replace('_', ' ')}.`);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
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
git add frontend/src/app/screens/workspace/activity
git commit -m "feat(activity): add emission activity screen with factor-based calculation"
```

---

### Task 5: Routes and navigation

**Files:**
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/core/nav.ts`

- [ ] **Step 1: Add the routes**

In `app.routes.ts`, inside the `ShellComponent` children, after the `dashboard` route:

```typescript
      { path: 'indicators', loadComponent: () => import('./screens/workspace/indicators/indicators.component').then((m) => m.IndicatorsComponent) },
      { path: 'activity', loadComponent: () => import('./screens/workspace/activity/activity.component').then((m) => m.ActivityComponent) },
```

- [ ] **Step 2: Add the nav entries**

In `core/nav.ts`, define the two items next to the existing `TEAM` and `GROUP` constants:

```typescript
const INDICATORS: NavItem = {
  key: 'indicators',
  label: 'Indicators',
  path: '/indicators',
  d: 'M3 3v18h18M7 15l4-4 3 3 5-6',
};

const ACTIVITY: NavItem = {
  key: 'activity',
  label: 'Emission Activity',
  path: '/activity',
  d: 'M13 2L3 14h8l-1 8 10-12h-8z',
};
```

Insert both into the `workspace` array immediately before the `dashboard` entry, and into the
`'compliance-hub'` array immediately before its `report` entry. Neither is `adminOnly` — both
endpoints are open to every company role.

- [ ] **Step 3: Verify build and tests**

```bash
cd frontend && npx ng build --configuration development
export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless
```
Expected: build succeeds; 30 specs pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/src/app/app.routes.ts frontend/src/app/core/nav.ts
git commit -m "feat(nav): add Indicators and Emission Activity to the workspace nav"
```

---

### Task 6: Playwright coverage

**Files:**
- Create: `frontend/e2e/indicators.spec.ts`

- [ ] **Step 1: Write the specs**

```typescript
import { APIRequestContext, Page, expect, test } from '@playwright/test';
import { loginThroughUi, registerUser, uniqueEmail, verifyUser } from './fixtures';

async function freshAdmin(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail('ind');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);
  return email;
}

test('indicators screen lists the seeded indicators grouped by category', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  await expect(page.getByText('Total Electricity Consumed')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/ENVIRONMENTAL \(\d+\)/)).toBeVisible();
  await expect(page.getByText(/SOCIAL \(\d+\)/)).toBeVisible();
  await expect(page.getByText(/GOVERNANCE \(\d+\)/)).toBeVisible();
});

test('a computed indicator shows the month grid and no annual field', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  await page.getByText('Total Electricity Consumed').click();
  // All 12 seeded indicators are computed (SUM/AVERAGE/LATEST/COUNT), never DIRECT_ANNUAL.
  await expect(page.getByText(/MONTHLY ENTRY/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/ANNUAL ENTRY/)).toHaveCount(0);
});

test('saving a monthly value updates the computed annual figure', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  await page.getByText('Total Electricity Consumed').click();
  await expect(page.getByText(/MONTHLY ENTRY/)).toBeVisible({ timeout: 15_000 });

  const jan = page.locator('input[inputmode=decimal]').first();
  await jan.fill('120');
  await jan.blur();

  await expect(page.getByText(/from 1 of 12 months/)).toBeVisible({ timeout: 15_000 });
});

test('setting a target persists with its direction', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  await page.getByText('Municipal Fresh Water Intake').click();
  await expect(page.getByText('TARGET')).toBeVisible({ timeout: 15_000 });

  const target = page.locator('input[inputmode=decimal]').last();
  await target.fill('900');
  await page.getByRole('button', { name: 'Set target' }).click();
  await expect(page.getByText('Target 900')).toBeVisible({ timeout: 15_000 });
});

test('activity screen lists Malaysian emission factors', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/activity');
  await expect(page.getByText(/Grid Electricity \(Peninsular/)).toBeVisible({ timeout: 15_000 });
});

test('adding an activity entry computes tCO2e and totals it', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/activity');
  await expect(page.getByText(/ADD ACTIVITY/)).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Quantity"]').fill('1000');
  await page.getByRole('button', { name: 'Add entry' }).click();

  await expect(page.getByText(/tCO₂e/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('TOTAL')).toBeVisible();
});

test('applying entries to a scope reports success', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/activity');
  await page.locator('input[placeholder="Quantity"]').fill('500');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('TOTAL')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /Apply \d+ entries/ }).click();
  await expect(page.getByText(/Applied \d+ entries to SCOPE/i)).toBeVisible({ timeout: 15_000 });
});

test('deleting an activity entry removes it', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/activity');
  await page.locator('input[placeholder="Quantity"]').fill('250');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('TOTAL')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Delete' }).first().click();
  await expect(page.getByText(/No entries for/)).toBeVisible({ timeout: 15_000 });
});
```

- [ ] **Step 2: Run the suite**

Backend must be running on 8080.

```bash
cd frontend && npx playwright test
```
Expected: 26 passed (18 existing plus 8 new).

- [ ] **Step 3: Commit**

```bash
cd /Users/liltris/Desktop/WeSee
git add frontend/e2e
git commit -m "test(e2e): cover indicator entry and emission activity flows"
```

---

## Verification

```bash
cd frontend
export CHROME_BIN="/Users/liltris/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npx ng test --watch=false --browsers=ChromeHeadless   # 30 unit specs
npx ng build --configuration development              # clean
npx playwright test                                   # 26 E2E specs
```
