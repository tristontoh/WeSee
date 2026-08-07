# M1 — Foundation & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead FastAPI-shaped API layer so the Angular app authenticates against the Spring Boot backend and renders navigation derived from real role and subscription plan.

**Architecture:** A `core/http/` layer (base URL, error normalization, JWT interceptor) plus feature-scoped services — `auth-api.service.ts` for calls, `session.service.ts` for state, `plan-gate.service.ts` for feature gating. Login returns the full user object, so the session hydrates from one response. Nav is derived from `role` + `plan`, replacing the fabricated `org_type`.

**Tech Stack:** Angular 19 (standalone components, signals, functional interceptors), RxJS 7.8, Playwright (E2E), Jasmine/Karma (unit), Spring Boot 3.3.5 backend.

## Global Constraints

- API base URL: `http://localhost:8080/api/v1` — the backend serves nothing useful on `:8000`.
- Angular dev server runs on port **4210**; backend on **8080**.
- All components are `standalone: true` and use `inject()`, never constructor DI — match existing code.
- State is held in Angular **signals**, never `BehaviorSubject` — match existing `auth.service.ts`.
- The backend returns **403, not 401**, for unauthenticated requests. Never branch on 401 alone.
- `Role` has five values: `COMPANY_ADMIN`, `COMPANY_CONTRIBUTOR`, `CONSULTANT`, `PLATFORM_ADMIN`, `SUPERADMIN`.
- `SubscriptionPlan` has three: `STARTER`(1), `GROWTH`(2), `ISSUER_READY`(3).
- Do not add social auth. The backend has none.
- Existing files use 2-space indent and single quotes. Match them.

---

### Task 1: Backend configuration for the Angular origin

The backend allows CORS only from `:3000` and mints verification links pointing there. Both must target `:4210` or every browser call fails preflight.

**Files:**
- Modify: `backend/src/main/resources/application.yml`

**Interfaces:**
- Consumes: nothing
- Produces: backend reachable from `http://localhost:4210`; verification links pointing at `:4210`

- [ ] **Step 1: Confirm the current values fail**

Run:
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS http://localhost:8080/api/v1/auth/login \
  -H 'Origin: http://localhost:4210' \
  -H 'Access-Control-Request-Method: POST'
```
Expected: `403` — origin not allowed.

- [ ] **Step 2: Update both settings**

In `backend/src/main/resources/application.yml`, find the `app:` block containing `base-url` and the `wesee:` block containing `cors`. Set:

```yaml
app:
  base-url: ${APP_BASE_URL:http://localhost:4210}
```

```yaml
wesee:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:4210}
```

If a `wesee.cors.allowed-origins` key does not yet exist, add it under the existing `wesee:` block (the same block holding `jwt:`). `SecurityConfig` reads it via `env.getProperty("wesee.cors.allowed-origins", "http://localhost:3000")`.

- [ ] **Step 3: Restart the backend and verify preflight passes**

Run:
```bash
cd backend && mvn -B spring-boot:run
```
Then in another shell:
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS http://localhost:8080/api/v1/auth/login \
  -H 'Origin: http://localhost:4210' \
  -H 'Access-Control-Request-Method: POST'
```
Expected: `200`

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/application.yml
git commit -m "config: point CORS and verification links at the Angular origin :4210"
```

---

### Task 2: HTTP foundation — base URL, error normalization, JWT interceptor

The interceptor is the single riskiest piece in M1 because of the 403 ambiguity. It gets tests first.

**Files:**
- Create: `frontend/src/app/core/http/api-base.ts`
- Create: `frontend/src/app/core/http/api-error.ts`
- Create: `frontend/src/app/core/http/auth.interceptor.ts`
- Create: `frontend/src/app/core/http/auth.interceptor.spec.ts`
- Modify: `frontend/src/app/app.config.ts`

**Interfaces:**
- Consumes: `SessionService` (Task 3) — but to keep tasks independent, Task 2 defines a minimal `TokenStore` interface the interceptor depends on, which `SessionService` implements in Task 3.
- Produces:
  - `API_BASE: string`
  - `ApiError { status: number; message: string; fieldErrors: Record<string, string> }`
  - `toApiError(err: HttpErrorResponse): ApiError`
  - `authInterceptor: HttpInterceptorFn`
  - `TOKEN_STORE` injection token of type `TokenStore { token(): string; clear(): void }`

- [ ] **Step 1: Write `api-base.ts`**

```typescript
/** Root of the Spring Boot API. The old FastAPI gateway on :8000 no longer exists. */
export const API_BASE = 'http://localhost:8080/api/v1';
```

- [ ] **Step 2: Write `api-error.ts`**

```typescript
import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  status: number;
  message: string;
  /** Per-field messages from Spring's @Valid failures, keyed by field name. */
  fieldErrors: Record<string, string>;
}

/** Normalizes Spring's error bodies into one shape forms and screens can rely on. */
export function toApiError(err: HttpErrorResponse): ApiError {
  if (err.status === 0) {
    return { status: 0, message: 'Could not reach the server.', fieldErrors: {} };
  }

  const body = err.error ?? {};
  const fieldErrors: Record<string, string> = {};

  // Spring validation failures arrive as { errors: [{ field, defaultMessage }] }
  if (Array.isArray(body.errors)) {
    for (const e of body.errors) {
      if (e?.field) fieldErrors[e.field] = e.defaultMessage ?? 'Invalid value';
    }
  }

  return {
    status: err.status,
    message: body.message ?? body.error ?? err.message ?? 'Something went wrong.',
    fieldErrors,
  };
}
```

- [ ] **Step 3: Write the failing interceptor test**

Create `frontend/src/app/core/http/auth.interceptor.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TOKEN_STORE, authInterceptor } from './auth.interceptor';
import { API_BASE } from './api-base';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let cleared: boolean;
  let navigatedTo: string | null;
  let currentToken: string;

  beforeEach(() => {
    cleared = false;
    navigatedTo = null;
    currentToken = '';

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TOKEN_STORE, useValue: { token: () => currentToken, clear: () => (cleared = true) } },
        { provide: Router, useValue: { navigateByUrl: (u: string) => (navigatedTo = u) } },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('attaches a Bearer header when a token exists', () => {
    currentToken = 'abc123';
    http.get(`${API_BASE}/auth/me`).subscribe();
    const req = ctrl.expectOne(`${API_BASE}/auth/me`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('sends no Authorization header when there is no token', () => {
    http.post(`${API_BASE}/auth/login`, {}).subscribe();
    const req = ctrl.expectOne(`${API_BASE}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('treats 403 WITHOUT a token as a dead session and redirects to /login', () => {
    currentToken = '';
    http.get(`${API_BASE}/indicators`).subscribe({ error: () => {} });
    ctrl.expectOne(`${API_BASE}/indicators`).flush(null, { status: 403, statusText: 'Forbidden' });
    expect(cleared).toBe(true);
    expect(navigatedTo).toBe('/login');
  });

  it('treats 403 WITH a token as an authorization refusal and does not redirect', () => {
    currentToken = 'abc123';
    http.get(`${API_BASE}/targets`).subscribe({ error: () => {} });
    ctrl.expectOne(`${API_BASE}/targets`).flush(null, { status: 403, statusText: 'Forbidden' });
    expect(cleared).toBe(false);
    expect(navigatedTo).toBeNull();
  });

  it('treats 401 as a dead session regardless of token', () => {
    currentToken = 'abc123';
    http.get(`${API_BASE}/auth/me`).subscribe({ error: () => {} });
    ctrl.expectOne(`${API_BASE}/auth/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(cleared).toBe(true);
    expect(navigatedTo).toBe('/login');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `Cannot find module './auth.interceptor'` or `TOKEN_STORE is not exported`.

- [ ] **Step 5: Write the interceptor**

Create `frontend/src/app/core/http/auth.interceptor.ts`:

```typescript
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

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

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
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS — 5 specs.

- [ ] **Step 7: Register the interceptor**

Modify `frontend/src/app/app.config.ts` — change the `provideHttpClient` line and add the `TOKEN_STORE` provider:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { TOKEN_STORE, authInterceptor } from './core/http/auth.interceptor';
import { SessionService } from './core/auth/session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: TOKEN_STORE, useExisting: SessionService },
  ],
};
```

This references `SessionService`, created in Task 3. Do Task 3 before building.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/core/http frontend/src/app/app.config.ts
git commit -m "feat(http): add API base, error normalization, and JWT interceptor"
```

---

### Task 3: Session service

Holds auth state as signals and implements `TokenStore`. Replaces `core/auth.service.ts`.

**Files:**
- Create: `frontend/src/app/core/auth/session.service.ts`
- Create: `frontend/src/app/core/auth/session.model.ts`
- Create: `frontend/src/app/core/auth/session.service.spec.ts`

**Interfaces:**
- Consumes: `TokenStore` from Task 2
- Produces:
  - `Role`, `SubscriptionPlan`, `MeResponse`, `AuthResponse`, `LoginResponse` types
  - `SessionService` with signals `token`, `user`, and computed `isLoggedIn`, `role`, `plan`, `companyId`, `navKey`
  - `SessionService.setSession(token, user)`, `.clear()`, `.token()`

- [ ] **Step 1: Write `session.model.ts`**

```typescript
export type Role =
  | 'COMPANY_ADMIN'
  | 'COMPANY_CONTRIBUTOR'
  | 'CONSULTANT'
  | 'PLATFORM_ADMIN'
  | 'SUPERADMIN';

export type SubscriptionPlan = 'STARTER' | 'GROWTH' | 'ISSUER_READY';

/** Mirrors backend PLAN_LEVEL ordering so `atLeast` comparisons match the server. */
export const PLAN_LEVEL: Record<SubscriptionPlan, number> = {
  STARTER: 1,
  GROWTH: 2,
  ISSUER_READY: 3,
};

/** Mirrors com.wesee.esg.auth.dto.MeResponse. */
export interface MeResponse {
  userId: string;
  name: string;
  email: string;
  role: Role;
  companyId: string | null;
  companyName: string | null;
  sectorCode: string | null;
  market: string | null;
  plan: SubscriptionPlan | null;
  onboardingCompleted: boolean;
  frameworks: string[];
  priorities: string[];
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  bio: string | null;
  hasAvatar: boolean;
  mfaSetupRequired: boolean;
}

export interface AuthResponse {
  token: string;
  user: MeResponse;
}

export interface LoginResponse {
  mfaRequired: boolean;
  mfaToken: string | null;
  emailVerificationRequired: boolean;
  auth: AuthResponse | null;
}

export type NavKey = 'workspace' | 'compliance-hub' | 'admin';
```

- [ ] **Step 2: Write the failing session test**

Create `frontend/src/app/core/auth/session.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { MeResponse } from './session.model';

const user = (over: Partial<MeResponse> = {}): MeResponse => ({
  userId: 'u1', name: 'Test', email: 't@wesee.my', role: 'COMPANY_ADMIN',
  companyId: 'c1', companyName: 'Acme', sectorCode: null, market: null,
  plan: 'STARTER', onboardingCompleted: true, frameworks: [], priorities: [],
  phone: null, dateOfBirth: null, address: null, bio: null,
  hasAvatar: false, mfaSetupRequired: false, ...over,
});

describe('SessionService', () => {
  let svc: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(SessionService);
  });

  it('starts logged out', () => {
    expect(svc.isLoggedIn()).toBe(false);
    expect(svc.token()).toBe('');
  });

  it('stores a session and exposes role and plan', () => {
    svc.setSession('tok', user());
    expect(svc.isLoggedIn()).toBe(true);
    expect(svc.token()).toBe('tok');
    expect(svc.role()).toBe('COMPANY_ADMIN');
    expect(svc.plan()).toBe('STARTER');
  });

  it('maps PLATFORM_ADMIN to the admin nav', () => {
    svc.setSession('tok', user({ role: 'PLATFORM_ADMIN', companyId: null, plan: null }));
    expect(svc.navKey()).toBe('admin');
  });

  it('maps SUPERADMIN to the admin nav', () => {
    svc.setSession('tok', user({ role: 'SUPERADMIN', companyId: null, plan: null }));
    expect(svc.navKey()).toBe('admin');
  });

  it('maps an ISSUER_READY company user to the compliance-hub nav', () => {
    svc.setSession('tok', user({ plan: 'ISSUER_READY' }));
    expect(svc.navKey()).toBe('compliance-hub');
  });

  it('maps a STARTER company user to the workspace nav', () => {
    svc.setSession('tok', user({ plan: 'STARTER' }));
    expect(svc.navKey()).toBe('workspace');
  });

  it('maps COMPANY_CONTRIBUTOR and CONSULTANT as company users, not admins', () => {
    svc.setSession('tok', user({ role: 'COMPANY_CONTRIBUTOR', plan: 'GROWTH' }));
    expect(svc.navKey()).toBe('workspace');
    svc.setSession('tok', user({ role: 'CONSULTANT', plan: 'ISSUER_READY' }));
    expect(svc.navKey()).toBe('compliance-hub');
  });

  it('survives a reload by restoring from localStorage', () => {
    svc.setSession('tok', user({ email: 'kept@wesee.my' }));
    const fresh = new SessionService();
    expect(fresh.isLoggedIn()).toBe(true);
    expect(fresh.user()?.email).toBe('kept@wesee.my');
  });

  it('clears everything on logout', () => {
    svc.setSession('tok', user());
    svc.clear();
    expect(svc.isLoggedIn()).toBe(false);
    expect(svc.user()).toBeNull();
    expect(localStorage.getItem('wesee_token')).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `Cannot find module './session.service'`.

- [ ] **Step 4: Write `session.service.ts`**

```typescript
import { Injectable, computed, signal } from '@angular/core';
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
   * Which navigation this session sees. The backend has no tenant-type concept — it has roles
   * and one company type whose features unlock by plan — so the nav is derived, not stored.
   */
  navKey = computed<NavKey>(() => {
    const role = this.role();
    if (role && PLATFORM_ROLES.includes(role)) return 'admin';
    return this.plan() === 'ISSUER_READY' ? 'compliance-hub' : 'workspace';
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS — 9 session specs plus the 5 interceptor specs.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/auth
git commit -m "feat(auth): add session service with role and plan derived navigation"
```

---

### Task 4: Auth API service

**Files:**
- Create: `frontend/src/app/core/auth/auth-api.service.ts`

**Interfaces:**
- Consumes: `API_BASE` (Task 2), session model types (Task 3)
- Produces: `AuthApiService` with `login`, `verifyMfa`, `register`, `verifyEmail`, `resendVerification`, `me`

- [ ] **Step 1: Write the service**

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { AuthResponse, LoginResponse, MeResponse } from './session.model';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  companyName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);

  /** JSON, not form-encoded — the old FastAPI gateway's OAuth2 password flow is gone. */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/auth/login`, { email, password });
  }

  verifyMfa(mfaToken: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/login/verify-mfa`, { mfaToken, code });
  }

  register(body: RegisterRequest): Observable<{ email: string }> {
    return this.http.post<{ email: string }>(`${API_BASE}/auth/register`, body);
  }

  /** Returns 204 No Content on success. */
  verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/auth/verify-email`, { token });
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_BASE}/auth/resend-verification`, { email });
  }

  /** Rehydrates a session after a page reload, when only the stored token survives. */
  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${API_BASE}/auth/me`);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/core/auth/auth-api.service.ts
git commit -m "feat(auth): add auth API service for the Spring Boot contract"
```

---

### Task 5: Plan gate service

**Files:**
- Create: `frontend/src/app/core/plan/plan-gate.service.ts`
- Create: `frontend/src/app/core/plan/plan-gate.service.spec.ts`

**Interfaces:**
- Consumes: `API_BASE`, `SessionService`, `PLAN_LEVEL`
- Produces: `PlanGateService` with `load()`, `state(featureKey): FeatureState`, and `FeatureState = 'visible' | 'locked' | 'hidden'`

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { PlanGateService } from './plan-gate.service';
import { SessionService } from '../auth/session.service';
import { MeResponse, SubscriptionPlan } from '../auth/session.model';

const userWithPlan = (plan: SubscriptionPlan): MeResponse => ({
  userId: 'u1', name: 'T', email: 't@wesee.my', role: 'COMPANY_ADMIN',
  companyId: 'c1', companyName: 'Acme', sectorCode: null, market: null,
  plan, onboardingCompleted: true, frameworks: [], priorities: [],
  phone: null, dateOfBirth: null, address: null, bio: null,
  hasAvatar: false, mfaSetupRequired: false,
});

describe('PlanGateService', () => {
  let gate: PlanGateService;
  let session: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    gate = TestBed.inject(PlanGateService);
    session = TestBed.inject(SessionService);
    gate.setFlagsForTest([
      { featureKey: 'indicators', minPlan: 'STARTER', visibleOnlyAtMinPlan: false },
      { featureKey: 'targets', minPlan: 'GROWTH', visibleOnlyAtMinPlan: false },
      { featureKey: 'assurance-workspace', minPlan: 'ISSUER_READY', visibleOnlyAtMinPlan: true },
    ]);
  });

  it('shows a feature at or above its minimum plan', () => {
    session.setSession('t', userWithPlan('GROWTH'));
    expect(gate.state('indicators')).toBe('visible');
    expect(gate.state('targets')).toBe('visible');
  });

  it('locks an under-plan feature when visibleOnlyAtMinPlan is false', () => {
    session.setSession('t', userWithPlan('STARTER'));
    expect(gate.state('targets')).toBe('locked');
  });

  it('hides an under-plan feature when visibleOnlyAtMinPlan is true', () => {
    session.setSession('t', userWithPlan('STARTER'));
    expect(gate.state('assurance-workspace')).toBe('hidden');
  });

  it('shows an ISSUER_READY feature to an ISSUER_READY plan', () => {
    session.setSession('t', userWithPlan('ISSUER_READY'));
    expect(gate.state('assurance-workspace')).toBe('visible');
  });

  it('defaults unlisted features to visible, mirroring the backend', () => {
    session.setSession('t', userWithPlan('STARTER'));
    expect(gate.state('not-a-real-feature')).toBe('visible');
  });

  it('hides everything when there is no plan (platform admins have no company)', () => {
    expect(gate.state('targets')).toBe('locked');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `Cannot find module './plan-gate.service'`.

- [ ] **Step 3: Write the service**

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { API_BASE } from '../http/api-base';
import { PLAN_LEVEL, SubscriptionPlan } from '../auth/session.model';
import { SessionService } from '../auth/session.service';

export type FeatureState = 'visible' | 'locked' | 'hidden';

export interface FeatureFlag {
  featureKey: string;
  minPlan: SubscriptionPlan;
  /** Display hint only — the backend stores it but never acts on it. */
  visibleOnlyAtMinPlan: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlanGateService {
  private http = inject(HttpClient);
  private session = inject(SessionService);
  private flags = signal<Record<string, FeatureFlag>>({});

  /** Called once after login; the matrix is small and does not change mid-session. */
  load(): void {
    this.http.get<FeatureFlag[]>(`${API_BASE}/reference/feature-flags`).subscribe({
      next: (list) => this.setFlagsForTest(list),
      error: () => this.flags.set({}),
    });
  }

  setFlagsForTest(list: FeatureFlag[]): void {
    this.flags.set(Object.fromEntries(list.map((f) => [f.featureKey, f])));
  }

  /**
   * Mirrors PlanGateService.check() on the backend, plus the visibility hint the backend
   * stores but never reads. Unlisted keys default open, matching the server.
   */
  state(featureKey: string): FeatureState {
    const flag = this.flags()[featureKey];
    if (!flag) return 'visible';

    const plan = this.session.plan();
    const has = plan ? PLAN_LEVEL[plan] >= PLAN_LEVEL[flag.minPlan] : false;
    if (has) return 'visible';
    return flag.visibleOnlyAtMinPlan ? 'hidden' : 'locked';
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS — 6 plan-gate specs.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/core/plan
git commit -m "feat(plan): mirror backend plan gating with hide/lock visibility states"
```

---

### Task 6: Rewire login, guards, and routes; delete the dead API layer

**Files:**
- Modify: `frontend/src/app/screens/auth/login/login.component.ts`
- Modify: `frontend/src/app/core/auth.guard.ts`
- Modify: `frontend/src/app/screens/workspace/dashboard/dashboard.component.ts`
- Modify: `frontend/src/app/core/app-state.service.ts`
- Modify: `frontend/src/app/shell/shell.component.ts`
- Delete: `frontend/src/app/core/api.service.ts`
- Delete: `frontend/src/app/core/auth.service.ts`

**Interfaces:**
- Consumes: `SessionService`, `AuthApiService`, `PlanGateService`, `toApiError`
- Produces: a working login that establishes a real session

- [ ] **Step 1: Rewrite the guards**

Replace the whole of `frontend/src/app/core/auth.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './auth/session.service';

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.isLoggedIn()) return true;
  return router.parseUrl('/login');
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.isLoggedIn()) return true;
  return router.parseUrl('/dashboard');
};
```

- [ ] **Step 2: Rewire the login component's class body**

In `login.component.ts`, replace the imports of `AuthService`/`ApiService` and the entire `LoginComponent` class body. Keep the template exactly as-is except for the two edits in Step 3.

```typescript
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { MeResponse } from '../../../core/auth/session.model';
import { PlanGateService } from '../../../core/plan/plan-gate.service';
import { toApiError } from '../../../core/http/api-error';
```

```typescript
export class LoginComponent {
  private session = inject(SessionService);
  private api = inject(AuthApiService);
  private gate = inject(PlanGateService);
  private router = inject(Router);

  step = signal<Step>('email');
  email = signal('');
  pw = signal('');
  mfaCode = signal('');
  private mfaToken = signal('');
  showPw = signal(false);
  focus = signal<Focus>(null);
  loading = signal(false);
  error = signal('');
  needsVerification = signal(false);

  atEmail = computed(() => this.step() === 'email');
  atPassword = computed(() => this.step() === 'password');
  atMfa = computed(() => this.step() === 'mfa');
  emailBorder = computed(() => (this.focus() === 'email' ? ACTIVE_BORDER : IDLE_BORDER));
  pwBorder = computed(() => (this.focus() === 'pw' ? ACTIVE_BORDER : IDLE_BORDER));
  eyeOpenPath = EYE_OPEN;
  eyeClosedPath = EYE_CLOSED;

  next() {
    this.step.set('password');
    this.focus.set(null);
  }

  back() {
    this.step.set('email');
    this.focus.set(null);
    this.pw.set('');
    this.showPw.set(false);
    this.error.set('');
    this.needsVerification.set(false);
  }

  submit() {
    const email = this.email().trim();
    const pw = this.pw();
    if (!pw || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.needsVerification.set(false);

    this.api.login(email, pw).subscribe({
      next: (res) => {
        if (res.emailVerificationRequired) {
          this.loading.set(false);
          this.needsVerification.set(true);
          this.error.set('Verify your email address before signing in.');
          return;
        }
        if (res.mfaRequired && res.mfaToken) {
          this.loading.set(false);
          this.mfaToken.set(res.mfaToken);
          this.step.set('mfa');
          return;
        }
        if (res.auth) this.establish(res.auth.token, res.auth.user);
      },
      error: (err) => {
        this.loading.set(false);
        const e = toApiError(err);
        this.error.set(
          e.status === 401 || e.status === 400
            ? 'Incorrect email or password.'
            : e.status === 0
              ? 'Could not reach the server. Is the backend running on :8080?'
              : e.message,
        );
      },
    });
  }

  submitMfa() {
    const code = this.mfaCode().trim();
    if (!code || this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    this.api.verifyMfa(this.mfaToken(), code).subscribe({
      next: (auth) => this.establish(auth.token, auth.user),
      error: (err) => {
        this.loading.set(false);
        this.error.set(toApiError(err).status === 0 ? 'Could not reach the server.' : 'That code is not valid.');
      },
    });
  }

  resend() {
    this.api.resendVerification(this.email().trim()).subscribe({
      next: () => this.error.set('Verification email sent. Check the backend console if SMTP is off.'),
      error: () => this.error.set('Could not resend the verification email.'),
    });
  }

  private establish(token: string, user: MeResponse) {
    this.session.setSession(token, user);
    this.gate.load();
    const next = { admin: '/admin/tenants', 'compliance-hub': '/compliance-hub/overview', workspace: '/dashboard' }[
      this.session.navKey()
    ];
    this.router.navigateByUrl('/loading?next=' + encodeURIComponent(next));
  }
}
```

Also widen the `Step` type at the top of the file:

```typescript
type Step = 'email' | 'password' | 'mfa';
```

- [ ] **Step 3: Edit the login template — remove social auth, add the MFA step and signup link**

In the template, delete this entire block (the divider and both social buttons):

```html
          <div style="display:flex;align-items:center;gap:14px;margin:24px 0 18px;">
            <div style="flex:1;height:1px;background:rgba(255,255,255,.18);"></div>
            <span style="font-size:11.5px;color:rgba(255,255,255,.55);letter-spacing:.5px;">OR CONTINUE WITH</span>
            <div style="flex:1;height:1px;background:rgba(255,255,255,.18);"></div>
          </div>
```

together with the `<div style="display:flex;gap:10px;">` block containing the Google and Apple buttons.

Change the "Create an account" paragraph to a real router link:

```html
          <p style="text-align:center;margin:26px 0 0;font-size:13px;color:rgba(255,255,255,.68);"><a routerLink="/register" style="font-weight:600;color:#fff;">Create an account</a></p>
```

Add `RouterLink` to the component's imports:

```typescript
import { RouterLink } from '@angular/router';
```
```typescript
  imports: [CommonModule, RouterLink],
```

Add a resend button inside the existing error box area, immediately after the `*ngIf="error()"` div:

```html
          <button *ngIf="needsVerification()" (click)="resend()" type="button" style="margin-top:10px;width:100%;height:42px;border-radius:11px;cursor:pointer;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);color:#fff;font-size:13.5px;">Resend verification email</button>
```

Add the MFA step as a sibling of the password step, immediately before the closing `</div>` of the frosted card:

```html
        <!-- ================= STEP 3 · MFA ================= -->
        <div *ngIf="atMfa()" style="animation:wsstep .35s cubic-bezier(.2,.8,.2,1) both;">
          <div style="text-align:center;margin-bottom:26px;">
            <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:27px;margin:0;letter-spacing:-.6px;">Two-factor code</h1>
            <p style="margin:9px 0 0;font-size:14px;color:rgba(255,255,255,.82);">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <div style="display:flex;align-items:center;border-radius:13px;padding:0 15px;height:50px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);">
            <input [value]="mfaCode()" (input)="mfaCode.set($any($event.target).value)" (keydown.enter)="submitMfa()" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" style="flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:18px;letter-spacing:6px;text-align:center;height:100%;">
          </div>
          <div *ngIf="error()" style="margin-top:14px;font-size:12.5px;color:#FFD8D2;background:rgba(192,69,59,.2);border:1px solid rgba(255,120,100,.4);padding:10px 13px;border-radius:11px;">{{ error() }}</div>
          <button (click)="submitMfa()" class="hover-lift" style="margin-top:22px;width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.5);cursor:pointer;font-family:'Sora',sans-serif;font-weight:600;font-size:15px;color:#0A0E27;background:linear-gradient(180deg,#ffffff,#E9EEFF);">Verify</button>
        </div>
```

- [ ] **Step 4: Detach the dashboard from the deleted ApiService**

In `dashboard.component.ts`, remove the `ApiService, CarbonOverview` import and the `private api = inject(ApiService)` line. Replace the `carbon` signal and both `this.api.*` call sites so the screen renders from its existing mock (`CAT_BARS`) until M3:

```typescript
  // Live emissions data returns in M3 (indicators + climate). Until then this screen
  // renders from CAT_BARS mock data only.
  private carbon = signal<CarbonOverview | null>(null);
```

Define the type locally so nothing imports the deleted file:

```typescript
interface EmissionRecord {
  id: string; scope: number; activity_type: string; activity_value: number;
  activity_unit: string; tco2e: number; factor_source: string;
  factor_dataset_version: string; confidence: number; ledger_tx_id: string | null;
}
interface CarbonOverview {
  total_tco2e: number; scope1: number; scope2: number; scope3: number;
  target_progress_pct: number; records: EmissionRecord[];
}
```

Delete the `ngOnInit` body that called `this.api.getCarbon()` and the upload handler body that called `this.api.ingestBill(file)`, replacing the latter with:

```typescript
    this.busy.set(false);
```

- [ ] **Step 5: Repoint `app-state.service.ts` and `shell.component.ts`**

In both files, change:

```typescript
import { AuthService } from './auth.service';
```
to
```typescript
import { SessionService } from './auth/session.service';
```
(in `shell.component.ts` the path is `../core/auth/session.service`)

and change every `private auth = inject(AuthService)` to `private auth = inject(SessionService)`.

`AuthService.loggedInEmail()` becomes `SessionService.email()`; `AuthService.logout()` becomes `SessionService.clear()`. Search both files for `loggedInEmail` and `logout(` and update each call site.

In `app-state.service.ts`, replace the URL-sniffing `effect` that sets `tenant` with the derived nav key:

```typescript
  constructor() {
    effect(() => this.tenant.set(this.auth.navKey()));
  }
```

- [ ] **Step 6: Rehydrate the session on app start**

Without this, a stored token is never validated. Every screen in M1 renders from mocks, so no
request is made, so the interceptor never sees a 403 and a stale session persists forever. This
also refreshes user data (plan, role) that may have changed server-side since the last login.

Replace `frontend/src/app/app.component.ts` entirely:

```typescript
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
    // A stored token is only a claim until the server confirms it. On failure the interceptor
    // clears the session and redirects, so no error handling is needed here.
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
```

- [ ] **Step 7: Delete the dead files**

```bash
cd /Users/liltris/Desktop/WeSee
rm frontend/src/app/core/api.service.ts frontend/src/app/core/auth.service.ts
```

- [ ] **Step 8: Verify the build and unit tests**

Run:
```bash
cd frontend && npx ng build --configuration development && npx ng test --watch=false --browsers=ChromeHeadless
```
Expected: build succeeds with no references to `api.service` or `auth.service`; 20 specs pass.

- [ ] **Step 9: Commit**

```bash
git add -A frontend/src/app
git commit -m "feat(auth): wire login to the Spring Boot backend and remove the FastAPI layer"
```

---

### Task 7: Register and verify-email screens

**Files:**
- Create: `frontend/src/app/screens/auth/register/register.component.ts`
- Create: `frontend/src/app/screens/auth/verify-email/verify-email.component.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `AuthApiService`, `toApiError`
- Produces: routes `/register` and `/verify-email`

- [ ] **Step 1: Write the register component**

```typescript
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = "position:relative;width:412px;max-width:calc(100% - 40px);border-radius:28px;padding:40px 38px 34px;background:linear-gradient(155deg,rgba(255,255,255,.24),rgba(255,255,255,.13));backdrop-filter:blur(30px) saturate(140%);border:1px solid rgba(255,255,255,.42);box-shadow:0 30px 80px rgba(5,8,30,.5);";
const FIELD = 'display:flex;align-items:center;border-radius:13px;padding:0 15px;height:50px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);margin-top:6px;';
const INPUT = 'flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14.5px;height:100%;';
const LABEL = 'font-size:12.5px;font-weight:500;color:rgba(255,255,255,.85);display:block;margin-top:14px;';
const BTN = "margin-top:22px;width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.5);cursor:pointer;font-family:'Sora',sans-serif;font-weight:600;font-size:15px;color:#0A0E27;background:linear-gradient(180deg,#ffffff,#E9EEFF);";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="position:relative;width:100%;height:100vh;min-height:660px;overflow:hidden;background:#0A0E27;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Inter Tight',system-ui,sans-serif;">
      <div style="position:absolute;inset:0;background-image:url('assets/bg-mountains.jpeg');background-size:cover;background-position:center;"></div>

      <div [style]="card">
        <div *ngIf="!done()">
          <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:27px;margin:0 0 6px;text-align:center;">Create your account</h1>

          <label [style]="labelStyle">Your name</label>
          <div [style]="fieldStyle"><input [value]="name()" (input)="name.set($any($event.target).value)" [style]="inputStyle" placeholder="Ada Lovelace"></div>

          <label [style]="labelStyle">Company name</label>
          <div [style]="fieldStyle"><input [value]="companyName()" (input)="companyName.set($any($event.target).value)" [style]="inputStyle" placeholder="Acme Sdn Bhd"></div>

          <label [style]="labelStyle">Email</label>
          <div [style]="fieldStyle"><input type="email" [value]="email()" (input)="email.set($any($event.target).value)" [style]="inputStyle" placeholder="you@company.com"></div>

          <label [style]="labelStyle">Password</label>
          <div [style]="fieldStyle"><input type="password" [value]="password()" (input)="password.set($any($event.target).value)" (keydown.enter)="submit()" [style]="inputStyle" placeholder="At least 8 characters"></div>

          <div *ngIf="error()" style="margin-top:14px;font-size:12.5px;color:#FFD8D2;background:rgba(192,69,59,.2);border:1px solid rgba(255,120,100,.4);padding:10px 13px;border-radius:11px;">{{ error() }}</div>

          <button (click)="submit()" [style]="btn" [disabled]="loading()">{{ loading() ? 'Creating…' : 'Create account' }}</button>
          <p style="text-align:center;margin:22px 0 0;font-size:13px;color:rgba(255,255,255,.68);"><a routerLink="/login" style="font-weight:600;color:#fff;">Back to sign in</a></p>
        </div>

        <div *ngIf="done()" style="text-align:center;">
          <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:25px;margin:0 0 10px;">Check your email</h1>
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
```

- [ ] **Step 2: Write the verify-email component**

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../core/auth/auth-api.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="width:100%;height:100vh;background:#0A0E27;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Inter Tight',system-ui,sans-serif;text-align:center;padding:24px;">
      <div style="max-width:420px;">
        <h1 style="font-family:'Sora',sans-serif;font-weight:600;font-size:26px;margin:0 0 12px;">{{ heading() }}</h1>
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
```

- [ ] **Step 3: Add the routes**

In `frontend/src/app/app.routes.ts`, add these two entries immediately after the existing `login` route:

```typescript
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./screens/auth/register/register.component').then((m) => m.RegisterComponent) },
  { path: 'verify-email', loadComponent: () => import('./screens/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent) },
```

`verify-email` deliberately has no `guestGuard` — a logged-in user clicking a verification link should still see the result rather than be bounced to the dashboard.

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/screens/auth frontend/src/app/app.routes.ts
git commit -m "feat(auth): add register and verify-email screens"
```

---

### Task 8: Playwright E2E suite

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/fixtures.ts`
- Create: `frontend/e2e/auth.spec.ts`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: the running app on 4210 and backend on 8080
- Produces: `npm run e2e`

- [ ] **Step 1: Install Playwright**

```bash
cd frontend && npm install --save-dev @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Add the npm script**

In `frontend/package.json`, add to `"scripts"`:

```json
    "e2e": "playwright test"
```

- [ ] **Step 3: Write the config**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4210',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx ng serve --port 4210',
    url: 'http://localhost:4210',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

The backend is **not** started by Playwright — start it separately with `make backend`. A test run
against a stopped backend fails loudly on the first spec, which is the desired signal.

- [ ] **Step 4: Write the fixtures**

```typescript
import { APIRequestContext } from '@playwright/test';

export const API = 'http://localhost:8080/api/v1';

export const SEED_ADMIN = { email: 'platform.admin@wesee.my', password: 'PlatformAdmin#2026' };

/** Unique per run so repeated runs never collide on the unique email constraint. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${process.env['PW_RUN_ID'] ?? Date.now()}@wesee.my`;
}

export async function registerUser(
  request: APIRequestContext,
  email: string,
  password = 'E2ePassw0rd!',
): Promise<void> {
  const res = await request.post(`${API}/auth/register`, {
    data: { name: 'E2E User', email, password, companyName: `E2E Co ${email}` },
  });
  if (!res.ok()) throw new Error(`register failed: ${res.status()} ${await res.text()}`);
}
```

- [ ] **Step 5: Write the specs**

```typescript
import { expect, test } from '@playwright/test';
import { SEED_ADMIN, registerUser, uniqueEmail } from './fixtures';

test('login screen has no social auth and offers signup', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Apple/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Create an account/i })).toBeVisible();
});

test('platform admin signs in and lands on the admin nav', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(SEED_ADMIN.email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill(SEED_ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin\/tenants/, { timeout: 15_000 });
});

test('a wrong password shows an error and stays on login', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(SEED_ADMIN.email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText(/Incorrect email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('an unverified account is told to verify before signing in', async ({ page, request }) => {
  const email = uniqueEmail('unverified');
  await registerUser(request, email);

  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill('E2ePassw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText(/Verify your email address/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend verification/i })).toBeVisible();
});

test('registering shows the check-your-email state', async ({ page }) => {
  const email = uniqueEmail('signup');
  await page.goto('/register');
  await page.locator('input[placeholder="Ada Lovelace"]').fill('E2E User');
  await page.locator('input[placeholder="Acme Sdn Bhd"]').fill(`E2E Co ${email}`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('E2ePassw0rd!');
  await page.getByRole('button', { name: /Create account/i }).click();

  await expect(page.getByText(/Check your email/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(email)).toBeVisible();
});

test('a short password is rejected before any request is sent', async ({ page }) => {
  await page.goto('/register');
  await page.locator('input[placeholder="Ada Lovelace"]').fill('E2E User');
  await page.locator('input[placeholder="Acme Sdn Bhd"]').fill('E2E Co');
  await page.locator('input[type=email]').fill(uniqueEmail('short'));
  await page.locator('input[type=password]').fill('short');
  await page.getByRole('button', { name: /Create account/i }).click();

  await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
});

test('a bad verification token reports failure', async ({ page }) => {
  await page.goto('/verify-email?token=not-a-real-token');
  await expect(page.getByText(/Verification failed/i)).toBeVisible({ timeout: 15_000 });
});

test('a protected route redirects to login when logged out', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('a stale token is cleared and the user is returned to login', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('wesee_token', 'expired.invalid.token');
    localStorage.setItem(
      'wesee_user',
      JSON.stringify({ userId: 'u', name: 'X', email: 'x@wesee.my', role: 'COMPANY_ADMIN', companyId: 'c', plan: 'STARTER' }),
    );
  });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  expect(await page.evaluate(() => localStorage.getItem('wesee_token'))).toBeNull();
});
```

- [ ] **Step 6: Run the suite**

Start the backend first:
```bash
cd backend && mvn -B spring-boot:run
```
Then:
```bash
cd frontend && npm run e2e
```
Expected: 9 passed.

- [ ] **Step 7: Ignore Playwright output in git**

Add to `frontend/.gitignore`:
```
/test-results/
/playwright-report/
/blob-report/
```

- [ ] **Step 8: Commit**

```bash
git add frontend/playwright.config.ts frontend/e2e frontend/package.json frontend/package-lock.json frontend/.gitignore
git commit -m "test(e2e): add Playwright coverage for the auth flows"
```

---

## Verification

After Task 8, all of the following must hold:

```bash
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless   # 20 unit specs pass
cd frontend && npx ng build --configuration development              # builds clean
cd frontend && npm run e2e                                           # 9 E2E specs pass
grep -r "localhost:8000" frontend/src                                # no matches
grep -r "api.service\|core/auth.service" frontend/src                # no matches
```
