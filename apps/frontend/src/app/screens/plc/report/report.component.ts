import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../../core/ui.service';
import { CLAIMS_SEED } from '../../../core/mock-data';

@Component({
  selector: 'app-plc-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Report Builder</h1>
      <p style="color:#64726B;margin:0 0 22px;font-size:14px;">Generate assured disclosures · every claim links to source evidence.</p>
      <!-- ReportBuilderWizard -->
      <div class="glass" style="display:flex;gap:0;margin-bottom:20px;border-radius:14px;padding:6px;">
        <div style="flex:1;display:flex;align-items:center;gap:10px;padding:11px 16px;border-radius:9px;background:#EEF1EC;"><span style="width:24px;height:24px;border-radius:50%;background:#4C96B3;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">✓</span><span style="font-size:13px;font-weight:600;">Framework</span></div>
        <div style="width:20px;"></div>
        <div style="flex:1;display:flex;align-items:center;gap:10px;padding:11px 16px;border-radius:9px;background:#E4EEF0;"><span style="width:24px;height:24px;border-radius:50%;background:#4C96B3;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">2</span><span style="font-size:13px;font-weight:600;color:#4C96B3;">Claim generation</span></div>
        <div style="width:20px;"></div>
        <div style="flex:1;display:flex;align-items:center;gap:10px;padding:11px 16px;border-radius:9px;"><span style="width:24px;height:24px;border-radius:50%;background:#EEF1EC;color:#93A099;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">3</span><span style="font-size:13px;font-weight:600;color:#93A099;">Review &amp; sign</span></div>
      </div>

      <!-- FlaggedClaimsAlert -->
      <div style="background:#FCEFF5;border:1px solid #F5DCE9;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:13px;margin-bottom:16px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F1A6CC" stroke-width="1.9"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01"></path></svg>
        <div style="flex:1;"><div style="font-size:13.5px;font-weight:600;color:#a34675;">2 claims reference unverified evidence</div><div style="font-size:12.5px;color:#c66ba8;">These cannot be included in a signed disclosure until resolved.</div></div>
        <button (click)="reviewFlagged()" style="border:none;background:#F1A6CC;color:#fff;border-radius:8px;padding:8px 14px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;">Review flagged</button>
      </div>

      <!-- AssuranceClaimRows -->
      <div class="glass" style="border-radius:16px;overflow:hidden;">
        <div style="padding:15px 20px;border-bottom:1px solid #EEF1EC;font-size:13.5px;font-weight:600;">Generated claims · Bursa CSI</div>
        <div *ngFor="let c of claims" (click)="openEvidence(c)" class="hover-row" style="padding:16px 20px;border-top:1px solid #F2F4EF;display:flex;align-items:center;gap:16px;cursor:pointer;">
          <div style="flex:1;">
            <div style="font-size:13.5px;line-height:1.5;margin-bottom:7px;">{{ c.text }}</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:11px;" [style.background]="c.confBg" [style.color]="c.confFg">{{ c.confLabel }}</span>
              <span style="font-size:11.5px;color:#93A099;display:flex;align-items:center;gap:5px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#93A099" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"></path></svg>{{ c.evidence }}</span>
            </div>
          </div>
          <span *ngIf="c.flagged" style="font-size:11px;font-weight:600;color:#F1A6CC;background:#FCEFF5;padding:3px 10px;border-radius:12px;">Flagged</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B4BEB7" stroke-width="2"><path d="M9 6l6 6-6 6"></path></svg>
        </div>
      </div>
    </div>
  `,
})
export class PlcReportComponent {
  private ui = inject(UiService);
  private router = inject(Router);
  claims = CLAIMS_SEED;

  openEvidence(c: (typeof CLAIMS_SEED)[number]) {
    this.ui.openEvidence({ claim: c.text, doc: c.doc, page: c.page, snippet: c.snippet });
  }

  reviewFlagged() {
    this.router.navigateByUrl('/dashboard');
  }
}
