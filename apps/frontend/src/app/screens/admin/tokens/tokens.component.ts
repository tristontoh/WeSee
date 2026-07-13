import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TOKEN_GRID } from '../../../core/mock-data';

@Component({
  selector: 'app-admin-tokens',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">BYO Token Monitor</h1>
      <p style="color:#64726B;margin:0 0 22px;font-size:14px;">Per-tenant Gemini Flash key health and quota usage.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;" class="grid-collapse">
        <div *ngFor="let k of grid" class="glass" style="border-radius:14px;padding:18px 20px;border-top-width:4px;border-top-style:solid;" [style.border-top-color]="k.color">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><span style="font-size:13.5px;font-weight:600;">{{ k.tenant }}</span><span style="width:10px;height:10px;border-radius:50%;" [style.background]="k.color"></span></div>
          <div style="font-size:12px;font-weight:600;margin-bottom:12px;" [style.color]="k.color">{{ k.state }}</div>
          <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#8A968F;margin-bottom:5px;"><span>Quota</span><span style="font-family:'Work Sans',monospace;color:#33413A;font-weight:600;">{{ k.quota }}</span></div>
          <div style="height:7px;border-radius:5px;background:#EEF1EC;overflow:hidden;"><div style="height:100%;border-radius:5px;" [style.width]="k.quota" [style.background]="k.color"></div></div>
        </div>
      </div>
    </div>
  `,
})
export class AdminTokensComponent {
  grid = TOKEN_GRID;
}
