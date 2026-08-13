import { Role } from '../auth/session.model';

export interface UserProfileResponse {
  userId: string;
  name: string;
  email: string;
  role: Role;
  companyName: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  bio: string | null;
}

export interface NotificationPreferencesResponse {
  reportDeadlineReminders: boolean;
  teamActivityAlerts: boolean;
  complianceAlerts: boolean;
  weeklyDigest: boolean;
  updatedAt: string | null;
}

export const NOTIFICATION_FIELDS: { key: keyof NotificationPreferencesResponse; label: string }[] = [
  { key: 'reportDeadlineReminders', label: 'Report deadline reminders' },
  { key: 'teamActivityAlerts', label: 'Team activity alerts' },
  { key: 'complianceAlerts', label: 'Compliance alerts' },
  { key: 'weeklyDigest', label: 'Weekly digest' },
];

export interface SessionResponse {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  current: boolean;
}

export interface ApiTokenResponse {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
}

/** Carries the only copy of the raw token — shown once, never retrievable again. */
export interface CreateApiTokenResponse extends ApiTokenResponse {
  token: string;
}

export const API_SCOPES = ['INDICATORS_READ', 'INDICATORS_WRITE'];

export interface PrivacyConsentResponse {
  marketingConsent: boolean;
  analyticsConsent: boolean;
  consentUpdatedAt: string | null;
}

export type TicketType = 'FEEDBACK' | 'SUPPORT_REQUEST';
export type TicketPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketStatus = 'OPEN' | 'PENDING' | 'CLOSED';

export const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: 'SUPPORT_REQUEST', label: 'Support request' },
  { value: 'FEEDBACK', label: 'Feedback' },
];

export const TICKET_PRIORITIES: TicketPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

export interface SupportTicketResponse {
  id: string;
  type: TicketType;
  subject: string;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  submittedByUserId: string | null;
}

export interface TicketMessageResponse {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderName: string | null;
  senderEmail: string | null;
  senderRole: Role | null;
  message: string;
  createdAt: string;
}
