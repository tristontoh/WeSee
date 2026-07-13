import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { UiService } from '../core/ui.service';
import { SUPPLIERS, tierStyle } from '../core/mock-data';

@Component({
  selector: 'app-supplier-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="supplier() as d" style="position:fixed;inset:0;z-index:40;">
      <div (click)="ui.closeDrawer()" style="position:absolute;inset:0;background:rgba(18,36,29,.4);"></div>
      <div style="position:absolute;top:0;right:0;bottom:0;width:440px;background:rgba(246,248,243,.72);backdrop-filter:blur(30px) saturate(150%);-webkit-backdrop-filter:blur(30px) saturate(150%);box-shadow:-8px 0 40px rgba(0,0,0,.16);animation:vdrawer .28s cubic-bezier(.2,.8,.2,1) both;display:flex;flex-direction:column;">
        <div style="padding:22px 24px;border-bottom:1px solid #E5E8E1;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;"><span style="font-size:18px;font-weight:600;">{{ d.name }}</span></div>
            <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;" [style.background]="d.tierBg" [style.color]="d.tierFg">{{ d.tier }}</span>
          </div>
          <button (click)="ui.closeDrawer()" class="icon-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5A52" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:22px 24px;">
          <div class="grid-collapse" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:22px;">
            <div class="glass" style="border-radius:12px;padding:14px;"><div style="font-size:11px;color:#8A968F;margin-bottom:6px;">Trust</div><div style="font-family:'Work Sans',monospace;font-size:20px;font-weight:600;" [style.color]="d.tierFg">{{ d.trust }}</div></div>
            <div class="glass" style="border-radius:12px;padding:14px;"><div style="font-size:11px;color:#8A968F;margin-bottom:6px;">Emissions</div><div style="font-family:'Work Sans',monospace;font-size:20px;font-weight:600;">{{ d.total }}</div></div>
            <div class="glass" style="border-radius:12px;padding:14px;"><div style="font-size:11px;color:#8A968F;margin-bottom:6px;">Docs</div><div style="font-family:'Work Sans',monospace;font-size:20px;font-weight:600;">{{ d.docCount }}</div></div>
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:12px;">Emissions breakdown</div>
          <div class="glass" style="border-radius:12px;padding:16px 18px;margin-bottom:22px;display:flex;flex-direction:column;gap:13px;">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;"><span>Scope 1</span><span style="font-family:'Work Sans',monospace;">{{ d.s1 }}</span></div>
              <div style="height:8px;border-radius:5px;background:#EEF1EC;"><div style="height:100%;border-radius:5px;background:#4C96B3;" [style.width]="d.s1pct"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;"><span>Scope 2</span><span style="font-family:'Work Sans',monospace;">{{ d.s2 }}</span></div>
              <div style="height:8px;border-radius:5px;background:#EEF1EC;"><div style="height:100%;border-radius:5px;background:#CBDCDF;" [style.width]="d.s2pct"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;"><span>Scope 3</span><span style="font-family:'Work Sans',monospace;">{{ d.s3 }}</span></div>
              <div style="height:8px;border-radius:5px;background:#EEF1EC;"><div style="height:100%;border-radius:5px;background:#D96BA1;" [style.width]="d.s3pct"></div></div>
            </div>
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:12px;">Source documents</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="glass" *ngFor="let doc of d.docs" style="border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:11px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64726B" stroke-width="1.7"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"></path></svg>
              <span style="flex:1;font-size:13px;">{{ doc.name }}</span>
              <span style="font-size:11px;color:#93A099;">{{ doc.date }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SupplierDrawerComponent {
  ui = inject(UiService);

  supplier = computed(() => {
    const id = this.ui.drawerSupplierId();
    if (!id) return null;
    const s = SUPPLIERS[id];
    const ts = tierStyle(s.tier);
    return { ...s, tierBg: ts.bg, tierFg: ts.fg };
  });
}
