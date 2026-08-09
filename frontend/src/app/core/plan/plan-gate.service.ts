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
