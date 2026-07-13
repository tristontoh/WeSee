import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-evidence-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="ui.evidence() as ev" style="position:fixed;inset:0;z-index:42;">
      <div (click)="ui.closeEvidence()" style="position:absolute;inset:0;background:rgba(18,36,29,.4);"></div>
      <div style="position:absolute;top:0;right:0;bottom:0;width:480px;background:rgba(246,248,243,.72);backdrop-filter:blur(30px) saturate(150%);-webkit-backdrop-filter:blur(30px) saturate(150%);box-shadow:-8px 0 40px rgba(0,0,0,.16);animation:vdrawer .28s cubic-bezier(.2,.8,.2,1) both;display:flex;flex-direction:column;">
        <div style="padding:22px 24px;border-bottom:1px solid #E5E8E1;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:11px;color:#8A968F;font-weight:600;letter-spacing:.3px;margin-bottom:6px;">EVIDENCE FOR CLAIM</div>
            <div style="font-size:14.5px;font-weight:600;max-width:340px;line-height:1.4;">{{ ev.claim }}</div>
          </div>
          <button (click)="ui.closeEvidence()" class="icon-btn" style="flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5A52" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:22px 24px;">
          <div style="font-size:12.5px;color:#64726B;margin-bottom:10px;">{{ ev.doc }} · page {{ ev.page }}</div>
          <div class="glass" style="border-radius:10px;padding:24px;position:relative;box-shadow:0 4px 14px rgba(0,0,0,.05);">
            <div style="height:11px;background:#EEF1EC;border-radius:4px;width:60%;margin-bottom:12px;"></div>
            <div style="height:9px;background:#F2F4EF;border-radius:4px;width:92%;margin-bottom:8px;"></div>
            <div style="height:9px;background:#F2F4EF;border-radius:4px;width:85%;margin-bottom:8px;"></div>
            <div style="height:9px;background:#F2F4EF;border-radius:4px;width:78%;margin-bottom:20px;"></div>
            <div style="border:2px solid #4C96B3;background:rgba(15,92,67,.07);border-radius:6px;padding:11px 13px;position:relative;">
              <span style="position:absolute;top:-9px;left:10px;background:#4C96B3;color:#fff;font-size:9.5px;font-weight:600;padding:2px 7px;border-radius:6px;">MATCHED · 96%</span>
              <div style="font-family:'Work Sans',monospace;font-size:12.5px;color:#1A2420;">{{ ev.snippet }}</div>
            </div>
            <div style="height:9px;background:#F2F4EF;border-radius:4px;width:88%;margin:20px 0 8px;"></div>
            <div style="height:9px;background:#F2F4EF;border-radius:4px;width:70%;"></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button (click)="accept()" class="btn-primary" style="flex:1;justify-content:center;">Accept evidence</button>
            <button (click)="ui.showToast('Opening source document…')" class="btn-frost">Open source doc</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EvidenceDrawerComponent {
  ui = inject(UiService);

  accept() {
    this.ui.showToast('Evidence accepted');
    this.ui.closeEvidence();
  }
}
