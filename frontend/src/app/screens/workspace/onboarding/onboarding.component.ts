import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../../core/ui.service';
import { ReferenceApiService } from '../../../core/reference/reference-api.service';
import { SectorResponse } from '../../../core/reference/reference.model';
import { FALLBACK_ICON, sectorDescription, sectorIcon } from '../../../core/reference/sector-icons';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { MARKETS } from '../../../core/company/company.model';
import { toApiError } from '../../../core/http/api-error';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap;max-width:1180px;">
    <div style="flex:1;min-width:420px;max-width:760px;">
      <div style="margin-bottom:10px;font-size:12px;color:#8A968F;font-weight:600;letter-spacing:.3px;">GET STARTED · STEP 2 OF 2</div>

      <!-- step rail -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:22px;height:22px;border-radius:50%;background:#4C96B3;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">✓</span>
          <span style="font-size:12.5px;color:#4A5560;font-weight:600;">Account</span>
        </div>
        <span style="width:36px;height:2px;background:#4C96B3;"></span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:22px;height:22px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;" [style.background]="ready() ? '#4C96B3' : '#A9BFC8'">2</span>
          <span style="font-size:12.5px;color:#1F2530;font-weight:700;">Workspace</span>
        </div>
      </div>

      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Set Up Your Workspace</h1>
      <p style="color:#64726B;margin:0 0 26px;font-size:14px;">Tell us your sector and market so WeSee can narrow the indicators and matters that apply to you.</p>

      <!-- 1 · sector -->
      <div class="glass" style="border-radius:14px;padding:22px;margin-bottom:14px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:3px;">1 · Select your sector</div>
        <div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;">This determines which sector-specific indicators and sustainability matters apply.</div>

        <div *ngIf="loading()" style="color:#8A968F;font-size:13.5px;">Loading sectors…</div>

        <div *ngIf="!loading()" class="grid-collapse" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;">
          <button *ngFor="let s of sectors()" (click)="selectedSector.set(s.key)" type="button" [attr.aria-pressed]="s.active" [attr.data-sector]="s.key"
            style="border-radius:12px;padding:15px 14px;cursor:pointer;text-align:left;transition:all .15s;border-width:1.5px;border-style:solid;font-family:inherit;display:flex;flex-direction:column;"
            [style.border-color]="s.border" [style.background]="s.bg" [style.box-shadow]="s.ring">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
              <span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" [style.background]="s.tileBg">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" [attr.stroke]="s.fg" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="s.d"></path></svg>
              </span>
              <!-- radio mirrors the design's selection affordance, in the app's teal -->
              <span style="width:16px;height:16px;border-radius:50%;border-width:1.5px;border-style:solid;flex-shrink:0;margin-top:3px;" [style.border-color]="s.radioBorder" [style.background]="s.radioBg"></span>
            </div>
            <div style="font-size:13.5px;font-weight:700;margin-top:13px;line-height:1.3;color:#1F2530;">{{ s.label }}</div>
            <div *ngIf="s.desc" style="font-size:12px;color:#8A968F;margin-top:5px;line-height:1.4;">{{ s.desc }}</div>
          </button>
        </div>
      </div>

      <!-- 2 · market -->
      <div class="glass" style="border-radius:14px;padding:22px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:3px;">2 · Select your market</div>
        <div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;">Bursa listing status decides which disclosures are mandatory for you.</div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;">
          <button *ngFor="let m of markets" (click)="selectedMarket.set(m.value)" type="button" [attr.aria-pressed]="selectedMarket() === m.value" [attr.data-market]="m.value"
            [style.border-color]="selectedMarket() === m.value ? '#4C96B3' : '#E5E8E1'"
            [style.background]="selectedMarket() === m.value ? '#E7F0F2' : '#fff'"
            [style.box-shadow]="selectedMarket() === m.value ? '0 0 0 3px rgba(76,150,179,.12)' : 'none'"
            style="padding:15px 14px;border-radius:12px;border-width:1.5px;border-style:solid;cursor:pointer;font-family:inherit;text-align:left;transition:all .15s;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px;">
              <span style="font-size:14px;font-weight:700;color:#1F2530;">{{ m.label }}</span>
              <span style="width:16px;height:16px;border-radius:50%;border-width:1.5px;border-style:solid;flex-shrink:0;"
                [style.border-color]="selectedMarket() === m.value ? '#4C96B3' : '#D5D8DD'"
                [style.background]="selectedMarket() === m.value ? '#4C96B3' : 'transparent'"></span>
            </div>
            <div style="font-size:12px;color:#8A968F;line-height:1.4;">{{ m.desc }}</div>
          </button>
        </div>

        <div *ngIf="error()" style="margin-top:16px;font-size:12.5px;color:#8C3A2E;background:#FBEAE7;border:1px solid #F0C4BC;padding:10px 13px;border-radius:11px;line-height:1.4;">{{ error() }}</div>

        <div style="display:flex;justify-content:flex-end;margin-top:22px;">
          <button (click)="finish()" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Finish setup' }}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>
        </div>
      </div>
    </div>

    <!-- summary -->
    <div style="width:300px;flex-shrink:0;flex-grow:1;max-width:320px;position:sticky;top:24px;" data-setup-summary>
      <div class="glass" style="border-radius:14px;padding:20px 20px 18px;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.3px;color:#1F2530;margin-bottom:16px;">Your setup so far</div>

        <div style="display:flex;gap:12px;align-items:flex-start;padding-bottom:15px;border-bottom:1px solid #F0F1F3;margin-bottom:15px;">
          <span style="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" [style.background]="chosenSector() ? '#D9E9EF' : '#F3F5F1'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" [attr.stroke]="chosenSector() ? '#4C96B3' : '#B0B8B3'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="chosenSector()?.d || fallbackIcon"></path></svg>
          </span>
          <div style="min-width:0;">
            <div style="font-size:10.5px;letter-spacing:.8px;color:#9AA0AA;font-weight:700;margin-bottom:3px;">SECTOR</div>
            <div style="font-size:13px;font-weight:600;line-height:1.35;" [style.color]="chosenSector() ? '#1F2530' : '#9AA0AA'">{{ chosenSector()?.label || 'Not selected yet' }}</div>
          </div>
        </div>

        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:18px;">
          <span style="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0;"
            [style.background]="chosenMarket() ? '#D9E9EF' : '#F3F5F1'" [style.color]="chosenMarket() ? '#4C96B3' : '#B0B8B3'">M</span>
          <div style="min-width:0;">
            <div style="font-size:10.5px;letter-spacing:.8px;color:#9AA0AA;font-weight:700;margin-bottom:3px;">MARKET</div>
            <div style="font-size:13px;font-weight:600;line-height:1.35;" [style.color]="chosenMarket() ? '#1F2530' : '#9AA0AA'">{{ chosenMarket()?.label || 'Not selected yet' }}</div>
          </div>
        </div>

        <div style="font-size:10.5px;letter-spacing:.8px;color:#9AA0AA;font-weight:700;margin-bottom:10px;">WHAT HAPPENS NEXT</div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          <div *ngFor="let n of nextUp" style="display:flex;gap:9px;font-size:12.5px;color:#4A5560;line-height:1.45;">
            <span style="color:#4C96B3;font-weight:700;">·</span>{{ n }}
          </div>
        </div>
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
        desc: sectorDescription(s.code),
        d: sectorIcon(s.code),
        active,
        border: active ? '#4C96B3' : '#E5E8E1',
        bg: active ? '#E7F0F2' : '#fff',
        fg: active ? '#4C96B3' : '#5B8FA8',
        tileBg: active ? '#D9E9EF' : '#F3F5F1',
        ring: active ? '0 0 0 3px rgba(76,150,179,.12)' : 'none',
        radioBorder: active ? '#4C96B3' : '#D5D8DD',
        radioBg: active ? '#4C96B3' : 'transparent',
      };
    }),
  );

  fallbackIcon = FALLBACK_ICON;

  nextUp = [
    'Indicators and materiality matters are filtered to your sector.',
    "Mandatory disclosures are set by your market's listing rules.",
    'You can change either setting later from Settings.',
  ];

  chosenSector = computed(() => this.sectors().find((s) => s.active) ?? null);
  chosenMarket = computed(() => MARKETS.find((m) => m.value === this.selectedMarket()) ?? null);
  /** Market is the only required field, so it alone decides whether step 2 reads as done. */
  ready = computed(() => !!this.selectedMarket());

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
