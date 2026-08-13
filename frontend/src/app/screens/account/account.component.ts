import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AccountApiService } from '../../core/account/account-api.service';
import {
  API_SCOPES,
  ApiTokenResponse,
  NOTIFICATION_FIELDS,
  NotificationPreferencesResponse,
  PrivacyConsentResponse,
  SessionResponse,
  SupportTicketResponse,
  TICKET_PRIORITIES,
  TICKET_TYPES,
  TicketPriority,
  TicketType,
  UserProfileResponse,
} from '../../core/account/account.model';
import { SessionService } from '../../core/auth/session.service';
import { UiService } from '../../core/ui.service';
import { toApiError } from '../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:38px;border-radius:9px;border:1px solid #E5E8E1;padding:0 11px;font-family:inherit;font-size:13.5px;background:#fff;width:100%;';
const BTN = 'height:38px;padding:0 16px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:880px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Account</h1>
      <p style="color:#64726B;margin:0 0 20px;font-size:14px;">Your profile, security, notifications and data.</p>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <!-- one-time API token -->
      <div *ngIf="newToken()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="font-weight:600;font-size:13.5px;margin-bottom:5px;">API token created</div>
        <div style="font-size:12.5px;color:#7A6A3A;margin-bottom:11px;">Copy it now — this is the only time it is shown.</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <code style="flex:1;background:#fff;border:1px solid #EADFC0;border-radius:9px;padding:10px 12px;font-size:12.5px;overflow-x:auto;white-space:nowrap;">{{ newToken() }}</code>
          <button (click)="newToken.set(null)" style="height:38px;padding:0 14px;border-radius:9px;border:1px solid #EADFC0;background:#fff;cursor:pointer;font-family:inherit;font-size:13px;">Done</button>
        </div>
      </div>

      <!-- profile -->
      <div [style]="card">
        <div [style]="h">PROFILE</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <input #nm [value]="profile()?.name || ''" placeholder="Full name" [style]="input">
          <input [value]="profile()?.email || ''" disabled [style]="input" style="background:#F6F7F4;">
          <input #jt [value]="profile()?.jobTitle || ''" placeholder="Job title" [style]="input">
          <input #dept [value]="profile()?.department || ''" placeholder="Department" [style]="input">
          <input #ph [value]="profile()?.phone || ''" placeholder="Phone" [style]="input">
        </div>
        <button (click)="saveProfile(nm.value, jt.value, dept.value, ph.value)" [style]="btn" style="margin-top:14px;">Save profile</button>
      </div>

      <!-- password -->
      <div [style]="card">
        <div [style]="h">PASSWORD</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <input #cur type="password" placeholder="Current password" [style]="input">
          <input #nw type="password" placeholder="New password (min 8)" [style]="input">
        </div>
        <button (click)="changePassword(cur.value, nw.value); cur.value = ''; nw.value = ''" [style]="btn" style="margin-top:14px;">Change password</button>
      </div>

      <!-- notifications -->
      <div [style]="card">
        <div [style]="h">NOTIFICATIONS</div>
        <div *ngFor="let f of notificationFields" style="display:flex;align-items:center;gap:12px;padding:8px 0;">
          <span style="flex:1;font-size:13.5px;">{{ f.label }}</span>
          <select (change)="setNotification(f.key, $any($event.target).value)" [style]="input" style="width:100px;">
            <option value="true" [selected]="notifValue(f.key)">On</option>
            <option value="false" [selected]="!notifValue(f.key)">Off</option>
          </select>
        </div>
        <button (click)="saveNotifications()" [style]="btn" style="margin-top:10px;">Save notifications</button>
      </div>

      <!-- sessions -->
      <div [style]="card">
        <div [style]="h">ACTIVE SESSIONS ({{ sessions().length }})</div>
        <div *ngFor="let s of sessions()" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:600;">{{ s.userAgent || 'Unknown device' }}</div>
            <div style="font-size:12px;color:#8A968F;">{{ s.ipAddress || '—' }} · since {{ s.createdAt.slice(0, 10) }}</div>
          </div>
          <span *ngIf="s.current" style="font-size:11px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:4px 10px;border-radius:11px;">This device</span>
          <button *ngIf="!s.current" (click)="revokeSession(s)" style="height:32px;padding:0 11px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">Sign out</button>
        </div>
        <button (click)="revokeOthers()" style="margin-top:12px;height:36px;padding:0 14px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">Sign out all other devices</button>
      </div>

      <!-- API tokens -->
      <div *ngIf="isCompanyAdmin()" [style]="card">
        <div [style]="h">API TOKENS ({{ tokens().length }})</div>
        <div *ngFor="let t of tokens()" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:600;">{{ t.name }}</div>
            <div style="font-size:12px;color:#8A968F;"><code>{{ t.tokenPrefix }}…</code> · {{ t.scopes.join(', ') }}</div>
          </div>
          <span *ngIf="t.revoked" style="font-size:11px;font-weight:600;color:#8C3A2E;background:#FBEAE7;padding:4px 10px;border-radius:11px;">Revoked</span>
          <button *ngIf="!t.revoked" (click)="revokeToken(t)" style="height:32px;padding:0 11px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Revoke</button>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
          <input #tkName placeholder="Token name" [style]="input" style="flex:1;min-width:160px;">
          <select #tkScope [style]="input" style="width:190px;">
            <option *ngFor="let s of scopes" [value]="s">{{ s }}</option>
          </select>
          <button (click)="createToken(tkName.value, tkScope.value); tkName.value = ''" [style]="btn">Create token</button>
        </div>
      </div>

      <!-- privacy -->
      <div *ngIf="isCompanyAdmin()" [style]="card">
        <div [style]="h">PRIVACY</div>
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
          <span style="flex:1;font-size:13.5px;">Marketing communications</span>
          <select #mk [style]="input" style="width:100px;">
            <option value="true" [selected]="consent()?.marketingConsent">On</option>
            <option value="false" [selected]="!consent()?.marketingConsent">Off</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
          <span style="flex:1;font-size:13.5px;">Product analytics</span>
          <select #an [style]="input" style="width:100px;">
            <option value="true" [selected]="consent()?.analyticsConsent">On</option>
            <option value="false" [selected]="!consent()?.analyticsConsent">Off</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button (click)="saveConsent(mk.value, an.value)" [style]="btn">Save consent</button>
          <button (click)="downloadData()" style="height:38px;padding:0 15px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:13px;font-family:inherit;">Download all company data</button>
        </div>
      </div>

      <!-- support -->
      <div [style]="card">
        <div [style]="h">SUPPORT TICKETS ({{ tickets().length }})</div>
        <div *ngFor="let t of tickets()" [attr.data-ticket]="t.subject" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:600;">{{ t.subject }}</div>
            <div style="font-size:12px;color:#8A968F;">{{ t.type === 'FEEDBACK' ? 'Feedback' : 'Support request' }} · {{ t.priority }}</div>
          </div>
          <span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:11px;background:#F3F5F1;color:#64726B;">{{ t.status }}</span>
        </div>
        <div *ngIf="!tickets().length" style="color:#8A968F;font-size:13.5px;">No tickets raised.</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
          <input #tkSubject placeholder="Subject" [style]="input">
          <select #tkType [style]="input">
            <option *ngFor="let t of ticketTypes" [value]="t.value">{{ t.label }}</option>
          </select>
          <input #tkMsg placeholder="What do you need help with?" [style]="input">
          <select #tkPri [style]="input">
            <option *ngFor="let p of priorities" [value]="p" [selected]="p === 'MEDIUM'">{{ p }}</option>
          </select>
        </div>
        <button (click)="raiseTicket(tkType.value, tkSubject.value, tkMsg.value, tkPri.value); tkSubject.value = ''; tkMsg.value = ''" [style]="btn" style="margin-top:12px;">Raise ticket</button>
      </div>
    </div>
  `,
})
export class AccountComponent implements OnInit {
  private api = inject(AccountApiService);
  private session = inject(SessionService);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  notificationFields = NOTIFICATION_FIELDS;
  scopes = API_SCOPES;
  ticketTypes = TICKET_TYPES;
  priorities = TICKET_PRIORITIES;

  profile = signal<UserProfileResponse | null>(null);
  notifications = signal<NotificationPreferencesResponse | null>(null);
  sessions = signal<SessionResponse[]>([]);
  tokens = signal<ApiTokenResponse[]>([]);
  consent = signal<PrivacyConsentResponse | null>(null);
  tickets = signal<SupportTicketResponse[]>([]);
  newToken = signal<string | null>(null);
  error = signal('');

  isCompanyAdmin = computed(() => this.session.role() === 'COMPANY_ADMIN');

  ngOnInit(): void {
    this.api.profile().subscribe({ next: (p) => this.profile.set(p), error: (e) => this.fail(e) });
    this.api.notifications().subscribe({ next: (n) => this.notifications.set(n), error: () => {} });
    this.loadSessions();
    this.loadTickets();
    if (this.isCompanyAdmin()) {
      this.loadTokens();
      this.api.consent().subscribe({ next: (c) => this.consent.set(c), error: () => {} });
    }
  }

  private fail(err: unknown) {
    this.error.set(toApiError(err as never).message);
  }

  private loadSessions() {
    this.api.sessions().subscribe({ next: (s) => this.sessions.set(s), error: () => {} });
  }

  private loadTokens() {
    this.api.apiTokens().subscribe({ next: (t) => this.tokens.set(t), error: () => {} });
  }

  private loadTickets() {
    this.api.tickets().subscribe({ next: (t) => this.tickets.set(t), error: () => {} });
  }

  notifValue(key: keyof NotificationPreferencesResponse): boolean {
    return Boolean(this.notifications()?.[key]);
  }

  setNotification(key: keyof NotificationPreferencesResponse, raw: string) {
    this.notifications.update((n) => (n ? { ...n, [key]: raw === 'true' } : n));
  }

  saveProfile(name: string, jobTitle: string, department: string, phone: string) {
    if (!name.trim()) {
      this.error.set('Name is required.');
      return;
    }
    this.error.set('');
    this.api
      .updateProfile({
        name: name.trim(),
        jobTitle: jobTitle.trim() || null,
        department: department.trim() || null,
        phone: phone.trim() || null,
      })
      .subscribe({
        next: (p) => {
          this.profile.set(p);
          this.ui.showToast('Profile saved.');
        },
        error: (e) => this.fail(e),
      });
  }

  changePassword(current: string, next: string) {
    if (next.length < 8) {
      this.error.set('New password must be at least 8 characters.');
      return;
    }
    this.error.set('');
    this.api.changePassword(current, next).subscribe({
      next: () => this.ui.showToast('Password changed.'),
      error: (e) => this.fail(e),
    });
  }

  saveNotifications() {
    const n = this.notifications();
    if (!n) return;
    this.api
      .updateNotifications({
        reportDeadlineReminders: n.reportDeadlineReminders,
        teamActivityAlerts: n.teamActivityAlerts,
        complianceAlerts: n.complianceAlerts,
        weeklyDigest: n.weeklyDigest,
      })
      .subscribe({
        next: (u) => {
          this.notifications.set(u);
          this.ui.showToast('Notification preferences saved.');
        },
        error: (e) => this.fail(e),
      });
  }

  revokeSession(s: SessionResponse) {
    this.api.revokeSession(s.id).subscribe({ next: () => this.loadSessions(), error: (e) => this.fail(e) });
  }

  revokeOthers() {
    this.api.revokeOtherSessions().subscribe({
      next: () => {
        this.ui.showToast('Other devices signed out.');
        this.loadSessions();
      },
      error: (e) => this.fail(e),
    });
  }

  createToken(name: string, scope: string) {
    if (!name.trim()) return;
    this.api.createApiToken(name.trim(), [scope]).subscribe({
      next: (t) => {
        // The raw token exists only in this response; there is no way to retrieve it later.
        this.newToken.set(t.token);
        this.loadTokens();
      },
      error: (e) => this.fail(e),
    });
  }

  revokeToken(t: ApiTokenResponse) {
    this.api.revokeApiToken(t.id).subscribe({ next: () => this.loadTokens(), error: (e) => this.fail(e) });
  }

  saveConsent(marketing: string, analytics: string) {
    this.api.updateConsent(marketing === 'true', analytics === 'true').subscribe({
      next: (c) => {
        this.consent.set(c);
        this.ui.showToast('Consent saved.');
      },
      error: (e) => this.fail(e),
    });
  }

  downloadData() {
    this.api.dataExport().subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wesee-company-data.json';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e) => this.fail(e),
    });
  }

  raiseTicket(type: string, subject: string, message: string, priority: string) {
    if (!subject.trim() || !message.trim()) {
      this.error.set('Subject and message are both required.');
      return;
    }
    this.error.set('');
    this.api
      .createTicket(type as TicketType, subject.trim(), message.trim(), priority as TicketPriority)
      .subscribe({
        next: () => {
          this.ui.showToast('Ticket raised.');
          this.loadTickets();
        },
        error: (e) => this.fail(e),
      });
  }
}
