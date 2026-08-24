import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AssuranceApiService } from '../../../core/assurance/assurance-api.service';
import {
  ASSURANCE_LEVELS,
  AssuranceLevel,
  SignOffAuditEntryResponse,
  SignOffResponse,
} from '../../../core/assurance/assurance.model';
import { currentFiscalYear } from '../../../core/indicators/entry-mode';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:38px;border-radius:9px;border:1px solid #E5E8E1;padding:0 11px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:38px;padding:0 16px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-assurance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:900px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;gap:16px;flex-wrap:wrap;">
        <div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Assurance sign-off</h1>
          <p style="color:#64726B;margin:0;font-size:14px;">Lock a fiscal year's disclosures with a tamper-evident hash and an audit trail.</p>
        </div>
        <select (change)="setYear($any($event.target).value)" [style]="input">
          <option *ngFor="let y of years" [value]="y" [selected]="y === year()">{{ y }}</option>
        </select>
      </div>

      <div *ngIf="planBlocked()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:20px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:5px;">Assurance needs the Issuer Ready plan</div>
        <div style="font-size:13px;color:#7A6A3A;line-height:1.5;">The assurance workspace is part of the issuer module.</div>
      </div>

      <div *ngIf="error() && !planBlocked()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <ng-container *ngIf="!planBlocked()">
        <!-- readiness -->
        <div [style]="card">
          <div [style]="h">READINESS · FY {{ year() }}</div>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px;">
            <span style="font-family:'Work Sans',monospace;font-size:32px;font-weight:600;">{{ completion() }}%</span>
            <span style="font-size:13px;color:#8A968F;">of this year's data is complete</span>
          </div>
          <div style="height:10px;border-radius:5px;background:#EEF1EC;overflow:hidden;">
            <div style="height:100%;border-radius:5px;background:linear-gradient(90deg,#4C96B3,#A99FDB);" [style.width]="completion() + '%'"></div>
          </div>
        </div>

        <!-- current status -->
        <div [style]="card" data-signoff-card>
          <div [style]="h">STATUS</div>

          <div *ngIf="signOff()?.status === 'SIGNED'">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <span style="font-size:11px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:4px 11px;border-radius:11px;">Signed off</span>
              <span style="font-size:13px;color:#64726B;">by {{ signOff()!.signerName }}, {{ signOff()!.signerTitle }}</span>
            </div>
            <div *ngIf="signOff()!.hash" style="font-size:12px;color:#8A968F;margin-bottom:12px;">
              Integrity hash <code style="background:#F3F5F1;padding:2px 6px;border-radius:5px;">{{ signOff()!.hash }}</code>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <input #reason placeholder="Reason for revoking" [style]="input" style="flex:1;min-width:200px;">
              <button (click)="revoke(reason.value)" style="height:38px;padding:0 15px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;">Revoke sign-off</button>
            </div>
          </div>

          <div *ngIf="signOff()?.status !== 'SIGNED'">
            <div style="font-size:13px;color:#8A968F;margin-bottom:14px;">FY {{ year() }} has not been signed off.</div>

            <!-- The backend rejects sign-off below 100% completeness, so say so up front
                 rather than letting the attempt fail with a 409. -->
            <div *ngIf="!canSign()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:11px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#7A6A3A;line-height:1.5;">
              Every applicable indicator needs a value for FY {{ year() }} before this year can be
              signed off. You are at {{ completion() }}%.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
              <input #name placeholder="Signer name" [style]="input">
              <input #title placeholder="Signer title" [style]="input">
              <select #level [style]="input">
                <option *ngFor="let l of levels" [value]="l.value">{{ l.label }}</option>
              </select>
              <input #assurer placeholder="External assurer (optional)" [style]="input">
              <input #standard placeholder="Standard referenced (optional)" [style]="input">
              <input #notes placeholder="Notes (optional)" [style]="input">
            </div>
            <button (click)="sign(name.value, title.value, level.value, assurer.value, standard.value, notes.value)" [style]="btn" [disabled]="busy() || !canSign()">Sign off FY {{ year() }}</button>
          </div>
        </div>

        <!-- audit trail -->
        <div [style]="card">
          <div [style]="h">AUDIT TRAIL ({{ trail().length }})</div>
          <div *ngFor="let a of trail()" style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid #F2F4F0;font-size:13px;">
            <span style="width:80px;font-weight:600;" [style.color]="a.action === 'SIGNED' ? '#4C96B3' : '#8C3A2E'">{{ a.action === 'SIGNED' ? 'Signed' : 'Revoked' }}</span>
            <span style="flex:1;color:#64726B;">{{ a.actorName || '—' }}<span *ngIf="a.actorTitle">, {{ a.actorTitle }}</span></span>
            <span style="color:#8A968F;font-size:12.5px;">{{ a.timestamp.slice(0, 10) }}</span>
          </div>
          <div *ngIf="loading()" style="color:#8A968F;font-size:13.5px;">Loading audit trail…</div>
          <div *ngIf="!loading() && !trail().length" style="color:#8A968F;font-size:13.5px;">Nothing recorded yet.</div>
        </div>
      </ng-container>
    </div>
  `,
})
export class AssuranceComponent implements OnInit {
  private api = inject(AssuranceApiService);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  levels = ASSURANCE_LEVELS;

  year = signal(currentFiscalYear());
  signOff = signal<SignOffResponse | null>(null);
  trail = signal<SignOffAuditEntryResponse[]>([]);
  completion = signal(0);
  busy = signal(false);
  loading = signal(false);
  error = signal('');
  planBlocked = signal(false);

  /** The backend requires 100% indicator completeness before a year may be signed. */
  canSign = computed(() => this.completion() >= 100);

  years = [currentFiscalYear() - 2, currentFiscalYear() - 1, currentFiscalYear(), currentFiscalYear() + 1];

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.api.forYear(this.year()).subscribe({
      next: (s) => {
        this.signOff.set(s);
        this.planBlocked.set(false);
      },
      error: (err) => {
        const e = toApiError(err);
        if (e.status === 403) this.planBlocked.set(true);
        // 404 simply means the year has never been signed — not an error worth showing.
        else if (e.status !== 404) this.error.set(e.message);
        this.signOff.set(null);
      },
    });
    this.api.completion(this.year()).subscribe({
      next: (c) => this.completion.set(c.completionPercent ?? 0),
      error: () => {},
    });
    this.loading.set(true);
    this.api.auditTrail(this.year()).subscribe({
      next: (t) => {
        this.trail.set(t);
        this.loading.set(false);
      },
      error: () => {
        this.trail.set([]);
        this.loading.set(false);
      },
    });
  }

  setYear(v: string) {
    this.year.set(Number(v));
    this.load();
  }

  sign(name: string, title: string, level: string, assurer: string, standard: string, notes: string) {
    if (!name.trim() || !title.trim()) {
      this.error.set('Signer name and title are both required.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .sign(this.year(), {
        signerName: name.trim(),
        signerTitle: title.trim(),
        assuranceLevel: (level as AssuranceLevel) || null,
        externalAssurerName: assurer.trim() || null,
        standardReferenced: standard.trim() || null,
        notes: notes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.ui.showToast(`FY ${this.year()} signed off.`);
          this.load();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(toApiError(err).message);
        },
      });
  }

  revoke(reason: string) {
    this.api.revoke(this.year(), reason.trim() || undefined).subscribe({
      next: () => {
        this.ui.showToast('Sign-off revoked.');
        this.load();
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }
}
