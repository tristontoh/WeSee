import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TRUST_FACTORS } from '../../../core/mock-data';

@Component({
  selector: 'app-trust',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:900px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Supplier Trust Score</h1>
      <p style="color:#64726B;margin:0 0 24px;font-size:14px;">How your buyers see the integrity of your emissions data.</p>
      <div class="grid-collapse" style="display:grid;grid-template-columns:300px 1fr;gap:16px;">
        <!-- TrustScoreGauge -->
        <div style="background:#3a5f66;border-radius:16px;padding:26px;color:#fff;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:12.5px;color:#9DB3A8;font-weight:600;margin-bottom:20px;">TRUST TIER · ENTERPRISE-INGESTED</div>
          <div style="width:180px;height:180px;border-radius:50%;background:conic-gradient(#A99FDB 0 78%,#3A3D6B 78% 100%);display:flex;align-items:center;justify-content:center;">
            <div style="width:138px;height:138px;border-radius:50%;background:#3a5f66;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <div style="font-family:'Work Sans',serif;font-size:52px;line-height:1;">78<span style="font-size:22px;">%</span></div>
              <div style="font-size:11px;color:#8FA79B;margin-top:4px;">verified</div>
            </div>
          </div>
          <div style="margin-top:22px;font-size:12.5px;color:#9DB3A8;text-align:center;line-height:1.5;">+8 pts if you connect 2 more<br>source documents this quarter</div>
        </div>
        <!-- TrustFactorList -->
        <div class="glass" style="border-radius:16px;padding:22px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:18px;">What's driving your score</div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <div *ngFor="let f of factors" style="display:flex;align-items:center;gap:13px;padding:12px 0;border-bottom:1px solid #F2F4EF;">
              <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;" [style.background]="f.bg" [style.color]="f.fg">{{ f.sign }}</div>
              <div style="flex:1;"><div style="font-size:13.5px;font-weight:500;">{{ f.label }}</div><div style="font-size:11.5px;color:#93A099;">{{ f.detail }}</div></div>
              <span style="font-family:'Work Sans',monospace;font-size:13px;font-weight:600;" [style.color]="f.fg">{{ f.delta }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TrustComponent {
  factors = TRUST_FACTORS;
}
