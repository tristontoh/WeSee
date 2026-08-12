import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../../core/ui.service';
import { EmissionsApiService } from '../../../core/emissions/emissions-api.service';
import { EmissionsResponse, scopeTotals } from '../../../core/emissions/emissions.model';
import { currentFiscalYear } from '../../../core/indicators/entry-mode';
import { toApiError } from '../../../core/http/api-error';

const INPUT = 'height:34px;border-radius:9px;border:1px solid #E5E8E1;padding:0 10px;font-family:inherit;font-size:13px;background:#fff;';
const BTN = 'height:34px;padding:0 13px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:12.5px;font-family:inherit;';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:12px;color:#8A968F;font-weight:600;letter-spacing:.3px;margin-bottom:6px;">EMISSIONS · FY {{ year() }}</div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0;letter-spacing:-.5px;">Emissions Dashboard</h1>
        </div>
        <div style="display:flex;gap:9px;align-items:center;">
          <select (change)="setYear($any($event.target).value)" [style]="input">
            <option *ngFor="let y of years" [value]="y" [selected]="y === year()">{{ y }}</option>
          </select>
          <button (click)="goExport()" class="btn-primary"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13"></path></svg>Export</button>
        </div>
      </div>

      <div *ngIf="planBlocked()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:5px;">Emissions reporting needs the Issuer Ready plan</div>
        <div style="font-size:13px;color:#7A6A3A;line-height:1.5;">Scope 1, 2 and 3 tracking is part of the climate module. Your indicator data is unaffected.</div>
      </div>

      <div *ngIf="error() && !planBlocked()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <ng-container *ngIf="!planBlocked()">
        <!-- scope summary -->
        <div class="grid-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px;">
          <div class="glass" style="border-radius:14px;padding:17px 18px;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;"><span style="width:9px;height:9px;border-radius:50%;background:#4C96B3;"></span><span style="font-size:12.5px;color:#64726B;font-weight:600;">Scope 1</span></div>
            <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;letter-spacing:-1px;">{{ t().scope1 }}</div>
            <div style="font-size:11.5px;color:#8A968F;margin-top:2px;">tCO₂e · direct</div>
            <div style="display:flex;gap:6px;margin-top:11px;">
              <input #s1in [value]="t().scope1" inputmode="decimal" [style]="input" style="width:100%;">
              <button (click)="saveScope1(s1in.value)" [style]="btn">Set</button>
            </div>
          </div>
          <div class="glass" style="border-radius:14px;padding:17px 18px;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;"><span style="width:9px;height:9px;border-radius:50%;background:#CBDCDF;"></span><span style="font-size:12.5px;color:#64726B;font-weight:600;">Scope 2</span></div>
            <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;letter-spacing:-1px;">{{ t().scope2 }}</div>
            <div style="font-size:11.5px;color:#8A968F;margin-top:2px;">tCO₂e · energy</div>
            <div style="display:flex;gap:6px;margin-top:11px;">
              <input #s2in [value]="t().scope2" inputmode="decimal" [style]="input" style="width:100%;">
              <button (click)="saveScope2(s2in.value)" [style]="btn">Set</button>
            </div>
          </div>
          <div class="glass" style="border-radius:14px;padding:17px 18px;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;"><span style="width:9px;height:9px;border-radius:50%;background:#D96BA1;"></span><span style="font-size:12.5px;color:#64726B;font-weight:600;">Scope 3</span></div>
            <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;letter-spacing:-1px;">{{ t().scope3 }}</div>
            <div style="font-size:11.5px;color:#8A968F;margin-top:2px;">tCO₂e · value chain</div>
            <div style="margin-top:11px;font-size:12px;color:#8A968F;">across {{ filledCategories() }} of {{ categories().length }} categories</div>
          </div>
          <div style="background:#3a5f66;color:#fff;border:1px solid #3a5f66;border-radius:14px;padding:17px 18px;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;"><span style="font-size:12.5px;color:#9DB3A8;font-weight:600;">Total footprint</span></div>
            <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;letter-spacing:-1px;">{{ t().total.toFixed(1) }}</div>
            <div style="font-size:11.5px;color:#8FA79B;margin-top:2px;">tCO₂e · FY {{ year() }}</div>
          </div>
        </div>

        <!-- donut -->
        <div class="glass" style="border-radius:14px;padding:20px 22px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:2px;">Scope breakdown</div>
          <div style="font-size:12px;color:#8A968F;margin-bottom:16px;">Share of total tCO₂e</div>
          <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
            <div style="width:150px;height:150px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;" [style.background]="donut()">
              <div style="width:92px;height:92px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div style="font-family:'Work Sans',monospace;font-size:20px;font-weight:600;">{{ t().total.toFixed(1) }}</div>
                <div style="font-size:10px;color:#8A968F;">tCO₂e</div>
              </div>
            </div>
            <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#4C96B3;"></span><span style="font-size:13px;flex:1;">Scope 1</span><span style="font-family:'Work Sans',monospace;font-size:13px;font-weight:600;">{{ t().pct1 }}%</span></div>
              <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#CBDCDF;"></span><span style="font-size:13px;flex:1;">Scope 2</span><span style="font-family:'Work Sans',monospace;font-size:13px;font-weight:600;">{{ t().pct2 }}%</span></div>
              <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#D96BA1;"></span><span style="font-size:13px;flex:1;">Scope 3</span><span style="font-family:'Work Sans',monospace;font-size:13px;font-weight:600;">{{ t().pct3 }}%</span></div>
            </div>
          </div>
        </div>

        <!-- scope 3 categories -->
        <div class="glass" style="border-radius:14px;padding:20px 22px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
            <div>
              <div style="font-size:14px;font-weight:600;">Scope 3 categories</div>
              <div style="font-size:12px;color:#8A968F;">GHG Protocol categories 1–15, plus any you add</div>
            </div>
            <div style="display:flex;gap:8px;">
              <input #newCat placeholder="Custom category name" [style]="input" style="width:210px;">
              <button (click)="addCategory(newCat.value); newCat.value = ''" [style]="btn" [disabled]="busy()">Add</button>
            </div>
          </div>

          <div *ngFor="let c of categories()" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #F2F4F0;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13.5px;font-weight:600;">{{ c.name }}</div>
              <div *ngIf="c.tooltip" style="font-size:12px;color:#8A968F;">{{ c.tooltip }}</div>
            </div>
            <input [value]="categoryValue(c.id)" (blur)="saveCategory(c.id, $any($event.target).value)" inputmode="decimal" [style]="input" style="width:110px;">
            <button *ngIf="c.standardCategoryNumber == null" (click)="removeCategory(c.id)" style="height:34px;padding:0 11px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Delete</button>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(EmissionsApiService);
  private ui = inject(UiService);
  private router = inject(Router);

  input = INPUT;
  btn = BTN;

  data = signal<EmissionsResponse | null>(null);
  year = signal(currentFiscalYear());
  busy = signal(false);
  error = signal('');
  planBlocked = signal(false);

  years = [currentFiscalYear() - 2, currentFiscalYear() - 1, currentFiscalYear(), currentFiscalYear() + 1];

  t = computed(() => scopeTotals(this.data(), this.year()));
  categories = computed(() => this.data()?.scope3 ?? []);
  filledCategories = computed(
    () => this.categories().filter((c) => c.values.some((v) => v.fiscalYear === this.year())).length,
  );

  donut = computed(() => {
    const { pct1, pct2, total } = this.t();
    if (total === 0) return '#EEF1EC';
    const a = pct1;
    const b = a + pct2;
    return `conic-gradient(#4C96B3 0 ${a}%,#CBDCDF ${a}% ${b}%,#D96BA1 ${b}% 100%)`;
  });

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.api.get(this.year()).subscribe({
      next: (d) => {
        this.data.set(d);
        this.planBlocked.set(false);
      },
      error: (err) => {
        const e = toApiError(err);
        // Nav gating should prevent arrival; this catches a plan downgraded mid-session.
        if (e.status === 403) this.planBlocked.set(true);
        else this.error.set(e.message);
      },
    });
  }

  setYear(v: string) {
    this.year.set(Number(v));
    this.load();
  }

  categoryValue(categoryId: string): string {
    const c = this.categories().find((x) => x.id === categoryId);
    const v = c?.values.find((x) => x.fiscalYear === this.year());
    return v ? `${v.value}` : '';
  }

  private apply(d: EmissionsResponse) {
    this.data.set(d);
    this.busy.set(false);
  }

  saveScope1(raw: string) {
    const value = Number(raw);
    if (raw.trim() === '' || Number.isNaN(value)) return;
    this.busy.set(true);
    this.api.setScope1(this.year(), value).subscribe({
      next: (d) => {
        this.apply(d);
        this.ui.showToast('Scope 1 saved.');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  saveScope2(raw: string) {
    const value = Number(raw);
    if (raw.trim() === '' || Number.isNaN(value)) return;
    this.busy.set(true);
    this.api.setScope2(this.year(), value).subscribe({
      next: (d) => {
        this.apply(d);
        this.ui.showToast('Scope 2 saved.');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  saveCategory(categoryId: string, raw: string) {
    const value = Number(raw);
    if (raw.trim() === '' || Number.isNaN(value)) return;
    this.api.setScope3Value(categoryId, this.year(), value).subscribe({
      next: (d) => this.data.set(d),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  addCategory(name: string) {
    if (!name.trim() || this.busy()) return;
    this.busy.set(true);
    this.api.addScope3Category(name.trim()).subscribe({
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

  removeCategory(categoryId: string) {
    this.api.deleteScope3Category(categoryId).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  goExport() {
    this.router.navigateByUrl('/export');
  }
}
