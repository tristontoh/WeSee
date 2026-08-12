import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { TargetsApiService } from '../../../core/esg/esg-api.service';
import { PerformanceTargetResponse } from '../../../core/esg/esg.model';
import { IndicatorsApiService } from '../../../core/indicators/indicators-api.service';
import { IndicatorResponse } from '../../../core/indicators/indicators.model';
import { currentFiscalYear } from '../../../core/indicators/entry-mode';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:38px;border-radius:9px;border:1px solid #E5E8E1;padding:0 11px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:38px;padding:0 16px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-targets',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:960px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Performance targets</h1>
      <p style="color:#64726B;margin:0 0 20px;font-size:14px;">Multi-year targets, with progress either tracked from a linked indicator or entered by hand.</p>

      <div *ngIf="planBlocked()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:20px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:5px;">Targets need the Growth plan</div>
        <div style="font-size:13px;color:#7A6A3A;line-height:1.5;">Performance target tracking is part of the Growth tier.</div>
      </div>

      <div *ngIf="error() && !planBlocked()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <ng-container *ngIf="!planBlocked()">
        <div [style]="card">
          <div [style]="h">ADD A TARGET</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <input #title placeholder="e.g. Cut Scope 2 by 40%" [style]="input" style="flex:2;min-width:200px;">
            <input #baseline [value]="thisYear" placeholder="Baseline year" inputmode="numeric" [style]="input" style="width:120px;">
            <input #targetYear [value]="thisYear + 5" placeholder="Target year" inputmode="numeric" [style]="input" style="width:120px;">
            <input #value placeholder="Target value" inputmode="decimal" [style]="input" style="width:130px;">
            <select #ind [style]="input" style="min-width:200px;">
              <option value="">No linked indicator</option>
              <option *ngFor="let i of indicators()" [value]="i.id">{{ i.name }}</option>
            </select>
            <button (click)="add(title.value, baseline.value, targetYear.value, value.value, ind.value); title.value = ''; value.value = ''" [style]="btn" [disabled]="busy()">Add target</button>
          </div>
        </div>

        <div [style]="card">
          <div [style]="h">TARGETS ({{ targets().length }})</div>
          <div *ngFor="let t of targets()" [attr.data-target]="t.title" style="padding:13px 0;border-bottom:1px solid #F2F4F0;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:600;">{{ t.title }}</div>
                <div style="font-size:12.5px;color:#8A968F;">
                  {{ t.baselineYear }} → {{ t.targetYear }} · target {{ t.targetValue }}
                  <span *ngIf="t.progressComputed"> · tracked from indicator</span>
                </div>
              </div>
              <div style="font-family:'Work Sans',monospace;font-size:15px;font-weight:600;width:56px;text-align:right;">{{ t.currentProgress }}%</div>
              <button (click)="remove(t)" style="height:32px;padding:0 11px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Delete</button>
            </div>
            <div style="height:9px;border-radius:5px;background:#EEF1EC;overflow:hidden;margin-top:9px;">
              <div style="height:100%;border-radius:5px;background:linear-gradient(90deg,#4C96B3,#A99FDB);" [style.width]="t.currentProgress + '%'"></div>
            </div>
          </div>
          <div *ngIf="!targets().length" style="color:#8A968F;font-size:13.5px;">No targets set yet.</div>
        </div>
      </ng-container>
    </div>
  `,
})
export class TargetsComponent implements OnInit {
  private api = inject(TargetsApiService);
  private indicatorsApi = inject(IndicatorsApiService);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  thisYear = currentFiscalYear();

  targets = signal<PerformanceTargetResponse[]>([]);
  indicators = signal<IndicatorResponse[]>([]);
  busy = signal(false);
  error = signal('');
  planBlocked = signal(false);

  ngOnInit(): void {
    this.load();
    this.indicatorsApi.list().subscribe({ next: (i) => this.indicators.set(i), error: () => {} });
  }

  private load() {
    this.api.list().subscribe({
      next: (t) => this.targets.set(t),
      error: (err) => {
        const e = toApiError(err);
        if (e.status === 403) this.planBlocked.set(true);
        else this.error.set(e.message);
      },
    });
  }

  add(title: string, baseline: string, targetYear: string, value: string, indicatorId: string) {
    const b = Number(baseline);
    const ty = Number(targetYear);
    const v = Number(value);
    if (!title.trim() || Number.isNaN(b) || Number.isNaN(ty) || Number.isNaN(v) || value.trim() === '') {
      this.error.set('Title, baseline year, target year and target value are all required.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .create({
        title: title.trim(),
        baselineYear: b,
        targetYear: ty,
        targetValue: v,
        indicatorId: indicatorId || null,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.ui.showToast('Target added.');
          this.load();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(toApiError(err).message);
        },
      });
  }

  remove(t: PerformanceTargetResponse) {
    this.api.remove(t.id).subscribe({ next: () => this.load(), error: (e) => this.error.set(toApiError(e).message) });
  }
}
