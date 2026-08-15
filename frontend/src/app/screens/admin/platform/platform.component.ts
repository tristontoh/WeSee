import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AdminApiService,
  InvoiceResponse,
  PlatformSettingsResponse,
} from '../../../core/admin/admin-api.service';
import { PlanPricingResponse } from '../../../core/reference/reference.model';
import { SubscriptionPlan } from '../../../core/auth/session.model';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:36px;border-radius:9px;border:1px solid #E5E8E1;padding:0 11px;font-family:inherit;font-size:13px;background:#fff;';
const LABEL = 'font-size:12px;font-weight:600;color:#33413A;display:block;margin-bottom:5px;';
const BTN = 'height:36px;padding:0 14px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:12.5px;font-family:inherit;';

@Component({
  selector: 'app-admin-platform',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:900px;">
      <div style="margin-bottom:22px;">
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Platform</h1>
        <p style="color:#64726B;margin:0;font-size:14px;">Mail configuration, plan pricing and billing across every tenant.</p>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <!-- mail -->
      <div [style]="card">
        <div [style]="h">EMAIL DELIVERY</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <span style="font-size:11px;font-weight:600;padding:4px 11px;border-radius:11px;"
            [style.background]="settings()?.configured ? '#E4EEF0' : '#FFF8E6'"
            [style.color]="settings()?.configured ? '#4C96B3' : '#8A6A2A'">{{ settings()?.configured ? 'Configured' : 'Not configured' }}</span>
          <span style="font-size:13px;color:#64726B;">
            Without SMTP, verification links and invites are written to the backend console instead of sent.
          </span>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;">
          <div>
            <label [style]="label">SMTP host</label>
            <input #host [value]="settings()?.smtpHost || ''" placeholder="smtp.gmail.com" [style]="input">
          </div>
          <div>
            <label [style]="label">Port</label>
            <input #port [value]="settings()?.smtpPort || 587" inputmode="numeric" [style]="input">
          </div>
          <div>
            <label [style]="label">Username</label>
            <input #user [value]="settings()?.smtpUsername || ''" placeholder="you@gmail.com" [style]="input">
          </div>
          <div>
            <label [style]="label">Password{{ settings()?.passwordSet ? ' (saved — leave blank to keep)' : '' }}</label>
            <input #pass type="password" [placeholder]="settings()?.passwordSet ? '••••••••' : 'App password'" [style]="input">
          </div>
          <div>
            <label [style]="label">From address</label>
            <input #from [value]="settings()?.fromAddress || ''" placeholder="no-reply@wesee.my" [style]="input">
          </div>
          <div>
            <label [style]="label">Enabled</label>
            <select #enabled [style]="input">
              <option value="true" [selected]="settings()?.enabled">On</option>
              <option value="false" [selected]="!settings()?.enabled">Off</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;align-items:center;">
          <button (click)="saveMail(host.value, port.value, user.value, pass.value, from.value, enabled.value); pass.value = ''" [style]="btn" [disabled]="busy()">Save mail settings</button>
          <button (click)="sendTest()" [disabled]="busy() || !settings()?.configured" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">Send test email</button>
          <span *ngIf="testResult()" style="font-size:12.5px;" [style.color]="testOk() ? '#4C96B3' : '#8C3A2E'">{{ testResult() }}</span>
        </div>

        <div style="font-size:12px;color:#8A968F;margin-top:12px;line-height:1.5;">
          Gmail needs an app password, not your account password — Google Account → Security →
          2-Step Verification → App passwords. The test message goes to your own address.
        </div>
      </div>

      <!-- pricing -->
      <div [style]="card">
        <div [style]="h">PLAN PRICING</div>
        <div *ngFor="let p of pricing()" [attr.data-plan]="p.plan" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;font-size:13.5px;font-weight:600;">{{ p.plan }}</div>
          <input #price [value]="p.monthlyPrice" inputmode="decimal" [style]="input" style="width:120px;">
          <span style="font-size:12.5px;color:#8A968F;">/ month</span>
          <button (click)="savePrice(p.plan, price.value)" [style]="btn">Save</button>
        </div>
        <div *ngIf="!pricing().length" style="color:#8A968F;font-size:13.5px;">No pricing configured.</div>
      </div>

      <!-- invoices -->
      <div [style]="card">
        <div [style]="h">INVOICES ({{ invoices().length }})</div>
        <div *ngFor="let i of invoices()" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:600;">{{ i.invoiceNumber }}</div>
            <div style="font-size:12px;color:#8A968F;">{{ i.companyName || '—' }} · due {{ i.dueDate }}</div>
          </div>
          <div style="font-family:'Work Sans',monospace;font-size:14px;font-weight:600;">RM{{ i.amount }}</div>
          <span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:11px;background:#F3F5F1;color:#64726B;">{{ i.status }}</span>
        </div>
        <div *ngIf="!invoices().length" style="color:#8A968F;font-size:13.5px;">No invoices raised.</div>
      </div>
    </div>
  `,
})
export class AdminPlatformComponent implements OnInit {
  private api = inject(AdminApiService);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  label = LABEL;
  btn = BTN;

  settings = signal<PlatformSettingsResponse | null>(null);
  pricing = signal<PlanPricingResponse[]>([]);
  invoices = signal<InvoiceResponse[]>([]);
  error = signal('');
  busy = signal(false);
  testResult = signal('');
  testOk = signal(false);

  ngOnInit(): void {
    this.api.settings().subscribe({
      next: (s) => this.settings.set(s),
      error: (err) => this.error.set(toApiError(err).message),
    });
    this.loadPricing();
    this.api.invoices().subscribe({ next: (i) => this.invoices.set(i), error: () => {} });
  }

  private loadPricing() {
    this.api.planPricing().subscribe({ next: (p) => this.pricing.set(p), error: () => {} });
  }

  saveMail(host: string, port: string, user: string, pass: string, from: string, enabled: string) {
    const p = Number(port);
    if (Number.isNaN(p) || p < 1 || p > 65535) {
      this.error.set('Port must be between 1 and 65535.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.testResult.set('');
    const current = this.settings();
    this.api
      .updateSettings({
        smtpHost: host.trim() || null,
        smtpPort: p,
        smtpUsername: user.trim() || null,
        // Blank means "keep what is stored" — the backend never returns the saved password.
        password: pass.trim() || null,
        fromAddress: from.trim() || null,
        enabled: enabled === 'true',
        appBaseUrl: current?.appBaseUrl ?? null,
        platformName: current?.platformName ?? null,
        supportEmail: current?.supportEmail ?? null,
        require2fa: false,
      })
      .subscribe({
        next: (s) => {
          this.settings.set(s);
          this.busy.set(false);
          this.ui.showToast('Mail settings saved.');
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(toApiError(err).message);
        },
      });
  }

  sendTest() {
    this.busy.set(true);
    this.testResult.set('');
    this.api.sendTestEmail().subscribe({
      next: (r) => {
        this.busy.set(false);
        this.testOk.set(r.success);
        this.testResult.set(r.message || (r.success ? 'Sent.' : 'Failed.'));
      },
      error: (err) => {
        this.busy.set(false);
        this.testOk.set(false);
        this.testResult.set(toApiError(err).message);
      },
    });
  }

  savePrice(plan: SubscriptionPlan, raw: string) {
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) return;
    this.api.setPlanPrice(plan, n).subscribe({
      next: () => {
        this.ui.showToast(`${plan} price updated.`);
        this.loadPricing();
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }
}
