import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { ExtractionApiService } from '../../../core/extraction/extraction-api.service';
import {
  ExtractedDocumentResponse,
  ExtractedRecordResponse,
  isPending,
} from '../../../core/extraction/extraction.model';
import { toApiError } from '../../../core/http/api-error';
import { UiService } from '../../../core/ui.service';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:40px;border-radius:10px;border:1px solid #E5E8E1;padding:0 12px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:40px;padding:0 16px;border-radius:10px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#F3F5F1', fg: '#8A968F' },
  EXTRACTING: { bg: '#EAF2F6', fg: '#4C96B3' },
  READY: { bg: '#E9F3EC', fg: '#3D7A52' },
  FAILED: { bg: '#FBEDEA', fg: '#8C3A2E' },
};

type Preview = 'image' | 'pdf' | 'none';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="max-width:1240px;">
      <a routerLink="/documents"
        style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#64726B;text-decoration:none;margin-bottom:14px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Documents
      </a>

      <div *ngIf="error()" [style]="CARD" style="color:#8C3A2E;font-size:13px;">{{ error() }}</div>

      <ng-container *ngIf="doc() as d">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <h1 style="font-size:19px;font-weight:600;margin:0;color:#2F3B35;">{{ d.originalFileName }}</h1>
          <span style="font-size:10.5px;font-weight:700;padding:5px 9px;border-radius:7px;"
            [style.background]="color(d.status).bg" [style.color]="color(d.status).fg">
            {{ d.status }}
          </span>
          <button *ngIf="d.status === 'FAILED'" (click)="retry()"
            style="margin-left:auto;height:34px;padding:0 14px;border-radius:9px;border:1.5px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12.5px;font-family:inherit;">
            Read it again
          </button>
        </div>

        <!-- Source on the left, what was read from it on the right: the whole point of this screen
             is checking one against the other, so they have to be on screen together. -->
        <div class="split">
          <div [style]="CARD" style="padding:0;overflow:hidden;background:#F7F8F5;">
            <img *ngIf="preview() === 'image' && src()" [src]="src()" [alt]="d.originalFileName"
              style="display:block;width:100%;height:auto;">

            <iframe *ngIf="preview() === 'pdf' && src()" [src]="src()" [title]="d.originalFileName"
              style="display:block;width:100%;height:78vh;border:0;background:#fff;"></iframe>

            <div *ngIf="preview() === 'none'" style="padding:44px 22px;text-align:center;">
              <div style="font-size:13.5px;font-weight:600;color:#42504A;margin-bottom:5px;">
                No preview for this file type
              </div>
              <div style="font-size:12.5px;color:#8A968F;line-height:1.5;">
                Spreadsheets and documents are stored, but only PDFs and images can be read or shown.
              </div>
            </div>

            <div *ngIf="preview() !== 'none' && !src()" style="padding:44px 22px;text-align:center;color:#8A968F;font-size:13px;">
              Loading the document…
            </div>
          </div>

          <div>
            <div [style]="CARD">
              <div [style]="H">
                {{ d.records.length ? 'WHAT WAS READ' : 'NOTHING TO REVIEW' }}
              </div>

              <div *ngIf="d.failureReason" style="color:#8C3A2E;font-size:12.5px;line-height:1.5;">
                {{ d.failureReason }}
              </div>

              <div *ngIf="isPending(d)" style="color:#8A968F;font-size:13px;">
                Being read. The figures appear here when it finishes.
              </div>

              <div *ngIf="d.status === 'READY' && !d.records.length" style="color:#8A968F;font-size:13px;line-height:1.5;">
                Nothing usable was found in this document. Enter the values by hand instead.
              </div>

              <div *ngFor="let rec of d.records; let first = first" [attr.data-record]="rec.targetId"
                [style.border-top]="first ? 'none' : '1px solid #F2F4F0'"
                [style.padding-top]="first ? '0' : '18px'"
                style="padding-bottom:18px;margin-bottom:0;">

                <div style="display:flex;align-items:baseline;gap:7px;">
                  <span style="font-size:25px;font-weight:600;color:#2F3B35;letter-spacing:-.4px;">
                    {{ rec.value }}
                  </span>
                  <!-- rec.unit, never rec.unitAsRead: the value has been converted into the
                       target's unit, and a 1.24 MWh figure labelled "kWh" misstates it a
                       thousandfold. The document's own unit is named below instead. -->
                  <span style="font-size:13px;color:#8A968F;">{{ rec.unit }}</span>
                  <span *ngIf="rec.status !== 'PROPOSED'"
                    style="margin-left:auto;font-size:11px;font-weight:700;color:#8A968F;">{{ rec.status }}</span>
                </div>

                <div style="font-size:13px;font-weight:600;color:#42504A;margin-top:5px;line-height:1.35;">
                  {{ rec.targetName }}
                </div>
                <div style="font-size:11px;color:#A9B3AD;margin-top:3px;">
                  {{ rec.targetType === 'EMISSION_ACTIVITY' ? 'Emission activity' : 'Indicator' }}
                  · FY{{ rec.fiscalYear }}<span *ngIf="rec.month"> · {{ MONTHS[rec.month - 1] }}</span>
                  <span *ngIf="rec.confidence"> · {{ (rec.confidence * 100).toFixed(0) }}% confident</span>
                  <!-- Only when it differs: naming the same unit twice is noise, but a silent
                       conversion is what a reviewer most needs to see. -->
                  <span *ngIf="rec.unitAsRead && rec.unitAsRead !== rec.unit">
                    · read as {{ rec.unitAsRead }}</span>
                </div>

                <!-- The figure is only checkable against the words it came from, so the quote sits
                     directly under it rather than in a details panel somewhere else. -->
                <blockquote *ngIf="rec.sourceSnippet"
                  style="margin:10px 0 0;padding:7px 0 7px 12px;border-left:2px solid #DCE4DE;
                         font-size:12px;color:#64726B;font-style:italic;line-height:1.5;">
                  {{ rec.sourceSnippet }}
                </blockquote>

                <div *ngIf="rec.status === 'PROPOSED'" style="display:flex;gap:8px;margin-top:14px;">
                  <input #val type="number" [value]="rec.value" [style]="INPUT"
                    style="width:110px;box-sizing:border-box;height:36px;font-size:12.5px;">
                  <button (click)="accept(rec, val.value)" [style]="BTN"
                    style="flex:1;height:36px;padding:0;font-size:12px;">Accept</button>
                  <button (click)="reject(rec)"
                    style="flex:1;height:36px;border-radius:10px;border:1.5px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;">
                    Reject
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="d.modelUsed" style="font-size:11px;color:#A9B3AD;margin-top:12px;padding:0 4px;">
              Read by {{ d.modelUsed }}
            </div>
          </div>
        </div>

        <!-- Full width, below the split: a meter table is five columns wide and would be
             unreadable squeezed beside the preview. Everything here is a copy of the page —
             nothing is proposed, so nothing is accepted. -->
        <div *ngIf="!transcriptionIsEmpty(d)" [style]="CARD" style="margin-top:16px;">
          <div [style]="H">WHAT THE DOCUMENT SAYS</div>
          <p style="font-size:12px;color:#8A968F;margin:-8px 0 18px;line-height:1.5;">
            Transcribed as printed, including the figures nothing reports on. Nothing here is
            written to your data.
          </p>

          <div *ngIf="d.transcription.fields.length"
            style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:2px 24px;margin-bottom:8px;">
            <div *ngFor="let f of d.transcription.fields"
              style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #F4F6F2;font-size:12.5px;">
              <span style="color:#8A968F;flex:0 0 46%;">{{ f.label }}</span>
              <span style="color:#2F3B35;font-weight:500;min-width:0;word-break:break-word;">{{ f.value }}</span>
            </div>
          </div>

          <!-- An untitled table gets a rule above it: bills leave headings off, and without one
               the table reads as a continuation of the one before it. -->
          <div *ngFor="let t of d.transcription.tables; let i = index"
            [style.border-top]="!t.title && i > 0 ? '1px solid #E9ECE6' : 'none'"
            [style.padding-top]="!t.title && i > 0 ? '22px' : '0'"
            style="margin-top:22px;">
            <div *ngIf="t.title" style="font-size:12.5px;font-weight:600;color:#42504A;margin-bottom:8px;">
              {{ t.title }}
            </div>
            <!-- Scrolls inside itself so a wide table never pushes the page sideways. -->
            <div style="overflow-x:auto;">
              <table style="border-collapse:collapse;font-size:12px;min-width:100%;">
                <thead>
                  <tr>
                    <th *ngFor="let c of t.columns"
                      style="text-align:left;padding:7px 14px 7px 0;border-bottom:1.5px solid #E5E8E1;
                             color:#8A968F;font-weight:600;white-space:nowrap;">{{ c }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of t.rows">
                    <td *ngFor="let cell of row"
                      style="padding:7px 14px 7px 0;border-bottom:1px solid #F4F6F2;color:#42504A;
                             white-space:nowrap;">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .split { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(340px, 1fr); gap: 16px; align-items: start; }
    @media (max-width: 900px) { .split { grid-template-columns: minmax(0, 1fr); } }
  `],
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  private api = inject(ExtractionApiService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private ui = inject(UiService);

  CARD = CARD;
  H = H;
  INPUT = INPUT;
  BTN = BTN;
  MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  isPending = isPending;

  doc = signal<ExtractedDocumentResponse | null>(null);
  src = signal<SafeResourceUrl | null>(null);
  preview = signal<Preview>('none');
  error = signal<string | null>(null);

  private id = '';
  private objectUrl: string | null = null;
  private poll?: Subscription;

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
    this.loadFile();

    // A document opened straight after upload may still be EXTRACTING, so the records fill in
    // without a manual refresh. Stops once the document reaches a terminal status.
    this.poll = interval(2000).subscribe(() => {
      const current = this.doc();
      if (current && isPending(current)) this.load();
    });
  }

  ngOnDestroy() {
    this.poll?.unsubscribe();
    // Revoked, or every visit to this screen leaks the whole file.
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  color(status: string) {
    return STATUS_COLORS[status] ?? STATUS_COLORS['PENDING'];
  }

  /** Older documents were read before transcription existed, so the field can be absent. */
  transcriptionIsEmpty(doc: ExtractedDocumentResponse): boolean {
    const t = doc.transcription;
    return !t || (!t.fields?.length && !t.tables?.length);
  }

  private load() {
    this.api.get(this.id).subscribe({
      next: (doc) => {
        this.doc.set(doc);
        this.preview.set(previewFor(doc.originalFileName));
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  private loadFile() {
    this.api.file(this.id).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        // Angular blocks a blob: URL bound to an iframe's src unless it is marked trusted. It is
        // ours: it names a blob this page just fetched from our own API, not anything user-supplied.
        this.src.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
      },
      // Left silent on purpose: the document's own record still renders, and a preview that
      // cannot load should not replace the figures with an error.
      error: () => this.preview.set('none'),
    });
  }

  retry() {
    this.api.retry(this.id).subscribe({
      next: () => this.load(),
      error: (err) => this.ui.showToast(toApiError(err).message),
    });
  }

  accept(rec: ExtractedRecordResponse, rawValue: string) {
    const parsed = Number(rawValue);
    this.api.accept(rec.id, { value: Number.isFinite(parsed) ? parsed : undefined }).subscribe({
      next: () => {
        this.ui.showToast('Accepted');
        this.load();
      },
      // A 409 here is the sign-off guard; its message names the year and explains itself.
      error: (err) => this.ui.showToast(toApiError(err).message),
    });
  }

  reject(rec: ExtractedRecordResponse) {
    this.api.reject(rec.id).subscribe({
      next: () => {
        this.ui.showToast('Rejected');
        this.load();
      },
      error: (err) => this.ui.showToast(toApiError(err).message),
    });
  }
}

/** Only what a browser renders in place; everything else the allowlist accepts is stored, not shown. */
function previewFor(fileName: string): Preview {
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
  if (extension === 'pdf') return 'pdf';
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') return 'image';
  return 'none';
}
