import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { DEFAULT_ROUTE, NAV, SCREEN_TITLES, TenantKey } from './nav';
import { TENANT_META, initialsOf } from './tenant-meta';
import { AuthService } from './auth.service';

const USERNAME_KEY = 'wesee_username';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private router = inject(Router);
  private auth = inject(AuthService);

  /** Independent client state, but kept in sync with the route below — /settings is the
   * one route reachable from any tenant, so it deliberately leaves `tenant` untouched. */
  tenant = signal<TenantKey>('sme');
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
    effect(() => {
      const url = this.currentUrl();
      if (url.startsWith('/plc')) this.tenant.set('plc');
      else if (url.startsWith('/admin')) this.tenant.set('admin');
      else if (url !== '/settings') this.tenant.set('sme');
    });
  }

  meta = computed(() => TENANT_META[this.tenant()]);

  /** Tenant's placeholder user, overridden by whatever email was used to log in. */
  private baseUser = computed(() => {
    const email = this.auth.loggedInEmail();
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

  navItems = computed(() => NAV[this.tenant()]);
  screenTitle = computed(() => SCREEN_TITLES[this.currentUrl()] ?? '');

  setTenant(t: TenantKey) {
    this.tenant.set(t);
    this.router.navigateByUrl(DEFAULT_ROUTE[t]);
  }

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
