import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ARBITRAGE_SEED } from '../../../core/mock-data';

@Component({
  selector: 'app-compliance-hub-arbitrage',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="margin-bottom:22px;"><div style="font-size:12px;color:#8A968F;font-weight:600;letter-spacing:.3px;margin-bottom:6px;">AI SOURCING · 3 OPPORTUNITIES</div><h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Sourcing Arbitrage</h1><p style="color:#64726B;margin:0;font-size:14px;">Lower-carbon vendors with equivalent quality, ranked by combined tCO₂e and cost savings.</p></div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div *ngFor="let a of cards()" class="glass" style="border-radius:16px;padding:22px 24px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
            <div><div style="font-size:11px;color:#8A968F;font-weight:600;letter-spacing:.3px;margin-bottom:5px;">{{ a.category }}</div><div style="font-size:16px;font-weight:600;">Switch {{ a.from }} → {{ a.to }}</div></div>
            <div style="display:flex;gap:22px;text-align:right;">
              <div><div style="font-size:11px;color:#8A968F;margin-bottom:3px;">tCO₂e saved</div><div style="font-family:'Work Sans',monospace;font-size:20px;font-weight:600;color:#4C96B3;">−{{ a.co2 }}</div></div>
              <div><div style="font-size:11px;color:#8A968F;margin-bottom:3px;">Cost saved</div><div style="font-family:'Work Sans',monospace;font-size:20px;font-weight:600;color:#D96BA1;">{{ a.rm }}</div></div>
            </div>
          </div>
          <!-- ArbitrageImpactBar -->
          <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:12px;"><span style="width:88px;font-size:12px;color:#8A968F;">Current</span><div style="flex:1;height:22px;border-radius:6px;background:#EEF1EC;overflow:hidden;"><div style="height:100%;background:#B0A6D9;border-radius:6px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:11px;font-family:'Work Sans',monospace;" [style.width]="a.curPct">{{ a.curVal }}</div></div></div>
            <div style="display:flex;align-items:center;gap:12px;"><span style="width:88px;font-size:12px;color:#8A968F;">Recommended</span><div style="flex:1;height:22px;border-radius:6px;background:#EEF1EC;overflow:hidden;"><div style="height:100%;background:#A99FDB;border-radius:6px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:11px;font-family:'Work Sans',monospace;" [style.width]="a.altPct">{{ a.altVal }}</div></div></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="font-size:12.5px;color:#64726B;">Recommended vendor trust: <span style="color:#4C96B3;font-weight:600;">{{ a.trust }}</span> · lead time {{ a.lead }}</div>
            <button (click)="accept(a.id)" style="border:none;border-radius:9px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;font-family:inherit;" [style.background]="a.btnBg" [style.color]="a.btnFg">{{ a.btnIcon }} {{ a.btnLabel }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ComplianceHubArbitrageComponent {
  private accepted = signal<Record<string, boolean>>({});

  cards = computed(() =>
    ARBITRAGE_SEED.map((a) => {
      const done = !!this.accepted()[a.id];
      return {
        ...a,
        btnBg: done ? '#E4EEF0' : '#4C96B3',
        btnFg: done ? '#4C96B3' : '#fff',
        btnLabel: done ? 'Accepted' : 'Accept recommendation',
        btnIcon: done ? '✓' : '→',
      };
    }),
  );

  accept(id: string) {
    this.accepted.update((s) => ({ ...s, [id]: true }));
  }
}
