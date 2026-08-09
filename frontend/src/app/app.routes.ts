import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./screens/auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./screens/auth/register/register.component').then((m) => m.RegisterComponent) },
  // Deliberately unguarded: a logged-in user clicking a verification link should see the
  // result rather than be bounced to the dashboard.
  { path: 'verify-email', loadComponent: () => import('./screens/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent) },
  { path: 'loading', loadComponent: () => import('./screens/loading/loading.component').then((m) => m.LoadingComponent) },
  { path: 'puzzle', loadComponent: () => import('./screens/puzzle/puzzle.component').then((m) => m.PuzzleComponent) },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      // Workspace
      { path: 'dashboard', loadComponent: () => import('./screens/workspace/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'onboarding', loadComponent: () => import('./screens/workspace/onboarding/onboarding.component').then((m) => m.OnboardingComponent) },
      { path: 'upload', loadComponent: () => import('./screens/workspace/upload/upload.component').then((m) => m.UploadComponent) },
      { path: 'review', loadComponent: () => import('./screens/workspace/review/review.component').then((m) => m.ReviewComponent) },
      { path: 'trust', loadComponent: () => import('./screens/workspace/trust/trust.component').then((m) => m.TrustComponent) },
      { path: 'export', loadComponent: () => import('./screens/workspace/export/export.component').then((m) => m.ExportComponent) },

      // Settings (shared)
      { path: 'settings', loadComponent: () => import('./screens/settings/settings.component').then((m) => m.SettingsComponent) },

      // Compliance Hub
      { path: 'compliance-hub/overview', loadComponent: () => import('./screens/compliance-hub/overview/overview.component').then((m) => m.ComplianceHubOverviewComponent) },
      { path: 'compliance-hub/ledger', loadComponent: () => import('./screens/compliance-hub/ledger/ledger.component').then((m) => m.ComplianceHubLedgerComponent) },
      { path: 'compliance-hub/arbitrage', loadComponent: () => import('./screens/compliance-hub/arbitrage/arbitrage.component').then((m) => m.ComplianceHubArbitrageComponent) },
      { path: 'compliance-hub/report', loadComponent: () => import('./screens/compliance-hub/report/report.component').then((m) => m.ComplianceHubReportComponent) },
      { path: 'compliance-hub/compliance', loadComponent: () => import('./screens/compliance-hub/compliance/compliance.component').then((m) => m.ComplianceHubComplianceComponent) },

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
