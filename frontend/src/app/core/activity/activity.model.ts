export type EmissionScope = 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';

export const SCOPES: { value: EmissionScope; label: string }[] = [
  { value: 'SCOPE_1', label: 'Scope 1' },
  { value: 'SCOPE_2', label: 'Scope 2' },
  { value: 'SCOPE_3', label: 'Scope 3' },
];

export interface EmissionFactorResponse {
  id: string;
  name: string;
  scope: EmissionScope;
  activityUnit: string;
  factorValue: number;
  source: string;
  sourceYear: number;
}

export interface EmissionActivityEntryResponse {
  id: string;
  fiscalYear: number;
  emissionFactorId: string;
  emissionFactorName: string;
  quantity: number;
  calculatedTco2e: number;
}
