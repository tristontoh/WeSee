import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CompanyApiService } from '../../../core/company/company-api.service';
import { CompanyGroupMemberResponse } from '../../../core/company/company.model';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const INPUT = 'height:40px;border-radius:10px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:40px;padding:0 16px;border-radius:10px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:900px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Group structure</h1>
      <p style="color:#64726B;margin:0 0 24px;font-size:14px;">Companies in your group. Switching changes which company you are working in.</p>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <div [style]="card">
        <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;">ADD SUBSIDIARY</div>
        <div style="display:flex;gap:10px;">
          <input #sub placeholder="Subsidiary name" [style]="input" style="flex:1;">
          <button (click)="create(sub.value); sub.value = ''" [style]="btn" [disabled]="busy()">Create</button>
        </div>
      </div>

      <div [style]="card">
        <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;">COMPANIES ({{ members().length }})</div>
        <div *ngFor="let m of members()" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
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
