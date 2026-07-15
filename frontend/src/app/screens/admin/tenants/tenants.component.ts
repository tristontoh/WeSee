import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiService } from '../../../core/ui.service';
import { TENANT_ROWS } from '../../../core/mock-data';

@Component({
  selector: 'app-admin-tenants',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;">
        <div><h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Tenants</h1><p style="color:#64726B;margin:0;font-size:14px;">All Workspace and Compliance Hub tenants on the platform.</p></div>
        <button (click)="newTenant()" class="btn-primary" style="border:none;">+ New tenant</button>
      </div>
      <div class="grid-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
        <div class="glass" style="border-radius:13px;padding:16px 18px;"><div style="font-size:12px;color:#8A968F;margin-bottom:8px;">Total tenants</div><div style="font-family:'Work Sans',monospace;font-size:24px;font-weight:600;">1,284</div></div>
        <div class="glass" style="border-radius:13px;padding:16px 18px;"><div style="font-size:12px;color:#8A968F;margin-bottom:8px;">Workspace</div><div style="font-family:'Work Sans',monospace;font-size:24px;font-weight:600;">1,196</div></div>
        <div class="glass" style="border-radius:13px;padding:16px 18px;"><div style="font-size:12px;color:#8A968F;margin-bottom:8px;">Compliance Hub</div><div style="font-family:'Work Sans',monospace;font-size:24px;font-weight:600;">88</div></div>
        <div class="glass" style="border-radius:13px;padding:16px 18px;"><div style="font-size:12px;color:#8A968F;margin-bottom:8px;">Suspended</div><div style="font-family:'Work Sans',monospace;font-size:24px;font-weight:600;color:#F1A6CC;">7</div></div>
      </div>
      <div class="glass table-scroll" style="border-radius:16px;overflow:hidden;">
        <table>
          <thead><tr><th>TENANT</th><th>TYPE</th><th>PLAN</th><th>SUPPLIERS</th><th style="text-align:right;">STATUS</th></tr></thead>
          <tbody>
            <tr *ngFor="let t of rows" class="hover-row">
              <td style="font-weight:600;">{{ t.name }}</td>
              <td><span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:11px;" [style.background]="t.typeBg" [style.color]="t.typeFg">{{ t.type }}</span></td>
              <td style="color:#64726B;">{{ t.plan }}</td>
              <td style="font-family:'Work Sans',monospace;color:#33413A;">{{ t.suppliers }}</td>
              <td style="text-align:right;"><span style="font-size:12px;font-weight:600;" [style.color]="t.stFg">● {{ t.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminTenantsComponent {
  private ui = inject(UiService);
  rows = TENANT_ROWS;

  newTenant() {
    this.ui.showToast('New tenant flow coming soon');
  }
}
