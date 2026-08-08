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
