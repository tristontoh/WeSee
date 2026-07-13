import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AppStateService } from '../core/app-state.service';
import { UiService } from '../core/ui.service';
import { AuthService } from '../core/auth.service';
import { NOTIFICATIONS } from '../core/mock-data';
import { TenantKey } from '../core/nav';
import { ToastComponent } from '../overlays/toast.component';
import { SupplierDrawerComponent } from '../overlays/supplier-drawer.component';
import { EvidenceDrawerComponent } from '../overlays/evidence-drawer.component';
import { ChangePasswordModalComponent } from '../overlays/change-password-modal.component';
import { ConfirmDialogComponent } from '../overlays/confirm-dialog.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ToastComponent,
    SupplierDrawerComponent,
    EvidenceDrawerComponent,
    ChangePasswordModalComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  state = inject(AppStateService);
  ui = inject(UiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  notifications = NOTIFICATIONS;

  searchResults = computed(() => {
    const q = this.ui.searchQuery().trim().toLowerCase();
    if (!q) return [];
    return this.state.navItems().filter((n) => n.label.toLowerCase().includes(q));
  });

  searchNoResults = computed(
    () => this.ui.searchOpen() && !!this.ui.searchQuery().trim() && this.searchResults().length === 0,
  );

  isActive(path: string) {
    return this.state.currentUrl() === path;
  }

  setTenant(t: TenantKey) {
    this.state.setTenant(t);
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  onSearchInput(e: Event) {
    this.ui.setSearchQuery((e.target as HTMLInputElement).value);
  }

  goSearchResult(path: string) {
    this.router.navigateByUrl(path);
    this.ui.clearSearch();
  }

  openSettings() {
    this.ui.closeProfile();
    this.router.navigateByUrl('/settings');
  }

  goSettingsBilling() {
    this.ui.closeProfile();
    this.router.navigateByUrl('/settings?view=billing');
  }

  signOut() {
    this.ui.closeProfile();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
