import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CompanyApiService } from '../../../core/company/company-api.service';
import { ASSIGNABLE_ROLES, TeamInviteResponse, TenantUserResponse } from '../../../core/company/company.model';
import { Role } from '../../../core/auth/session.model';
import { SessionService } from '../../../core/auth/session.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:40px;border-radius:10px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:40px;padding:0 16px;border-radius:10px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:900px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Team</h1>
      <p style="color:#64726B;margin:0 0 24px;font-size:14px;">People with access to {{ session.user()?.companyName || 'your company' }}.</p>

      <!-- one-time secret -->
      <div *ngIf="secret()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="font-weight:600;font-size:13.5px;margin-bottom:5px;">{{ secret()!.title }}</div>
        <div style="font-size:12.5px;color:#7A6A3A;margin-bottom:11px;">Copy this now — it will not be shown again.</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <code style="flex:1;background:#fff;border:1px solid #EADFC0;border-radius:9px;padding:10px 12px;font-size:12.5px;overflow-x:auto;white-space:nowrap;">{{ secret()!.value }}</code>
          <button (click)="dismissSecret()" style="height:38px;padding:0 14px;border-radius:9px;border:1px solid #EADFC0;background:#fff;cursor:pointer;font-family:inherit;font-size:13px;">Done</button>
        </div>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <!-- add member -->
      <div *ngIf="canManage()" [style]="card">
        <div [style]="h">ADD SOMEONE</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <input #nm placeholder="Full name" [style]="input" style="flex:1;min-width:150px;">
          <input #em placeholder="email@company.com" [style]="input" style="flex:1;min-width:180px;">
          <select #rl [style]="input">
            <option *ngFor="let r of roles" [value]="r">{{ label(r) }}</option>
          </select>
          <button (click)="addUser(nm.value, em.value, rl.value)" [style]="btn" [disabled]="busy()">Create user</button>
          <button (click)="invite(nm.value, em.value, rl.value)" [style]="btn" style="background:#fff;color:#4C96B3;border:1px solid #BFD8DD;" [disabled]="busy()">Send invite</button>
        </div>
      </div>

      <!-- members -->
      <div [style]="card">
        <div [style]="h">MEMBERS ({{ users().length }})</div>
        <div *ngFor="let u of users()" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;">{{ u.name }}</div>
            <div style="font-size:12.5px;color:#8A968F;">{{ u.email }}</div>
          </div>
          <span *ngIf="!u.active" style="font-size:11px;font-weight:600;color:#B36A5E;background:#FBEAE7;padding:3px 9px;border-radius:10px;">Inactive</span>
          <!-- [selected] per option, not [value] on the select: binding value before the
               options render leaves every member showing the first role. -->
          <select *ngIf="canManage()" (change)="changeRole(u, $any($event.target).value)" [style]="input" style="height:34px;">
            <option *ngFor="let r of roles" [value]="r" [selected]="r === u.role">{{ label(r) }}</option>
          </select>
          <span *ngIf="!canManage()" style="font-size:12.5px;color:#64726B;">{{ label(u.role) }}</span>
          <button *ngIf="canManage()" (click)="toggleActive(u)" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">{{ u.active ? 'Deactivate' : 'Activate' }}</button>
        </div>
        <div *ngIf="!users().length" style="color:#8A968F;font-size:13.5px;">No members yet.</div>
      </div>

      <!-- invites -->
      <div *ngIf="canManage()" [style]="card">
        <div [style]="h">PENDING INVITES ({{ invites().length }})</div>
        <div *ngFor="let i of invites()" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;">{{ i.name }}</div>
            <div style="font-size:12.5px;color:#8A968F;">{{ i.email }} · {{ label(i.role) }}</div>
          </div>
          <span *ngIf="i.expired" style="font-size:11px;font-weight:600;color:#B36A5E;background:#FBEAE7;padding:3px 9px;border-radius:10px;">Expired</span>
          <button (click)="resend(i)" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">Resend</button>
          <button (click)="revoke(i)" style="height:34px;padding:0 12px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Revoke</button>
        </div>
        <div *ngIf="!invites().length" style="color:#8A968F;font-size:13.5px;">No pending invites.</div>
      </div>
    </div>
  `,
})
export class TeamComponent implements OnInit {
  private api = inject(CompanyApiService);
  session = inject(SessionService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  roles = ASSIGNABLE_ROLES;

  users = signal<TenantUserResponse[]>([]);
  invites = signal<TeamInviteResponse[]>([]);
  busy = signal(false);
  error = signal('');
  secret = signal<{ title: string; value: string } | null>(null);

  /** GET /company/users is open to any member, but every write is COMPANY_ADMIN-only. */
  canManage = computed(() => this.session.role() === 'COMPANY_ADMIN');

  ngOnInit(): void {
    this.loadUsers();
    if (this.canManage()) this.loadInvites();
  }

  label(r: Role): string {
    return r
      .replace('COMPANY_', '')
      .replace('_', ' ')
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());
  }

  private loadUsers() {
    this.api.listUsers().subscribe({
      next: (u) => this.users.set(u),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  private loadInvites() {
    this.api.listInvites().subscribe({
      next: (i) => this.invites.set(i),
      error: () => {},
    });
  }

  addUser(name: string, email: string, role: string) {
    if (!name.trim() || !email.trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.createUser(name.trim(), email.trim(), role as Role).subscribe({
      next: (u) => {
        this.busy.set(false);
        // Only chance to show this — with SMTP off it is the user's sole way in.
        this.secret.set({ title: `Temporary password for ${u.email}`, value: u.temporaryPassword });
        this.loadUsers();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  invite(name: string, email: string, role: string) {
    if (!name.trim() || !email.trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.createInvite(name.trim(), email.trim(), role as Role).subscribe({
      next: (i) => {
        this.busy.set(false);
        this.secret.set({ title: `Invite link for ${i.email}`, value: i.inviteUrl });
        this.loadInvites();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  changeRole(u: TenantUserResponse, role: string) {
    this.api.updateUserRole(u.id, role as Role).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  toggleActive(u: TenantUserResponse) {
    this.api.setUserActive(u.id, !u.active).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  resend(i: TeamInviteResponse) {
    this.api.resendInvite(i.id).subscribe({
      next: (fresh) => {
        this.secret.set({ title: `Invite link for ${fresh.email}`, value: fresh.inviteUrl });
        this.loadInvites();
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  revoke(i: TeamInviteResponse) {
    this.api.revokeInvite(i.id).subscribe({
      next: () => this.loadInvites(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  dismissSecret() {
    this.secret.set(null);
  }
}
