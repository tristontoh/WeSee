import { SubscriptionPlan } from '../auth/session.model';

export interface SectorResponse {
  code: string;
  name: string;
}

export interface PlanPricingResponse {
  plan: SubscriptionPlan;
  monthlyPrice: number;
}

export interface MatterResponse {
  id: string;
  name: string;
  category: string;
  description: string;
  matterSet: string;
}

export interface IndicatorDefinitionResponse {
  id: string;
  name: string;
  unit: string;
  matterId: string;
  category: string;
  sectorSpecific: boolean;
  sectorCode: string | null;
}
