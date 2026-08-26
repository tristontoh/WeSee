/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { referenceApi } from '../api/referenceApi';
import { planFromBackend } from '../api/mappers';

export type PlanType = 'starter' | 'growth' | 'issuer-ready';

interface PlanContextProps {
  plan: PlanType;
  setPlan: (plan: PlanType) => void;
  hasFeature: (featureKey: string) => boolean;
  isFeatureVisible: (featureKey: string) => boolean;
  getFeatureDetails: (featureKey: string) => { name: string; requiredPlan: PlanType; description: string };
}

const PlanContext = createContext<PlanContextProps | undefined>(undefined);

/** Static display copy only — the actual gating rules (minPlan/visibility) are fetched live from
 * the backend's feature_flag table (see ReferenceService.listFeatureFlags), since a Platform
 * Admin can change them via the Plan Management module. These defaults are just the fallback
 * shown before that fetch resolves. */
const FEATURE_REGISTRY: Record<string, { name: string; minPlan: PlanType; description: string }> = {
  'dashboard': { name: 'Dashboard', minPlan: 'starter', description: 'Real-time overview of your sustainability reporting progress.' },
  'materiality': { name: 'Materiality Assessment', minPlan: 'starter', description: 'Identify and prioritize ESG issues most relevant to your business.' },
  'indicators': { name: 'Indicators', minPlan: 'starter', description: 'Track key sustainability metrics and qualitative disclosures.' },
  'reports': { name: 'Reports & Export', minPlan: 'starter', description: 'Export standardized ESG summaries and reports.' },
  'team': { name: 'Team Management', minPlan: 'starter', description: 'Invite and manage team members inside your workspace.' },
  'billing': { name: 'Billing & Plan', minPlan: 'starter', description: 'Manage subscription and billing preferences.' },
  'settings': { name: 'Platform Settings', minPlan: 'starter', description: 'Configure workspace details and reporting cycles.' },

  // Growth Plan Locked Features
  'governance': { name: 'Governance', minPlan: 'growth', description: 'Define board oversight, sustainability policies, and risk management workflows.' },
  'targets': { name: 'Targets', minPlan: 'growth', description: 'Set, monitor, and visualize custom ESG targets and science-based goals.' },

  // Issuer-Ready Plan Hidden Features
  'ifrs-s1-s2': { name: 'IFRS S1/S2', minPlan: 'issuer-ready', description: 'Fully aligned climate-related risks reporting matching global IFRS standards, including Scope 1, 2 & 3 GHG emissions.' },
  'climate-module': { name: 'Climate Module', minPlan: 'issuer-ready', description: 'Scope 1, 2, & 3 Greenhouse Gas (GHG) calculations and analytics.' },
  'assurance-workspace': { name: 'Assurance Workspace', minPlan: 'issuer-ready', description: 'Prepare audit-ready trails and cooperate with external sustainability assurance providers.' },
  'csi-export': { name: 'CSI Export', minPlan: 'issuer-ready', description: 'One-click direct integration and export to Bursa Malaysia’s CSI portal.' }
};

const ISSUER_ONLY_DEFAULTS = ['ifrs-s1-s2', 'climate-module', 'assurance-workspace', 'csi-export'];

interface FeatureFlagState {
  minPlan: PlanType;
  visibleOnlyAtMinPlan: boolean;
}

function defaultFlags(): Record<string, FeatureFlagState> {
  const result: Record<string, FeatureFlagState> = {};
  for (const [key, meta] of Object.entries(FEATURE_REGISTRY)) {
    result[key] = { minPlan: meta.minPlan, visibleOnlyAtMinPlan: ISSUER_ONLY_DEFAULTS.includes(key) };
  }
  return result;
}

const PLAN_LEVELS: Record<PlanType, number> = { starter: 1, growth: 2, 'issuer-ready': 3 };

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Try loading initial plan from local storage to keep state stable, default to 'starter' to showcase locked flows
  const [plan, setPlanState] = useState<PlanType>(() => {
    const saved = localStorage.getItem('wesee_current_plan');
    return (saved as PlanType) || 'starter';
  });

  // Live gating rules from the backend — seeded with the hardcoded defaults so there's no
  // flash-of-wrong-content before the fetch resolves (or if it fails while logged out).
  const [featureFlags, setFeatureFlags] = useState<Record<string, FeatureFlagState>>(defaultFlags);

  useEffect(() => {
    referenceApi.featureFlags()
      .then((flags) => {
        setFeatureFlags((prev) => {
          const next = { ...prev };
          flags.forEach((f) => {
            next[f.featureKey] = { minPlan: planFromBackend(f.minPlan), visibleOnlyAtMinPlan: f.visibleOnlyAtMinPlan };
          });
          return next;
        });
      })
      .catch(() => {
        // Not logged in yet, offline, etc. — keep the fallback defaults.
      });
  }, []);

  const setPlan = (newPlan: PlanType) => {
    setPlanState(newPlan);
    localStorage.setItem('wesee_current_plan', newPlan);
  };

  const hasFeature = (featureKey: string): boolean => {
    const flag = featureFlags[featureKey];
    if (!flag) return true; // Default true for unlisted features

    return PLAN_LEVELS[plan] >= PLAN_LEVELS[flag.minPlan];
  };

  const isFeatureVisible = (featureKey: string): boolean => {
    const flag = featureFlags[featureKey];
    if (!flag) return true;

    // Features flagged "visible only at min plan" disappear entirely below that tier, rather
    // than showing a locked/blurred entry — driven by real per-feature data now instead of a
    // fixed list of keys, so an admin toggling this in Plan Management takes effect live.
    if (!flag.visibleOnlyAtMinPlan) return true;

    return PLAN_LEVELS[plan] >= PLAN_LEVELS[flag.minPlan];
  };

  const getFeatureDetails = (featureKey: string) => {
    const meta = FEATURE_REGISTRY[featureKey];
    const flag = featureFlags[featureKey];
    return {
      name: meta?.name ?? featureKey,
      requiredPlan: flag?.minPlan ?? meta?.minPlan ?? 'starter',
      description: meta?.description ?? '',
    };
  };

  return (
    <PlanContext.Provider value={{ plan, setPlan, hasFeature, isFeatureVisible, getFeatureDetails }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};
