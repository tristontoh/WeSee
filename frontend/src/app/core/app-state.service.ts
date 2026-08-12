import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { NAV, NavItem, SCREEN_TITLES, TenantKey } from './nav';
import { TENANT_META, initialsOf } from './tenant-meta';
import { SessionService } from './auth/session.service';
import { PlanGateService } from './plan/plan-gate.service';

const USERNAME_KEY = 'wesee_username';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private router = inject(Router);
  private auth = inject(SessionService);
  private gate = inject(PlanGateService);

  /** Independent client state, but kept in sync with the route below — /settings is the
   * one route reachable from any tenant, so it deliberately leaves `tenant` untouched. */
  tenant = signal<TenantKey>('workspace');
  private usernameOverride = signal<string>(this.readUsername());

  currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: '/' },
  );

  constructor() {
    // Derived from the session, not from the URL: the backend decides what this user may
    // see via role and subscription plan, so the nav follows that rather than the route.
    effect(() => this.tenant.set(this.auth.navKey()));
  }

  meta = computed(() => TENANT_META[this.tenant()]);

  /** Real company from the session; falls back to the tenant blurb for platform admins,
   * who belong to no company. */
  companyName = computed(() => this.auth.user()?.companyName || this.meta().sub);

  /** Tenant's placeholder user, overridden by whatever email was used to log in. */
  private baseUser = computed(() => {
    const email = this.auth.email();
    const fallback = this.meta().user;
    if (!email) return fallback;
    const localPart = email.split('@')[0] || '';
    const words = localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    const derivedName = words.length ? words.join(' ') : 'User';
    const initials = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : derivedName.slice(0, 2).toUpperCase();
    return { name: derivedName, initials, email };
  });

  displayName = computed(() => this.usernameOverride() || this.baseUser().name);
  initials = computed(() => initialsOf(this.displayName()));
  user = computed(() => ({ ...this.baseUser(), name: this.displayName(), initials: this.initials() }));

  /**
   * True when the backend marks a feature visibleOnlyAtMinPlan=false and this company's plan
   * is below its minimum — shown deliberately, but not usable yet.
   */
  isLocked(item: NavItem): boolean {
    return !!item.feature && this.gate.state(item.feature) === 'locked';
  }

  navItems = computed(() => {
    const isAdmin = this.auth.role() === 'COMPANY_ADMIN';
    // Group is entirely COMPANY_ADMIN-gated on the backend, including its list endpoint,
    // so hide it rather than render a section that will 403. Feature-gated items follow the
    // backend's own plan matrix for the same reason.
    return NAV[this.tenant()].filter(
      (n) => (!n.adminOnly || isAdmin) && (!n.feature || this.gate.state(n.feature) !== 'hidden'),
    );
  });
  screenTitle = computed(() => SCREEN_TITLES[this.currentUrl()] ?? '');

  setUsername(v: string) {
    const trimmed = v.trim();
    try {
      if (trimmed) localStorage.setItem(USERNAME_KEY, trimmed);
      else localStorage.removeItem(USERNAME_KEY);
    } catch {
      /* localStorage unavailable */
    }
    this.usernameOverride.set(trimmed);
  }

  private readUsername(): string {
    try {
      return localStorage.getItem(USERNAME_KEY) || '';
    } catch {
      return '';
    }
  }
}
