import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./screens/auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./screens/auth/register/register.component').then((m) => m.RegisterComponent) },
  // Deliberately unguarded: a logged-in user clicking a verification link should see the
  // result rather than be bounced to the dashboard.
  { path: 'verify-email', loadComponent: () => import('./screens/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent) },
  // Also unguarded: an invited person may already be signed in as someone else.
  { path: 'accept-invite', loadComponent: () => import('./screens/auth/accept-invite/accept-invite.component').then((m) => m.AcceptInviteComponent) },
  { path: 'loading', loadComponent: () => import('./screens/loading/loading.component').then((m) => m.LoadingComponent) },
  { path: 'puzzle', loadComponent: () => import('./screens/puzzle/puzzle.component').then((m) => m.PuzzleComponent) },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'indicators' },

      // Workspace
      { path: 'dashboard', loadComponent: () => import('./screens/workspace/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'indicators', loadComponent: () => import('./screens/workspace/indicators/indicators.component').then((m) => m.IndicatorsComponent) },
      { path: 'activity', loadComponent: () => import('./screens/workspace/activity/activity.component').then((m) => m.ActivityComponent) },
      { path: 'ifrs', loadComponent: () => import('./screens/workspace/ifrs/ifrs.component').then((m) => m.IfrsComponent) },
      { path: 'materiality', loadComponent: () => import('./screens/workspace/materiality/materiality.component').then((m) => m.MaterialityComponent) },
      { path: 'governance', loadComponent: () => import('./screens/workspace/governance/governance.component').then((m) => m.GovernanceComponent) },
      { path: 'targets', loadComponent: () => import('./screens/workspace/targets/targets.component').then((m) => m.TargetsComponent) },
      { path: 'assurance', loadComponent: () => import('./screens/workspace/assurance/assurance.component').then((m) => m.AssuranceComponent) },
      { path: 'onboarding', loadComponent: () => import('./screens/workspace/onboarding/onboarding.component').then((m) => m.OnboardingComponent) },
      { path: 'export', loadComponent: () => import('./screens/workspace/export/export.component').then((m) => m.ExportComponent) },

      // Settings (shared)
      { path: 'settings', loadComponent: () => import('./screens/settings/settings.component').then((m) => m.SettingsComponent) },
      { path: 'account', loadComponent: () => import('./screens/account/account.component').then((m) => m.AccountComponent) },

      // Company
      { path: 'team', loadComponent: () => import('./screens/company/team/team.component').then((m) => m.TeamComponent) },
      { path: 'group', loadComponent: () => import('./screens/company/group/group.component').then((m) => m.GroupComponent) },

      // Admin
      { path: 'admin/tenants', loadComponent: () => import('./screens/admin/tenants/tenants.component').then((m) => m.AdminTenantsComponent) },
      { path: 'admin/platform', loadComponent: () => import('./screens/admin/platform/platform.component').then((m) => m.AdminPlatformComponent) },
      { path: 'admin/support', loadComponent: () => import('./screens/admin/support/support.component').then((m) => m.AdminSupportComponent) },

      { path: '**', redirectTo: 'indicators' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
