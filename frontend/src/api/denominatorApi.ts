/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

/**
 * Mirrors com.wesee.esg.denominator.AnnualFigureKey. Kept as a union rather than fetched, so a
 * typo in a call site is a compile error; the form itself still renders from the catalogue
 * endpoint, which is the server's own list.
 */
export type AnnualFigureKey =
  | 'REVENUE'
  | 'PRODUCTION_OUTPUT'
  | 'RAW_MATERIAL_INPUT'
  | 'RAW_MATERIAL_CONVERTED'
  | 'AVERAGE_HEADCOUNT'
  | 'EMPLOYEE_DEPARTURES'
  | 'FEMALE_HEADCOUNT'
  | 'TOTAL_HOURS_WORKED'
  | 'LOST_TIME_INJURIES'
  | 'TOTAL_TRAINING_HOURS'
  | 'EMPLOYEES_TRAINED_ANTICORRUPTION'
  | 'EMPLOYEES_AWARDED_EQUITY'
  | 'OPERATIONAL_SITES'
  | 'SITES_CLIMATE_RISK_ASSESSED'
  | 'SITES_NEAR_HIGH_CONSERVATION_VALUE'
  | 'TIER1_SUPPLIERS'
  | 'TIER1_SUPPLIERS_ASSESSED'
  | 'RECYCLED_WATER_VOLUME';

export type FigureGroup = 'FINANCIAL' | 'WORKFORCE' | 'SITES_AND_SUPPLIERS' | 'WATER';

export interface FigureCatalogueEntry {
  figureKey: AnnualFigureKey;
  label: string;
  unit: string;
  group: FigureGroup;
  wholeNumber: boolean;
}

export interface AnnualFigure {
  figureKey: AnnualFigureKey;
  label: string;
  fiscalYear: number;
  value: number;
  unit: string;
  sourceNote: string | null;
}

export interface BoardMemberDto {
  id: string;
  fiscalYear: number;
  name: string;
  roleTitle: string | null;
  independent: boolean;
  /** Null means "not stated", which is an answer rather than a gap. */
  gender: string | null;
  appointedAt: string | null;
  resignedAt: string | null;
}

export interface UpsertBoardMember {
  name: string;
  roleTitle?: string | null;
  independent: boolean;
  gender?: string | null;
  appointedAt?: string | null;
  resignedAt?: string | null;
}

export interface BoardMeetingAttendance {
  boardMemberId: string;
  memberName: string;
  attended: boolean;
}

export interface BoardMeetingDto {
  id: string;
  fiscalYear: number;
  heldOn: string;
  kind: string;
  attendance: BoardMeetingAttendance[];
}

export interface ShareCapitalDto {
  fiscalYear: number;
  totalOutstandingShares: number;
  publicHeldShares: number | null;
  bumiputeraHeldShares: number | null;
}

export interface ShareholdingDto {
  id: string;
  fiscalYear: number;
  holderName: string;
  sharesHeld: number;
}

const base = '/api/v1/denominators';

export const denominatorApi = {
  catalogue: () => apiClient.get<FigureCatalogueEntry[]>(`${base}/catalogue`),

  listFigures: (fiscalYear: number) =>
    apiClient.get<AnnualFigure[]>(`${base}/figures/${fiscalYear}`),

  setFigure: (fiscalYear: number, figureKey: AnnualFigureKey, value: number, sourceNote?: string | null) =>
    apiClient.put<AnnualFigure>(`${base}/figures/${fiscalYear}/${figureKey}`, { value, sourceNote }),

  deleteFigure: (fiscalYear: number, figureKey: AnnualFigureKey) =>
    apiClient.delete<void>(`${base}/figures/${fiscalYear}/${figureKey}`),

  listBoardMembers: (fiscalYear: number) =>
    apiClient.get<BoardMemberDto[]>(`${base}/board/members/${fiscalYear}`),

  addBoardMember: (fiscalYear: number, body: UpsertBoardMember) =>
    apiClient.post<BoardMemberDto>(`${base}/board/members/${fiscalYear}`, body),

  updateBoardMember: (fiscalYear: number, memberId: string, body: UpsertBoardMember) =>
    apiClient.put<BoardMemberDto>(`${base}/board/members/${fiscalYear}/${memberId}`, body),

  deleteBoardMember: (memberId: string) =>
    apiClient.delete<void>(`${base}/board/members/${memberId}`),

  listBoardMeetings: (fiscalYear: number) =>
    apiClient.get<BoardMeetingDto[]>(`${base}/board/meetings/${fiscalYear}`),

  addBoardMeeting: (fiscalYear: number, heldOn: string, kind?: string) =>
    apiClient.post<BoardMeetingDto>(`${base}/board/meetings/${fiscalYear}`, { heldOn, kind }),

  updateBoardMeeting: (fiscalYear: number, meetingId: string, heldOn: string, kind?: string) =>
    apiClient.put<BoardMeetingDto>(`${base}/board/meetings/${fiscalYear}/${meetingId}`, { heldOn, kind }),

  deleteBoardMeeting: (meetingId: string) =>
    apiClient.delete<void>(`${base}/board/meetings/${meetingId}`),

  setAttendance: (meetingId: string, memberId: string, attended: boolean) =>
    apiClient.put<void>(`${base}/board/meetings/${meetingId}/attendance/${memberId}`, { attended }),

  getShareCapital: (fiscalYear: number) =>
    apiClient.get<ShareCapitalDto | null>(`${base}/shares/capital/${fiscalYear}`),

  setShareCapital: (
    fiscalYear: number,
    totalOutstandingShares: number,
    publicHeldShares: number | null,
    bumiputeraHeldShares: number | null,
  ) =>
    apiClient.put<ShareCapitalDto>(`${base}/shares/capital/${fiscalYear}`, {
      totalOutstandingShares,
      publicHeldShares,
      bumiputeraHeldShares,
    }),

  listHoldings: (fiscalYear: number) =>
    apiClient.get<ShareholdingDto[]>(`${base}/shares/holdings/${fiscalYear}`),

  addHolding: (fiscalYear: number, holderName: string, sharesHeld: number) =>
    apiClient.post<ShareholdingDto>(`${base}/shares/holdings/${fiscalYear}`, { holderName, sharesHeld }),

  updateHolding: (fiscalYear: number, holdingId: string, holderName: string, sharesHeld: number) =>
    apiClient.put<ShareholdingDto>(`${base}/shares/holdings/${fiscalYear}/${holdingId}`, {
      holderName,
      sharesHeld,
    }),

  topHoldings: (fiscalYear: number, limit: number) =>
    apiClient.get<ShareholdingDto[]>(`${base}/shares/holdings/${fiscalYear}/top/${limit}`),

  deleteHolding: (holdingId: string) =>
    apiClient.delete<void>(`${base}/shares/holdings/${holdingId}`),
};
