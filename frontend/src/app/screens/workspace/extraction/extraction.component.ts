import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { ExtractionApiService } from '../../../core/extraction/extraction-api.service';
import {
  ExtractedDocumentResponse,
  ExtractedRecordResponse,
  isPending,
} from '../../../core/extraction/extraction.model';
import { toApiError } from '../../../core/http/api-error';
import { UiService } from '../../../core/ui.service';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:40px;border-radius:10px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:40px;padding:0 16px;border-radius:10px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#F3F5F1', fg: '#8A968F' },
  EXTRACTING: { bg: '#EAF2F6', fg: '#4C96B3' },
  READY: { bg: '#E9F3EC', fg: '#3D7A52' },
  FAILED: { bg: '#FBEDEA', fg: '#8C3A2E' },
};

@Component({
  selector: 'app-extraction',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="max-width:1000px;">
      <div [style]="CARD">
        <div [style]="H">UPLOAD A SOURCE DOCUMENT</div>
        <p style="font-size:13.5px;color:#64726B;margin:0 0 14px;line-height:1.5;">
          Upload a utility bill or invoice and it will be read for the figures it contains.
          Nothing is written to your data until you accept it below.
        </p>
        <input type="file" (change)="onFile($event)"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.docx"
          [style]="INPUT" style="padding:8px 12px;height:auto;">
        <div *ngIf="error()" style="color:#8C3A2E;font-size:13px;margin-top:12px;">{{ error() }}</div>
      </div>

      <div *ngIf="!documents().length" [style]="CARD" style="color:#8A968F;font-size:13.5px;">
        No documents uploaded yet.
      </div>

      <div *ngFor="let doc of documents()" [style]="CARD">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <strong style="font-size:14px;">{{ doc.originalFileName }}</strong>
          <span style="font-size:10.5px;font-weight:700;padding:5px 9px;border-radius:7px;"
            [style.background]="color(doc.status).bg" [style.color]="color(doc.status).fg">
            {{ doc.status }}
          </span>
          <button *ngIf="doc.status === 'FAILED'" (click)="retry(doc)"
            style="margin-left:auto;height:32px;padding:0 12px;border-radius:8px;border:1.5px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12px;font-family:inherit;">
            Retry
          </button>
        </div>
        <div style="font-size:11px;color:#A9B3AD;margin-bottom:12px;">
          Uploaded by {{ doc.uploadedBy }}
        </div>

        <div *ngIf="doc.failureReason" style="color:#8C3A2E;font-size:12.5px;margin-bottom:8px;">
          {{ doc.failureReason }}
        </div>

        <div *ngIf="doc.status === 'READY' && !doc.records.length"
          style="color:#8A968F;font-size:13px;">
          Nothing usable was found in this document.
        </div>

        <div *ngFor="let rec of doc.records" [attr.data-record]="rec.targetId"
          style="display:grid;grid-template-columns:minmax(0,1fr) 130px 170px;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #F2F4F0;">
          <div style="min-width:0;">
            <div style="font-size:13px;font-weight:600;line-height:1.35;">{{ rec.targetName }}</div>
            <div style="font-size:11px;color:#A9B3AD;margin-top:3px;">
              {{ rec.targetType === 'EMISSION_ACTIVITY' ? 'Emission activity' : 'Indicator' }}
              · FY{{ rec.fiscalYear }}
              <span *ngIf="rec.unitAsRead"> · read as {{ rec.unitAsRead }}</span>
              <span *ngIf="rec.confidence"> · {{ (rec.confidence * 100).toFixed(0) }}% confident</span>
            </div>
            <div *ngIf="rec.sourceSnippet"
              style="font-size:11px;color:#8A968F;margin-top:4px;font-style:italic;">
              “{{ rec.sourceSnippet }}”
            </div>
          </div>

          <input #val type="number" [value]="rec.value" [disabled]="rec.status !== 'PROPOSED'"
            [style]="INPUT" style="width:100%;box-sizing:border-box;height:36px;font-size:12.5px;">

          <div style="display:flex;gap:6px;">
            <ng-container *ngIf="rec.status === 'PROPOSED'; else reviewed">
              <button (click)="accept(rec, val.value)" [style]="BTN"
                style="flex:1;height:36px;padding:0;font-size:12px;">Accept</button>
              <button (click)="reject(rec)"
                style="flex:1;height:36px;border-radius:10px;border:1.5px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;">
                Reject
              </button>
            </ng-container>
            <ng-template #reviewed>
              <span style="font-size:11.5px;font-weight:700;color:#8A968F;">{{ rec.status }}</span>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ExtractionComponent implements OnInit, OnDestroy {
  private api = inject(ExtractionApiService);
  private ui = inject(UiService);

  CARD = CARD;
  H = H;
  INPUT = INPUT;
  BTN = BTN;

  documents = signal<ExtractedDocumentResponse[]>([]);
  error = signal<string | null>(null);
  private poll?: Subscription;

  ngOnInit() {
    this.refresh();
    // Extraction runs off the request thread, so the queue is polled while any
    // document is still PENDING or EXTRACTING, and left alone once all are terminal.
    this.poll = interval(2000).subscribe(() => {
      if (this.documents().some(isPending)) {
        this.refresh();
      }
    });
  }

  ngOnDestroy() {
    this.poll?.unsubscribe();
  }

  color(status: string) {
    return STATUS_COLORS[status] ?? STATUS_COLORS['PENDING'];
  }

  refresh() {
    this.api.list().subscribe({
      next: (docs) => this.documents.set(docs),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.error.set(null);
    this.api.upload(file).subscribe({
      next: () => {
        input.value = '';
        this.refresh();
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  retry(doc: ExtractedDocumentResponse) {
    this.api.retry(doc.id).subscribe({
      next: () => this.refresh(),
      error: (err) => this.ui.showToast(toApiError(err).message),
    });
  }

  accept(rec: ExtractedRecordResponse, rawValue: string) {
    const parsed = Number(rawValue);
    this.api.accept(rec.id, { value: Number.isFinite(parsed) ? parsed : undefined }).subscribe({
      next: () => {
        this.ui.showToast('Accepted');
        this.refresh();
      },
      // A 409 here is the sign-off guard; its message names the year and explains itself.
      error: (err) => this.ui.showToast(toApiError(err).message),
    });
  }

  reject(rec: ExtractedRecordResponse) {
    this.api.reject(rec.id).subscribe({
      next: () => this.refresh(),
      error: (err) => this.ui.showToast(toApiError(err).message),
    });
  }
}
