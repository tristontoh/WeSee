import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MAPPING_ROWS } from '../../../core/mock-data';

@Component({
  selector: 'app-admin-mapping',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Framework Mapping</h1>
      <p style="color:#64726B;margin:0 0 22px;font-size:14px;">Map disclosure framework fields to WeSee's internal metrics.</p>
      <div style="display:flex;gap:6px;margin-bottom:16px;">
        <span style="padding:8px 15px;border-radius:9px;font-size:13px;font-weight:600;background:#4C96B3;color:#fff;cursor:pointer;">Bursa CSI</span>
        <span style="padding:8px 15px;border-radius:9px;font-size:13px;font-weight:600;background:#fff;border:1px solid #D9DDD4;color:#64726B;cursor:pointer;">ISSB</span>
        <span style="padding:8px 15px;border-radius:9px;font-size:13px;font-weight:600;background:#fff;border:1px solid #D9DDD4;color:#64726B;cursor:pointer;">SEDG</span>
        <span style="padding:8px 15px;border-radius:9px;font-size:13px;font-weight:600;background:#fff;border:1px solid #D9DDD4;color:#64726B;cursor:pointer;">SASB</span>
      </div>
      <div class="glass table-scroll" style="border-radius:16px;overflow:hidden;">
        <table>
          <thead><tr><th>FRAMEWORK FIELD</th><th></th><th>INTERNAL METRIC</th><th style="text-align:right;">UNIT</th></tr></thead>
          <tbody>
            <tr *ngFor="let m of rows">
              <td style="font-weight:500;">{{ m.field }}</td>
              <td style="color:#B4BEB7;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></td>
              <td><span style="display:inline-flex;align-items:center;gap:8px;font-family:'Work Sans',monospace;font-size:12.5px;background:#F2F4EF;border:1px solid #E5E8E1;border-radius:8px;padding:5px 11px;">{{ m.metric }}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#93A099" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg></span></td>
              <td style="text-align:right;font-family:'Work Sans',monospace;color:#64726B;">{{ m.unit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminMappingComponent {
  rows = MAPPING_ROWS;
}
