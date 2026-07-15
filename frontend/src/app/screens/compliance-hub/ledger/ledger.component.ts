import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiService } from '../../../core/ui.service';
import { LEDGER_ROWS } from '../../../core/mock-data';

@Component({
  selector: 'app-compliance-hub-ledger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;">
        <div><h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Supplier Assurance Ledger</h1><p style="color:#64726B;margin:0;font-size:14px;">Per-supplier trust integrity · click a row for full breakdown.</p></div>
        <div style="display:flex;gap:8px;">
          <button (click)="filterLedger()" class="btn-frost"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 3H2l8 9.5V19l4 2v-8.5z"></path></svg>Filter</button>
        </div>
      </div>
      <div class="glass table-scroll" style="border-radius:16px;overflow:hidden;">
        <table>
          <thead><tr><th>SUPPLIER</th><th>TRUST TIER</th><th>TRUST %</th><th>tCO₂e</th><th>SOURCE</th><th style="text-align:right;">STATUS</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of rows" (click)="ui.openDrawer(r.openId)" class="hover-row" style="cursor:pointer;">
              <td style="font-weight:600;">{{ r.name }}</td>
              <td><span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;" [style.background]="r.tierBg" [style.color]="r.tierFg">{{ r.tier }}</span></td>
              <td style="font-family:'Work Sans',monospace;font-weight:600;" [style.color]="r.tierFg">{{ r.trust }}</td>
              <td style="font-family:'Work Sans',monospace;color:#33413A;">{{ r.total }}</td>
              <td style="color:#64726B;">{{ r.source }}</td>
              <td style="text-align:right;"><span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;" [style.color]="r.connFg">{{ r.connIcon }} {{ r.conn }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ComplianceHubLedgerComponent {
  ui = inject(UiService);
  rows = LEDGER_ROWS;

  filterLedger() {
    this.ui.showToast('Filter panel coming soon');
  }
}
