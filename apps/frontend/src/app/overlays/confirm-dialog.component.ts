import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="ui.dialog() as d" style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;">
      <div (click)="ui.closeDialog()" style="position:absolute;inset:0;background:rgba(18,36,29,.5);"></div>
      <div style="position:relative;background:rgba(255,255,255,.62);backdrop-filter:blur(30px) saturate(150%);-webkit-backdrop-filter:blur(30px) saturate(150%);border:1px solid rgba(255,255,255,.6);border-radius:16px;padding:26px;width:420px;box-shadow:0 24px 60px rgba(0,0,0,.28);animation:vfade .2s ease both;">
        <div style="width:44px;height:44px;border-radius:11px;background:#FCEFF5;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F1A6CC" stroke-width="1.9"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01"></path></svg>
        </div>
        <div style="font-size:17px;font-weight:600;margin-bottom:7px;">{{ d.title }}</div>
        <div style="font-size:13.5px;color:#64726B;line-height:1.55;margin-bottom:22px;">{{ d.body }}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button (click)="ui.closeDialog()" class="btn-frost">Cancel</button>
          <button (click)="ui.closeDialog()" class="btn-danger">{{ d.confirmLabel }}</button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  ui = inject(UiService);
}
