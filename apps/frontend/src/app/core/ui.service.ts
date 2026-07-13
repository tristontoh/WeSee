import { Injectable, signal } from '@angular/core';

export interface DialogConfig {
  title: string;
  body: string;
  confirmLabel: string;
}

export interface EvidenceData {
  claim: string;
  doc: string;
  page: string;
  snippet: string;
}

@Injectable({ providedIn: 'root' })
export class UiService {
  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  drawerSupplierId = signal<string | null>(null);
  evidence = signal<EvidenceData | null>(null);
  pwOpen = signal(false);
  dialog = signal<DialogConfig | null>(null);

  profileOpen = signal(false);
  notifOpen = signal(false);
  notifUnread = signal(true);
  searchOpen = signal(false);
  searchQuery = signal('');

  showToast(msg: string) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(msg);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2400);
  }

  openDrawer(id: string) {
    this.drawerSupplierId.set(id);
  }
  closeDrawer() {
    this.drawerSupplierId.set(null);
  }

  openEvidence(e: EvidenceData) {
    this.evidence.set(e);
  }
  closeEvidence() {
    this.evidence.set(null);
  }

  openPw() {
    this.pwOpen.set(true);
    this.profileOpen.set(false);
  }
  closePw() {
    this.pwOpen.set(false);
  }

  openDialog(cfg: DialogConfig) {
    this.dialog.set(cfg);
  }
  closeDialog() {
    this.dialog.set(null);
  }

  toggleProfile() {
    this.profileOpen.update((v) => !v);
  }
  closeProfile() {
    this.profileOpen.set(false);
  }

  toggleNotif() {
    this.notifOpen.update((v) => !v);
    this.notifUnread.set(false);
  }
  closeNotif() {
    this.notifOpen.set(false);
  }

  setSearchQuery(q: string) {
    this.searchQuery.set(q);
    this.searchOpen.set(true);
  }
  focusSearch() {
    if (this.searchQuery()) this.searchOpen.set(true);
  }
  closeSearch() {
    this.searchOpen.set(false);
  }
  clearSearch() {
    this.searchQuery.set('');
    this.searchOpen.set(false);
  }
}
