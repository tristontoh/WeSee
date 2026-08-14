import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApiService } from '../../../core/admin/admin-api.service';
import { SupportTicketResponse, TicketStatus } from '../../../core/account/account.model';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'CLOSED'];
const INPUT = 'height:34px;border-radius:9px;border:1px solid #E5E8E1;padding:0 10px;font-family:inherit;font-size:13px;background:#fff;';

const STATUS_COLOR: Record<TicketStatus, { bg: string; fg: string }> = {
  OPEN: { bg: '#FFF8E6', fg: '#8A6A2A' },
  PENDING: { bg: '#E7F0F2', fg: '#4C96B3' },
  CLOSED: { bg: '#F3F5F1', fg: '#64726B' },
};

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:940px;">
      <div style="margin-bottom:22px;">
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Support Tools</h1>
        <p style="color:#64726B;margin:0;font-size:14px;">Tickets raised by companies across the platform.</p>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <div style="background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:6px 22px 18px;">
        <div *ngFor="let t of tickets()" [attr.data-ticket]="t.subject" style="display:flex;align-items:flex-start;gap:12px;padding:13px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;">{{ t.subject }}</div>
            <div style="font-size:12.5px;color:#8A968F;margin-top:2px;">{{ t.message }}</div>
            <div style="font-size:12px;color:#93A099;margin-top:4px;">
              {{ t.type === 'FEEDBACK' ? 'Feedback' : 'Support request' }} · {{ t.priority }} · {{ t.createdAt.slice(0, 10) }}
            </div>
          </div>
          <span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:11px;"
            [style.background]="color(t.status).bg" [style.color]="color(t.status).fg">{{ t.status }}</span>
          <select (change)="setStatus(t, $any($event.target).value)" [style]="input" style="width:120px;">
            <option *ngFor="let s of statuses" [value]="s" [selected]="s === t.status">{{ s }}</option>
          </select>
        </div>
        <div *ngIf="!tickets().length" style="color:#8A968F;font-size:13.5px;padding:14px 0;">No tickets on the platform.</div>
      </div>
    </div>
  `,
})
export class AdminSupportComponent implements OnInit {
  private api = inject(AdminApiService);
  private ui = inject(UiService);

  input = INPUT;
  statuses = STATUSES;

  tickets = signal<SupportTicketResponse[]>([]);
  error = signal('');

  color(s: TicketStatus) {
    return STATUS_COLOR[s];
  }

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.api.adminTickets().subscribe({
      next: (t) => this.tickets.set(t),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  setStatus(t: SupportTicketResponse, status: string) {
    this.api.setTicketStatus(t.id, status as TicketStatus).subscribe({
      next: () => {
        this.ui.showToast(`Ticket moved to ${status}.`);
        this.load();
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }
}
