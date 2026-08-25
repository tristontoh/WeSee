import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExtractionApiService } from '../../../core/extraction/extraction-api.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';

/**
 * Uploading only. A document goes off to be read on another thread, so there is nothing to show
 * here once it is accepted — what came back lives in the Documents screen, and the confirmation
 * below is what carries the reader across to it.
 */
@Component({
  selector: 'app-extraction',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="max-width:1000px;">
      <div [style]="CARD">
        <div [style]="H">UPLOAD A SOURCE DOCUMENT</div>

        <!-- The native file input is visually hidden: its "Choose File" chip is drawn by the
             browser and cannot be styled to match the rest of the app. The label below drives it. -->
        <input #picker type="file" (change)="onFile($event)"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.docx"
          style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;">

        <div (dragover)="onDragOver($event)" (dragleave)="dragging.set(false)" (drop)="onDrop($event)"
          [style.border-color]="dragging() ? '#4C96B3' : '#DDE3DA'"
          [style.background]="dragging() ? '#F5FAFC' : '#FCFDFB'"
          style="border:1.5px dashed;border-radius:14px;padding:26px 22px;text-align:center;transition:border-color .15s,background .15s;">

          <svg viewBox="0 0 24 24" fill="none" stroke="#A9B3AD" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" width="30" height="30" style="margin-bottom:10px;">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9.5 14.5L12 12l2.5 2.5"/>
          </svg>

          <div style="font-size:14px;font-weight:600;color:#42504A;margin-bottom:4px;">
            {{ uploading() ? 'Reading ' + uploadingName() + '…' : 'Drop a bill here' }}
          </div>
          <div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;">
            PDF, image, or spreadsheet · up to 10 MB
          </div>

          <button type="button" (click)="picker.click()" [disabled]="uploading()"
            [style.opacity]="uploading() ? '.55' : '1'"
            style="height:40px;padding:0 18px;border-radius:10px;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:#fff;background:linear-gradient(90deg,#4C96B3,#A99FDB);">
            Choose a document
          </button>
        </div>

        <p style="font-size:12.5px;color:#8A968F;margin:14px 0 0;line-height:1.5;">
          The figures found in the document are proposed in Documents. Nothing is written to your
          data until you accept them.
        </p>

        <div *ngIf="error()" style="color:#8C3A2E;font-size:13px;margin-top:12px;">{{ error() }}</div>
      </div>

      <!-- Without this the file appears to vanish: it is read on another thread and the result
           lands on a different screen. -->
      <div *ngIf="uploaded() as name" [style]="CARD"
        style="display:flex;align-items:center;gap:12px;border-color:#D6E7DC;background:#F6FBF7;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3D7A52" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" width="18" height="18" style="flex-shrink:0;">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <div style="min-width:0;flex:1;">
          <div style="font-size:13.5px;font-weight:600;color:#2F3B35;">{{ name }} is being read</div>
          <div style="font-size:12px;color:#5F7A69;margin-top:2px;">
            The figures appear in Documents when it finishes.
          </div>
        </div>
        <a [routerLink]="uploadedId() ? ['/documents', uploadedId()] : ['/documents']"
          style="flex-shrink:0;height:36px;line-height:36px;padding:0 15px;border-radius:9px;text-decoration:none;font-size:12.5px;font-weight:600;color:#fff;background:#4C96B3;">
          View document
        </a>
      </div>
    </div>
  `,
})
export class ExtractionComponent {
  private api = inject(ExtractionApiService);

  CARD = CARD;
  H = H;

  error = signal<string | null>(null);
  dragging = signal(false);
  uploading = signal(false);
  uploadingName = signal('');
  uploaded = signal<string | null>(null);
  uploadedId = signal<string | null>(null);

  onDragOver(event: DragEvent) {
    // Without preventDefault the browser navigates to the dropped file instead of handing it over.
    event.preventDefault();
    this.dragging.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.upload(file, input);
  }

  private upload(file: File, input?: HTMLInputElement) {
    this.error.set(null);
    this.uploaded.set(null);
    this.uploading.set(true);
    this.uploadingName.set(file.name);

    this.api.upload(file).subscribe({
      next: (doc) => {
        // Cleared so re-picking the same file still fires a change event.
        if (input) input.value = '';
        this.uploading.set(false);
        this.uploaded.set(doc.originalFileName);
        this.uploadedId.set(doc.id);
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }
}
