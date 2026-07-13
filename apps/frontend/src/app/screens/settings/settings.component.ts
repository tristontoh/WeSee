import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppStateService } from '../../core/app-state.service';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:900px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 18px;letter-spacing:-.5px;">Settings</h1>

      <!-- tabs -->
      <div class="glass" style="display:inline-flex;align-items:center;gap:2px;border-radius:11px;padding:4px;margin-bottom:24px;">
        <button (click)="tab.set('account')" style="border:none;cursor:pointer;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;font-family:inherit;" [style.background]="tab()==='account' ? '#4C96B3' : 'transparent'" [style.color]="tab()==='account' ? '#fff' : '#64726B'">Account</button>
        <button (click)="tab.set('billing')" style="border:none;cursor:pointer;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;font-family:inherit;" [style.background]="tab()==='billing' ? '#4C96B3' : 'transparent'" [style.color]="tab()==='billing' ? '#fff' : '#64726B'">Billing</button>
      </div>

      <!-- ============ ACCOUNT ============ -->
      <div *ngIf="tab()==='account'" style="display:flex;flex-direction:column;gap:16px;">
        <div class="glass" style="border-radius:16px;padding:24px;">
          <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:18px;">PROFILE</div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:52px;height:52px;border-radius:50%;background:#629BB5;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:18px;flex-shrink:0;">{{ state.user().initials }}</div>
            <div style="min-width:0;">
              <div style="font-size:16px;font-weight:600;color:#1B2B24;">{{ state.user().name }}</div>
              <div style="font-size:12.5px;color:#8A968F;">{{ state.user().email }}</div>
            </div>
          </div>

          <div style="height:1px;background:rgba(0,0,0,.06);margin:4px 0 20px;"></div>

          <div style="font-size:12.5px;font-weight:600;color:#33413A;margin-bottom:8px;">Display name</div>
          <div *ngIf="!usernameEditing()" style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,.55);border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:12px 14px;">
            <div style="font-size:14px;color:#1A2420;">{{ state.user().name }}</div>
            <button (click)="startEdit()" class="hover-soft" style="border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.6);color:#33413A;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;">Edit</button>
          </div>
          <div *ngIf="usernameEditing()" style="display:flex;align-items:center;gap:10px;">
            <input [value]="usernameDraft()" (input)="usernameDraft.set($any($event.target).value)" placeholder="e.g. Chicken Noodle" style="flex:1;border:1px solid #CBDCDF;background:#fff;border-radius:9px;padding:11px 14px;font-size:14px;color:#1A2420;font-family:inherit;outline:none;">
            <button (click)="saveUsername()" class="btn-primary" style="border:none;padding:11px 16px;">Save</button>
            <button (click)="usernameEditing.set(false)" style="border:1px solid rgba(0,0,0,.1);background:none;color:#64726B;border-radius:9px;padding:11px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>
          </div>
          <div style="font-size:12px;color:#93A099;margin-top:10px;line-height:1.5;">This is how you're addressed across WeSee. It doesn't change your login email.</div>
        </div>

        <div class="glass" style="border-radius:16px;padding:24px;">
          <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:16px;">SECURITY</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-size:14px;font-weight:600;color:#1A2420;margin-bottom:3px;">Password</div>
              <div style="font-size:12.5px;color:#8A968F;">Change the password used to sign in.</div>
            </div>
            <button (click)="ui.openPw()" class="hover-soft" style="border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.6);color:#33413A;border-radius:8px;padding:9px 16px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit;">Change password</button>
          </div>
        </div>
      </div>

      <!-- ============ BILLING ============ -->
      <div *ngIf="tab()==='billing'">
        <div class="grid-collapse" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <!-- PlanCard -->
          <div class="glass" style="border-radius:16px;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><span style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;">CURRENT PLAN</span><span style="font-size:11px;font-weight:600;color:#4C96B3;background:#E4EEF0;padding:4px 10px;border-radius:12px;">Active</span></div>
            <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:4px;"><span style="font-family:'Work Sans',serif;font-size:40px;">RM19</span><span style="color:#8A968F;font-size:14px;">/month</span></div>
            <div style="font-size:13px;font-weight:600;margin-bottom:2px;">SME Starter</div>
            <div style="font-size:12.5px;color:#8A968F;margin-bottom:20px;">Renews 1 Aug 2026 · Visa ···· 4291</div>
            <button (click)="manageSubscription()" class="btn-frost" style="width:100%;justify-content:center;">Manage subscription</button>
          </div>
          <!-- BYOTokenHealthIndicator -->
          <div class="glass" style="border-radius:16px;padding:24px;">
            <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:16px;">AI KEY HEALTH · GEMINI FLASH</div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;"><span style="width:10px;height:10px;border-radius:50%;background:#4C96B3;box-shadow:0 0 0 4px rgba(110,120,216,.16);"></span><span style="font-size:15px;font-weight:600;">Key valid &amp; active</span></div>
            <div style="margin-bottom:8px;display:flex;justify-content:space-between;font-size:12.5px;color:#64726B;"><span>Quota used this month</span><span style="font-family:'Work Sans',monospace;font-weight:600;color:#1A2420;">62%</span></div>
            <div style="height:9px;border-radius:5px;background:#EEF1EC;overflow:hidden;margin-bottom:14px;"><div style="height:100%;width:62%;background:linear-gradient(90deg,#4C96B3,#A99FDB);border-radius:5px;"></div></div>
            <div style="font-size:12px;color:#93A099;">1.24M / 2M tokens · resets in 22 days</div>
          </div>
        </div>
        <!-- UpgradePrompt -->
        <div style="background:linear-gradient(140deg,#4D7E86,#3a5f66);border-radius:16px;padding:26px 28px;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px;">
          <div><div style="font-size:12px;font-weight:600;color:#C3B9F0;letter-spacing:.4px;margin-bottom:8px;">UNLOCK PLC COMMAND CENTER</div><div style="font-family:'Work Sans',serif;font-size:26px;margin-bottom:6px;">Ready to assure your own supply chain?</div><div style="font-size:13.5px;color:#A9C2B6;max-width:520px;line-height:1.5;">Upgrade to the PLC tier for supplier ledgers, AI sourcing arbitrage and multi-framework compliance exports.</div></div>
          <button (click)="seePlcPricing()" style="border:none;background:#fff;color:#4C96B3;border-radius:10px;padding:13px 24px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:inherit;">See PLC pricing</button>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  state = inject(AppStateService);
  ui = inject(UiService);
  private route = inject(ActivatedRoute);

  tab = signal<'account' | 'billing'>(this.route.snapshot.queryParamMap.get('view') === 'billing' ? 'billing' : 'account');

  usernameEditing = signal(false);
  usernameDraft = signal('');

  startEdit() {
    this.usernameDraft.set(this.state.user().name);
    this.usernameEditing.set(true);
  }

  saveUsername() {
    this.state.setUsername(this.usernameDraft());
    this.usernameEditing.set(false);
  }

  manageSubscription() {
    this.ui.showToast('Opening billing portal…');
  }

  seePlcPricing() {
    this.ui.showToast('PLC pricing details coming soon');
  }
}
