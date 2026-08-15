import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { InvitePreviewResponse } from '../../../core/auth/session.model';
import { SessionService } from '../../../core/auth/session.service';
import { PlanGateService } from '../../../core/plan/plan-gate.service';
import { DEFAULT_ROUTE } from '../../../core/nav';
import { toApiError } from '../../../core/http/api-error';

const CARD =
  "position:relative;width:412px;max-width:calc(100% - 40px);border-radius:28px;padding:40px 38px 34px;background:linear-gradient(155deg,rgba(255,255,255,.24),rgba(255,255,255,.13));backdrop-filter:blur(30px) saturate(140%);-webkit-backdrop-filter:blur(30px) saturate(140%);border:1px solid rgba(255,255,255,.42);box-shadow:0 30px 80px rgba(5,8,30,.5),inset 0 1px 0 rgba(255,255,255,.28);";
const FIELD =
  'display:flex;align-items:center;border-radius:13px;padding:0 15px;height:50px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);margin-top:6px;';
const INPUT = 'flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14.5px;height:100%;';
const LABEL = 'font-size:12.5px;font-weight:500;color:rgba(255,255,255,.85);display:block;margin-top:14px;';
const BTN =
  "margin-top:22px;width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.5);cursor:pointer;font-family:'Sora',sans-serif;font-weight:600;font-size:15px;color:#0A0E27;background:linear-gradient(180deg,#ffffff,#E9EEFF);box-shadow:0 10px 26px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.9);";

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="position:relative;width:100%;height:100vh;min-height:660px;overflow:hidden;background:#0A0E27;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased;">
      <div style="position:absolute;inset:0;background-image:url('assets/bg-mountains.jpeg');background-size:cover;background-position:center;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(140% 110% at 50% 42%,transparent 55%,rgba(8,12,28,.32) 100%);"></div>

      <div [style]="card">
        <div *ngIf="state() === 'loading'" style="text-align:center;">
          <p style="font-size:14px;color:rgba(255,255,255,.82);margin:0;">Checking your invitation…</p>
        </div>

        <div *ngIf="state() === 'invalid'" style="text-align:center;">
          <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:25px;margin:0 0 10px;letter-spacing:-.5px;">Invitation not valid</h1>
          <p style="font-size:14px;color:rgba(255,255,255,.82);line-height:1.6;">{{ error() || 'This link has expired or has already been used.' }}</p>
          <p style="margin:22px 0 0;font-size:13px;"><a routerLink="/login" style="font-weight:600;color:#fff;">Go to sign in</a></p>
        </div>

        <div *ngIf="state() === 'ready'">
          <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:26px;margin:0 0 6px;text-align:center;letter-spacing:-.5px;">Join {{ invite()!.companyName }}</h1>
          <p style="margin:0;text-align:center;font-size:14px;color:rgba(255,255,255,.82);line-height:1.5;">
            <span *ngIf="invite()!.invitedByName">{{ invite()!.invitedByName }} invited you</span>
            <span *ngIf="!invite()!.invitedByName">You were invited</span>
            as {{ roleLabel(invite()!.role) }}.
          </p>

          <label [style]="labelStyle">Email</label>
          <div [style]="fieldStyle"><input [value]="invite()!.email" disabled [style]="inputStyle" style="opacity:.7;"></div>

          <label [style]="labelStyle">Your name</label>
          <div [style]="fieldStyle"><input #nm [value]="invite()!.name || ''" [style]="inputStyle" placeholder="Ada Lovelace"></div>

          <label [style]="labelStyle">Choose a password</label>
          <div [style]="fieldStyle"><input #pw type="password" (keydown.enter)="accept(nm.value, pw.value)" [style]="inputStyle" placeholder="At least 8 characters"></div>

          <div *ngIf="error()" style="margin-top:14px;font-size:12.5px;color:#FFD8D2;background:rgba(192,69,59,.2);border:1px solid rgba(255,120,100,.4);padding:10px 13px;border-radius:11px;line-height:1.4;">{{ error() }}</div>

          <button (click)="accept(nm.value, pw.value)" [style]="btn" [disabled]="busy()">{{ busy() ? 'Joining…' : 'Join ' + invite()!.companyName }}</button>
        </div>
      </div>
    </div>
  `,
})
export class AcceptInviteComponent implements OnInit {
  private api = inject(AuthApiService);
  private session = inject(SessionService);
  private gate = inject(PlanGateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  card = CARD;
  fieldStyle = FIELD;
  inputStyle = INPUT;
  labelStyle = LABEL;
  btn = BTN;

  state = signal<'loading' | 'ready' | 'invalid'>('loading');
  invite = signal<InvitePreviewResponse | null>(null);
  busy = signal(false);
  error = signal('');

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.state.set('invalid');
      this.error.set('That link is missing its invitation token.');
      return;
    }
    // Preview does not consume the invite, so a refresh is harmless.
    this.api.previewInvite(this.token).subscribe({
      next: (i) => {
        this.invite.set(i);
        this.state.set('ready');
      },
      error: (err) => {
        this.state.set('invalid');
        const e = toApiError(err);
        if (e.status !== 404) this.error.set(e.message);
      },
    });
  }

  roleLabel(role: string): string {
    return role
      .replace('COMPANY_', '')
      .replace('_', ' ')
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());
  }

  accept(name: string, password: string) {
    if (!name.trim()) {
      this.error.set('Enter your name.');
      return;
    }
    if (password.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');

    this.api.acceptInvite(this.token, name.trim(), password).subscribe({
      next: (auth) => {
        // Accepting signs the member straight in — no separate email verification step.
        this.session.setSession(auth.token, auth.user);
        this.gate.load();
        this.busy.set(false);
        this.router.navigateByUrl(DEFAULT_ROUTE[this.session.navKey()]);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }
}
