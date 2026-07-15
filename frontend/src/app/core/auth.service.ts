import { Injectable, computed, signal } from '@angular/core';

const EMAIL_KEY = 'wesee_login_email';
const TOKEN_KEY = 'wesee_token';
const ORG_TYPE_KEY = 'wesee_org_type';

export type OrgType = 'workspace' | 'compliance-hub' | 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private emailSignal = signal<string>(this.read(EMAIL_KEY));
  private tokenSignal = signal<string>(this.read(TOKEN_KEY));
  private orgTypeSignal = signal<string>(this.read(ORG_TYPE_KEY));

  loggedInEmail = computed(() => this.emailSignal());
  token = computed(() => this.tokenSignal());
  orgType = computed(() => this.orgTypeSignal());
  /** A real session now requires a backend-issued token, not just an email. */
  isLoggedIn = computed(() => !!this.tokenSignal());

  /** Persist a real backend session (called after a successful /auth/login). */
  setSession(email: string, token: string, orgType: string) {
    this.emailSignal.set(email.trim());
    this.tokenSignal.set(token);
    this.orgTypeSignal.set(orgType);
    this.write(EMAIL_KEY, email.trim());
    this.write(TOKEN_KEY, token);
    this.write(ORG_TYPE_KEY, orgType);
  }

  /** Kept for callers that only set an email (legacy/demo paths). */
  login(email: string) {
    this.emailSignal.set(email.trim());
    this.write(EMAIL_KEY, email.trim());
  }

  logout() {
    this.emailSignal.set('');
    this.tokenSignal.set('');
    this.orgTypeSignal.set('');
    this.remove(EMAIL_KEY);
    this.remove(TOKEN_KEY);
    this.remove(ORG_TYPE_KEY);
  }

  private read(key: string): string {
    try {
      return localStorage.getItem(key) || '';
    } catch {
      return '';
    }
  }
  private write(key: string, val: string) {
    try {
      localStorage.setItem(key, val);
    } catch {
      /* localStorage unavailable */
    }
  }
  private remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* localStorage unavailable */
    }
  }
}
