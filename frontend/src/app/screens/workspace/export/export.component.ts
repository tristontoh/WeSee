import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ExportApiService } from '../../../core/assurance/assurance-api.service';
import { ExportFormat, ExportHistoryResponse } from '../../../core/assurance/assurance.model';
import { currentFiscalYear } from '../../../core/indicators/entry-mode';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

interface Doc {
  path: string;
  label: string;
  detail: string;
  format: ExportFormat;
  /** Backend feature key that must be unlocked; undefined means always available. */
  requires?: string;
}

const DOCS: Doc[] = [
  { path: 'integrated-report.pdf', label: 'Integrated ESG report', detail: 'Full narrative and indicator report', format: 'PDF' },
  { path: 'ifrs-s1-report.pdf', label: 'IFRS S1 report', detail: 'General sustainability disclosures', format: 'PDF', requires: 'ifrs-s1-s2' },
  { path: 'ifrs-s2-report.pdf', label: 'IFRS S2 report', detail: 'Climate-related disclosures', format: 'PDF', requires: 'ifrs-s1-s2' },
  { path: 'csv', label: 'Raw indicator ledger', detail: 'Every indicator value as CSV', format: 'CSV' },
  { path: 'csi', label: 'CSI submission file', detail: 'Bursa CSI-formatted CSV', format: 'CSV_CSI', requires: 'csi-export' },
];

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:38px;border-radius:9px;border:1px solid #E5E8E1;padding:0 11px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:36px;padding:0 15px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:12.5px;font-family:inherit;';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:900px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;gap:16px;flex-wrap:wrap;">
        <div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Export Center</h1>
          <p style="color:#64726B;margin:0;font-size:14px;">Generate reports and submission files, and keep a record of what was issued.</p>
        </div>
        <select (change)="setYear($any($event.target).value)" [style]="input">
          <option *ngFor="let y of years" [value]="y" [selected]="y === year()">{{ y }}</option>
        </select>
      </div>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <div [style]="card">
        <div [style]="h">AVAILABLE DOCUMENTS · FY {{ year() }}</div>
        <div *ngFor="let d of docs" [attr.data-doc]="d.path" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:600;">{{ d.label }}</div>
            <div style="font-size:12px;color:#8A968F;">{{ d.detail }} · {{ d.format }}</div>
          </div>
          <button (click)="download(d)" [style]="btn" [disabled]="pending() === d.path">{{ pending() === d.path ? 'Generating…' : 'Download' }}</button>
        </div>
      </div>

      <div [style]="card">
        <div [style]="h">EXPORT HISTORY ({{ history().length }})</div>
        <div *ngFor="let h of history()" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F2F4F0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:600;">{{ h.exportType }}</div>
            <div style="font-size:12px;color:#8A968F;">FY {{ h.fiscalYear }} · {{ h.format }} · {{ h.generatedAt.slice(0, 10) }}<span *ngIf="h.generatedByName"> · {{ h.generatedByName }}</span></div>
          </div>
          <span *ngIf="h.signedOffByName" style="font-size:11px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:4px 10px;border-radius:11px;">Signed off</span>
          <button *ngIf="!h.signedOffByName" (click)="signOff(h)" style="height:32px;padding:0 11px;border-radius:9px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">Mark signed off</button>
        </div>
        <div *ngIf="!history().length" style="color:#8A968F;font-size:13.5px;">Nothing exported yet.</div>
      </div>
    </div>
  `,
})
export class ExportComponent implements OnInit {
  private api = inject(ExportApiService);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  docs = DOCS;

  year = signal(currentFiscalYear());
  history = signal<ExportHistoryResponse[]>([]);
  pending = signal<string | null>(null);
  error = signal('');

  years = [currentFiscalYear() - 2, currentFiscalYear() - 1, currentFiscalYear(), currentFiscalYear() + 1];

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.api.history().subscribe({
      next: (h) => this.history.set(h),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  setYear(v: string) {
    this.year.set(Number(v));
  }

  download(d: Doc) {
    this.pending.set(d.path);
    this.error.set('');
    this.api.download(d.path, this.year()).subscribe({
      next: (blob) => {
        this.pending.set(null);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${d.path.replace('.pdf', '')}-FY${this.year()}${d.path.endsWith('.pdf') ? '.pdf' : '.csv'}`;
        a.click();
        URL.revokeObjectURL(url);

        // The backend records server-generated exports itself; /exports/log exists for
        // client-generated ones (logClientGeneratedExport). Calling it here would double-log.
        this.load();
        this.ui.showToast(`${d.label} generated.`);
      },
      error: (err) => {
        this.pending.set(null);
        const e = toApiError(err);
        this.error.set(
          e.status === 403
            ? `${d.label} needs a higher plan.`
            : e.message,
        );
      },
    });
  }

  signOff(h: ExportHistoryResponse) {
    this.api.signOffExport(h.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }
}
