import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import {
  AssessmentDetailResponse,
  AssessmentSummaryResponse,
  CompliancePolicyResponse,
  GovernanceLevelResponse,
  MatterOwnershipResponse,
  OversightLevel,
  PerformanceTargetResponse,
  ScoreInput,
  StakeholderOptionResponse,
  UpsertPerformanceTargetRequest,
} from './esg.model';

/** Materiality is open to every plan. */
@Injectable({ providedIn: 'root' })
export class MaterialityApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/materiality`;

  stakeholderOptions(): Observable<StakeholderOptionResponse[]> {
    return this.http.get<StakeholderOptionResponse[]>(`${this.base}/stakeholder-options`);
  }

  addStakeholder(name: string): Observable<StakeholderOptionResponse> {
    return this.http.post<StakeholderOptionResponse>(`${this.base}/stakeholder-options`, { name });
  }

  toggleStakeholder(id: string, selected: boolean): Observable<StakeholderOptionResponse> {
    return this.http.patch<StakeholderOptionResponse>(`${this.base}/stakeholder-options/${id}`, { selected });
  }

  deleteStakeholder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/stakeholder-options/${id}`);
  }

  assessments(): Observable<AssessmentSummaryResponse[]> {
    return this.http.get<AssessmentSummaryResponse[]>(`${this.base}/assessments`);
  }

  assessment(id: string): Observable<AssessmentDetailResponse> {
    return this.http.get<AssessmentDetailResponse>(`${this.base}/assessments/${id}`);
  }

  createAssessment(
    name: string,
    assessmentDate: string,
    scores: ScoreInput[],
    stakeholderNames: string[],
  ): Observable<AssessmentDetailResponse> {
    return this.http.post<AssessmentDetailResponse>(`${this.base}/assessments`, {
      name,
      assessmentDate,
      scores,
      stakeholderNames,
    });
  }

  /** COMPANY_ADMIN only. */
  validate(id: string): Observable<AssessmentDetailResponse> {
    return this.http.patch<AssessmentDetailResponse>(`${this.base}/assessments/${id}/validate`, {});
  }

  reportUrl(id: string): string {
    return `${this.base}/assessments/${id}/report.pdf`;
  }
}

/** Every endpoint here is behind @planGate.check('governance') — GROWTH or above. */
@Injectable({ providedIn: 'root' })
export class GovernanceApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/governance`;

  structure(): Observable<GovernanceLevelResponse[]> {
    return this.http.get<GovernanceLevelResponse[]>(`${this.base}/structure`);
  }

  setLevel(level: OversightLevel, roleTitle: string, description?: string): Observable<GovernanceLevelResponse> {
    return this.http.put<GovernanceLevelResponse>(`${this.base}/structure/${level}`, {
      roleTitle,
      description: description ?? null,
    });
  }

  ownership(): Observable<MatterOwnershipResponse[]> {
    return this.http.get<MatterOwnershipResponse[]>(`${this.base}/ownership`);
  }

  setOwner(
    matterId: string,
    ownerName: string,
    oversightLevel: OversightLevel,
    notes?: string,
  ): Observable<MatterOwnershipResponse> {
    return this.http.put<MatterOwnershipResponse>(`${this.base}/ownership/${matterId}`, {
      ownerName,
      oversightLevel,
      notes: notes ?? null,
    });
  }

  policies(): Observable<CompliancePolicyResponse[]> {
    return this.http.get<CompliancePolicyResponse[]>(`${this.base}/compliance-policies`);
  }

  addPolicy(name: string, reviewCycleMonths: number, description?: string): Observable<CompliancePolicyResponse> {
    return this.http.post<CompliancePolicyResponse>(`${this.base}/compliance-policies`, {
      name,
      reviewCycleMonths,
      description: description ?? null,
    });
  }

  markReviewed(id: string, documentUrl?: string): Observable<CompliancePolicyResponse> {
    return this.http.patch<CompliancePolicyResponse>(`${this.base}/compliance-policies/${id}/review`, {
      documentUrl: documentUrl ?? null,
    });
  }

  deletePolicy(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/compliance-policies/${id}`);
  }
}

/** Behind @planGate.check('targets') — GROWTH or above. */
@Injectable({ providedIn: 'root' })
export class TargetsApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/targets`;

  list(): Observable<PerformanceTargetResponse[]> {
    return this.http.get<PerformanceTargetResponse[]>(this.base);
  }

  create(body: UpsertPerformanceTargetRequest): Observable<PerformanceTargetResponse> {
    return this.http.post<PerformanceTargetResponse>(this.base, body);
  }

  update(id: string, body: UpsertPerformanceTargetRequest): Observable<PerformanceTargetResponse> {
    return this.http.put<PerformanceTargetResponse>(`${this.base}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
