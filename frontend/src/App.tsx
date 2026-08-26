/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  HashRouter, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate, 
  useLocation 
} from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  ShieldCheck,
  Sliders,
  Target,
  FileText,
  Globe,
  Lock,
  KeyRound,
  Users,
  CreditCard,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  Sparkles,
  Info,
  Building,
  X,
  Headphones,
  BarChart3,
  Building2,
  Database,
  Ticket,
  Package,
  ScrollText,
  Zap,
  FileUp,
  FolderOpen
} from 'lucide-react';

import { PlanProvider, usePlan, PlanType } from './contexts/PlanContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { Role, canAccess, hasPermission, MANAGEMENT_ROLES, PLATFORM_ROLES, TENANT_ROLES } from './permissions';
import { CAPABILITIES } from './capabilities';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AcceptInvitePage from './components/AcceptInvitePage';
import VerifyEmailPage from './components/VerifyEmailPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import OnboardingPage from './components/OnboardingPage';
import UpgradeGate from './components/ui/UpgradeGate';
import AuthTopBar from './components/ui/AuthTopBar';
import AskAiPanel from './components/ai/AskAiPanel';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import FeaturesPage from './components/FeaturesPage';
import PricingPage from './components/PricingPage';
import AboutPage from './components/AboutPage';

import MaterialityAssessmentView from './components/MaterialityAssessmentView';
import GovernanceView from './components/GovernanceView';
import IndicatorsView from './components/IndicatorsView';
import EmissionActivityView from './components/EmissionActivityView';
import ExtractionUploadView from './components/ExtractionUploadView';
import DocumentsView from './components/DocumentsView';
import DocumentDetailView from './components/DocumentDetailView';
import IfrsS1S2View from './components/IfrsS1S2View';
import AssuranceWorkspaceView from './components/AssuranceWorkspaceView';
import ApiAccessView from './components/ApiAccessView';
import ReportsExportView from './components/ReportsExportView';
import AdminPanel from './components/AdminPanel';
import TargetsView from './components/TargetsView';
import SupportTicketsView from './components/SupportTicketsView';
import ProfileView from './components/ProfileView';
import TeamView from './components/TeamView';
import AuditLogView from './components/AuditLogView';
import CompanyDetailsView from './components/settings/CompanyDetailsView';

// Import all sub-views from PlaceholderViews
import {
  SettingsView
} from './components/PlaceholderViews';

/**
 * Resets scroll on navigation. The browser does not do this for a hash change, so moving between
 * marketing pages otherwise lands the reader wherever they happened to be on the previous one.
 *
 * The "back to Landing, then scroll to a section" links still work: they navigate first and scroll
 * on a timeout, which lands after this effect rather than being undone by it.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

/**
 * 1. Authenticated Layout Component (Sidebar + TopBar + Main Area Wrapper)
 */
function AuthenticatedLayout({ children, allowedRoles, requiredPermissions }: { children: React.ReactNode; allowedRoles?: Role[]; requiredPermissions?: string[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan, hasFeature, isFeatureVisible } = usePlan();
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const { showToast } = useToast();

  // Declared before any early return below so hook order stays stable across renders
  // (e.g. logging out flips isAuthenticated on this same mounted component).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-app-mesh text-gray-400 text-sm">
        Loading workspace…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Platform-level roles have no company, so the onboarding flow (which sets up a tenant's
  // market/sector) doesn't apply to them.
  const requiresOnboarding = user && !user.onboardingCompleted && !canAccess(user.role, PLATFORM_ROLES);
  if (requiresOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Platform-wide "require 2FA for all users" toggle (Platform Settings → Security) — every role
  // can reach /profile, which is where 2FA enrollment lives, so redirect there until they enroll.
  const requiresMfaSetup = user && user.mfaSetupRequired;
  if (requiresMfaSetup && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  const isPlatformAdmin = canAccess(user?.role, PLATFORM_ROLES);
  const hasRequiredPermission = !requiredPermissions
    || requiredPermissions.some((key) => hasPermission(user?.role, user?.permissions, key));
  const hasPageAccess = canAccess(user?.role, allowedRoles) && hasRequiredPermission;

  const userInitials = user?.name 
    ? user.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() 
    : 'SV';

  // Calculate current page breadcrumbs based on pathname
  const getBreadcrumbs = () => {
    const path = location.pathname.substring(1) || 'dashboard';
    const mapping: Record<string, string> = {
      'dashboard': 'Dashboard',
      'materiality': 'Materiality Assessment',
      'governance': 'Compliance',
      'indicators': 'ESG Indicators',
      'activity': 'Emission Activity',
      'extraction': 'Document Extraction',
      'documents': 'Documents',
      'targets': 'Targets & Decarbonization',
      'reports': 'Reports & Export',
      'support': 'Feedback & Support',
      'ifrs-s1-s2': 'IFRS S1/S2 Module',
      'assurance-workspace': 'Assurance Workspace',
      'api-access': 'API Access',
      'team': 'Team Directory',
      'audit-log': 'Audit Log',
      'settings': 'Settings',
      'profile': 'My Profile',
      'admin/overview': 'Platform Admin — Overview',
      'admin/tenants': 'Platform Admin — Tenant Companies',
      'admin/reference': 'Platform Admin — Reference Frameworks',
      'admin/billing': 'Platform Admin — Subscriptions & Invoices',
      'admin/support': 'Platform Admin — Feedback & Support',
      'admin/plans': 'Platform Admin — Plan Management',
      'admin/audit-log': 'Platform Admin — Audit Log',
      'admin/settings': 'Platform Admin — Settings'
    };

    if (path.startsWith('settings/companies/')) {
      return ['Workspace', 'Settings', 'Company Details'];
    }

    if (path.startsWith('documents/')) {
      return ['Workspace', 'Documents', 'Document'];
    }

    return ['Workspace', mapping[path] || path];
  };

  // Nav categories & items
  const mainMenuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/dashboard' },
    { key: 'materiality', label: 'Materiality', icon: <Compass className="w-4 h-4" />, path: '/materiality' },
    { key: 'indicators', label: 'Indicators', icon: <Sliders className="w-4 h-4" />, path: '/indicators' },
    // Activity, then the two extraction screens: a bill uploaded there proposes an activity entry
    // and an indicator value, so it belongs beside the screens those land in. Not plan-gated —
    // reading a document is available at every tier, same as manual entry.
    { key: 'activity', label: 'Emission Activity', icon: <Zap className="w-4 h-4" />, path: '/activity' },
    { key: 'extraction', label: 'Document Extraction', icon: <FileUp className="w-4 h-4" />, path: '/extraction' },
    { key: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" />, path: '/documents' },
    { key: 'targets', label: 'Targets', icon: <Target className="w-4 h-4" />, path: '/targets', gated: true },
    { key: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" />, path: '/reports' },
  ];

  const managementsItems = [
    { key: 'governance', label: 'Compliance', icon: <ShieldCheck className="w-4 h-4" />, path: '/governance', gated: true },
    { key: 'ifrs-s1-s2', label: 'IFRS S1/S2', icon: <Globe className="w-4 h-4" />, path: '/ifrs-s1-s2', premiumOnly: true },
    { key: 'assurance-workspace', label: 'Assurance Workspace', icon: <Lock className="w-4 h-4" />, path: '/assurance-workspace', premiumOnly: true },
    { key: 'api-access', label: 'API Access', icon: <KeyRound className="w-4 h-4" />, path: '/api-access' },
    { key: 'team', label: 'Team', icon: <Users className="w-4 h-4" />, path: '/team', requiresAnyPermission: ['team.view', 'team.manage', 'roles.view', 'roles.manage'] },
    { key: 'audit-log', label: 'Audit Log', icon: <ScrollText className="w-4 h-4" />, path: '/audit-log', requiresCapability: 'activityLog' as const, requiresAnyPermission: ['audit_log.view'] },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, path: '/settings', requiresManagement: true },
  ];

  const platformItems = [
    { key: 'admin-overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" />, path: '/admin/overview' },
    { key: 'admin-tenants', label: 'Tenant Companies', icon: <Building2 className="w-4 h-4" />, path: '/admin/tenants' },
    { key: 'admin-reference', label: 'Reference Frameworks', icon: <Database className="w-4 h-4" />, path: '/admin/reference' },
    { key: 'admin-billing', label: 'Subscriptions & Invoices', icon: <CreditCard className="w-4 h-4" />, path: '/admin/billing' },
    { key: 'admin-support', label: 'Feedback & Support', icon: <Ticket className="w-4 h-4" />, path: '/admin/support' },
    { key: 'admin-plans', label: 'Plan Management', icon: <Package className="w-4 h-4" />, path: '/admin/plans' },
    { key: 'admin-settings', label: 'Platform Settings', icon: <Settings className="w-4 h-4" />, path: '/admin/settings' },
  ];

  const canManageWorkspace = canAccess(user?.role, MANAGEMENT_ROLES);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-mesh text-gray-900 font-sans">
      
      {/*
        Below lg the sidebar is a drawer, not a column. At 256px fixed it left a 430px window about
        170px for its content, and the shell clips overflow, so the page was not merely cramped —
        parts of it could not be reached at all.

        Frosted rather than solid: the page background is a fixed gradient wash, and frosting lets
        that one continuous field read across the whole window instead of stopping at a white
        column. Same reason on AuthTopBar.
      */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-[#0A0E27]/40 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={`bg-white/55 backdrop-blur-xl border-r border-white/60 flex flex-col h-full transition-all duration-300 z-50 shrink-0
          fixed inset-y-0 left-0 lg:static lg:z-40
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-64 lg:w-20' : 'w-64'}`}
      >
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
          aria-label={sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
          className="hidden lg:flex absolute top-8 -right-3 w-6 h-6 items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm text-gray-400 hover:text-gray-800 hover:border-gray-300 transition-colors cursor-pointer z-50"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Sidebar Header */}
        <div className="h-[72px] flex items-center px-6 border-b border-transparent shrink-0">
          <div className="flex items-center space-x-3 w-full">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm font-black text-sm shrink-0 border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-gray-900 text-lg truncate">WeSee</span>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">

          {isPlatformAdmin ? (
            /* Platform Admin Section — platform admins have no company context, so tenant
               data views (dashboard, materiality, etc.) don't apply to them. */
            <div className="mb-6">
              {!sidebarCollapsed && <h3 className="px-3 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Platform</h3>}
              <nav className="space-y-1">
                {platformItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } ${sidebarCollapsed ? 'justify-center' : ''}`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <div className={`${isActive ? 'text-emerald-500' : 'text-gray-400'} shrink-0`}>
                        {item.icon}
                      </div>
                      {!sidebarCollapsed && (
                        <span className="ml-3 truncate">{item.label}</span>
                      )}
                      {isActive && !sidebarCollapsed && (
                        <div className="ml-auto w-1 h-5 bg-emerald-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ) : (
            <>
              {/* Main Menu Section */}
              <div className="mb-6">
                {!sidebarCollapsed && <h3 className="px-3 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Main menu</h3>}
                <nav className="space-y-1">
                  {mainMenuItems.map(item => {
                    if (item.gated && !isFeatureVisible(item.key)) return null;
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.key}
                        onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                        className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <div className={`${isActive ? 'text-emerald-500' : 'text-gray-400'} shrink-0`}>
                          {item.icon}
                        </div>
                        {!sidebarCollapsed && (
                          <span className="ml-3 truncate">{item.label}</span>
                        )}
                        {isActive && !sidebarCollapsed && (
                          <div className="ml-auto w-1 h-5 bg-emerald-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Managements Section */}
              <div className="mb-6">
                {!sidebarCollapsed && <h3 className="px-3 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Managements</h3>}
                <nav className="space-y-1">
                  {managementsItems.map(item => {
                    if (item.gated && !isFeatureVisible(item.key)) return null;
                    if (item.requiresManagement && !canManageWorkspace) return null;
                    if (item.requiresCapability && !CAPABILITIES[item.requiresCapability]) return null;
                    if (item.requiresAnyPermission && !item.requiresAnyPermission.some((key) => hasPermission(user?.role, user?.permissions, key))) return null;
                    if (item.premiumOnly && plan !== 'issuer-ready') return null;
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.key}
                        onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                        className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <div className={`${isActive ? 'text-emerald-500' : 'text-gray-400'} shrink-0`}>
                          {item.icon}
                        </div>
                        {!sidebarCollapsed && (
                          <span className="ml-3 truncate">{item.label}</span>
                        )}
                        {!sidebarCollapsed && item.premiumOnly && (
                           <span className="ml-auto bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">New</span>
                        )}
                        {isActive && !sidebarCollapsed && !item.premiumOnly && (
                          <div className="ml-auto w-1 h-5 bg-emerald-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          {!sidebarCollapsed && !isPlatformAdmin && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
               <button
                 className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
               >
                 <X className="w-4 h-4" />
               </button>
               <div className="flex items-center space-x-2 mb-2 text-gray-900 font-semibold text-sm">
                 <Headphones className="w-4 h-4" />
                 <span>Need support</span>
               </div>
               <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                 Contact with one of our expert to get support.
               </p>
               <button
                 onClick={() => navigate('/support', { state: { openNewTicket: true } })}
                 className="w-full py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
               >
                 Call the Expert
               </button>
            </div>
          )}

        </div>
      </aside>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Dynamic TopBar */}
        <AuthTopBar
          onMenuClick={() => setMobileNavOpen(true)}
          onNotificationClick={() => showToast('Notification center is simulated in this ESG Sandbox.', 'info')}
          onSearchChange={(val) => console.log('Simulated ESG search query: ', val)}
          onAskAIClick={CAPABILITIES.ai ? () => setAskAiOpen(true) : undefined}
        />
        {CAPABILITIES.ai && <AskAiPanel open={askAiOpen} onClose={() => setAskAiOpen(false)} />}

        {/* Scrollable Children Body */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 md:p-8">
          {hasPageAccess && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold mb-4">
              {getBreadcrumbs().map((crumb, index, arr) => {
                const isLast = index === arr.length - 1;
                return (
                  <React.Fragment key={`${crumb}-${index}`}>
                    {index > 0 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
                    <span className={isLast ? 'text-gray-900' : 'text-gray-400'}>{crumb}</span>
                  </React.Fragment>
                );
              })}
            </nav>
          )}
          {hasPageAccess ? children : (
            <div className="flex flex-col items-center justify-center text-center py-24 px-6 bg-white border border-gray-100 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">You don't have access to this page</h2>
              <p className="text-sm text-gray-500 max-w-sm">
                This area is restricted based on your account role. Contact your workspace admin if you believe this is a mistake.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * Maps each route to its browser tab title. Falls back to the bare brand name for
 * anything unmapped (e.g. the settings/companies/:companyId detail route).
 */
const PAGE_TITLES: Record<string, string> = {
  '/': 'ESG Reporting & Bursa Malaysia Compliance Software',
  '/features': 'Platform Features',
  '/pricing': 'Pricing',
  '/about': 'About',
  '/login': 'Log In',
  '/register': 'Create Account',
  '/accept-invite': 'Accept Invite',
  '/verify-email': 'Verify Email',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/onboarding': 'Onboarding',
  '/dashboard': 'Dashboard',
  '/materiality': 'Materiality Assessment',
  '/governance': 'Compliance',
  '/indicators': 'ESG Indicators',
  '/activity': 'Emission Activity',
  '/extraction': 'Document Extraction',
  '/documents': 'Documents',
  '/targets': 'Targets & Decarbonization',
  '/reports': 'Reports & Export',
  '/support': 'Feedback & Support',
  '/ifrs-s1-s2': 'IFRS S1/S2 Module',
  '/assurance-workspace': 'Assurance Workspace',
  '/api-access': 'API Access',
  '/team': 'Team Directory',
  '/audit-log': 'Audit Log',
  '/settings': 'Settings',
  '/profile': 'My Profile',
  '/admin/overview': 'Platform Admin — Overview',
  '/admin/tenants': 'Platform Admin — Tenant Companies',
  '/admin/reference': 'Platform Admin — Reference Frameworks',
  '/admin/billing': 'Platform Admin — Subscriptions & Invoices',
  '/admin/support': 'Platform Admin — Feedback & Support',
  '/admin/plans': 'Platform Admin — Plan Management',
  '/admin/audit-log': 'Platform Admin — Audit Log',
  '/admin/settings': 'Platform Admin — Settings',
};

function usePageTitle() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const label = PAGE_TITLES[path] ?? (path.startsWith('/settings/companies/') ? 'Company Details' : undefined);

    document.title = label ? `WeSee - ${label}` : 'WeSee';
  }, [location.pathname]);
}

/**
 * 2. Main App Content Switcher mapping React Router URL state
 */
function AppContent() {
  const navigate = useNavigate();
  usePageTitle();

  return (
    <Routes>
      {/* Superadmin Panel — sections are separate routes so the sidebar can navigate/highlight them */}
      <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
      <Route
        path="/admin/overview"
        element={
          <AuthenticatedLayout allowedRoles={PLATFORM_ROLES}>
            <AdminPanel />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/admin/tenants"
        element={
          <AuthenticatedLayout allowedRoles={PLATFORM_ROLES}>
            <AdminPanel />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/admin/reference"
        element={
          <AuthenticatedLayout allowedRoles={PLATFORM_ROLES}>
            <AdminPanel />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/admin/billing"
        element={
          <AuthenticatedLayout allowedRoles={PLATFORM_ROLES}>
            <AdminPanel />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/admin/support"
        element={
          <AuthenticatedLayout allowedRoles={PLATFORM_ROLES}>
            <AdminPanel />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/admin/plans"
        element={
          <AuthenticatedLayout allowedRoles={PLATFORM_ROLES}>
            <AdminPanel />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          CAPABILITIES.activityLog ? (
            <AuthenticatedLayout allowedRoles={PLATFORM_ROLES}>
              <AdminPanel />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/admin/overview" replace />
          )
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AuthenticatedLayout allowedRoles={PLATFORM_ROLES}>
            <AdminPanel />
          </AuthenticatedLayout>
        }
      />

      {/* Standalone Authentication & Onboarding Gateway Pages */}
      <Route 
        path="/login" 
        element={<LoginPage />} 
      />
      <Route
        path="/register"
        element={<RegisterPage />}
      />
      <Route
        path="/accept-invite"
        element={<AcceptInvitePage />}
      />
      <Route
        path="/verify-email"
        element={<VerifyEmailPage />}
      />
      {/* Reachable only by typed URL while the reset endpoints are absent — see capabilities.ts. */}
      <Route
        path="/forgot-password"
        element={CAPABILITIES.passwordReset ? <ForgotPasswordPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/reset-password"
        element={CAPABILITIES.passwordReset ? <ResetPasswordPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/onboarding"
        element={<OnboardingPage />} 
      />

      {/* Public Pages */}
      <Route
        path="/"
        element={
          <LandingPage
            onNavigateToDashboard={() => navigate('/dashboard')}
            onNavigateToFeatures={() => navigate('/features')}
            onNavigateToPricing={() => navigate('/pricing')}
            onNavigateToAbout={() => navigate('/about')}
            onNavigateToLogin={() => navigate('/login')}
            onNavigateToRegister={() => navigate('/register')}
          />
        }
      />
      <Route
        path="/features"
        element={
          <FeaturesPage
            onNavigateToDashboard={() => navigate('/dashboard')}
            onNavigateToPricing={() => navigate('/pricing')}
            onNavigateToAbout={() => navigate('/about')}
            onNavigateToLanding={(section) => {
              navigate('/');
              if (section) {
                setTimeout(() => {
                  const el = document.getElementById(section);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 150);
              }
            }}
          />
        }
      />
      <Route
        path="/pricing"
        element={
          <PricingPage
            onNavigateToDashboard={() => navigate('/dashboard')}
            onNavigateToFeatures={() => navigate('/features')}
            onNavigateToAbout={() => navigate('/about')}
            onNavigateToLanding={(section) => {
              navigate('/');
              if (section) {
                setTimeout(() => {
                  const el = document.getElementById(section);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 150);
              }
            }}
          />
        }
      />
      <Route
        path="/about"
        element={
          <AboutPage
            onNavigateToDashboard={() => navigate('/dashboard')}
            onNavigateToFeatures={() => navigate('/features')}
            onNavigateToPricing={() => navigate('/pricing')}
            onNavigateToLanding={(section) => {
              navigate('/');
              if (section) {
                setTimeout(() => {
                  const el = document.getElementById(section);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 150);
              }
            }}
          />
        }
      />

      {/* Authenticated Pages Layout Wrappers */}
      <Route
        path="/dashboard"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <Dashboard />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/materiality"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <MaterialityAssessmentView />
          </AuthenticatedLayout>
        }
      />

      {/* Gated Governance Route (Growth requirement) */}
      <Route
        path="/governance"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <UpgradeGate feature="governance" variant="page" onUpgrade={() => navigate('/settings?tab=billing')}>
              <GovernanceView />
            </UpgradeGate>
          </AuthenticatedLayout>
        }
      />

      <Route
        path="/indicators"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <IndicatorsView />
          </AuthenticatedLayout>
        }
      />

      <Route
        path="/activity"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <EmissionActivityView />
          </AuthenticatedLayout>
        }
      />

      {/* Uploading and reviewing are two screens: /extraction takes the file, /documents lists what
          came back, and /documents/:id shows the source beside the figures read from it. */}
      <Route
        path="/extraction"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <ExtractionUploadView />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/documents"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <DocumentsView />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <DocumentDetailView />
          </AuthenticatedLayout>
        }
      />

      {/* Gated Targets Route (Growth requirement) */}
      <Route
        path="/targets"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <UpgradeGate feature="targets" variant="page" onUpgrade={() => navigate('/settings?tab=billing')}>
              <TargetsView />
            </UpgradeGate>
          </AuthenticatedLayout>
        }
      />

      <Route
        path="/reports"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <ReportsExportView />
          </AuthenticatedLayout>
        }
      />

      <Route
        path="/support"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <SupportTicketsView />
          </AuthenticatedLayout>
        }
      />

      {/* No allowedRoles — every authenticated role (tenant or platform) can reach their own profile */}
      <Route
        path="/profile"
        element={
          <AuthenticatedLayout>
            <ProfileView />
          </AuthenticatedLayout>
        }
      />

      {/* Premium Specific Routes (Only accessed if Issuer-Ready is active, but safeguard with UpgradeGate too) */}
      <Route
        path="/ifrs-s1-s2"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <UpgradeGate feature="ifrs-s1-s2" onUpgrade={() => navigate('/settings?tab=billing')}>
              <IfrsS1S2View />
            </UpgradeGate>
          </AuthenticatedLayout>
        }
      />
      {/* Retired duplicate placeholder — the real Scope 1/2/3 GHG ledger lives at /ifrs-s1-s2 */}
      <Route path="/climate-module" element={<Navigate to="/ifrs-s1-s2" replace />} />
      <Route
        path="/assurance-workspace"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <UpgradeGate feature="assurance-workspace" onUpgrade={() => navigate('/settings?tab=billing')}>
              <AssuranceWorkspaceView />
            </UpgradeGate>
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/api-access"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES}>
            <ApiAccessView />
          </AuthenticatedLayout>
        }
      />
      {/* Retired duplicate placeholder — the real CSI-Compatible Export lives on /reports */}
      <Route path="/csi-export" element={<Navigate to="/reports" replace />} />

      {/* Company Pages */}
      <Route
        path="/team"
        element={
          <AuthenticatedLayout allowedRoles={TENANT_ROLES} requiredPermissions={['team.view', 'team.manage', 'roles.view', 'roles.manage']}>
            <TeamView />
          </AuthenticatedLayout>
        }
      />
      {/* Reachable only by typed URL while the activity-log endpoints are absent — see capabilities.ts. */}
      <Route
        path="/audit-log"
        element={
          CAPABILITIES.activityLog ? (
            <AuthenticatedLayout allowedRoles={TENANT_ROLES} requiredPermissions={['audit_log.view']}>
              <AuditLogView />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      {/* Billing now lives inside Profile & Settings — redirect the old standalone route there. */}
      <Route path="/billing" element={<Navigate to="/settings?tab=billing" replace />} />
      {/* No allowedRoles — every authenticated role can reach Profile & Settings; SettingsView itself
          hides admin-only sub-tabs (e.g. SMTP) internally based on role. */}
      <Route
        path="/settings"
        element={
          <AuthenticatedLayout>
            <SettingsView />
          </AuthenticatedLayout>
        }
      />
      <Route
        path="/settings/companies/:companyId"
        element={
          <AuthenticatedLayout allowedRoles={MANAGEMENT_ROLES}>
            <CompanyDetailsView />
          </AuthenticatedLayout>
        }
      />

      {/* Fallback routing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * 3. Core App Entrance wrapping Provider and Router
 */
function AppWithAuth() {
  const { plan, setPlan } = usePlan();
  return (
    <AuthProvider currentPlan={plan} setWorkspacePlan={setPlan}>
      <HashRouter>
        <ScrollToTop />
        {/* Wraps the routed screens so each can register how to reload itself, and the top bar's
            refresh control can call them. */}
        <RefreshProvider>
          <AppContent />
        </RefreshProvider>
      </HashRouter>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <PlanProvider>
        <AppWithAuth />
      </PlanProvider>
    </ToastProvider>
  );
}
