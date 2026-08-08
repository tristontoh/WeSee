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
 * Attaches the bearer token and decides what an auth failure means.
 *
 * The backend returns 403 — not 401 — for unauthenticated requests, the same status it uses
 * for a plan-gated refusal. The only way to tell them apart is whether we sent a token:
 * no token means the session is gone; a token means the server refused this specific action.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(TOKEN_STORE);
  const router = inject(Router);
  const token = store.token();

  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      const sessionIsDead = err.status === 401 || (err.status === 403 && !token);
      if (sessionIsDead) {
        store.clear();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
