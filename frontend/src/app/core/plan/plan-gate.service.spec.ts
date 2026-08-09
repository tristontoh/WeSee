import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlanGateService } from './plan-gate.service';
import { SessionService } from '../auth/session.service';
import { MeResponse, SubscriptionPlan } from '../auth/session.model';

const userWithPlan = (plan: SubscriptionPlan): MeResponse => ({
  userId: 'u1',
  name: 'T',
  email: 't@wesee.my',
  role: 'COMPANY_ADMIN',
  companyId: 'c1',
  companyName: 'Acme',
  sectorCode: null,
  market: null,
  plan,
  onboardingCompleted: true,
  frameworks: [],
  priorities: [],
  phone: null,
  dateOfBirth: null,
  address: null,
  bio: null,
  hasAvatar: false,
  mfaSetupRequired: false,
});

describe('PlanGateService', () => {
  let gate: PlanGateService;
  let session: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
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

  it('locks gated features when there is no plan (platform admins have no company)', () => {
    expect(gate.state('targets')).toBe('locked');
  });
});
