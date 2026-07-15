import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../../core/ui.service';
import { ApiService, CarbonOverview } from '../../../core/api.service';
import { CAT_BARS } from '../../../core/mock-data';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px;">
        <div>
          <div style="font-size:12px;color:#8A968F;font-weight:600;letter-spacing:.3px;margin-bottom:6px;">EMISSIONS · Q2 2026</div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0;letter-spacing:-.5px;">Emissions Dashboard</h1>
        </div>
        <div style="display:flex;gap:9px;">
          <input #billInput type="file" accept="image/*,application/pdf" (change)="onBillChosen($event)" style="display:none;">
          <button (click)="recalculate()" [disabled]="busy()" class="btn-frost"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" [style.animation]="busy() ? 'vspin 0.8s linear infinite' : 'none'"><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"></path></svg>{{ busy() ? 'Ingesting…' : 'Recalculate' }}</button>
          <button (click)="goExport()" class="btn-primary"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13"></path></svg>Export</button>
        </div>
      </div>

      <!-- scope summary cards · live from the gateway (Engine 01 certified records) -->
      <div class="grid-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px;">
        <div class="glass" style="border-radius:14px;padding:17px 18px;">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;"><span style="width:9px;height:9px;border-radius:50%;background:#4C96B3;"></span><span style="font-size:12.5px;color:#64726B;font-weight:600;">Scope 1</span></div>
          <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;letter-spacing:-1px;">{{ s1() }}</div>
          <div style="font-size:11.5px;color:#8A968F;margin-top:2px;">tCO₂e · direct</div>
          <div style="margin-top:11px;font-size:12px;color:#F1A6CC;font-weight:600;display:flex;align-items:center;gap:4px;">▲ 6.1%</div>
        </div>
        <div class="glass" style="border-radius:14px;padding:17px 18px;">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;"><span style="width:9px;height:9px;border-radius:50%;background:#CBDCDF;"></span><span style="font-size:12.5px;color:#64726B;font-weight:600;">Scope 2</span></div>
          <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;letter-spacing:-1px;">{{ s2() }}</div>
          <div style="font-size:11.5px;color:#8A968F;margin-top:2px;">tCO₂e · energy</div>
          <div style="margin-top:11px;font-size:12px;color:#4C96B3;font-weight:600;display:flex;align-items:center;gap:4px;">▼ 3.4%</div>
        </div>
        <div class="glass" style="border-radius:14px;padding:17px 18px;">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;"><span style="width:9px;height:9px;border-radius:50%;background:#D96BA1;"></span><span style="font-size:12.5px;color:#64726B;font-weight:600;">Scope 3</span></div>
          <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;letter-spacing:-1px;">{{ s3() }}</div>
          <div style="font-size:11.5px;color:#8A968F;margin-top:2px;">tCO₂e · value chain</div>
          <div style="margin-top:11px;font-size:12px;color:#4C96B3;font-weight:600;display:flex;align-items:center;gap:4px;">▼ 1.2%</div>
        </div>
        <div style="background:#3a5f66;color:#fff;border:1px solid #3a5f66;border-radius:14px;padding:17px 18px;">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;"><span style="font-size:12.5px;color:#9DB3A8;font-weight:600;">Total footprint</span></div>
          <div style="font-family:'Work Sans',monospace;font-size:26px;font-weight:600;letter-spacing:-1px;">{{ total() }}</div>
          <div style="font-size:11.5px;color:#8FA79B;margin-top:2px;">tCO₂e this period</div>
          <div style="margin-top:11px;font-size:12px;color:#C3B9F0;font-weight:600;">▼ 0.8% vs Q1</div>
        </div>
      </div>

      <div class="grid-collapse" style="display:grid;grid-template-columns:1.05fr 1.35fr;gap:14px;margin-bottom:16px;">
        <!-- ScopeDonutChart -->
        <div class="glass" style="border-radius:14px;padding:20px 22px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:2px;">Scope breakdown</div>
          <div style="font-size:12px;color:#8A968F;margin-bottom:16px;">Share of total tCO₂e</div>
          <div style="display:flex;align-items:center;gap:24px;">
            <div style="width:150px;height:150px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;" [style.background]="donut()">
              <div style="width:92px;height:92px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div style="font-family:'Work Sans',monospace;font-size:20px;font-weight:600;">{{ total() }}</div>
                <div style="font-size:10px;color:#8A968F;">tCO₂e</div>
              </div>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#4C96B3;"></span><span style="font-size:13px;flex:1;">Scope 1</span><span style="font-family:'Work Sans',monospace;font-size:13px;font-weight:600;">{{ p1() }}%</span></div>
              <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#CBDCDF;"></span><span style="font-size:13px;flex:1;">Scope 2</span><span style="font-family:'Work Sans',monospace;font-size:13px;font-weight:600;">{{ p2() }}%</span></div>
              <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#D96BA1;"></span><span style="font-size:13px;flex:1;">Scope 3</span><span style="font-family:'Work Sans',monospace;font-size:13px;font-weight:600;">{{ p3() }}%</span></div>
            </div>
          </div>
        </div>
        <!-- EmissionsByCategory -->
        <div class="glass" style="border-radius:14px;padding:20px 22px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:2px;">Emissions by category</div>
          <div style="font-size:12px;color:#8A968F;margin-bottom:20px;">tCO₂e · top sources</div>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div *ngFor="let c of catBars">
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;"><span style="color:#33413A;">{{ c.label }}</span><span style="font-family:'Work Sans',monospace;color:#64726B;">{{ c.val }}</span></div>
              <div style="height:9px;border-radius:5px;background:#EEF1EC;overflow:hidden;"><div style="height:100%;border-radius:5px;" [style.width]="c.pct" [style.background]="c.color"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- EmissionsTrendLine -->
      <div class="glass" style="border-radius:14px;padding:20px 22px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div><div style="font-size:14px;font-weight:600;">Emissions trend</div><div style="font-size:12px;color:#8A968F;">tCO₂e per month · trailing 12</div></div>
          <div style="display:flex;gap:16px;font-size:12px;color:#64726B;"><span style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:3px;background:#4C96B3;border-radius:2px;"></span>This year</span><span style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:3px;background:#4D7E86;border-radius:2px;"></span>Prior year</span></div>
        </div>
        <svg viewBox="0 0 720 180" style="width:100%;height:180px;overflow:visible;">
          <line x1="0" y1="30" x2="720" y2="30" stroke="#EEF1EC" stroke-width="1"></line><line x1="0" y1="75" x2="720" y2="75" stroke="#EEF1EC" stroke-width="1"></line><line x1="0" y1="120" x2="720" y2="120" stroke="#EEF1EC" stroke-width="1"></line><line x1="0" y1="165" x2="720" y2="165" stroke="#E5E8E1" stroke-width="1"></line>
          <polyline fill="none" stroke="#4D7E86" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="0,120 65,110 131,124 196,100 262,108 327,92 393,98 458,82 524,90 589,72 655,80 720,68"></polyline>
          <polyline fill="none" stroke="#4C96B3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="0,100 65,86 131,104 196,72 262,88 327,60 393,74 458,52 524,66 589,46 655,58 720,40"></polyline>
          <circle cx="720" cy="40" r="4.5" fill="#4C96B3"></circle><circle cx="720" cy="40" r="9" fill="#4C96B3" opacity="0.15"></circle>
        </svg>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private ui = inject(UiService);
  private api = inject(ApiService);
  private router = inject(Router);
  catBars = CAT_BARS;

  @ViewChild('billInput') billInput!: ElementRef<HTMLInputElement>;

  /** Live overview from the gateway; null until loaded → design values shown as fallback. */
  private carbon = signal<CarbonOverview | null>(null);
  busy = signal(false);

  // Fallback values mirror the original design so the screen never looks empty.
  s1 = computed(() => this.fmt(this.carbon()?.scope1 ?? 184.2));
  s2 = computed(() => this.fmt(this.carbon()?.scope2 ?? 97.6));
  s3 = computed(() => this.fmt(this.carbon()?.scope3 ?? 432.8));
  total = computed(() => this.fmt(this.carbon()?.total_tco2e ?? 714.6));

  p1 = computed(() => this.pct(this.carbon()?.scope1 ?? 184.2));
  p2 = computed(() => this.pct(this.carbon()?.scope2 ?? 97.6));
  p3 = computed(() => this.pct(this.carbon()?.scope3 ?? 432.8));

  /** Conic-gradient donut derived from the real scope split. */
  donut = computed(() => {
    const a = Number(this.p1());
    const b = a + Number(this.p2());
    return `conic-gradient(#4C96B3 0 ${a}%,#CBDCDF ${a}% ${b}%,#D96BA1 ${b}% 100%)`;
  });

  ngOnInit() {
    this.api.getCarbon().subscribe({
      next: (c) => this.carbon.set(c),
      error: () => {
        /* keep design fallbacks if the gateway is unreachable */
      },
    });
  }

  private denom(): number {
    const c = this.carbon();
    const total = c ? c.scope1 + c.scope2 + c.scope3 : 714.6;
    return total || 1;
  }
  private fmt(n: number): string {
    return n.toFixed(1);
  }
  private pct(n: number): string {
    return ((n / this.denom()) * 100).toFixed(1);
  }

  /** Recalculate = ingest a new source doc through Engine 01, then refresh totals.
   * Opens the file picker; the actual work happens in onBillChosen. */
  recalculate() {
    if (this.busy()) return;
    this.billInput.nativeElement.click();
  }

  onBillChosen(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true);
    this.ui.showToast('Extracting emissions from ' + file.name + '…');
    this.api.ingestBill(file).subscribe({
      next: (rec) => {
        // Pull the refreshed overview so the new record is reflected in the totals.
        this.api.getCarbon().subscribe({ next: (c) => this.carbon.set(c), error: () => {} });
        this.busy.set(false);
        this.ui.showToast(
          `Certified ${rec.activity_type} · +${rec.tco2e.toFixed(1)} tCO₂e (ledger ${(rec.ledger_tx_id || '').slice(0, 8)}…)`,
        );
      },
      error: () => {
        this.busy.set(false);
        this.ui.showToast('Ingestion failed — is the backend running on :8000?');
      },
    });
    input.value = ''; // allow re-picking the same file
  }

  goExport() {
    this.router.navigateByUrl('/export');
  }
}
