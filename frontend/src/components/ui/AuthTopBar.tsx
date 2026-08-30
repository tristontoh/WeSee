/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, RefreshCw, ChevronDown, Settings, LogOut, LifeBuoy, Building2, Check, Sparkles, Menu } from 'lucide-react';
import { usePlan, PlanType } from '../../contexts/PlanContext';
import { useAuth } from '../../contexts/AuthContext';
import { canAccess, hasPermission, TENANT_ROLES, MANAGEMENT_ROLES } from '../../permissions';
import { CAPABILITIES } from '../../capabilities';
import { companyApi, CompanyGroupMember } from '../../api/companyApi';
import { useRefreshControl } from '../../contexts/RefreshContext';

interface AuthTopBarProps {
  /** Opens the sidebar drawer. Only rendered below lg, where the sidebar is off-canvas. */
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onAskAIClick?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
}

export default function AuthTopBar({
  onMenuClick,
  onNotificationClick,
  onAskAIClick,
  searchValue = '',
  onSearchChange,
}: AuthTopBarProps) {
  const navigate = useNavigate();
  const { plan } = usePlan();
  const { user, logout } = useAuth();
  const { refresh, refreshing } = useRefreshControl();
  const [value, setValue] = useState(searchValue);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const canSwitchCompany = canAccess(user?.role, MANAGEMENT_ROLES);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<CompanyGroupMember[]>([]);
  const [switchingCompanyId, setSwitchingCompanyId] = useState<string | null>(null);
  const companyMenuRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  // ⌘K opens the Ask AI panel (falls back to focusing search if the assistant isn't available to this user)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (onAskAIClick) {
          onAskAIClick();
        } else {
          document.getElementById('ask-ai-input')?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAskAIClick]);

  // Close the profile menu when clicking anywhere outside it
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  // Company admins can switch between the companies in their group (see Settings > Companies)
  useEffect(() => {
    if (!canSwitchCompany) return;
    companyApi.getGroup().then(setCompanyMembers).catch(() => setCompanyMembers([]));
  }, [canSwitchCompany]);

  useEffect(() => {
    if (!companyMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node)) {
        setCompanyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [companyMenuOpen]);

  const currentCompanyName = companyMembers.find((m) => m.current)?.name ?? user?.company ?? 'Workspace';

  const handleSwitchCompany = (member: CompanyGroupMember) => {
    if (member.current || switchingCompanyId) return;
    setSwitchingCompanyId(member.id);
    companyApi.switchCompany(member.id)
      .then(() => window.location.reload())
      .catch(() => setSwitchingCompanyId(null));
  };

  const userInitials = user?.name
    ? user.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'SV';

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    // Frosted rather than solid — see the sidebar in App.tsx for why.
    <header className="w-full flex items-center justify-between py-3 px-4 sm:px-6 lg:px-8 bg-white/40 backdrop-blur-xl border-b border-white/50 sticky top-0 z-35 font-sans h-[72px] shrink-0">
      
      {/* 1. Left-aligned Search input + Ask AI */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {/* The only way to reach the nav below lg, where the sidebar is a drawer. */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="lg:hidden shrink-0 p-2 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100/70 rounded-full transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative w-full max-w-md group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="ask-ai-input"
            type="text"
            placeholder="Search"
            value={value}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-2 text-sm text-gray-800 bg-gray-50 border border-transparent hover:bg-gray-100 focus:bg-white rounded-full outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-150"
          />
        </div>

        {CAPABILITIES.ai && hasPermission(user?.role, user?.permissions, 'ai.use') && (
          <button
            onClick={onAskAIClick}
            title="Ask AI (⌘K)"
            aria-label="Ask AI"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        )}
      </div>

      {/* 2. Right-side items */}
      <div className="flex items-center gap-1 sm:gap-3 lg:gap-4 shrink-0">

        {/* Company Switcher */}
        {canSwitchCompany && (
          <div className="relative" ref={companyMenuRef}>
            <button
              onClick={() => setCompanyMenuOpen((open) => !open)}
              className="flex items-center space-x-1.5 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-full transition-colors cursor-pointer max-w-[200px]"
              aria-label="Switch company"
              aria-expanded={companyMenuOpen}
            >
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">{currentCompanyName}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${companyMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {companyMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-lg py-2 z-40 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Switch Company</p>
                </div>
                <div className="py-1 max-h-72 overflow-y-auto">
                  {companyMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSwitchCompany(member)}
                      disabled={switchingCompanyId === member.id}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:opacity-60 cursor-pointer transition-colors"
                    >
                      <span className="truncate">{member.name}</span>
                      {member.current ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : switchingCompanyId === member.id ? (
                        <span className="text-[10px] text-gray-400 shrink-0">Switching…</span>
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="pt-1 mt-1 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setCompanyMenuOpen(false);
                      navigate('/settings?tab=company');
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-2.5 text-gray-400" />
                    Manage Companies
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Was decorative — no handler at all, so a record deleted elsewhere stayed on screen
            until a full page load. Now it re-fetches whatever the current screen registered. */}
        <button
          onClick={refresh}
          disabled={refreshing}
          title="Refresh this page's data"
          aria-label="Refresh"
          className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-all cursor-pointer disabled:cursor-default"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>

        {/* Notifications Bell */}
        <button
          onClick={onNotificationClick}
          className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-all relative cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* User Profile */}
        <div className="relative pl-2" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-full transition-colors"
            aria-label="Profile menu"
            aria-expanded={profileMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden">
              {userInitials}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-lg py-2 z-40 animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name ?? 'User'}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2.5 text-gray-400" />
                  Profile & Settings
                </button>

                {canAccess(user?.role, TENANT_ROLES) && (
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/support');
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <LifeBuoy className="w-4 h-4 mr-2.5 text-gray-400" />
                    Feedback & Support
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2.5" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
