import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="ui.pwOpen()" style="position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;">
      <div (click)="close()" style="position:absolute;inset:0;background:rgba(18,36,29,.5);"></div>
      <div style="position:relative;background:rgba(255,255,255,.72);backdrop-filter:blur(30px) saturate(150%);-webkit-backdrop-filter:blur(30px) saturate(150%);border:1px solid rgba(255,255,255,.6);border-radius:16px;padding:26px;width:420px;box-shadow:0 24px 60px rgba(0,0,0,.28);animation:vfade .2s ease both;">
        <div style="width:44px;height:44px;border-radius:11px;background:#E4EEF0;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C96B3" stroke-width="1.9"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 018 0v3"></path></svg>
        </div>
        <div style="font-size:17px;font-weight:600;margin-bottom:6px;">Change password</div>
        <div style="font-size:13px;color:#64726B;line-height:1.5;margin-bottom:20px;">Use at least 8 characters. You'll stay signed in on this device.</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <label style="display:flex;flex-direction:column;gap:6px;"><span style="font-size:12px;font-weight:600;color:#64726B;">Current password</span><input type="password" placeholder="••••••••" style="height:44px;border-radius:10px;border:1px solid rgba(0,0,0,.14);background:rgba(255,255,255,.6);padding:0 14px;font-size:14px;outline:none;color:#1A2420;"></label>
          <label style="display:flex;flex-direction:column;gap:6px;"><span style="font-size:12px;font-weight:600;color:#64726B;">New password</span><input type="password" placeholder="••••••••" style="height:44px;border-radius:10px;border:1px solid rgba(0,0,0,.14);background:rgba(255,255,255,.6);padding:0 14px;font-size:14px;outline:none;color:#1A2420;"></label>
          <label style="display:flex;flex-direction:column;gap:6px;"><span style="font-size:12px;font-weight:600;color:#64726B;">Confirm new password</span><input type="password" placeholder="••••••••" style="height:44px;border-radius:10px;border:1px solid rgba(0,0,0,.14);background:rgba(255,255,255,.6);padding:0 14px;font-size:14px;outline:none;color:#1A2420;"></label>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px;">
          <button (click)="close()" style="border:1px solid rgba(0,0,0,.14);background:rgba(255,255,255,.5);border-radius:9px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;color:#33413A;font-family:inherit;">Cancel</button>
          <button (click)="close()" class="btn-primary">Update password</button>
        </div>
      </div>
    </div>
  `,
})
export class ChangePasswordModalComponent {
  ui = inject(UiService);

  close() {
    this.ui.closePw();
  }
}
