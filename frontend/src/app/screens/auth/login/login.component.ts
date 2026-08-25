import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { MeResponse } from '../../../core/auth/session.model';
import { PlanGateService } from '../../../core/plan/plan-gate.service';
import { toApiError } from '../../../core/http/api-error';

type Step = 'email' | 'password' | 'mfa';
type Focus = 'email' | 'pw' | null;

const ACTIVE_BORDER = 'rgba(255,255,255,.7)';
const IDLE_BORDER = 'rgba(255,255,255,.18)';
const EYE_OPEN = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z';
const EYE_CLOSED = 'M17.9 17.9A9.8 9.8 0 0112 20c-6.5 0-10-8-10-8a17 17 0 013.2-4.2M9.9 4.2A9.5 9.5 0 0112 4c6.5 0 10 8 10 8a17 17 0 01-2.16 3.19M1 1l22 22';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="position:relative;width:100%;height:100vh;min-height:660px;overflow:hidden;background:#0A0E27;display:flex;align-items:center;justify-content:center;font-size:15px;color:#fff;font-family:'Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased;">

      <!-- background: photographic grade -->
      <div style="position:absolute;inset:0;background-image:url('assets/bg-mountains.jpeg');background-size:cover;background-position:center;filter:saturate(106%) contrast(1.04) brightness(1.01);"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(140% 110% at 50% 42%,transparent 55%,rgba(8,12,28,.32) 100%),linear-gradient(180deg,rgba(8,12,28,.10) 0%,transparent 30%,transparent 68%,rgba(8,12,28,.28) 100%);"></div>

      <!-- ============ FROSTED GLASS CARD ============ -->
      <div style="position:relative;width:412px;max-width:calc(100% - 40px);border-radius:28px;padding:40px 38px 34px;background:linear-gradient(155deg,rgba(255,255,255,.24),rgba(255,255,255,.13));backdrop-filter:blur(30px) saturate(140%);-webkit-backdrop-filter:blur(30px) saturate(140%);border:1px solid rgba(255,255,255,.42);box-shadow:0 30px 80px rgba(5,8,30,.5),inset 0 1px 0 rgba(255,255,255,.28);animation:wsfade .7s cubic-bezier(.2,.8,.2,1) both;">

        <div style="position:absolute;top:0;left:24px;right:24px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);"></div>

        <button *ngIf="atPassword()" (click)="back()" class="hover-frost" style="position:absolute;top:22px;left:22px;width:38px;height:38px;border-radius:11px;cursor:pointer;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;transition:background .15s;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M11 18l-6-6 6-6"></path></svg>
        </button>

        <div style="display:flex;justify-content:center;gap:7px;margin-bottom:20px;">
          <span style="width:22px;height:5px;border-radius:3px;background:#fff;transition:all .25s;"></span>
          <span style="width:22px;height:5px;border-radius:3px;transition:all .25s;" [style.background]="atPassword() ? '#fff' : 'rgba(255,255,255,.28)'"></span>
        </div>

        <!-- ================= STEP 1 · EMAIL ================= -->
        <div *ngIf="atEmail()" style="animation:wsstep .35s cubic-bezier(.2,.8,.2,1) both;">
          <div style="text-align:center;margin-bottom:28px;">
            <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:27px;margin:0;letter-spacing:-.6px;">Welcome to WeSee</h1>
            <p style="margin:9px 0 0;font-size:14px;color:rgba(255,255,255,.82);line-height:1.5;">Sign in to see everything, clearly.</p>
          </div>

          <label style="display:flex;flex-direction:column;gap:7px;">
            <span style="font-size:12.5px;font-weight:500;color:rgba(255,255,255,.85);letter-spacing:.2px;">Email</span>
            <div style="display:flex;align-items:center;gap:11px;border-radius:13px;padding:0 15px;height:50px;background:rgba(255,255,255,.08);border-width:1px;border-style:solid;transition:border-color .18s;position:relative;" [style.border-color]="emailBorder()">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2.5"></rect><path d="M3 7l9 6 9-6"></path></svg>
              <input [value]="email()" (input)="email.set($any($event.target).value)" (keydown.enter)="next()" (focus)="focus.set('email')" (blur)="focus.set(null)" type="email" placeholder="you@email.com" style="flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14.5px;height:100%;">
            </div>
          </label>

          <button (click)="next()" class="hover-lift" style="margin-top:18px;width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.5);cursor:pointer;font-family:'Sora',sans-serif;font-weight:600;font-size:15px;color:#0A0E27;background:linear-gradient(180deg,#ffffff,#E9EEFF);box-shadow:0 10px 26px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;gap:10px;transition:transform .12s,box-shadow .18s;">
            <span>Next</span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0A0E27" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
          </button>

          <p style="text-align:center;margin:26px 0 0;font-size:13px;color:rgba(255,255,255,.68);"><a routerLink="/register" style="font-weight:600;color:#fff;">Create an account</a></p>
        </div>

        <!-- ================= STEP 2 · PASSWORD ================= -->
        <div *ngIf="atPassword()" style="animation:wsstep .35s cubic-bezier(.2,.8,.2,1) both;">
          <div style="text-align:center;margin-bottom:26px;">
            <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:27px;margin:0;letter-spacing:-.6px;">Almost there.</h1>
          </div>

          <label style="display:flex;flex-direction:column;gap:7px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12.5px;font-weight:500;color:rgba(255,255,255,.85);letter-spacing:.2px;">Password</span>
              <a href="#" style="font-size:12px;color:rgba(255,255,255,.65);">Forgot?</a>
            </div>
            <div style="display:flex;align-items:center;gap:11px;border-radius:13px;padding:0 15px;height:50px;background:rgba(255,255,255,.08);border-width:1px;border-style:solid;transition:border-color .18s;" [style.border-color]="pwBorder()">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="1.7"><rect x="5" y="11" width="14" height="10" rx="2.2"></rect><path d="M8 11V8a4 4 0 018 0v3"></path></svg>
              <input [value]="pw()" (input)="pw.set($any($event.target).value)" (keydown.enter)="submit()" (focus)="focus.set('pw')" (blur)="focus.set(null)" [type]="showPw() ? 'text' : 'password'" placeholder="••••••••" style="flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14.5px;height:100%;letter-spacing:1px;">
              <button (click)="showPw.set(!showPw())" type="button" class="hover-eye" style="background:none;border:none;cursor:pointer;padding:4px;display:flex;color:rgba(255,255,255,.65);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path [attr.d]="showPw() ? eyeOpenPath : eyeClosedPath"></path><circle cx="12" cy="12" r="3" [style.display]="showPw() ? 'block' : 'none'"></circle></svg>
              </button>
            </div>
          </label>

          <div *ngIf="error()" style="margin-top:14px;font-size:12.5px;color:#FFD8D2;background:rgba(192,69,59,.2);border:1px solid rgba(255,120,100,.4);padding:10px 13px;border-radius:11px;line-height:1.4;">{{ error() }}</div>

          <button *ngIf="needsVerification()" (click)="resend()" type="button" style="margin-top:10px;width:100%;height:42px;border-radius:11px;cursor:pointer;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);color:#fff;font-size:13.5px;">Resend verification email</button>

          <button (click)="submit()" class="hover-lift" style="margin-top:22px;width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.5);cursor:pointer;font-family:'Sora',sans-serif;font-weight:600;font-size:15px;color:#0A0E27;background:linear-gradient(180deg,#ffffff,#E9EEFF);box-shadow:0 10px 26px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;gap:10px;transition:transform .12s,box-shadow .18s;">
            <svg *ngIf="loading()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0E27" stroke-width="2.4" style="animation:wsspin .8s linear infinite;"><path d="M21 12a9 9 0 11-6.2-8.5"></path></svg>
            <ng-container *ngIf="!loading()"><span>Sign in</span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0A0E27" stroke-width="2.2"><path d="M20 6L9 17l-5-5"></path></svg></ng-container>
          </button>
        </div>

        <!-- ================= STEP 3 · MFA ================= -->
        <div *ngIf="atMfa()" style="animation:wsstep .35s cubic-bezier(.2,.8,.2,1) both;">
          <div style="text-align:center;margin-bottom:26px;">
            <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:27px;margin:0;letter-spacing:-.6px;">Two-factor code</h1>
            <p style="margin:9px 0 0;font-size:14px;color:rgba(255,255,255,.82);line-height:1.5;">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <div style="display:flex;align-items:center;border-radius:13px;padding:0 15px;height:50px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);">
            <input [value]="mfaCode()" (input)="mfaCode.set($any($event.target).value)" (keydown.enter)="submitMfa()" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" style="flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:18px;letter-spacing:6px;text-align:center;height:100%;">
          </div>
          <div *ngIf="error()" style="margin-top:14px;font-size:12.5px;color:#FFD8D2;background:rgba(192,69,59,.2);border:1px solid rgba(255,120,100,.4);padding:10px 13px;border-radius:11px;line-height:1.4;">{{ error() }}</div>
          <button (click)="submitMfa()" class="hover-lift" style="margin-top:22px;width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.5);cursor:pointer;font-family:'Sora',sans-serif;font-weight:600;font-size:15px;color:#0A0E27;background:linear-gradient(180deg,#ffffff,#E9EEFF);box-shadow:0 10px 26px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.9);">Verify</button>
        </div>

      </div>
    </div>
  `,
  styles: [
    `
      @keyframes wsfade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes wsstep { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes wsspin { to { transform: rotate(360deg); } }
      .hover-lift:hover { box-shadow: 0 14px 34px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.9); }
      .hover-lift:active { transform: translateY(1px); }
      .hover-frost:hover { background: rgba(255, 255, 255, 0.16); }
      .hover-frost2:hover { background: rgba(255, 255, 255, 0.18); }
      .hover-eye:hover { color: #fff; }
    `,
  ],
})
export class LoginComponent {
  private session = inject(SessionService);
  private api = inject(AuthApiService);
  private gate = inject(PlanGateService);
  private router = inject(Router);

  step = signal<Step>('email');
  email = signal('');
  pw = signal('');
  mfaCode = signal('');
  private mfaToken = signal('');
  showPw = signal(false);
  focus = signal<Focus>(null);
  loading = signal(false);
  error = signal('');
  needsVerification = signal(false);

  atEmail = computed(() => this.step() === 'email');
  atPassword = computed(() => this.step() === 'password');
  atMfa = computed(() => this.step() === 'mfa');
  emailBorder = computed(() => (this.focus() === 'email' ? ACTIVE_BORDER : IDLE_BORDER));
  pwBorder = computed(() => (this.focus() === 'pw' ? ACTIVE_BORDER : IDLE_BORDER));
  eyeOpenPath = EYE_OPEN;
  eyeClosedPath = EYE_CLOSED;

  next() {
    this.step.set('password');
    this.focus.set(null);
  }

  back() {
    this.step.set('email');
    this.focus.set(null);
    this.pw.set('');
    this.showPw.set(false);
    this.error.set('');
    this.needsVerification.set(false);
  }

  submit() {
    const email = this.email().trim();
    const pw = this.pw();
    if (!pw || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.needsVerification.set(false);

    this.api.login(email, pw).subscribe({
      next: (res) => {
        if (res.emailVerificationRequired) {
          this.loading.set(false);
          this.needsVerification.set(true);
          this.error.set('Verify your email address before signing in.');
          return;
        }
        if (res.mfaRequired && res.mfaToken) {
          this.loading.set(false);
          this.mfaToken.set(res.mfaToken);
          this.step.set('mfa');
          return;
        }
        if (res.auth) this.establish(res.auth.token, res.auth.user);
      },
      error: (err) => {
        this.loading.set(false);
        const e = toApiError(err);
        this.error.set(
          e.status === 401 || e.status === 400
            ? 'Incorrect email or password.'
            : e.status === 0
              ? 'Could not reach the server. Is the backend running on :8080?'
              : e.message,
        );
      },
    });
  }

  submitMfa() {
    const code = this.mfaCode().trim();
    if (!code || this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    this.api.verifyMfa(this.mfaToken(), code).subscribe({
      next: (auth) => this.establish(auth.token, auth.user),
      error: (err) => {
        this.loading.set(false);
        this.error.set(toApiError(err).status === 0 ? 'Could not reach the server.' : 'That code is not valid.');
      },
    });
  }

  resend() {
    this.api.resendVerification(this.email().trim()).subscribe({
      next: () => this.error.set('Verification email sent. Check the backend console if SMTP is off.'),
      error: () => this.error.set('Could not resend the verification email.'),
    });
  }

  private establish(token: string, user: MeResponse) {
    this.session.setSession(token, user);
    this.gate.load();
    // landingRoute is the single source of truth: DEFAULT_ROUTE per nav key — workspace-tier
    // lands on /indicators because /dashboard reads ISSUER_READY-only data — except a company
    // that has not finished setup, which starts on onboarding.
    const next = this.session.landingRoute();
    this.router.navigateByUrl('/loading?next=' + encodeURIComponent(next));
  }
}
