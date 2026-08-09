import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../core/auth/auth-api.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="width:100%;height:100vh;background:#0A0E27;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Inter Tight',system-ui,sans-serif;text-align:center;padding:24px;-webkit-font-smoothing:antialiased;">
      <div style="max-width:420px;">
        <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:26px;margin:0 0 12px;letter-spacing:-.5px;">{{ heading() }}</h1>
        <p style="font-size:14px;color:rgba(255,255,255,.8);line-height:1.6;">{{ detail() }}</p>
        <p *ngIf="state() !== 'pending'" style="margin-top:26px;"><a routerLink="/login" style="font-weight:600;color:#fff;font-size:14px;">Go to sign in</a></p>
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private api = inject(AuthApiService);
  private route = inject(ActivatedRoute);

  state = signal<'pending' | 'ok' | 'failed'>('pending');
  heading = signal('Verifying your email…');
  detail = signal('One moment.');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.fail('That link is missing its verification token.');
      return;
    }
    this.api.verifyEmail(token).subscribe({
      next: () => {
        this.state.set('ok');
        this.heading.set('Email verified');
        this.detail.set('Your account is active. You can sign in now.');
      },
      error: () => this.fail('That link is invalid or has already been used.'),
    });
  }

  private fail(msg: string) {
    this.state.set('failed');
    this.heading.set('Verification failed');
    this.detail.set(msg);
  }
}
