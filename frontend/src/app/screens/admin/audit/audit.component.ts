import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AUDIT_ROWS } from '../../../core/mock-data';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;"><h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0;letter-spacing:-.5px;">Audit Log</h1><span style="font-size:11px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:4px 10px;border-radius:12px;">APPEND-ONLY</span></div>
      <p style="color:#64726B;margin:0 0 22px;font-size:14px;">Immutable event log · every entry hash-chained to the prior.</p>
      <div class="glass" style="border-radius:16px;overflow:hidden;">
        <div *ngFor="let l of rows" style="padding:14px 20px;border-top:1px solid #F2F4EF;display:flex;align-items:center;gap:16px;">
          <div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" [style.background]="l.bg" [style.color]="l.fg"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="l.d"></path></svg></div>
          <div style="flex:1;"><div style="font-size:13.5px;"><strong>{{ l.actor }}</strong> {{ l.action }}</div><div style="font-family:'Work Sans',monospace;font-size:11px;color:#93A099;margin-top:3px;">{{ l.hash }}</div></div>
          <span style="font-size:12px;color:#64726B;white-space:nowrap;">{{ l.ts }}</span>
        </div>
      </div>
    </div>
  `,
})
export class AdminAuditComponent {
  rows = AUDIT_ROWS;
}
