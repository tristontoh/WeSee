import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionService } from './core/auth/session.service';
import { AuthApiService } from './core/auth/auth-api.service';
import { PlanGateService } from './core/plan/plan-gate.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
  private session = inject(SessionService);
  private api = inject(AuthApiService);
  private gate = inject(PlanGateService);

  ngOnInit(): void {
    // A stored token is only a claim until the server confirms it. Every M1 screen renders
    // from mocks, so without this no request is ever made and a stale session would persist
    // forever. On failure the interceptor clears the session and redirects.
    if (!this.session.token()) return;
    this.api.me().subscribe({
      next: (user) => {
        this.session.setSession(this.session.token(), user);
        this.gate.load();
      },
      error: () => {},
    });
  }
}
