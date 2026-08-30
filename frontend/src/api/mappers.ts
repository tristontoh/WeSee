/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { PlanType } from '../contexts/PlanContext';
import { MatterCategory } from './referenceApi';

export type FrontendMatterCategory = 'Environmental' | 'Social' | 'Governance';

/** The frontend's pre-existing components compare against title-case category strings everywhere. */
export function categoryFromBackend(category: MatterCategory): FrontendMatterCategory {
  switch (category) {
    case 'ENVIRONMENTAL': return 'Environmental';
    case 'SOCIAL': return 'Social';
    case 'GOVERNANCE': return 'Governance';
  }
}

export type BackendSubscriptionPlan = 'STARTER' | 'GROWTH' | 'ISSUER_READY';
export type BackendMarketClassification = 'SME' | 'MAIN_MARKET' | 'ACE_MARKET';
export type FrontendMarket = 'SME' | 'ACE Market' | 'Main Market';

export function planToBackend(plan: PlanType): BackendSubscriptionPlan {
  switch (plan) {
    case 'starter': return 'STARTER';
    case 'growth': return 'GROWTH';
    case 'issuer-ready': return 'ISSUER_READY';
  }
}

export function planFromBackend(plan: BackendSubscriptionPlan): PlanType {
  switch (plan) {
    case 'STARTER': return 'starter';
    case 'GROWTH': return 'growth';
    case 'ISSUER_READY': return 'issuer-ready';
  }
}

export function marketToBackend(market: FrontendMarket): BackendMarketClassification {
  switch (market) {
    case 'SME': return 'SME';
    case 'Main Market': return 'MAIN_MARKET';
    case 'ACE Market': return 'ACE_MARKET';
  }
}

export function marketFromBackend(market: BackendMarketClassification): FrontendMarket {
  switch (market) {
    case 'SME': return 'SME';
    case 'MAIN_MARKET': return 'Main Market';
    case 'ACE_MARKET': return 'ACE Market';
  }
}

/**
 * Maps OnboardingPage.tsx's MALAYSIAN_SECTORS display names to the backend's seeded Sector
 * codes (see backend V12__sector_seed_correction.sql, whose names were corrected to match this
 * list exactly, so this is a straight lookup rather than fuzzy matching).
 */
export const SECTOR_NAME_TO_CODE: Record<string, string> = {
  'Technology & Software Services': 'TECHNOLOGY_SOFTWARE',
  'Manufacturing & Heavy Industry': 'MANUFACTURING',
  'Agriculture & Plantation (Palm Oil)': 'AGRICULTURE_PLANTATION',
  'Construction & Property Development': 'CONSTRUCTION_PROPERTY',
  'Energy & Oil & Gas Utilities': 'ENERGY_OIL_GAS',
  'Financial Services & Banking': 'FINANCIAL_SERVICES',
  'Consumer Products & Retail Services': 'CONSUMER_RETAIL',
  'Healthcare & Pharmaceuticals': 'HEALTHCARE_PHARMA',
};
