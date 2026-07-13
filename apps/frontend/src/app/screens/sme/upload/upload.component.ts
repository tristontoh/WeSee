import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { UiService } from '../../../core/ui.service';
import { UPLOADS } from '../../../core/mock-data';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Upload Center</h1>
      <p style="color:#64726B;margin:0 0 24px;font-size:14px;">Drop utility bills, fuel slips and freight manifests — snap a photo on mobile too.</p>
      <div class="grid-collapse" style="display:grid;grid-template-columns:1fr 1.15fr;gap:16px;">
        <!-- FileDropzone -->
        <div style="border:2px dashed #BFCcC3;border-radius:16px;background:#fff;padding:38px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;">
          <div style="width:60px;height:60px;border-radius:15px;background:#E4EEF0;display:flex;align-items:center;justify-content:center;margin-bottom:16px;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4C96B3" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"></path></svg></div>
          <div style="font-size:15px;font-weight:600;margin-bottom:5px;">Drag files here</div>
          <div style="font-size:12.5px;color:#8A968F;margin-bottom:18px;">PDF, JPG, PNG · up to 25 MB each</div>
          <div style="display:flex;gap:9px;">
            <button (click)="browseFiles()" class="btn-primary" style="border:none;">Browse files</button>
            <input #fileInput type="file" multiple (change)="onFilesChosen($event)" style="display:none;">
            <button (click)="takePhoto()" class="btn-frost"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>Take photo</button>
          </div>
        </div>
        <!-- BatchUploadQueue -->
        <div class="glass" style="border-radius:16px;overflow:hidden;">
          <div style="padding:16px 20px;border-bottom:1px solid #EEF1EC;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:14px;font-weight:600;">Upload queue</span><span style="font-size:12px;color:#8A968F;">4 files · 1 extracting</span></div>
          <div *ngFor="let u of uploads" style="padding:14px 20px;border-bottom:1px solid #F2F4EF;display:flex;align-items:center;gap:13px;">
            <div style="width:38px;height:38px;border-radius:9px;background:#F2F4EF;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64726B" stroke-width="1.7"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"></path></svg></div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ u.name }}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                <span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:11px;" [style.background]="u.tagBg" [style.color]="u.tagFg">{{ u.type }}</span>
                <span style="font-size:11px;color:#93A099;">{{ u.size }}</span>
              </div>
            </div>
            <span style="font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:6px;" [style.color]="u.statusFg">{{ u.statusIcon }} {{ u.status }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class UploadComponent {
  private ui = inject(UiService);
  uploads = UPLOADS;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  browseFiles() {
    this.fileInput?.nativeElement.click();
  }

  onFilesChosen(e: Event) {
    const input = e.target as HTMLInputElement;
    const n = input.files?.length ?? 0;
    if (n) this.ui.showToast(n === 1 ? '1 file queued for extraction' : `${n} files queued for extraction`);
    input.value = '';
  }

  takePhoto() {
    this.ui.showToast("Camera capture isn't available in this preview");
  }
}
