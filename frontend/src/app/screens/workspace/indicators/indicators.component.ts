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

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:20px;margin-bottom:14px;';
const INPUT = 'height:36px;border-radius:9px;border:1px solid #E5E8E1;padding:0 10px;font-family:inherit;font-size:13px;background:#fff;';
const BTN = 'height:36px;padding:0 14px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:12.5px;font-family:inherit;';

@Component({
  selector: 'app-indicators',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:1000px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;gap:16px;flex-wrap:wrap;">
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

      <div *ngFor="let group of grouped()" style="margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:10px;">{{ group.key }} ({{ group.items.length }})</div>

        <div *ngFor="let ind of group.items" [style]="card">
          <div style="display:flex;align-items:flex-start;gap:14px;cursor:pointer;" (click)="toggle(ind.id)">
            <div style="flex:1;min-width:0;">
              <div style="font-size:14.5px;font-weight:600;">{{ ind.name }}</div>
              <div style="font-size:12.5px;color:#8A968F;margin-top:2px;">
                {{ ind.id }} · {{ ind.unit }} · {{ ind.aggregationRule }}<span *ngIf="ind.sectorSpecific"> · sector-specific</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:16px;font-weight:600;font-family:'Work Sans',monospace;">{{ annualOf(ind) }}</div>
              <div style="font-size:11.5px;color:#8A968F;">{{ statusOf(ind) }}</div>
            </div>
            <div *ngIf="ind.effectiveTarget != null" style="text-align:right;min-width:110px;">
              <div style="font-size:12.5px;color:#64726B;">Target {{ ind.effectiveTarget }}</div>
              <div style="font-size:11.5px;color:#8A968F;">{{ ind.effectiveTargetDirection === 'DOWN' ? '↓ lower is better' : '↑ higher is better' }}</div>
            </div>
          </div>

          <div *ngIf="open() === ind.id" style="margin-top:18px;border-top:1px solid #F2F4F0;padding-top:16px;">
            <!-- monthly grid -->
            <div *ngIf="modeOf(ind) === 'monthly'">
              <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:10px;">MONTHLY ENTRY · {{ year() }}</div>
              <div class="grid-collapse" style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">
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

            <!-- target + approve -->
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
              <div *ngFor="let hst of ind.history.slice(0, 6)" style="display:flex;gap:10px;font-size:12.5px;color:#64726B;padding:5px 0;border-bottom:1px solid #F6F7F4;">
                <span style="width:110px;">{{ hst.fiscalYear }}<span *ngIf="hst.month"> · {{ months[hst.month - 1] }}</span></span>
                <span style="font-family:'Work Sans',monospace;width:90px;">{{ hst.value }}</span>
                <span style="flex:1;">{{ hst.enteredBy || '—' }}</span>
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
      .map((c) => ({
        key: c,
        label: CATEGORY_LABELS[c],
        items: this.indicators().filter((i) => i.category === c),
      }))
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
