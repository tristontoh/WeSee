import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AdminApiService, TenantSummaryResponse } from '../../../core/admin/admin-api.service';
import { SubscriptionPlan } from '../../../core/auth/session.model';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const PLANS: SubscriptionPlan[] = ['STARTER', 'GROWTH', 'ISSUER_READY'];

const INPUT = 'height:34px;border-radius:9px;border:1px solid #E5E8E1;padding:0 10px;font-family:inherit;font-size:13px;background:#fff;';

@Component({
  selector: 'app-admin-tenants',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="margin-bottom:22px;">
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Tenants</h1>
        <p style="color:#64726B;margin:0;font-size:14px;">Every company on the platform.</p>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <div class="grid-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;">
        <div class="glass" style="border-radius:14px;padding:17px 18px;">
          <div style="font-size:12.5px;color:#64726B;font-weight:600;margin-bottom:8px;">Total tenants</div>
          <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;">{{ tenants().length }}</div>
        </div>
        <div *ngFor="let p of plans" class="glass" style="border-radius:14px;padding:17px 18px;">
          <div style="font-size:12.5px;color:#64726B;font-weight:600;margin-bottom:8px;">{{ p }}</div>
          <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;">{{ countOf(p) }}</div>
        </div>
      </div>

      <div style="background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:6px 22px 18px;">
        <div *ngFor="let t of tenants()" [attr.data-tenant]="t.name" style="display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;">{{ t.name }}</div>
            <div style="font-size:12.5px;color:#8A968F;">
              {{ t.primaryContactEmail || 'no contact' }}<span *ngIf="t.sectorCode"> · {{ t.sectorCode }}</span>
            </div>
          </div>
          <select (change)="setPlan(t, $any($event.target).value)" [style]="input" style="width:150px;">
            <option *ngFor="let p of plans" [value]="p" [selected]="p === t.subscriptionPlan">{{ p }}</option>
          </select>
          <span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:11px;"
            [style.background]="t.active ? '#E4EEF0' : '#FBEAE7'"
            [style.color]="t.active ? '#4C96B3' : '#8C3A2E'">{{ t.active ? 'Active' : 'Suspended' }}</span>
          <button (click)="toggleActive(t)" style="height:32px;padding:0 11px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">{{ t.active ? 'Suspend' : 'Reactivate' }}</button>
        </div>
        <div *ngIf="!tenants().length" style="color:#8A968F;font-size:13.5px;padding:14px 0;">No tenants yet.</div>
      </div>
    </div>
  `,
})
export class AdminTenantsComponent implements OnInit {
  private api = inject(AdminApiService);
  private ui = inject(UiService);

  input = INPUT;
  plans = PLANS;

  tenants = signal<TenantSummaryResponse[]>([]);
  error = signal('');

  countOf = (plan: SubscriptionPlan) => this.tenants().filter((t) => t.subscriptionPlan === plan).length;

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.api.tenants().subscribe({
      next: (t) => this.tenants.set(t),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  setPlan(t: TenantSummaryResponse, plan: string) {
    this.api.setTenantPlan(t.id, plan as SubscriptionPlan).subscribe({
      next: () => {
        this.ui.showToast(`${t.name} moved to ${plan}.`);
        this.load();
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  toggleActive(t: TenantSummaryResponse) {
    this.api.setTenantStatus(t.id, !t.active).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }
}
