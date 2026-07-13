import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-loading',
  standalone: true,
  template: `
    <div style="position:relative;width:100%;height:100vh;overflow:hidden;background:radial-gradient(120% 110% at 12% 6%,#dbe9f8 0%,transparent 52%),radial-gradient(120% 120% at 90% 8%,#fbe7d0 0%,transparent 48%),#EDEFEA;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;font-family:'Instrument Sans',system-ui,sans-serif;color:#1A2420;">

      <div style="position:relative;width:112px;height:158px;transform:scale(0.42,0.34);display:flex;align-items:flex-start;justify-content:center;">
        <div style="position:relative;width:140px;height:140px;display:grid;grid-template-columns:repeat(14,1fr);grid-template-rows:repeat(14,1fr);grid-template-areas:'a1 a2 a3 a4 a5 top0 top0 top0 top0 a10 a11 a12 a13 a14' 'b1 b2 b3 top1 top1 top1 top1 top1 top1 top1 top1 b12 b13 b14' 'c1 c2 top2 top2 top2 top2 top2 top2 top2 top2 top2 top2 c13 c14' 'd1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 d14' 'e1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 e14' 'f1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 f14' 'top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4' 'top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4' 'top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4' 'top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4' 'top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4' 'top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4' 'st0 st0 an4 st1 an7 st2 an10 an10 st3 an13 st4 an16 st5 st5' 'an1 an2 an3 an5 an6 an8 an9 an9 an11 an12 an14 an15 an17 an18';animation:loadingUpNDown infinite .5s;">

          <div style="grid-area:top0;background:#1A1A1A;"></div>
          <div style="grid-area:top1;background:#1A1A1A;"></div>
          <div style="grid-area:top2;background:#1A1A1A;"></div>
          <div style="grid-area:top3;background:#1A1A1A;"></div>
          <div style="grid-area:top4;background:#1A1A1A;"></div>
          <div style="grid-area:st0;background:#1A1A1A;"></div>
          <div style="grid-area:st1;background:#1A1A1A;"></div>
          <div style="grid-area:st2;background:#1A1A1A;"></div>
          <div style="grid-area:st3;background:#1A1A1A;"></div>
          <div style="grid-area:st4;background:#1A1A1A;"></div>
          <div style="grid-area:st5;background:#1A1A1A;"></div>

          <div style="grid-area:an1;background:#1A1A1A;animation:loadingFlicker0 infinite .5s;"></div>
          <div style="grid-area:an2;background:transparent;animation:loadingFlicker1 infinite .5s;"></div>
          <div style="grid-area:an3;background:transparent;animation:loadingFlicker1 infinite .5s;"></div>
          <div style="grid-area:an4;background:transparent;animation:loadingFlicker1 infinite .5s;"></div>
          <div style="grid-area:an6;background:#1A1A1A;animation:loadingFlicker0 infinite .5s;"></div>
          <div style="grid-area:an7;background:#1A1A1A;animation:loadingFlicker0 infinite .5s;"></div>
          <div style="grid-area:an8;background:#1A1A1A;animation:loadingFlicker0 infinite .5s;"></div>
          <div style="grid-area:an9;background:transparent;animation:loadingFlicker1 infinite .5s;"></div>
          <div style="grid-area:an10;background:transparent;animation:loadingFlicker1 infinite .5s;"></div>
          <div style="grid-area:an11;background:#1A1A1A;animation:loadingFlicker0 infinite .5s;"></div>
          <div style="grid-area:an12;background:#1A1A1A;animation:loadingFlicker0 infinite .5s;"></div>
          <div style="grid-area:an13;background:#1A1A1A;animation:loadingFlicker0 infinite .5s;"></div>
          <div style="grid-area:an15;background:transparent;animation:loadingFlicker1 infinite .5s;"></div>
          <div style="grid-area:an16;background:transparent;animation:loadingFlicker1 infinite .5s;"></div>
          <div style="grid-area:an17;background:transparent;animation:loadingFlicker1 infinite .5s;"></div>
          <div style="grid-area:an18;background:#1A1A1A;animation:loadingFlicker0 infinite .5s;"></div>

          <div style="position:absolute;top:30px;left:20px;width:20px;height:50px;background:#FBEFE8;"></div>
          <div style="position:absolute;top:40px;left:10px;width:40px;height:30px;background:#FBEFE8;"></div>
          <div style="position:absolute;top:30px;left:80px;width:20px;height:50px;background:#FBEFE8;"></div>
          <div style="position:absolute;top:40px;left:70px;width:40px;height:30px;background:#FBEFE8;"></div>

          <div style="position:absolute;top:50px;left:10px;width:20px;height:20px;background:#2A3AA8;z-index:1;animation:loadingEyes infinite 3s;"></div>
          <div style="position:absolute;top:50px;left:70px;width:20px;height:20px;background:#2A3AA8;z-index:1;animation:loadingEyes infinite 3s;"></div>
        </div>
      </div>

      <div style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:17px;color:#4A5A52;letter-spacing:.2px;">Setting up your workspace…</div>
    </div>
  `,
  styles: [
    `
      @keyframes loadingUpNDown { 0%, 49% { transform: translateY(0px); } 50%, 100% { transform: translateY(-10px); } }
      @keyframes loadingFlicker0 { 0%, 49% { background-color: #1a1a1a; } 50%, 100% { background-color: transparent; } }
      @keyframes loadingFlicker1 { 0%, 49% { background-color: transparent; } 50%, 100% { background-color: #1a1a1a; } }
      @keyframes loadingEyes { 0%, 49% { transform: translateX(0px); } 50%, 99% { transform: translateX(6px); } 100% { transform: translateX(0px); } }
    `,
  ],
})
export class LoadingComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    const next = this.route.snapshot.queryParamMap.get('next') || '/dashboard';
    this.timer = setTimeout(() => this.router.navigateByUrl(next), 700);
  }

  ngOnDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }
}
