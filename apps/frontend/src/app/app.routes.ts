import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./screens/auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'loading', loadComponent: () => import('./screens/loading/loading.component').then((m) => m.LoadingComponent) },
  { path: 'puzzle', loadComponent: () => import('./screens/puzzle/puzzle.component').then((m) => m.PuzzleComponent) },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      // SME
      { path: 'dashboard', loadComponent: () => import('./screens/sme/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'onboarding', loadComponent: () => import('./screens/sme/onboarding/onboarding.component').then((m) => m.OnboardingComponent) },
      { path: 'upload', loadComponent: () => import('./screens/sme/upload/upload.component').then((m) => m.UploadComponent) },
      { path: 'review', loadComponent: () => import('./screens/sme/review/review.component').then((m) => m.ReviewComponent) },
      { path: 'trust', loadComponent: () => import('./screens/sme/trust/trust.component').then((m) => m.TrustComponent) },
      { path: 'export', loadComponent: () => import('./screens/sme/export/export.component').then((m) => m.ExportComponent) },

      // Settings (shared)
      { path: 'settings', loadComponent: () => import('./screens/settings/settings.component').then((m) => m.SettingsComponent) },

      // PLC
      { path: 'plc/overview', loadComponent: () => import('./screens/plc/overview/overview.component').then((m) => m.PlcOverviewComponent) },
      { path: 'plc/ledger', loadComponent: () => import('./screens/plc/ledger/ledger.component').then((m) => m.PlcLedgerComponent) },
      { path: 'plc/arbitrage', loadComponent: () => import('./screens/plc/arbitrage/arbitrage.component').then((m) => m.PlcArbitrageComponent) },
      { path: 'plc/report', loadComponent: () => import('./screens/plc/report/report.component').then((m) => m.PlcReportComponent) },
      { path: 'plc/compliance', loadComponent: () => import('./screens/plc/compliance/compliance.component').then((m) => m.PlcComplianceComponent) },

      // Admin
      { path: 'admin/tenants', loadComponent: () => import('./screens/admin/tenants/tenants.component').then((m) => m.AdminTenantsComponent) },
      { path: 'admin/mapping', loadComponent: () => import('./screens/admin/mapping/mapping.component').then((m) => m.AdminMappingComponent) },
      { path: 'admin/tokens', loadComponent: () => import('./screens/admin/tokens/tokens.component').then((m) => m.AdminTokensComponent) },
      { path: 'admin/audit', loadComponent: () => import('./screens/admin/audit/audit.component').then((m) => m.AdminAuditComponent) },
      { path: 'admin/support', loadComponent: () => import('./screens/admin/support/support.component').then((m) => m.AdminSupportComponent) },

      { path: '**', redirectTo: 'dashboard' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
