/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PlanType } from './PlanContext';
import { authApi, MeResponse } from '../api/authApi';
import { tokenStore } from '../api/tokenStore';
import { ApiError, setUnauthorizedHandler } from '../api/client';
import { planFromBackend, marketFromBackend, marketToBackend, FrontendMarket } from '../api/mappers';
import { Role } from '../permissions';

export interface UserProfile {
  name: string;
  email: string;
  company: string;
  /** Backend sector code (e.g. "MANUFACTURING"), not a display name. */
  sector: string;
  market: FrontendMarket;
  frameworks: string[];
  priorities: string[];
  plan: PlanType;
  role: Role;
  onboardingCompleted: boolean;
  phone: string;
  dateOfBirth: string;
  address: string;
  bio: string;
  hasAvatar: boolean;
  mfaSetupRequired: boolean;
  /**
   * Effective custom-role permission keys (empty for COMPANY_ADMIN — see permissions.hasPermission).
   * `undefined` when the backend does not implement per-company RBAC at all, which is a different
   * thing from a user who was granted nothing; hasPermission() treats the two differently.
   */
  permissions: Set<string> | undefined;
}

function toUserProfile(me: MeResponse): UserProfile {
  return {
    name: me.name,
    email: me.email,
    company: me.companyName ?? '',
    sector: me.sectorCode ?? '',
    market: me.market ? marketFromBackend(me.market) : 'SME',
    frameworks: me.frameworks ?? [],
    priorities: me.priorities ?? [],
    plan: me.plan ? planFromBackend(me.plan) : 'starter',
    role: me.role,
    onboardingCompleted: me.onboardingCompleted,
    phone: me.phone ?? '',
    dateOfBirth: me.dateOfBirth ?? '',
    address: me.address ?? '',
    bio: me.bio ?? '',
    hasAvatar: me.hasAvatar,
    mfaSetupRequired: me.mfaSetupRequired,
    permissions: me.permissions ? new Set(me.permissions) : undefined,
  };
}

export type LoginOutcome =
  | { status: 'success'; profile: UserProfile }
  | { status: 'mfa_required'; mfaToken: string }
  | { status: 'email_verification_required'; email: string };

interface AuthContextProps {
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** True while rehydrating the session from a stored token on initial app load. */
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<LoginOutcome>;
  completeMfaLogin: (mfaToken: string, code: string) => Promise<UserProfile>;
  register: (name: string, email: string, company: string, password: string) => Promise<string>;
  resendVerification: (email: string) => Promise<void>;
  acceptInvite: (token: string, name: string, password: string) => Promise<UserProfile>;
  updateProfile: (data: { name: string; email: string; phone: string; dateOfBirth: string; address: string; bio: string }) => Promise<UserProfile>;
  completeOnboarding: (data: {
    market: FrontendMarket;
    sectorCode: string;
    frameworks: string[];
    priorities: string[];
  }) => Promise<void>;
  logout: () => void;
  /** Local-only convenience update (e.g. refreshing display after a companyApi call elsewhere) — does not itself persist to the backend. */
  updateUser: (fields: Partial<UserProfile>) => void;
  /** True when the session ended because a request came back 401 (expired/invalid token), as opposed to the user clicking "Log out". LoginPage reads this to explain why they landed back here. */
  sessionExpired: boolean;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; currentPlan: PlanType; setWorkspacePlan: (p: PlanType) => void }> = ({
  children,
  setWorkspacePlan,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
      setIsAuthenticated(false);
      setWorkspacePlan('starter');
      setSessionExpired(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then((me) => {
        const profile = toUserProfile(me);
        setUser(profile);
        setIsAuthenticated(true);
        setWorkspacePlan(profile.plan);
      })
      // A 401 is already handled by unauthorizedHandler above (it fires for every request,
      // including this one). This backend answers a bad token with 403 rather than 401, though, and
      // 403 cannot be handled globally: the app relies on it for plan gating, so treating every one
      // as an expired session would sign people out of a screen their plan simply does not include.
      // /auth/me is not plan-gated, so a rejection here can only mean the token does not work —
      // clear it, or it sits in storage failing every request until the next successful login.
      .catch((err: ApiError) => {
        if (err?.status === 401 || err?.status === 403) tokenStore.clear();
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean): Promise<LoginOutcome> => {
    const result = await authApi.login(email, password, rememberMe);
    if (result.emailVerificationRequired) {
      return { status: 'email_verification_required', email };
    }
    if (result.mfaRequired) {
      return { status: 'mfa_required', mfaToken: result.mfaToken! };
    }
    const { token, user: me } = result.auth!;
    tokenStore.set(token);
    const profile = toUserProfile(me);
    setUser(profile);
    setIsAuthenticated(true);
    setWorkspacePlan(profile.plan);
    return { status: 'success', profile };
  };

  const completeMfaLogin = async (mfaToken: string, code: string): Promise<UserProfile> => {
    const { token, user: me } = await authApi.verifyMfa(mfaToken, code);
    tokenStore.set(token);
    const profile = toUserProfile(me);
    setUser(profile);
    setIsAuthenticated(true);
    setWorkspacePlan(profile.plan);
    return profile;
  };

  const register = async (name: string, email: string, company: string, password: string): Promise<string> => {
    const result = await authApi.register(name, email, password, company);
    return result.email;
  };

  const resendVerification = async (email: string): Promise<void> => {
    await authApi.resendVerification(email);
  };

  const acceptInvite = async (token: string, name: string, password: string): Promise<UserProfile> => {
    const { token: authToken, user: me } = await authApi.acceptInvite(token, name, password);
    tokenStore.set(authToken);
    const profile = toUserProfile(me);
    setUser(profile);
    setIsAuthenticated(true);
    setWorkspacePlan(profile.plan);
    return profile;
  };

  const updateProfile = async (data: { name: string; email: string; phone: string; dateOfBirth: string; address: string; bio: string }): Promise<UserProfile> => {
    const me = await authApi.updateProfile({
      name: data.name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth || null,
      address: data.address,
      bio: data.bio,
    });
    const profile = toUserProfile(me);
    setUser(profile);
    return profile;
  };

  const completeOnboarding = async (data: {
    market: FrontendMarket;
    sectorCode: string;
    frameworks: string[];
    priorities: string[];
  }): Promise<void> => {
    const me = await authApi.completeOnboarding({
      market: marketToBackend(data.market),
      sectorCode: data.sectorCode,
      frameworks: data.frameworks,
      priorities: data.priorities,
    });
    const profile = toUserProfile(me);
    setUser(profile);
    setWorkspacePlan(profile.plan);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    setIsAuthenticated(false);
    setWorkspacePlan('starter');
    setSessionExpired(false);
  };

  const updateUser = (fields: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
    if (fields.plan) {
      setWorkspacePlan(fields.plan);
    }
  };

  const clearSessionExpired = () => setSessionExpired(false);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, completeMfaLogin, register, resendVerification, acceptInvite, updateProfile, completeOnboarding, logout, updateUser, sessionExpired, clearSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
