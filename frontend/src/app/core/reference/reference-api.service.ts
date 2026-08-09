import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import {
  IndicatorDefinitionResponse,
  MatterResponse,
  PlanPricingResponse,
  SectorResponse,
} from './reference.model';

@Injectable({ providedIn: 'root' })
export class ReferenceApiService {
  private http = inject(HttpClient);

  sectors(): Observable<SectorResponse[]> {
    return this.http.get<SectorResponse[]>(`${API_BASE}/reference/sectors`);
  }

  planPricing(): Observable<PlanPricingResponse[]> {
    return this.http.get<PlanPricingResponse[]>(`${API_BASE}/reference/plan-pricing`);
  }

  matters(): Observable<MatterResponse[]> {
    return this.http.get<MatterResponse[]>(`${API_BASE}/reference/matters`);
  }

  /** Narrowed to the company's sector and market — used by M4's materiality screens. */
  applicableMatters(): Observable<MatterResponse[]> {
    return this.http.get<MatterResponse[]>(`${API_BASE}/reference/matters/applicable`);
  }

  indicators(): Observable<IndicatorDefinitionResponse[]> {
    return this.http.get<IndicatorDefinitionResponse[]>(`${API_BASE}/reference/indicators`);
  }

  applicableIndicators(): Observable<IndicatorDefinitionResponse[]> {
    return this.http.get<IndicatorDefinitionResponse[]>(`${API_BASE}/reference/indicators/applicable`);
  }
}
