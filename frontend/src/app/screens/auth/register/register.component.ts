import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthApiService } from '../../../core/auth/auth-api.service';
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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="position:relative;width:100%;height:100vh;min-height:660px;overflow:hidden;background:#0A0E27;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased;">
      <div style="position:absolute;inset:0;background-image:url('assets/bg-mountains.jpeg');background-size:cover;background-position:center;filter:saturate(106%) contrast(1.04);"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(140% 110% at 50% 42%,transparent 55%,rgba(8,12,28,.32) 100%);"></div>

      <div [style]="card">
        <div *ngIf="!done()">
          <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:27px;margin:0 0 4px;text-align:center;letter-spacing:-.6px;">Create your account</h1>
          <p style="margin:0;text-align:center;font-size:14px;color:rgba(255,255,255,.82);">Start seeing your sustainability, clearly.</p>

          <label [style]="labelStyle">Your name</label>
          <div [style]="fieldStyle"><input [value]="name()" (input)="name.set($any($event.target).value)" [style]="inputStyle" placeholder="Ada Lovelace"></div>

          <label [style]="labelStyle">Company name</label>
          <div [style]="fieldStyle"><input [value]="companyName()" (input)="companyName.set($any($event.target).value)" [style]="inputStyle" placeholder="Acme Sdn Bhd"></div>

          <label [style]="labelStyle">Email</label>
          <div [style]="fieldStyle"><input type="email" [value]="email()" (input)="email.set($any($event.target).value)" [style]="inputStyle" placeholder="you@company.com"></div>

          <label [style]="labelStyle">Password</label>
          <div [style]="fieldStyle"><input type="password" [value]="password()" (input)="password.set($any($event.target).value)" (keydown.enter)="submit()" [style]="inputStyle" placeholder="At least 8 characters"></div>

          <div *ngIf="error()" style="margin-top:14px;font-size:12.5px;color:#FFD8D2;background:rgba(192,69,59,.2);border:1px solid rgba(255,120,100,.4);padding:10px 13px;border-radius:11px;line-height:1.4;">{{ error() }}</div>

          <button (click)="submit()" [style]="btn" [disabled]="loading()">{{ loading() ? 'Creating…' : 'Create account' }}</button>
          <p style="text-align:center;margin:22px 0 0;font-size:13px;color:rgba(255,255,255,.68);"><a routerLink="/login" style="font-weight:600;color:#fff;">Back to sign in</a></p>
        </div>

        <div *ngIf="done()" style="text-align:center;">
          <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:25px;margin:0 0 10px;letter-spacing:-.5px;">Check your email</h1>
          <p style="font-size:14px;color:rgba(255,255,255,.82);line-height:1.6;">We sent a verification link to <strong>{{ email() }}</strong>. Open it to activate your account.</p>
          <p style="font-size:12px;color:rgba(255,255,255,.55);margin-top:16px;line-height:1.5;">No SMTP configured in development? The backend logs the link to its console.</p>
          <p style="margin:22px 0 0;font-size:13px;"><a routerLink="/login" style="font-weight:600;color:#fff;">Back to sign in</a></p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private api = inject(AuthApiService);

  card = CARD;
  fieldStyle = FIELD;
  inputStyle = INPUT;
  labelStyle = LABEL;
  btn = BTN;

  name = signal('');
  companyName = signal('');
  email = signal('');
  password = signal('');
  loading = signal(false);
  error = signal('');
  done = signal(false);

  submit() {
    if (this.loading()) return;
    // Mirrors the backend's @Size(min = 8) so the user is told before a round trip.
    if (this.password().length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.api
      .register({
        name: this.name().trim(),
        companyName: this.companyName().trim(),
        email: this.email().trim(),
        password: this.password(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.done.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          const e = toApiError(err);
          const firstField = Object.values(e.fieldErrors)[0];
          this.error.set(firstField ?? (e.status === 0 ? 'Could not reach the server.' : e.message));
        },
      });
  }
}
