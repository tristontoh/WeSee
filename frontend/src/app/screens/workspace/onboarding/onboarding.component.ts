import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../../core/ui.service';
import { ReferenceApiService } from '../../../core/reference/reference-api.service';
import { SectorResponse } from '../../../core/reference/reference.model';
import { sectorIcon } from '../../../core/reference/sector-icons';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { MARKETS } from '../../../core/company/company.model';
import { toApiError } from '../../../core/http/api-error';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:760px;">
      <div style="margin-bottom:8px;font-size:12px;color:#8A968F;font-weight:600;letter-spacing:.3px;">GET STARTED · STEP 2 OF 2</div>
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Set Up Your Workspace</h1>
      <p style="color:#64726B;margin:0 0 26px;font-size:14px;">Tell us your sector and market so WeSee can narrow the indicators and matters that apply to you.</p>

      <!-- 1 · sector -->
      <div class="glass" style="border-radius:14px;padding:22px;margin-bottom:14px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:3px;">1 · Select your sector</div>
        <div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;">This determines which sector-specific indicators and sustainability matters apply.</div>

        <div *ngIf="loading()" style="color:#8A968F;font-size:13.5px;">Loading sectors…</div>

        <div *ngIf="!loading()" class="grid-collapse" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
          <button *ngFor="let s of sectors()" (click)="selectedSector.set(s.key)" type="button" style="border-radius:11px;padding:14px 12px;cursor:pointer;text-align:left;transition:all .13s;border-width:1.5px;border-style:solid;" [style.border-color]="s.border" [style.background]="s.bg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" [attr.stroke]="s.fg" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:9px;"><path [attr.d]="s.d"></path></svg>
            <div style="font-size:13px;font-weight:600;" [style.color]="s.fg">{{ s.label }}</div>
          </button>
        </div>
      </div>

      <!-- 2 · market -->
      <div class="glass" style="border-radius:14px;padding:22px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:3px;">2 · Select your market</div>
        <div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;">Bursa listing status decides which disclosures are mandatory for you.</div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button *ngFor="let m of markets" (click)="selectedMarket.set(m.value)" type="button"
            [style.border-color]="selectedMarket() === m.value ? '#4C96B3' : '#E5E8E1'"
            [style.background]="selectedMarket() === m.value ? '#E7F0F2' : '#fff'"
            [style.color]="selectedMarket() === m.value ? '#4C96B3' : '#33413A'"
            style="padding:11px 20px;border-radius:11px;border-width:1.5px;border-style:solid;cursor:pointer;font-size:13.5px;font-weight:600;font-family:inherit;">
            {{ m.label }}
          </button>
        </div>

        <div *ngIf="error()" style="margin-top:16px;font-size:12.5px;color:#8C3A2E;background:#FBEAE7;border:1px solid #F0C4BC;padding:10px 13px;border-radius:11px;line-height:1.4;">{{ error() }}</div>

        <div style="display:flex;justify-content:flex-end;margin-top:22px;">
          <button (click)="finish()" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Finish setup' }}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>
        </div>
      </div>
    </div>
  `,
})
export class OnboardingComponent implements OnInit {
  private ui = inject(UiService);
  private router = inject(Router);
  private reference = inject(ReferenceApiService);
  private auth = inject(AuthApiService);
  private session = inject(SessionService);

  markets = MARKETS;
  selectedSector = signal<string>('');
  selectedMarket = signal<string>('');
  loading = signal(false);
  saving = signal(false);
  error = signal('');

  private raw = signal<SectorResponse[]>([]);

  sectors = computed(() =>
    this.raw().map((s) => {
      const active = s.code === this.selectedSector();
      return {
        key: s.code,
        label: s.name,
        d: sectorIcon(s.code),
        border: active ? '#4C96B3' : '#E5E8E1',
        bg: active ? '#E7F0F2' : '#fff',
        fg: active ? '#4C96B3' : '#33413A',
      };
    }),
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.reference.sectors().subscribe({
      next: (list) => {
        this.raw.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  finish() {
    // market is @NotNull on OnboardingRequest, so the backend rejects a blank one.
    if (!this.selectedMarket()) {
      this.error.set('Choose which market your company is listed on.');
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');

    this.auth
      .completeOnboarding({
        market: this.selectedMarket(),
        sectorCode: this.selectedSector() || null,
        frameworks: [],
        priorities: [],
      })
      .subscribe({
        next: (me) => {
          this.session.applyUser(me);
          this.saving.set(false);
          this.ui.showToast('Setup complete.');
          this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(toApiError(err).message);
        },
      });
  }
}
