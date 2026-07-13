import { Component } from '@angular/core';

@Component({
  selector: 'app-plc-overview',
  standalone: true,
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px;">
        <div>
          <div style="font-size:12px;color:#8A968F;font-weight:600;letter-spacing:.3px;margin-bottom:6px;">SUPPLY CHAIN · CONSOLIDATED</div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0;letter-spacing:-.5px;">Carbon Overview</h1>
        </div>
        <!-- PeriodSelector -->
        <div style="display:flex;align-items:center;gap:2px;background:#fff;border:1px solid #D9DDD4;border-radius:10px;padding:4px;">
          <span style="padding:7px 13px;border-radius:7px;font-size:13px;font-weight:600;background:#4C96B3;color:#fff;">Q2 2026</span>
          <span style="padding:7px 13px;font-size:13px;font-weight:500;color:#64726B;cursor:pointer;">Q1 2026</span>
          <span style="padding:7px 13px;font-size:13px;font-weight:500;color:#64726B;cursor:pointer;">FY2025</span>
          <span style="padding:7px 9px;color:#93A099;display:flex;align-items:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path></svg></span>
        </div>
      </div>

      <div class="grid-plc-overview" style="display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:14px;margin-bottom:16px;">
        <!-- CarbonScopeDonut -->
        <div style="background:#3a5f66;color:#fff;border-radius:16px;padding:22px 24px;grid-row:span 2;">
          <div style="font-size:13px;font-weight:600;margin-bottom:2px;color:#EAF1EC;">Scope breakdown</div>
          <div style="font-size:12px;color:#8FA79B;margin-bottom:22px;">Across 38 suppliers</div>
          <div style="display:flex;justify-content:center;margin-bottom:22px;">
            <div style="width:190px;height:190px;border-radius:50%;background:conic-gradient(#A99FDB 0 22%,#8FB8EC 22% 34%,#C9A0DE 34% 100%);display:flex;align-items:center;justify-content:center;">
              <div style="width:120px;height:120px;border-radius:50%;background:#3a5f66;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div style="font-family:'Work Sans',serif;font-size:34px;line-height:1;">12,847</div>
                <div style="font-size:11px;color:#8FA79B;margin-top:4px;">tCO₂e total</div>
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:11px;">
            <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#A99FDB;"></span><span style="font-size:13px;flex:1;color:#C7D2CB;">Scope 1</span><span style="font-family:'Work Sans',monospace;font-size:13px;">2,826</span></div>
            <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#8FB8EC;"></span><span style="font-size:13px;flex:1;color:#C7D2CB;">Scope 2</span><span style="font-family:'Work Sans',monospace;font-size:13px;">1,542</span></div>
            <div style="display:flex;align-items:center;gap:10px;"><span style="width:11px;height:11px;border-radius:3px;background:#C9A0DE;"></span><span style="font-size:13px;flex:1;color:#C7D2CB;">Scope 3</span><span style="font-family:'Work Sans',monospace;font-size:13px;">8,479</span></div>
          </div>
        </div>
        <!-- TotalEmissionsCard -->
        <div class="glass" style="border-radius:16px;padding:22px 24px;">
          <div style="font-size:12.5px;color:#64726B;font-weight:600;margin-bottom:14px;">Total emissions</div>
          <div style="font-family:'Work Sans',serif;font-size:44px;line-height:1;letter-spacing:-1px;">12,847</div>
          <div style="font-size:13px;color:#8A968F;margin-top:4px;">tCO₂e · Q2 2026</div>
          <div style="margin-top:16px;font-size:12.5px;color:#4C96B3;font-weight:600;display:flex;align-items:center;gap:5px;">▼ 4.2% <span style="color:#8A968F;font-weight:500;">vs Q1</span></div>
        </div>
        <!-- CapitalUnlockedCard -->
        <div style="background:linear-gradient(155deg,#9B8FD8,#6E62B8);color:#fff;border:1px solid #6E62B8;border-radius:16px;padding:22px 24px;">
          <div style="font-size:12.5px;color:#EDE8FA;font-weight:600;margin-bottom:14px;">SLL rebate unlocked</div>
          <div style="font-family:'Work Sans',serif;font-size:44px;line-height:1;letter-spacing:-1px;">RM 2.4M</div>
          <div style="font-size:13px;color:#DED4F2;margin-top:4px;">Sustainability-linked loan margin</div>
          <div style="margin-top:16px;font-size:12.5px;color:#fff;font-weight:600;display:flex;align-items:center;gap:5px;">▲ RM 340K <span style="color:#DED4F2;font-weight:500;">this quarter</span></div>
        </div>
        <!-- StatCards -->
        <div class="glass" style="border-radius:16px;padding:20px 22px;">
          <div style="font-size:12.5px;color:#64726B;font-weight:600;margin-bottom:10px;">Verified suppliers</div>
          <div style="font-family:'Work Sans',monospace;font-size:30px;font-weight:600;">31<span style="color:#B4BEB7;font-size:18px;"> / 38</span></div>
          <div style="font-size:12px;color:#4C96B3;margin-top:8px;font-weight:600;">82% of spend covered</div>
        </div>
        <div class="glass" style="border-radius:16px;padding:20px 22px;">
          <div style="font-size:12.5px;color:#64726B;font-weight:600;margin-bottom:10px;">Data assurance</div>
          <div style="font-family:'Work Sans',monospace;font-size:30px;font-weight:600;">89<span style="font-size:18px;">%</span></div>
          <div style="font-size:12px;color:#D96BA1;margin-top:8px;font-weight:600;">11% self-reported</div>
        </div>
      </div>
    </div>
  `,
})
export class PlcOverviewComponent {}
