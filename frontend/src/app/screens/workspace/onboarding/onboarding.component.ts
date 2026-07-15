import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../../core/ui.service';
import { SECTORS } from '../../../core/mock-data';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:760px;">
      <div style="margin-bottom:8px;font-size:12px;color:#8A968F;font-weight:600;letter-spacing:.3px;">GET STARTED · STEP 3 OF 3</div>
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Set Up Your Workspace</h1>
      <p style="color:#64726B;margin:0 0 26px;font-size:14px;">Three quick steps and WeSee starts extracting emissions from your documents.</p>

      <!-- SectorSelector -->
      <div class="glass" style="border-radius:14px;padding:22px;margin-bottom:14px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:3px;">1 · Select your sector</div>
        <div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;">We tune extraction models and emission factors to your industry.</div>
        <div class="grid-collapse" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
          <button *ngFor="let s of sectors()" (click)="selectedSector.set(s.key)" style="border-radius:11px;padding:14px 12px;cursor:pointer;text-align:left;transition:all .13s;border-width:1.5px;border-style:solid;" [style.border-color]="s.border" [style.background]="s.bg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" [attr.stroke]="s.fg" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:9px;"><path [attr.d]="s.d"></path></svg>
            <div style="font-size:13px;font-weight:600;" [style.color]="s.fg">{{ s.label }}</div>
          </button>
        </div>
      </div>

      <!-- BuyerLinkForm -->
      <div class="glass" style="border-radius:14px;padding:22px;margin-bottom:14px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:3px;">2 · Connect your buyer</div>
        <div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;">Link to a Compliance Hub buyer to stream verified emissions directly into their ledger.</div>
        <div style="display:flex;gap:10px;">
          <div style="flex:1;display:flex;align-items:center;gap:10px;border:1px solid #D9DDD4;border-radius:10px;padding:11px 14px;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A968F" stroke-width="1.8"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"></path></svg>
            <span style="color:#33413A;font-size:13.5px;font-weight:500;">Sunway Group Bhd</span>
            <span style="margin-left:auto;font-size:11px;color:#4C96B3;background:#E4EEF0;padding:3px 8px;border-radius:12px;font-weight:600;">Invite found</span>
          </div>
          <button (click)="connectBuyer()" class="btn-primary">Connect</button>
        </div>
      </div>

      <!-- BYOTokenSetup -->
      <div class="glass" style="border-radius:14px;padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div><div style="font-size:14px;font-weight:600;margin-bottom:3px;">3 · Bring your own AI key</div><div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;">WeSee uses your Gemini Flash key for extraction — you only pay Google for usage.</div></div>
          <span style="font-size:11px;font-weight:600;color:#D96BA1;background:#F9E6EF;padding:4px 10px;border-radius:12px;">Gemini 2.5 Flash</span>
        </div>
        <div style="display:flex;gap:10px;">
          <div style="flex:1;display:flex;align-items:center;gap:10px;border-radius:10px;padding:11px 14px;border:1px solid;" [style.border-color]="token().border" [style.background]="token().bg">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A968F" stroke-width="1.8"><path d="M21 2l-2 2m-7.6 7.6a5 5 0 11-7 7 5 5 0 017-7zM15 7l4 4"></path></svg>
            <span style="color:#33413A;font-size:13.5px;font-family:'Work Sans',monospace;letter-spacing:.5px;">{{ token().masked }}</span>
            <span style="margin-left:auto;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px;" [style.color]="token().statusFg">{{ token().statusIcon }} {{ token().status }}</span>
          </div>
          <button (click)="validateToken()" class="btn-frost">Validate</button>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:22px;">
          <button (click)="goDashboard()" class="btn-primary">Finish setup<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>
        </div>
      </div>
    </div>
  `,
})
export class OnboardingComponent {
  private ui = inject(UiService);
  private router = inject(Router);

  selectedSector = signal('electronics');
  tokenState = signal<'valid' | 'validating'>('valid');

  sectors = computed(() =>
    SECTORS.map((s) => {
      const active = s.key === this.selectedSector();
      return { ...s, border: active ? '#4C96B3' : '#E5E8E1', bg: active ? '#E7F0F2' : '#fff', fg: active ? '#4C96B3' : '#33413A' };
    }),
  );

  token = computed(() =>
    this.tokenState() === 'validating'
      ? { masked: 'AIza••••••••••••••••3kQ9', status: 'Validating…', statusFg: '#D96BA1', statusIcon: '◌', border: '#CBDCDF', bg: '#EEF4F8' }
      : { masked: 'AIza••••••••••••••••3kQ9', status: 'Valid key', statusFg: '#4C96B3', statusIcon: '✓', border: '#BFD8DD', bg: '#E7F0F2' },
  );

  connectBuyer() {
    this.ui.showToast('Invite sent to Sunway Group Bhd');
  }

  validateToken() {
    this.tokenState.set('validating');
    setTimeout(() => this.tokenState.set('valid'), 1100);
  }

  goDashboard() {
    this.router.navigateByUrl('/dashboard');
  }
}
