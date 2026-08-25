import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_ROUTE } from '../nav';
import { MeResponse, NavKey, Role, SubscriptionPlan } from './session.model';
import { TokenStore } from '../http/auth.interceptor';

const TOKEN_KEY = 'wesee_token';
const USER_KEY = 'wesee_user';

/** Roles that administer the platform rather than belong to a company. */
const PLATFORM_ROLES: Role[] = ['PLATFORM_ADMIN', 'SUPERADMIN'];

@Injectable({ providedIn: 'root' })
export class SessionService implements TokenStore {
  private tokenSignal = signal<string>(readString(TOKEN_KEY));
  private userSignal = signal<MeResponse | null>(readJson<MeResponse>(USER_KEY));

  user = computed(() => this.userSignal());
  isLoggedIn = computed(() => !!this.tokenSignal() && !!this.userSignal());
  role = computed<Role | null>(() => this.userSignal()?.role ?? null);
  plan = computed<SubscriptionPlan | null>(() => this.userSignal()?.plan ?? null);
  companyId = computed<string | null>(() => this.userSignal()?.companyId ?? null);
  email = computed<string>(() => this.userSignal()?.email ?? '');

  /**
   * Two setup steps: the account exists once you have signed in, the workspace once
   * onboarding is submitted. Drives the sidebar progress card, which hides at 2 of 2.
   */
  onboardingCompleted = computed(() => this.userSignal()?.onboardingCompleted ?? false);
  setupStepsDone = computed(() => (this.onboardingCompleted() ? 2 : 1));

  /**
   * Which navigation this session sees. The backend has no tenant-type concept — it has roles
   * and one company type whose features unlock by plan — so the nav is derived, not stored.
   */
  navKey = computed<NavKey>(() => {
    const role = this.role();
    if (role && PLATFORM_ROLES.includes(role)) return 'admin';
    return this.plan() === 'ISSUER_READY' ? 'compliance-hub' : 'workspace';
  });

  /**
   * Where a session lands after signing in. A company that has not finished setup starts on
   * onboarding rather than a data screen, because sector and market decide which matters and
   * indicators apply at all. A starting point, not a lock — the nav stays clickable.
   *
   * Platform admins are excluded deliberately: they belong to no company, so their
   * onboardingCompleted is false permanently and they would never reach the admin screens.
   */
  landingRoute = computed<string>(() => {
    const key = this.navKey();
    return key !== 'admin' && !this.onboardingCompleted() ? '/onboarding' : DEFAULT_ROUTE[key];
  });

  /** TokenStore — read by the HTTP interceptor. */
  token(): string {
    return this.tokenSignal();
  }

  setSession(token: string, user: MeResponse) {
    this.tokenSignal.set(token);
    this.userSignal.set(user);
    writeString(TOKEN_KEY, token);
    writeString(USER_KEY, JSON.stringify(user));
  }

  /**
   * Replaces the cached user without touching the token. Used after a plan change or a company
   * switch, both of which alter MeResponse — including `plan`, which drives navigation.
   */
  applyUser(user: MeResponse) {
    this.userSignal.set(user);
    writeString(USER_KEY, JSON.stringify(user));
  }

  clear() {
    this.tokenSignal.set('');
    this.userSignal.set(null);
    remove(TOKEN_KEY);
    remove(USER_KEY);
  }
}

function readString(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeString(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* localStorage unavailable */
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* localStorage unavailable */
  }
}
