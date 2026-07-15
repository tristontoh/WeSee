import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiService } from '../../../core/ui.service';
import { EXPORT_HISTORY } from '../../../core/mock-data';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Export Center</h1>
      <p style="color:#64726B;margin:0 0 24px;font-size:14px;">Stream verified data to your linked buyer, or download a watermarked report.</p>
      <div class="grid-collapse" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <!-- ConnectedShareButton -->
        <div style="background:linear-gradient(160deg,#4D7E86,#3a5f66);border-radius:16px;padding:24px;color:#fff;">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#C3B9F0;margin-bottom:14px;"><span style="width:8px;height:8px;border-radius:50%;background:#A99FDB;box-shadow:0 0 0 4px rgba(47,187,136,.2);"></span>CONNECTED · SUNWAY GROUP</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:6px;">Stream to buyer ledger</div>
          <div style="font-size:13px;color:#A9C2B6;margin-bottom:20px;line-height:1.5;">Push your Q2 emissions directly into Sunway's assurance ledger. Cryptographically signed, no PDF needed.</div>
          <button (click)="streamToLedger()" style="border:none;background:#fff;color:#4C96B3;border-radius:10px;padding:11px 20px;font-size:13.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;font-family:inherit;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"></path></svg>Stream Q2 data</button>
        </div>
        <!-- DisconnectedExportButton -->
        <div class="glass" style="border-radius:16px;padding:24px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#8A968F;margin-bottom:14px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A968F" stroke-width="2"><path d="M18.4 18.4A9 9 0 105.6 5.6M1 1l22 22"></path></svg>UNLINKED BUYERS</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:6px;">Download report</div>
          <div style="font-size:13px;color:#64726B;margin-bottom:20px;line-height:1.5;">For buyers not on WeSee. PDF is watermarked and carries a verification hash they can check.</div>
          <button (click)="downloadReport()" class="btn-frost" style="padding:11px 20px;font-size:13.5px;">Download watermarked PDF</button>
        </div>
      </div>
      <!-- ExportHistoryTable -->
      <div class="glass" style="border-radius:16px;overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid #EEF1EC;font-size:14px;font-weight:600;">Export history</div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>PERIOD</th><th>METHOD</th><th>HASH</th><th>TIMESTAMP</th></tr></thead>
            <tbody>
              <tr *ngFor="let x of history">
                <td style="font-weight:600;">{{ x.period }}</td>
                <td><span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:11px;" [style.background]="x.mBg" [style.color]="x.mFg">{{ x.method }}</span></td>
                <td style="font-family:'Work Sans',monospace;color:#64726B;font-size:12px;">{{ x.hash }}</td>
                <td style="color:#64726B;">{{ x.ts }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ExportComponent {
  private ui = inject(UiService);
  history = EXPORT_HISTORY;

  streamToLedger() {
    this.ui.showToast("Streaming Q2 report to Sunway's assurance ledger…");
  }

  downloadReport() {
    this.ui.showToast('Preparing watermarked PDF for download…');
  }
}
