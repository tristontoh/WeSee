import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GovernanceApiService } from '../../../core/esg/esg-api.service';
import {
  COMPLIANCE_LABELS,
  CompliancePolicyResponse,
  ComplianceStatus,
  GovernanceLevelResponse,
  MatterOwnershipResponse,
  OVERSIGHT_LEVELS,
  OversightLevel,
} from '../../../core/esg/esg.model';
import { ReferenceApiService } from '../../../core/reference/reference-api.service';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:26px 30px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.8px;margin-bottom:16px;';
const INPUT = 'height:38px;border-radius:9px;border:1.5px solid #E5E8E1;padding:0 13px;font-family:inherit;font-size:13.5px;background:#FBFCFA;color:#26302B;';
const BTN = 'height:38px;padding:0 16px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

const STATUS_COLOR: Record<ComplianceStatus, { bg: string; fg: string }> = {
  CURRENT: { bg: '#E4EEF0', fg: '#4C96B3' },
  DUE_SOON: { bg: '#FFF8E6', fg: '#8A6A2A' },
  OVERDUE: { bg: '#FBEAE7', fg: '#8C3A2E' },
  NOT_ESTABLISHED: { bg: '#F3F5F1', fg: '#64726B' },
};

/** Matches the category palette used by Indicators and Materiality. */
const CAT_COLOR: Record<string, string> = {
  ENVIRONMENTAL: '#4C96B3',
  SOCIAL: '#A99FDB',
  GOVERNANCE: '#D96BA1',
};

type StepKey = 'oversight' | 'ownership' | 'policies';
const STEPS: { key: StepKey; label: string }[] = [
  { key: 'oversight', label: 'Oversight Structure' },
  { key: 'ownership', label: 'Matter Ownership' },
  { key: 'policies', label: 'Compliance Policies' },
];

@Component({
  selector: 'app-governance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:900px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Governance</h1>
      <p style="color:#64726B;margin:0 0 20px;font-size:14px;">Who oversees sustainability, who owns each matter, and which policies are current.</p>

      <div *ngIf="planBlocked()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:20px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:5px;">Governance needs the Growth plan</div>
        <div style="font-size:13px;color:#7A6A3A;line-height:1.5;">Oversight structure, matter ownership and compliance policies are part of the Growth tier.</div>
      </div>

      <div *ngIf="error() && !planBlocked()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <ng-container *ngIf="!planBlocked()">
        <!-- ---------- step nav ---------- -->
        <div style="display:flex;gap:0;background:#fff;border:1px solid #E9ECE6;border-radius:14px;padding:6px;margin-bottom:16px;">
          <button *ngFor="let s of steps; let i = index" type="button" (click)="go(s.key)"
            [attr.data-step]="s.key" [attr.aria-current]="s.key === step() ? 'step' : null"
            [style.background]="s.key === step() ? 'linear-gradient(90deg,#4C96B3,#A99FDB)' : 'transparent'"
            style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 8px;border:none;border-radius:10px;cursor:pointer;font-family:inherit;">
            <span [style.background]="s.key === step() ? 'rgba(255,255,255,.28)' : '#F3F5F1'"
              [style.color]="s.key === step() ? '#fff' : '#8A968F'"
              style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">{{ i + 1 }}</span>
            <span [style.color]="s.key === step() ? '#fff' : '#64726B'"
              [style.font-weight]="s.key === step() ? '700' : '600'"
              style="font-size:13px;">{{ s.label }}</span>
          </button>
        </div>

        <!-- ---------- step content ---------- -->
        <div [style]="card">
          <!-- 1 · oversight structure -->
          <ng-container *ngIf="step() === 'oversight'">
            <div [style]="h">OVERSIGHT STRUCTURE</div>
            <div *ngFor="let lvl of levels" style="display:grid;grid-template-columns:150px 1fr 96px;align-items:center;gap:16px;margin-bottom:16px;">
              <span style="font-size:14px;font-weight:600;">{{ lvl.label }}</span>
              <input #role [value]="roleFor(lvl.value)" placeholder="Role title" [style]="input" style="width:100%;box-sizing:border-box;">
              <button (click)="saveLevel(lvl.value, role.value)" [style]="btn" style="width:100%;">Save</button>
            </div>
          </ng-container>

          <!-- 2 · matter ownership -->
          <ng-container *ngIf="step() === 'ownership'">
            <div [style]="h">MATTER OWNERSHIP ({{ ownership().length }})</div>
            <div *ngFor="let o of ownership()" [attr.data-matter]="o.matterId"
              style="display:grid;grid-template-columns:minmax(0,1fr) 230px 152px 58px;align-items:center;gap:10px;padding:8px;border-radius:9px;margin-bottom:2px;">
              <div style="display:flex;align-items:center;gap:9px;min-width:0;">
                <span [style.background]="dotFor(o.matterId)" style="width:7px;height:7px;border-radius:50%;flex-shrink:0;"></span>
                <span style="font-size:12.5px;font-weight:600;line-height:1.3;">{{ o.matterName }}</span>
              </div>
              <input #owner [value]="o.ownerName || ''" placeholder="Owner" [style]="input" style="width:100%;box-sizing:border-box;height:34px;font-size:12px;">
              <select #lv [style]="input" style="width:100%;box-sizing:border-box;height:34px;font-size:12px;">
                <option *ngFor="let l of levels" [value]="l.value" [selected]="l.value === (o.oversightLevel || 'IMPLEMENTATION')">{{ l.label }}</option>
              </select>
              <button (click)="saveOwner(o, owner.value, lv.value)" [style]="btn" style="width:100%;height:34px;font-size:12px;padding:0;">Set</button>
            </div>
            <div *ngIf="loading()" style="color:#8A968F;font-size:13.5px;">Loading matters…</div>
            <div *ngIf="!loading() && !ownership().length" style="color:#8A968F;font-size:13.5px;">No matters to assign.</div>
          </ng-container>

          <!-- 3 · compliance policies -->
          <ng-container *ngIf="step() === 'policies'">
            <div [style]="h">COMPLIANCE POLICIES ({{ policies().length }})</div>
            <div *ngFor="let p of policies()" [attr.data-policy]="p.name"
              style="display:grid;grid-template-columns:1fr 116px 108px 78px;align-items:center;gap:9px;padding:9px 4px;border-bottom:1px solid #F2F4F0;">
              <div style="min-width:0;">
                <div style="font-size:12.5px;font-weight:600;line-height:1.35;">{{ p.name }}<span *ngIf="p.mandatory" style="font-size:11px;color:#8C3A2E;font-weight:700;"> · mandatory</span></div>
                <div style="font-size:11px;color:#A9B3AD;margin-top:2px;">Every {{ p.reviewCycleMonths }} months<span *ngIf="p.nextReviewDueAt"> · next due {{ p.nextReviewDueAt.slice(0, 10) }}</span></div>
              </div>
              <span style="font-size:10.5px;font-weight:700;padding:6px 4px;border-radius:7px;text-align:center;white-space:nowrap;"
                [style.background]="color(p.status).bg" [style.color]="color(p.status).fg">{{ label(p.status) }}</span>
              <button (click)="markReviewed(p)" style="height:32px;padding:0 8px;border-radius:8px;border:1.5px solid #E5E8E1;background:#fff;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;">Mark reviewed</button>
              <button *ngIf="!p.mandatory" (click)="removePolicy(p)" style="height:32px;padding:0 8px;border-radius:8px;border:1.5px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;">Delete</button>
              <span *ngIf="p.mandatory"></span>
            </div>

            <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
              <input #pname placeholder="Policy name" [style]="input" style="flex:1;min-width:180px;">
              <input #pcycle value="12" placeholder="Review months" inputmode="numeric" [style]="input" style="width:88px;text-align:center;">
              <button (click)="addPolicy(pname.value, pcycle.value); pname.value = ''" [style]="btn">Add policy</button>
            </div>
          </ng-container>
        </div>

        <!-- ---------- prev / next ---------- -->
        <div style="display:flex;justify-content:space-between;margin-top:16px;">
          <button type="button" (click)="prev()" [disabled]="stepIndex() === 0"
            [style.color]="stepIndex() === 0 ? '#C3CBC6' : '#3A4048'"
            [style.cursor]="stepIndex() === 0 ? 'default' : 'pointer'"
            style="padding:10px 20px;border:1.5px solid #E5E8E1;border-radius:10px;background:#fff;font-weight:600;font-size:13px;font-family:inherit;">← Back</button>
          <button type="button" (click)="next()" [disabled]="stepIndex() === 2"
            [style.background]="stepIndex() === 2 ? '#EDF0EB' : 'linear-gradient(90deg,#4C96B3,#A99FDB)'"
            [style.color]="stepIndex() === 2 ? '#A9B3AD' : '#fff'"
            [style.cursor]="stepIndex() === 2 ? 'default' : 'pointer'"
            style="padding:10px 22px;border:none;border-radius:10px;font-weight:700;font-size:13px;font-family:inherit;">Next →</button>
        </div>
      </ng-container>
    </div>
  `,
})
export class GovernanceComponent implements OnInit {
  private api = inject(GovernanceApiService);
  private reference = inject(ReferenceApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  levels = OVERSIGHT_LEVELS;
  steps = STEPS;

  structure = signal<GovernanceLevelResponse[]>([]);
  ownership = signal<MatterOwnershipResponse[]>([]);
  policies = signal<CompliancePolicyResponse[]>([]);
  loading = signal(false);
  error = signal('');
  planBlocked = signal(false);

  /** Deep-linkable so a step can be opened, bookmarked and refreshed directly. */
  step = signal<StepKey>(this.readStep());
  stepIndex = computed(() => STEPS.findIndex((s) => s.key === this.step()));

  /** matterId → category, for the row dots. Ownership itself carries no category. */
  private categories = signal<Record<string, string>>({});

  private readStep(): StepKey {
    const raw = this.route.snapshot.queryParamMap.get('step');
    return STEPS.some((s) => s.key === raw) ? (raw as StepKey) : 'oversight';
  }

  ngOnInit(): void {
    this.api.structure().subscribe({
      next: (s) => this.structure.set(s),
      error: (err) => this.handle(err),
    });
    this.loadOwnership();
    this.loadPolicies();
    this.reference.applicableMatters().subscribe({
      next: (matters) =>
        this.categories.set(Object.fromEntries(matters.map((m) => [m.id, m.category]))),
      error: () => {},
    });
  }

  go(key: StepKey) {
    this.step.set(key);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: key },
      replaceUrl: true,
    });
  }

  prev() {
    const i = this.stepIndex();
    if (i > 0) this.go(STEPS[i - 1].key);
  }

  next() {
    const i = this.stepIndex();
    if (i < STEPS.length - 1) this.go(STEPS[i + 1].key);
  }

  dotFor(matterId: string): string {
    return CAT_COLOR[this.categories()[matterId]] ?? '#C3CBC6';
  }

  private handle(err: unknown) {
    const e = toApiError(err as never);
    if (e.status === 403) this.planBlocked.set(true);
    else this.error.set(e.message);
  }

  private loadOwnership() {
    this.loading.set(true);
    this.api.ownership().subscribe({
      next: (o) => {
        this.ownership.set(o);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadPolicies() {
    this.api.policies().subscribe({ next: (p) => this.policies.set(p), error: () => {} });
  }

  roleFor(level: OversightLevel): string {
    return this.structure().find((s) => s.level === level)?.roleTitle ?? '';
  }

  label(s: ComplianceStatus): string {
    return COMPLIANCE_LABELS[s];
  }

  color(s: ComplianceStatus) {
    return STATUS_COLOR[s];
  }

  saveLevel(level: OversightLevel, roleTitle: string) {
    if (!roleTitle.trim()) return;
    this.api.setLevel(level, roleTitle.trim()).subscribe({
      next: () => {
        this.ui.showToast('Oversight saved.');
        this.api.structure().subscribe({ next: (s) => this.structure.set(s), error: () => {} });
      },
      error: (err) => this.handle(err),
    });
  }

  saveOwner(o: MatterOwnershipResponse, ownerName: string, level: string) {
    if (!ownerName.trim()) return;
    this.api.setOwner(o.matterId, ownerName.trim(), level as OversightLevel).subscribe({
      next: () => {
        this.ui.showToast('Owner set.');
        this.loadOwnership();
      },
      error: (err) => this.handle(err),
    });
  }

  addPolicy(name: string, cycle: string) {
    const months = Number(cycle);
    if (!name.trim() || Number.isNaN(months) || months < 1) return;
    this.api.addPolicy(name.trim(), months).subscribe({
      next: () => this.loadPolicies(),
      error: (err) => this.handle(err),
    });
  }

  markReviewed(p: CompliancePolicyResponse) {
    this.api.markReviewed(p.id).subscribe({
      next: () => {
        this.ui.showToast(`${p.name} marked reviewed.`);
        this.loadPolicies();
      },
      error: (err) => this.handle(err),
    });
  }

  removePolicy(p: CompliancePolicyResponse) {
    this.api.deletePolicy(p.id).subscribe({ next: () => this.loadPolicies(), error: (e) => this.handle(e) });
  }
}
