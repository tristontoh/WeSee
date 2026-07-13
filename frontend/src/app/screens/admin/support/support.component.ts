import { Component, inject } from '@angular/core';
import { UiService } from '../../../core/ui.service';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  template: `
    <div style="animation:vfade .3s ease both;max-width:820px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.5px;">Support Tools</h1>
      <p style="color:#64726B;margin:0 0 22px;font-size:14px;">Elevated actions · all logged to the audit trail.</p>
      <div style="background:#EDF3F8;border:1px solid #D9E4EF;border-radius:12px;padding:13px 17px;display:flex;align-items:center;gap:11px;margin-bottom:20px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D96BA1" stroke-width="1.9"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01"></path></svg>
        <span style="font-size:12.5px;color:#c66ba8;">These actions affect live tenant data. Impersonation and overrides require a reason and are permanently recorded.</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="glass" style="border-radius:13px;padding:18px 20px;display:flex;align-items:center;gap:15px;">
          <div style="width:40px;height:40px;border-radius:10px;background:#E7F0F2;color:#CBDCDF;display:flex;align-items:center;justify-content:center;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1"></path></svg></div>
          <div style="flex:1;"><div style="font-size:14px;font-weight:600;">Impersonate tenant</div><div style="font-size:12.5px;color:#8A968F;">View the app exactly as a tenant user sees it.</div></div>
          <button (click)="impersonateTenant()" class="btn-frost">Start session</button>
        </div>
        <div class="glass" style="border-radius:13px;padding:18px 20px;display:flex;align-items:center;gap:15px;">
          <div style="width:40px;height:40px;border-radius:10px;background:#E4EEF0;color:#4C96B3;display:flex;align-items:center;justify-content:center;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"></path></svg></div>
          <div style="flex:1;"><div style="font-size:14px;font-weight:600;">Manual review override</div><div style="font-size:12.5px;color:#8A968F;">Force-approve or re-flag an extraction field.</div></div>
          <button (click)="manualOverride()" class="btn-frost">Open override</button>
        </div>
        <div class="glass" style="border-radius:13px;padding:18px 20px;display:flex;align-items:center;gap:15px;">
          <div style="width:40px;height:40px;border-radius:10px;background:#FCEFF5;color:#F1A6CC;display:flex;align-items:center;justify-content:center;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"></path></svg></div>
          <div style="flex:1;"><div style="font-size:14px;font-weight:600;">Reset tenant workspace</div><div style="font-size:12.5px;color:#8A968F;">Purge extractions and re-run ingestion. Destructive.</div></div>
          <button (click)="openResetDialog()" class="btn-danger-outline">Reset…</button>
        </div>
      </div>
    </div>
  `,
})
export class AdminSupportComponent {
  private ui = inject(UiService);

  impersonateTenant() {
    this.ui.showToast('Impersonation coming soon');
  }

  manualOverride() {
    this.ui.showToast('Manual override coming soon');
  }

  openResetDialog() {
    this.ui.openDialog({
      title: 'Reset this workspace?',
      body: 'This permanently purges all extractions and re-runs ingestion for Rimba Electronics Sdn Bhd. This action is recorded in the audit log and cannot be undone.',
      confirmLabel: 'Reset workspace',
    });
  }
}
