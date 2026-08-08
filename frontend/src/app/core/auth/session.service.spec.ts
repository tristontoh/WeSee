import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { MeResponse } from './session.model';

const user = (over: Partial<MeResponse> = {}): MeResponse => ({
  userId: 'u1',
  name: 'Test',
  email: 't@wesee.my',
  role: 'COMPANY_ADMIN',
  companyId: 'c1',
  companyName: 'Acme',
  sectorCode: null,
  market: null,
  plan: 'STARTER',
  onboardingCompleted: true,
  frameworks: [],
  priorities: [],
  phone: null,
  dateOfBirth: null,
  address: null,
  bio: null,
  hasAvatar: false,
  mfaSetupRequired: false,
  ...over,
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
