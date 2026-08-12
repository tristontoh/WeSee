import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
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
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:38px;border-radius:9px;border:1px solid #E5E8E1;padding:0 11px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:38px;padding:0 16px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

const STATUS_COLOR: Record<ComplianceStatus, { bg: string; fg: string }> = {
  CURRENT: { bg: '#E4EEF0', fg: '#4C96B3' },
  DUE_SOON: { bg: '#FFF8E6', fg: '#8A6A2A' },
  OVERDUE: { bg: '#FBEAE7', fg: '#8C3A2E' },
  NOT_ESTABLISHED: { bg: '#F3F5F1', fg: '#64726B' },
};

@Component({
  selector: 'app-governance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:960px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Governance</h1>
      <p style="color:#64726B;margin:0 0 20px;font-size:14px;">Who oversees sustainability, who owns each matter, and which policies are current.</p>

      <div *ngIf="planBlocked()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:20px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:5px;">Governance needs the Growth plan</div>
        <div style="font-size:13px;color:#7A6A3A;line-height:1.5;">Oversight structure, matter ownership and compliance policies are part of the Growth tier.</div>
      </div>

      <div *ngIf="error() && !planBlocked()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <ng-container *ngIf="!planBlocked()">
        <!-- oversight structure -->
        <div [style]="card">
          <div [style]="h">OVERSIGHT STRUCTURE</div>
          <div *ngFor="let lvl of levels" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #F2F4F0;">
            <div style="width:140px;font-size:13.5px;font-weight:600;">{{ lvl.label }}</div>
            <input #role [value]="roleFor(lvl.value)" placeholder="Role title" [style]="input" style="flex:1;">
            <button (click)="saveLevel(lvl.value, role.value)" [style]="btn" style="height:34px;font-size:12.5px;">Save</button>
          </div>
        </div>

        <!-- matter ownership -->
        <div [style]="card">
          <div [style]="h">MATTER OWNERSHIP ({{ ownership().length }})</div>
          <div *ngFor="let o of ownership()" [attr.data-matter]="o.matterId" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #F2F4F0;">
            <div style="flex:1;min-width:0;font-size:13.5px;font-weight:600;">{{ o.matterName }}</div>
            <input #owner [value]="o.ownerName || ''" placeholder="Owner" [style]="input" style="width:170px;">
            <select #lv [style]="input" style="width:150px;">
              <option *ngFor="let l of levels" [value]="l.value" [selected]="l.value === (o.oversightLevel || 'IMPLEMENTATION')">{{ l.label }}</option>
            </select>
            <button (click)="saveOwner(o, owner.value, lv.value)" [style]="btn" style="height:34px;font-size:12.5px;">Set</button>
          </div>
          <div *ngIf="!ownership().length" style="color:#8A968F;font-size:13.5px;">No matters to assign.</div>
        </div>

        <!-- compliance policies -->
        <div [style]="card">
          <div [style]="h">COMPLIANCE POLICIES ({{ policies().length }})</div>
          <div *ngFor="let p of policies()" [attr.data-policy]="p.name" style="display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13.5px;font-weight:600;">{{ p.name }}<span *ngIf="p.mandatory" style="font-size:11px;color:#8C3A2E;font-weight:600;"> · mandatory</span></div>
              <div style="font-size:12px;color:#8A968F;">Every {{ p.reviewCycleMonths }} months<span *ngIf="p.nextReviewDueAt"> · next due {{ p.nextReviewDueAt.slice(0, 10) }}</span></div>
            </div>
            <span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:11px;"
              [style.background]="color(p.status).bg" [style.color]="color(p.status).fg">{{ label(p.status) }}</span>
            <button (click)="markReviewed(p)" style="height:32px;padding:0 11px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">Mark reviewed</button>
            <button *ngIf="!p.mandatory" (click)="removePolicy(p)" style="height:32px;padding:0 11px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Delete</button>
          </div>

          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
            <input #pname placeholder="Policy name" [style]="input" style="flex:1;min-width:180px;">
            <input #pcycle value="12" placeholder="Review months" inputmode="numeric" [style]="input" style="width:130px;">
            <button (click)="addPolicy(pname.value, pcycle.value); pname.value = ''" [style]="btn">Add policy</button>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class GovernanceComponent implements OnInit {
  private api = inject(GovernanceApiService);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  levels = OVERSIGHT_LEVELS;

  structure = signal<GovernanceLevelResponse[]>([]);
  ownership = signal<MatterOwnershipResponse[]>([]);
  policies = signal<CompliancePolicyResponse[]>([]);
  error = signal('');
  planBlocked = signal(false);

  ngOnInit(): void {
    this.api.structure().subscribe({
      next: (s) => this.structure.set(s),
      error: (err) => this.handle(err),
    });
    this.loadOwnership();
    this.loadPolicies();
  }

  private handle(err: unknown) {
    const e = toApiError(err as never);
    if (e.status === 403) this.planBlocked.set(true);
    else this.error.set(e.message);
  }

  private loadOwnership() {
    this.api.ownership().subscribe({ next: (o) => this.ownership.set(o), error: () => {} });
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
