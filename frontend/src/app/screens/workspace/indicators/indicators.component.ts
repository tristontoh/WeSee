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

const ORDER: IndicatorCategory[] = ['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE'];

/** Category accents, drawn from the palette already in use elsewhere in the product. */
const CATEGORY_COLOR: Record<IndicatorCategory, string> = {
  ENVIRONMENTAL: '#4C96B3',
  SOCIAL: '#A99FDB',
  GOVERNANCE: '#D96BA1',
};

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:12px;padding:15px 18px;margin-bottom:10px;';
const CHIP = 'background:#fff;border:1px solid #E9ECE6;border-radius:10px;padding:8px 14px;font-size:12.5px;color:#64726B;';
const INPUT = 'height:36px;border-radius:9px;border:1px solid #E5E8E1;padding:0 10px;font-family:inherit;font-size:13px;background:#fff;';
const BTN = 'height:36px;padding:0 14px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:12.5px;font-family:inherit;';

/** "IND-ENG-01" -> "ENG"; anything unexpected falls back to its first three characters. */
function tagOf(id: string): string {
  const parts = (id || '').split('-');
  return (parts.length >= 2 ? parts[1] : id).slice(0, 3).toUpperCase();
}

@Component({
  selector: 'app-indicators',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap;max-width:1240px;">
    <div style="flex:1;min-width:520px;max-width:820px;">

      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:4px;">
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;margin:0;letter-spacing:-.5px;">Indicators</h1>
        <div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E9ECE6;border-radius:9px;padding:6px 10px;flex-shrink:0;">
          <span style="font-size:12.5px;font-weight:600;color:#64726B;">Fiscal year</span>
          <select (change)="setYear($any($event.target).value)" style="border:none;background:none;font-family:inherit;font-size:13px;font-weight:700;color:#1F2530;cursor:pointer;outline:none;">
            <option *ngFor="let y of years" [value]="y" [selected]="y === year()">{{ y }}</option>
          </select>
        </div>
      </div>
      <p style="color:#64726B;margin:0 0 18px;font-size:14px;">{{ indicators().length }} indicators apply to your sector and market.</p>

      <!-- stat chips -->
      <div style="display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap;">
        <div [style]="chip"><span style="font-weight:700;color:#1F2530;">{{ indicators().length }}</span> total indicators</div>
        <div [style]="chip"><span style="font-weight:700;color:#1F2530;">{{ withData() }}</span> with data logged</div>
        <div [style]="chip"><span style="font-weight:700;color:#1F2530;">{{ groups().length }}</span> categories</div>
      </div>

      <!-- category tabs -->
      <div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px;background:#EEF0F3;border-radius:12px;margin-bottom:20px;">
        <button *ngFor="let t of tabs()" (click)="tab.set(t.id)" type="button" [attr.data-tab]="t.id"
          [style.background]="t.id === tab() ? '#fff' : 'transparent'"
          [style.color]="t.id === tab() ? '#1F2530' : '#7D8590'"
          [style.box-shadow]="t.id === tab() ? '0 1px 3px rgba(20,20,30,.1)' : 'none'"
          style="padding:8px 18px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .15s;">
          {{ t.label }}
        </button>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>
      <div *ngIf="loading()" style="color:#8A968F;font-size:13.5px;">Loading indicators…</div>

      <!-- grouped rows -->
      <div *ngFor="let g of visibleGroups()" style="margin-bottom:26px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px;">
          <span style="width:7px;height:7px;border-radius:50%;" [style.background]="g.color"></span>
          <span style="font-size:11.5px;letter-spacing:1.1px;color:#8F95A0;font-weight:700;">{{ g.key }} ({{ g.items.length }})</span>
        </div>

        <div *ngFor="let ind of g.items" [attr.data-indicator]="ind.id" [style]="card">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <span style="width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10.5px;color:#fff;" [style.background]="g.color">{{ ind.tag }}</span>

            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:14px;color:#1F2530;">{{ ind.name }}</div>
              <div style="font-size:12px;color:#9AA0AA;margin-top:3px;">{{ ind.id }} · {{ ind.unit }} · {{ ind.aggregationRule }}</div>
            </div>

            <div style="text-align:right;min-width:76px;">
              <div style="font-size:13.5px;font-weight:600;" [style.color]="ind.hasValue ? '#1F2530' : '#B0B5BD'">{{ ind.valueLabel }}</div>
              <div style="font-size:11.5px;" [style.color]="ind.hasValue ? '#8A968F' : '#B0B5BD'">{{ ind.statusLabel }}</div>
            </div>

            <div *ngIf="ind.effectiveTarget != null" style="text-align:right;min-width:104px;">
              <div style="font-size:13.5px;font-weight:700;color:#1F2530;">Target {{ ind.effectiveTarget }}</div>
              <div style="font-size:11.5px;color:#9AA0AA;">{{ ind.directionLabel }}</div>
            </div>

            <button (click)="toggle(ind.id)" type="button"
              style="flex-shrink:0;padding:7px 14px;border-radius:8px;border:1.4px solid #DFE6EC;background:#fff;color:#4C96B3;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;">
              {{ open() === ind.id ? 'Close' : '+ Add data' }}
            </button>
          </div>

          <!-- entry panel -->
          <div *ngIf="open() === ind.id" style="margin-top:16px;border-top:1px solid #F2F4F0;padding-top:15px;">
            <div *ngIf="ind.mode === 'monthly'">
              <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:10px;">MONTHLY ENTRY · {{ year() }}</div>
              <div class="grid-collapse" style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">
                <div *ngFor="let m of months; let i = index">
                  <div style="font-size:11px;color:#8A968F;margin-bottom:3px;">{{ m }}</div>
                  <input [value]="monthValue(ind.raw, i + 1)" (blur)="saveMonth(ind.raw, i + 1, $any($event.target).value)" inputmode="decimal" [style]="input" style="width:100%;">
                </div>
              </div>
              <div style="font-size:12px;color:#8A968F;margin-top:10px;">
                Annual value is computed ({{ ind.aggregationRule }}) from {{ ind.monthsReported }} of 12 months.
              </div>
            </div>

            <div *ngIf="ind.mode === 'annual'">
              <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:10px;">ANNUAL ENTRY · {{ year() }}</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <input #annual [value]="ind.annualRaw" inputmode="decimal" [style]="input" style="width:180px;">
                <button (click)="saveAnnual(ind.raw, annual.value)" [style]="btn">Save</button>
              </div>
            </div>

            <div style="margin-top:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <span style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;">TARGET</span>
              <input #tgt [value]="ind.effectiveTarget ?? ''" inputmode="decimal" [style]="input" style="width:120px;">
              <select #dir [style]="input">
                <option value="DOWN" [selected]="ind.effectiveTargetDirection !== 'UP'">Lower is better</option>
                <option value="UP" [selected]="ind.effectiveTargetDirection === 'UP'">Higher is better</option>
              </select>
              <button (click)="saveTarget(ind.raw, tgt.value, dir.value)" [style]="btn" style="background:#fff;color:#4C96B3;border:1px solid #BFD8DD;">Set target</button>

              <button *ngIf="canApprove() && !ind.approved" (click)="approve(ind.raw)" [style]="btn" style="margin-left:auto;">Approve {{ year() }}</button>
              <span *ngIf="ind.approved" style="margin-left:auto;font-size:11px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:4px 10px;border-radius:11px;">Approved</span>
            </div>

            <div *ngIf="ind.raw.history.length" style="margin-top:16px;">
              <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:8px;">HISTORY</div>
              <div *ngFor="let hst of ind.raw.history.slice(0, 6)" style="display:flex;gap:10px;font-size:12.5px;color:#64726B;padding:5px 0;border-bottom:1px solid #F6F7F4;">
                <span style="width:110px;">{{ hst.fiscalYear }}<span *ngIf="hst.month"> · {{ months[hst.month - 1] }}</span></span>
                <span style="font-family:'Work Sans',monospace;width:90px;">{{ hst.value }}</span>
                <span style="flex:1;">{{ hst.enteredBy || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- completion -->
    <div style="width:300px;flex-shrink:0;flex-grow:1;max-width:320px;position:sticky;top:24px;" data-completion>
      <div class="glass" style="border-radius:14px;padding:20px 20px 18px;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.3px;color:#1F2530;margin-bottom:4px;">Completion — FY{{ year() }}</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:600;color:#1A2027;margin:8px 0 4px;">{{ completionPct() }}%</div>
        <div style="font-size:12.5px;color:#8A968F;margin-bottom:18px;">{{ withData() }} of {{ indicators().length }} indicators have data</div>

        <div *ngFor="let g of groups()" style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64726B;margin-bottom:5px;">
            <span>{{ g.label }}</span>
            <span style="color:#9AA0AA;">{{ g.done }} / {{ g.items.length }}</span>
          </div>
          <div style="height:5px;border-radius:4px;background:#EEF0F2;overflow:hidden;">
            <div style="height:100%;border-radius:4px;" [style.width]="g.pct + '%'" [style.background]="g.color"></div>
          </div>
        </div>

        <div style="height:1px;background:#ECEEF1;margin:14px 0;"></div>
        <div style="font-size:12px;color:#8A968F;line-height:1.5;">
          Log activity data under <span style="color:#4C96B3;font-weight:600;">Emission Activity</span> to start populating these indicators.
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
  chip = CHIP;
  input = INPUT;
  btn = BTN;
  months = MONTHS;

  indicators = signal<IndicatorResponse[]>([]);
  loading = signal(false);
  error = signal('');
  open = signal<string | null>(null);
  year = signal(currentFiscalYear());
  tab = signal<string>('ALL');

  years = [currentFiscalYear() - 2, currentFiscalYear() - 1, currentFiscalYear(), currentFiscalYear() + 1];

  canApprove = computed(() => this.session.role() === 'COMPANY_ADMIN');

  /** One view-model per indicator, so the template stays declarative. */
  private decorated = computed(() =>
    this.indicators().map((raw) => {
      const point = raw.values.find((v) => v.fiscalYear === this.year());
      return {
        raw,
        id: raw.id,
        name: raw.name,
        unit: raw.unit,
        category: raw.category,
        aggregationRule: raw.aggregationRule,
        effectiveTarget: raw.effectiveTarget,
        effectiveTargetDirection: raw.effectiveTargetDirection,
        tag: tagOf(raw.id),
        mode: entryMode(raw.aggregationRule),
        hasValue: !!point,
        valueLabel: point ? `${point.value}` : '—',
        statusLabel: point ? (point.status === 'APPROVED' ? 'Approved' : 'Draft') : 'No data',
        approved: point?.status === 'APPROVED',
        monthsReported: point?.monthsReported ?? 0,
        annualRaw: point ? `${point.value}` : '',
        directionLabel: raw.effectiveTargetDirection === 'UP' ? '↑ higher is better' : '↓ lower is better',
      };
    }),
  );

  groups = computed(() =>
    ORDER.map((key) => {
      const items = this.decorated().filter((i) => i.category === key);
      const done = items.filter((i) => i.hasValue).length;
      return {
        key,
        label: CATEGORY_LABELS[key],
        color: CATEGORY_COLOR[key],
        items,
        done,
        pct: items.length ? Math.round((done / items.length) * 100) : 0,
      };
    }).filter((g) => g.items.length),
  );

  visibleGroups = computed(() =>
    this.tab() === 'ALL' ? this.groups() : this.groups().filter((g) => g.key === this.tab()),
  );

  tabs = computed(() => [
    { id: 'ALL', label: 'All' },
    ...this.groups().map((g) => ({ id: g.key as string, label: g.label })),
  ]);

  withData = computed(() => this.decorated().filter((i) => i.hasValue).length);
  completionPct = computed(() => {
    const total = this.decorated().length;
    return total ? Math.round((this.withData() / total) * 100) : 0;
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
