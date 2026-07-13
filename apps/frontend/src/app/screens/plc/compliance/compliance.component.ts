import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiService } from '../../../core/ui.service';
import { FRAMEWORKS, VERSIONS } from '../../../core/mock-data';

@Component({
  selector: 'app-plc-compliance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Compliance Export Center</h1>
      <p style="color:#64726B;margin:0 0 16px;font-size:14px;">Generate framework-aligned disclosures. Signed exports are immutable.</p>
      <!-- ExportImmutableNote -->
      <div style="background:#E7F0F2;border:1px solid #CFD3F5;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:11px;margin-bottom:20px;">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4C96B3" stroke-width="1.9"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg>
        <span style="font-size:12.5px;color:#4D7E86;">Once generated and signed, an export <strong>cannot be edited</strong>. A new version must be created to reflect changes.</span>
      </div>
      <div class="grid-collapse" style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:20px;">
        <div *ngFor="let f of frameworks" class="glass" style="border-radius:16px;padding:20px 22px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:12px;"><div style="width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;" [style.background]="f.iconBg" [style.color]="f.iconFg">{{ f.mark }}</div><div><div style="font-size:14.5px;font-weight:600;">{{ f.name }}</div><div style="font-size:12px;color:#8A968F;">{{ f.full }}</div></div></div>
            <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;display:flex;align-items:center;gap:5px;" [style.background]="f.stBg" [style.color]="f.stFg">{{ f.stIcon }} {{ f.status }}</span>
          </div>
          <div style="font-size:12.5px;color:#64726B;margin-bottom:16px;">{{ f.coverage }}</div>
          <button (click)="frameworkAction(f)" style="border-width:1px;border-style:solid;border-radius:9px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;width:100%;font-family:inherit;" [style.border-color]="f.btnBorder" [style.background]="f.btnBg" [style.color]="f.btnFg">{{ f.btnLabel }}</button>
        </div>
      </div>
      <!-- ExportVersionHistory -->
      <div class="glass" style="border-radius:16px;overflow:hidden;">
        <div style="padding:15px 20px;border-bottom:1px solid #EEF1EC;font-size:13.5px;font-weight:600;">Version history</div>
        <div *ngFor="let v of versions" style="padding:13px 20px;border-top:1px solid #F2F4EF;display:flex;align-items:center;gap:14px;">
          <span style="font-family:'Work Sans',monospace;font-size:12px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:3px 9px;border-radius:8px;">{{ v.ver }}</span>
          <div style="flex:1;"><span style="font-size:13px;font-weight:500;">{{ v.name }}</span></div>
          <span style="font-family:'Work Sans',monospace;font-size:12px;color:#93A099;">{{ v.hash }}</span>
          <span style="font-size:12px;color:#64726B;width:150px;text-align:right;">{{ v.ts }}</span>
        </div>
      </div>
    </div>
  `,
})
export class PlcComplianceComponent {
  private ui = inject(UiService);
  frameworks = FRAMEWORKS;
  versions = VERSIONS;

  frameworkAction(f: (typeof FRAMEWORKS)[number]) {
    this.ui.showToast(`${f.name}: ${f.btnLabel.toLowerCase()}…`);
  }
}
