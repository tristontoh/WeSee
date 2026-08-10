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
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;gap:16px;flex-wrap:wrap;">
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
          <button (click)="apply(sc.value)" [style]="btn" [disabled]="busy() || !entries().length">Apply {{ entries().length }} entries</button>
        </div>
        <div style="font-size:12px;color:#8A968F;margin-top:10px;line-height:1.5;">
          Applying writes these entries into your scope totals. Viewing the combined scope 1/2/3
          picture needs the Issuer Ready plan, so the total above is computed here from your entries.
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
    const count = this.entries().length;
    this.api.applyToScope(this.year(), scope as EmissionScope).subscribe({
      next: () => {
        this.busy.set(false);
        this.ui.showToast(`Applied ${count} entries to ${scope.replace('_', ' ')}.`);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }
}
