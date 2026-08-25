import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { ExtractionApiService } from '../../../core/extraction/extraction-api.service';
import { ExtractedDocumentResponse, isPending } from '../../../core/extraction/extraction.model';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#F3F5F1', fg: '#8A968F' },
  EXTRACTING: { bg: '#EAF2F6', fg: '#4C96B3' },
  READY: { bg: '#E9F3EC', fg: '#3D7A52' },
  FAILED: { bg: '#FBEDEA', fg: '#8C3A2E' },
};

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="max-width:1000px;">
      <div *ngIf="error()" [style]="CARD" style="color:#8C3A2E;font-size:13px;">{{ error() }}</div>

      <!-- An empty screen is an invitation, so it points at the one thing to do next rather
           than just reporting that there is nothing. -->
      <div *ngIf="!documents().length && !error()" [style]="CARD" style="text-align:center;padding:44px 22px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#C6CEC8" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" width="34" height="34">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
        </svg>
        <div style="font-size:14.5px;font-weight:600;color:#42504A;margin:12px 0 5px;">No documents yet</div>
        <div style="font-size:13px;color:#8A968F;margin-bottom:18px;line-height:1.5;">
          Upload a bill or invoice and it will be read for the figures it contains.
        </div>
        <a routerLink="/extraction"
          style="display:inline-block;height:38px;line-height:38px;padding:0 18px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;color:#fff;background:#4C96B3;">
          Upload a document
        </a>
      </div>

      <div *ngIf="documents().length" [style]="CARD" style="padding:22px 0 6px;">
        <div [style]="H" style="padding:0 22px;">
          {{ documents().length }} DOCUMENT{{ documents().length === 1 ? '' : 'S' }}
        </div>

        <a *ngFor="let doc of documents()" [routerLink]="['/documents', doc.id]"
          [attr.data-document]="doc.originalFileName"
          class="doc-row"
          style="display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:14px;align-items:center;
                 padding:14px 22px;border-top:1px solid #F2F4F0;text-decoration:none;color:inherit;">

          <div style="min-width:0;">
            <div style="font-size:13.5px;font-weight:600;color:#2F3B35;overflow:hidden;
                        text-overflow:ellipsis;white-space:nowrap;">
              {{ doc.originalFileName }}
            </div>
            <div style="font-size:11px;color:#A9B3AD;margin-top:3px;">
              {{ summary(doc) }} · uploaded by {{ doc.uploadedBy }}
            </div>
          </div>

          <span style="font-size:10.5px;font-weight:700;padding:5px 9px;border-radius:7px;"
            [style.background]="color(doc.status).bg" [style.color]="color(doc.status).fg">
            {{ doc.status }}
          </span>

          <svg viewBox="0 0 24 24" fill="none" stroke="#C6CEC8" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .doc-row:hover { background: #FAFBF8; }
    .doc-row:focus-visible { outline: 2px solid #4C96B3; outline-offset: -2px; }
  `],
})
export class DocumentsComponent implements OnInit, OnDestroy {
  private api = inject(ExtractionApiService);

  CARD = CARD;
  H = H;

  documents = signal<ExtractedDocumentResponse[]>([]);
  error = signal<string | null>(null);
  private poll?: Subscription;

  ngOnInit() {
    this.refresh();
    // Extraction runs off the request thread, so the list is polled while any document is still
    // PENDING or EXTRACTING, and left alone once all are terminal.
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

  /** What the row says about the document, which depends on how far it has got. */
  summary(doc: ExtractedDocumentResponse): string {
    if (doc.status === 'FAILED') return doc.failureReason || 'Could not be read';
    if (doc.status !== 'READY') return 'Being read';
    const proposed = doc.records.filter((r) => r.status === 'PROPOSED').length;
    if (proposed) return `${proposed} figure${proposed === 1 ? '' : 's'} to review`;
    if (doc.records.length) return 'All figures reviewed';
    return 'Nothing usable was found';
  }

  refresh() {
    this.api.list().subscribe({
      next: (docs) => this.documents.set(docs),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }
}
