import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Minimal contract the interceptor needs, so it does not depend on the whole session. */
export interface TokenStore {
  token(): string;
  clear(): void;
}

export const TOKEN_STORE = new InjectionToken<TokenStore>('TOKEN_STORE');

/**
 * The one endpoint that requires authentication and nothing else — no role, no subscription
 * plan. A 403 here can only mean "not authenticated", which makes it the session probe.
 */
const AUTH_PROBE = '/auth/me';

/**
 * Attaches the bearer token and decides what an auth failure means.
 *
 * The backend returns 403 — never 401 — for every auth failure: missing token, invalid or
 * expired token, and genuine authorization refusal all look identical. So "did we send a
 * token?" is not enough to tell a dead session from a plan-gated endpoint; an expired token
 * sends one and still gets 403.
 *
 * The discriminator is the endpoint. /auth/me is gated on authentication alone, so a 403
 * from it means the session is dead. A 403 from anywhere else, with a token attached, means
 * the server refused that specific action — surface it, do not log the user out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(TOKEN_STORE);
  const router = inject(Router);
  const token = store.token();

  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      const sessionIsDead =
        err.status === 401 || (err.status === 403 && (!token || req.url.includes(AUTH_PROBE)));
      if (sessionIsDead) {
        store.clear();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
