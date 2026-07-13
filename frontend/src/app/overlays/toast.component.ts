import { Component, inject } from '@angular/core';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div
      style="position:fixed;left:50%;bottom:28px;z-index:400;background:#1A2420;color:#fff;padding:12px 20px;border-radius:12px;font-size:13.5px;font-weight:500;box-shadow:0 14px 34px rgba(0,0,0,.25);pointer-events:none;max-width:360px;text-align:center;transition:opacity .25s ease,transform .25s ease;"
      [style.transform]="'translateX(-50%) translateY(' + (ui.toast() ? '0px' : '10px') + ')'"
      [style.opacity]="ui.toast() ? 1 : 0"
    >{{ ui.toast() }}</div>
  `,
})
export class ToastComponent {
  ui = inject(UiService);
}
