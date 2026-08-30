/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  X,
  Check,
  Copy,
  AlertCircle,
  ShieldAlert,
  Eye,
  Mail,
  Calendar,
  BadgeCheck,
  Send,
  Clock,
  RefreshCw,
  Trash2,
  Link2
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Select from './ui/Select';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hasPermission } from '../permissions';
import { CAPABILITIES } from '../capabilities';
import { companyApi, TeamInviteResponse } from '../api/companyApi';
import { TenantUserResponse, BackendRole } from '../api/tenantAdminApi';
import { customRoleApi, CustomRoleResponse } from '../api/customRoleApi';
import RolesView from './RolesView';

/** The coarse admin/member split — custom roles (fetched dynamically) are the real source of a
 *  Member's permissions now; COMPANY_CONTRIBUTOR is the one canonical "non-admin" enum value
 *  offered here (CONSULTANT still exists on old data but isn't offered for new assignments,
 *  since the two have been functionally identical since custom roles were introduced). */
const BASE_ROLES: BackendRole[] = ['COMPANY_ADMIN', 'COMPANY_CONTRIBUTOR'];

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Admin',
  COMPANY_CONTRIBUTOR: 'Member',
  CONSULTANT: 'Member',
  PLATFORM_ADMIN: 'Platform Admin',
  SUPERADMIN: 'Superadmin'
};

export default function TeamView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission(user?.role, user?.permissions, 'team.manage');
  const canManageRoles = hasPermission(user?.role, user?.permissions, 'roles.manage');

  const [tab, setTab] = useState<'members' | 'roles'>('members');
  const [users, setUsers] = useState<TenantUserResponse[]>([]);
  /*
   * First load only, so a refetch never blanks a list the reader is working in — an empty list and
   * an unread one are different facts, and only one of them means "add something".
   */
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<TeamInviteResponse[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleResponse[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BackendRole>('COMPANY_CONTRIBUTOR');
  const [customRoleId, setCustomRoleId] = useState<string>('');

  const [createdInvite, setCreatedInvite] = useState<TeamInviteResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<TenantUserResponse | null>(null);

  const refreshUsers = () => {
    companyApi.listUsers().then(setUsers).catch((e) => console.error(e)).finally(() => setLoading(false));
  };

  const refreshInvites = () => {
    if (!canManage) return;
    companyApi.listInvites().then(setPendingInvites).catch((e) => console.error(e));
  };

  const refreshRoles = () => {
    if (!CAPABILITIES.customRoles) return;
    customRoleApi.list().then(setCustomRoles).catch((e) => console.error(e)).finally(() => setRolesLoading(false));
  };

  useEffect(() => {
    refreshUsers();
    refreshInvites();
    refreshRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openInviteModal = () => {
    setName('');
    setEmail('');
    setRole('COMPANY_CONTRIBUTOR');
    setCustomRoleId(customRoles[0]?.id ?? '');
    setCreatedInvite(null);
    setCopied(false);
    setShowInviteModal(true);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '' || email.trim() === '') {
      showToast('Name and email are required.', 'error');
      return;
    }
    if (role !== 'COMPANY_ADMIN' && !customRoleId) {
      showToast('Choose a role for this member — create one first under the Roles tab if none exist yet.', 'error');
      return;
    }
    companyApi.createInvite(name.trim(), email.trim(), role, role === 'COMPANY_ADMIN' ? null : customRoleId)
      .then((created) => {
        setCreatedInvite(created);
        refreshInvites();
      })
      .catch((e) => {
        console.error(e);
        showToast(e?.status === 409
          ? (e?.message || 'An invite is already pending for this email, or an account already exists.')
          : 'Failed to send invite.', 'error');
      });
  };

  const handleCopy = () => {
    if (!createdInvite) return;
    navigator.clipboard.writeText(createdInvite.inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyInviteLink = (invite: TeamInviteResponse) => {
    navigator.clipboard.writeText(invite.inviteUrl).then(() => {
      setCopiedInviteId(invite.id);
      setTimeout(() => setCopiedInviteId(null), 2000);
    });
  };

  const handleResendInvite = (inviteId: string) => {
    companyApi.resendInvite(inviteId).then(refreshInvites).catch((e) => console.error(e));
  };

  const handleRevokeInvite = (inviteId: string) => {
    companyApi.revokeInvite(inviteId).then(() => {
      refreshInvites();
      setConfirmRevokeId(null);
    }).catch((e) => console.error(e));
  };

  const handleRoleChange = (u: TenantUserResponse, newRole: BackendRole) => {
    const nextCustomRoleId = newRole === 'COMPANY_ADMIN' ? null : (u.customRoleId ?? customRoles[0]?.id ?? null);
    companyApi.updateUserRole(u.id, newRole, nextCustomRoleId).then(refreshUsers).catch((e) => console.error(e));
  };

  const handleCustomRoleChange = (u: TenantUserResponse, newCustomRoleId: string) => {
    companyApi.updateUserRole(u.id, u.role, newCustomRoleId).then(refreshUsers).catch((e) => console.error(e));
  };

  const handleToggleActive = (u: TenantUserResponse) => {
    companyApi.setUserActive(u.id, !u.active).then(() => {
      refreshUsers();
      setConfirmDeactivateId(null);
    }).catch((e) => console.error(e));
  };

  const canViewRoles = CAPABILITIES.customRoles
    && (canManageRoles || hasPermission(user?.role, user?.permissions, 'roles.view'));

  return (
    <div className="space-y-8 w-full pb-16 font-sans">

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-navy-100/40">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-950">Team</h2>
          <p className="text-xs text-navy-500 mt-1 max-w-xl">
            Manage who has access to your workspace, and what they're allowed to do.
          </p>
        </div>

        {tab === 'members' && canManage && (
          <Button variant="primary" size="sm" onClick={openInviteModal} icon={<Send className="w-4 h-4" />}>
            Invite Member
          </Button>
        )}
      </div>

      {canViewRoles && (
        <div className="flex items-center gap-1 border-b border-navy-100/60 -mt-4">
          <button
            onClick={() => setTab('members')}
            className={`px-4 py-2 text-xs font-bold cursor-pointer border-b-2 transition-colors ${
              tab === 'members' ? 'text-primary-700 border-primary-600' : 'text-navy-400 border-transparent hover:text-navy-700'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setTab('roles')}
            className={`px-4 py-2 text-xs font-bold cursor-pointer border-b-2 transition-colors ${
              tab === 'roles' ? 'text-primary-700 border-primary-600' : 'text-navy-400 border-transparent hover:text-navy-700'
            }`}
          >
            Roles
          </button>
        </div>
      )}

      {tab === 'roles' && canViewRoles ? (
        <RolesView roles={customRoles} rolesLoading={rolesLoading} canManage={canManageRoles} onRolesChanged={refreshRoles} />
      ) : (
      <>
      {/* USER LIST */}
      <Card className="bg-white border-navy-100 overflow-hidden" padded="none">
        {loading && users.length === 0 ? (
          <p className="text-sm text-navy-400 p-6 text-center">Loading team…</p>
        ) : users.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Users className="w-10 h-10 text-navy-300 mx-auto" />
            <h5 className="text-xs font-bold text-navy-950">No team members yet</h5>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50/10 text-[9px] font-bold text-navy-400 uppercase tracking-widest font-mono">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                {users.map((u) => {
                  const isSelf = user != null && u.email.toLowerCase() === user.email.toLowerCase();
                  const isConfirming = confirmDeactivateId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-navy-50/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-navy-950">{u.name}{isSelf && <span className="text-[9px] text-navy-400 font-semibold ml-1.5">(you)</span>}</td>
                      <td className="px-6 py-4 text-navy-500">{u.email}</td>
                      <td className="px-6 py-4">
                        {canManage && !isSelf && BASE_ROLES.includes(u.role) ? (
                          <div className="flex items-center gap-1.5">
                            <Select
                              size="sm"
                              className="w-[150px]"
                              aria-label="Role"
                              value={u.role}
                              onChange={(v) => handleRoleChange(u, v as BackendRole)}
                              options={BASE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                            />
                            {u.role !== 'COMPANY_ADMIN' && (
                              <Select
                                size="sm"
                                className="w-[150px]"
                                aria-label="Custom role"
                                placeholder={customRoles.length === 0 ? 'No roles yet' : 'Select…'}
                                disabled={customRoles.length === 0}
                                value={u.customRoleId ?? ''}
                                onChange={(v) => handleCustomRoleChange(u, v)}
                                options={customRoles.map((r) => ({ value: r.id, label: r.name }))}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 uppercase tracking-wide">
                            {u.customRoleName ?? ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-navy-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-navy-50 text-navy-500 border-navy-100'
                        }`}>
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingUser(u)}
                          className="p-1.5 text-navy-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer transition-colors"
                          title="View user details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!canManage ? (
                          <span className="text-[10px] text-navy-300">—</span>
                        ) : isSelf ? (
                          <span className="text-[10px] text-navy-300" title="You can't change your own role or deactivate yourself">Not applicable</span>
                        ) : isConfirming ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleActive(u)}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeactivateId(null)}
                              className="px-2 py-1 text-[10px] font-bold text-navy-500 hover:text-navy-700 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : u.active ? (
                          <button
                            onClick={() => setConfirmDeactivateId(u.id)}
                            className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="px-2.5 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* PENDING INVITES */}
      {canManage && pendingInvites.length > 0 && (
        <Card className="bg-white border-navy-100 overflow-hidden" padded="none">
          <div className="flex items-center space-x-2 px-6 py-3.5 border-b border-navy-100 bg-navy-50/10">
            <Clock className="w-3.5 h-3.5 text-navy-400" />
            <h5 className="text-xs font-bold text-navy-950">Pending Invites</h5>
            <span className="text-[10px] font-bold text-navy-400 font-mono">({pendingInvites.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-[9px] font-bold text-navy-400 uppercase tracking-widest font-mono">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Invited By</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                {pendingInvites.map((invite) => {
                  const isConfirmingRevoke = confirmRevokeId === invite.id;
                  return (
                    <tr key={invite.id} className="hover:bg-navy-50/10 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-navy-950">{invite.name}</td>
                      <td className="px-6 py-3.5 text-navy-500">{invite.email}</td>
                      <td className="px-6 py-3.5">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 uppercase tracking-wide">
                          {invite.customRoleName ?? ROLE_LABELS[invite.role] ?? invite.role}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-navy-500">{invite.invitedByName ?? 'Unknown'}</td>
                      <td className="px-6 py-3.5">
                        {invite.expired ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-2 py-0.5 uppercase tracking-wide">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5 uppercase tracking-wide">
                            Awaiting Response
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {isConfirmingRevoke ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmRevokeId(null)}
                              className="px-2 py-1 text-[10px] font-bold text-navy-500 hover:text-navy-700 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleCopyInviteLink(invite)}
                              className="p-1.5 text-navy-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer transition-colors"
                              title="Copy invite link"
                            >
                              {copiedInviteId === invite.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleResendInvite(invite.id)}
                              className="p-1.5 text-navy-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer transition-colors"
                              title="Resend invite (generates a new link)"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmRevokeId(invite.id)}
                              className="p-1.5 text-navy-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Revoke invite"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowInviteModal(false)}
          />

          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-navy-100 relative z-10 overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 to-indigo-500" />

            <div className="flex items-start justify-between pb-4 border-b border-navy-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl border border-primary-100">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-navy-950 uppercase tracking-wider">
                    {createdInvite ? 'Invite Ready' : 'Invite Team Member'}
                  </h4>
                  <p className="text-[10px] text-navy-400 font-semibold">
                    {createdInvite ? 'Share this link with them — it expires in 7 days and can only be used once' : 'Grant only the role an individual actually needs'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-navy-400 hover:text-navy-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdInvite ? (
              <div className="space-y-4 pt-4 text-xs font-semibold">
                <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 font-bold">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Share this link with {createdInvite.name} — anyone with it can join {user?.company || 'your workspace'} as {createdInvite.customRoleName ?? ROLE_LABELS[createdInvite.role] ?? createdInvite.role}.</span>
                </div>

                <div className="flex items-center gap-2 bg-navy-50/50 border border-navy-100 rounded-xl px-3 py-2.5">
                  <code className="flex-1 text-[11px] font-mono text-navy-900 break-all">{createdInvite.inviteUrl}</code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 text-navy-500 hover:text-primary-600 hover:bg-white rounded-lg cursor-pointer transition-colors shrink-0"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[10px] text-navy-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3 h-3 shrink-0" />
                  We'll also try emailing this invite to {createdInvite.email} automatically if outbound email is configured for your workspace.
                </p>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="sm" onClick={() => setShowInviteModal(false)} icon={<Check className="w-4 h-4" />}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4 pt-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aisha Razak"
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. aisha@company.my"
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Role</label>
                  <Select
                    className="w-full"
                    aria-label="Role"
                    value={role}
                    onChange={(v) => setRole(v as BackendRole)}
                    options={BASE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                  />
                </div>

                {role !== 'COMPANY_ADMIN' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider">Custom Role</label>
                    <Select
                      className="w-full"
                      aria-label="Custom role"
                      placeholder="Select a role…"
                      value={customRoleId}
                      onChange={setCustomRoleId}
                      options={customRoles.map((r) => ({ value: r.id, label: r.name }))}
                    />
                    {customRoles.length === 0 && (
                      <p className="text-[10px] text-navy-400">No custom roles yet — create one under the Roles tab first.</p>
                    )}
                  </div>
                )}


                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" icon={<Send className="w-4 h-4" />}>
                    Send Invite
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VIEW USER DETAILS MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setViewingUser(null)}
          />

          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-navy-100 relative z-10 overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 to-indigo-500" />

            <div className="flex items-start justify-between pb-4 border-b border-navy-50">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {viewingUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-black text-navy-950">{viewingUser.name}</h4>
                  <p className="text-[10px] text-navy-400 font-semibold">User Details</p>
                </div>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="text-navy-400 hover:text-navy-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-4 text-xs">
              <div className="flex items-center gap-3 bg-navy-50/50 border border-navy-100 rounded-xl px-3.5 py-3">
                <Mail className="w-4 h-4 text-navy-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-navy-400 uppercase tracking-wider font-bold block">Email</span>
                  <span className="font-bold text-navy-900">{viewingUser.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-navy-50/50 border border-navy-100 rounded-xl px-3.5 py-3">
                <BadgeCheck className="w-4 h-4 text-navy-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-navy-400 uppercase tracking-wider font-bold block">Role</span>
                  <span className="font-bold text-navy-900">{viewingUser.customRoleName ?? ROLE_LABELS[viewingUser.role] ?? viewingUser.role}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-navy-50/50 border border-navy-100 rounded-xl px-3.5 py-3">
                <Calendar className="w-4 h-4 text-navy-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-navy-400 uppercase tracking-wider font-bold block">Member Since</span>
                  <span className="font-bold text-navy-900">{new Date(viewingUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${
                  viewingUser.active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-navy-50 text-navy-500 border-navy-100'
                }`}>
                  {viewingUser.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-5">
              <Button variant="secondary" size="sm" onClick={() => setViewingUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

    </div>
  );
}
