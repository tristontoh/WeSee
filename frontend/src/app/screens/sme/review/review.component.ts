import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { UiService } from '../../../core/ui.service';
import { EXTRACTIONS_SEED } from '../../../core/mock-data';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;">
        <div><h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Extraction Review</h1><p style="color:#64726B;margin:0;font-size:14px;">7 fields need review · 2 flagged as low confidence.</p></div>
        <button (click)="approveAllHighConfidence()" class="btn-primary" style="border:none;">Approve all high-confidence</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div *ngFor="let e of extractions()" class="glass" style="border-radius:14px;padding:18px 20px;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;border-left-width:4px;border-left-style:solid;" [style.border-left-color]="e.accent">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;">
              <span style="font-size:11px;font-weight:600;color:#8A968F;letter-spacing:.3px;">{{ e.field }}</span>
              <span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:11px;" [style.background]="e.statusBg" [style.color]="e.statusFg">{{ e.reviewStatus }}</span>
            </div>
            <div *ngIf="e.editing" style="display:flex;gap:9px;align-items:center;">
              <input [value]="e.value" (input)="onInput(e.id, $event)" style="font-family:'Work Sans',monospace;font-size:19px;font-weight:600;border:1.5px solid #4C96B3;border-radius:8px;padding:5px 10px;width:200px;outline:none;color:#1A2420;">
              <button (click)="save()" class="btn-primary" style="border:none;padding:8px 14px;font-size:12.5px;">Save</button>
              <button (click)="cancel()" class="btn-frost" style="padding:8px 12px;font-size:12.5px;color:#64726B;">Cancel</button>
            </div>
            <div *ngIf="!e.editing" style="display:flex;align-items:baseline;gap:12px;">
              <span style="font-family:'Work Sans',monospace;font-size:22px;font-weight:600;letter-spacing:-.5px;">{{ e.value }}</span>
              <button (click)="edit(e.id)" style="border:none;background:none;color:#4C96B3;font-size:12.5px;font-weight:600;cursor:pointer;padding:0;display:flex;align-items:center;gap:4px;font-family:inherit;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4v16h16v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"></path></svg>Correct</button>
            </div>
            <div style="font-size:11.5px;color:#93A099;margin-top:9px;">Source · {{ e.source }}</div>
          </div>
          <!-- ConfidenceIndicator -->
          <div style="text-align:center;min-width:96px;">
            <div style="width:56px;height:56px;border-radius:50%;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;" [style.background]="'conic-gradient(' + e.color + ' 0 ' + e.confPct + ',#EEF1EC ' + e.confPct + ' 100%)'">
              <div style="width:42px;height:42px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-family:'Work Sans',monospace;font-size:13px;font-weight:600;" [style.color]="e.color">{{ e.conf }}</div>
            </div>
            <div style="font-size:10.5px;font-weight:600;" [style.color]="e.color">{{ e.label }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReviewComponent {
  private ui = inject(UiService);

  private editingId = signal<string | null>(null);
  private edits = signal<Record<string, string>>({});

  extractions = computed(() =>
    EXTRACTIONS_SEED.map((e) => ({
      ...e,
      value: this.edits()[e.id] ?? e.value,
      editing: this.editingId() === e.id,
    })),
  );

  approveAllHighConfidence() {
    this.ui.showToast('All high-confidence extractions approved');
  }

  edit(id: string) {
    this.editingId.set(id);
  }

  cancel() {
    this.editingId.set(null);
  }

  save() {
    this.editingId.set(null);
  }

  onInput(id: string, e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.edits.update((s) => ({ ...s, [id]: value }));
  }
}
