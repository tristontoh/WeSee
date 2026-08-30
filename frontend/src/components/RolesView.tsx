/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useToast } from '../contexts/ToastContext';
import { customRoleApi, CustomRoleResponse, CustomRoleRequest } from '../api/customRoleApi';
import { referenceApi, PermissionResponse } from '../api/referenceApi';

interface RolesViewProps {
  roles: CustomRoleResponse[];
  /** Owned by the parent along with the roles themselves, so the two cannot disagree. */
  rolesLoading?: boolean;
  canManage: boolean;
  onRolesChanged: () => void;
}

export default function RolesView({ roles, rolesLoading = false, canManage, onRolesChanged }: RolesViewProps) {
  const { showToast } = useToast();
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [editing, setEditing] = useState<CustomRoleResponse | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    referenceApi.permissions().then(setPermissions).catch((e) => console.error(e));
  }, []);

  const modules = useMemo(() => {
    const byModule = new Map<string, PermissionResponse[]>();
    permissions.forEach((p) => {
      const list = byModule.get(p.module) ?? [];
      list.push(p);
      byModule.set(p.module, list);
    });
    return Array.from(byModule.entries());
  }, [permissions]);

  const openCreate = () => {
    setName('');
    setDescription('');
    setSelectedKeys(new Set());
    setEditing('new');
  };

  const openEdit = (role: CustomRoleResponse) => {
    setName(role.name);
    setDescription(role.description ?? '');
    setSelectedKeys(new Set(role.permissionKeys));
    setEditing(role);
  };

  const togglePermission = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '') {
      showToast('Name is required.', 'error');
      return;
    }
    const payload: CustomRoleRequest = { name: name.trim(), description: description.trim() || undefined, permissionKeys: Array.from(selectedKeys) };
    const request = editing === 'new' ? customRoleApi.create(payload) : customRoleApi.update((editing as CustomRoleResponse).id, payload);
    request
      .then(() => {
        setEditing(null);
        onRolesChanged();
      })
      .catch((e) => {
        console.error(e);
        showToast(e?.status === 409 ? (e?.message || 'A role with this name already exists.') : 'Failed to save role.', 'error');
      });
  };

  const handleDelete = (roleId: string) => {
    customRoleApi.delete(roleId)
      .then(() => {
        setConfirmDeleteId(null);
        onRolesChanged();
      })
      .catch((e) => {
        console.error(e);
        setConfirmDeleteId(null);
        showToast(e?.message || 'Failed to delete role — it may still be assigned to a team member or invite.', 'error');
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-navy-500 max-w-xl">
          Custom roles control exactly which parts of the workspace a member can view or edit. Roles you create here only apply within your own company.
        </p>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
            New Role
          </Button>
        )}
      </div>

      {rolesLoading && roles.length === 0 ? (
        <p className="text-sm text-navy-400 p-6 text-center">Loading roles…</p>
      ) : roles.length === 0 ? (
        <Card className="bg-white border-navy-100 p-16 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-navy-300 mx-auto" />
          <h5 className="text-xs font-bold text-navy-950">No custom roles yet</h5>
          <p className="text-[11px] text-navy-400">Create one to control what your team members can access.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="bg-white border-navy-100" padded="sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h5 className="text-sm font-bold text-navy-950 truncate">{role.name}</h5>
                  <p className="text-[11px] text-navy-400 mt-0.5">{role.description || 'No description'}</p>
                  <p className="text-[10px] text-navy-400 font-mono mt-1.5">{role.permissionKeys.length} permission{role.permissionKeys.length === 1 ? '' : 's'} granted</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(role)} className="p-1.5 text-navy-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer transition-colors" title="Edit role">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteId === role.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(role.id)} className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer">Confirm</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-[10px] font-bold text-navy-500 hover:text-navy-700 rounded-lg cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(role.id)} className="p-1.5 text-navy-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors" title="Delete role">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity" onClick={() => setEditing(null)} />

          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-navy-100 relative z-10 overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 to-indigo-500" />

            <div className="flex items-start justify-between pb-4 border-b border-navy-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl border border-primary-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-navy-950 uppercase tracking-wider">
                  {editing === 'new' ? 'Create Role' : `Edit ${editing.name}`}
                </h4>
              </div>
              <button onClick={() => setEditing(null)} className="text-navy-400 hover:text-navy-600 p-1 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Role Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sustainability Analyst"
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Description (optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this role is for"
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider">Permissions</label>
                <div className="border border-navy-100 rounded-xl divide-y divide-navy-50 max-h-72 overflow-y-auto">
                  {modules.map(([module, perms]) => (
                    <div key={module} className="p-3">
                      <div className="text-[10px] font-bold text-navy-700 uppercase tracking-wider mb-2">{module.replace('_', ' ')}</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {perms.map((p) => (
                          <label key={p.key} className="flex items-center gap-2 cursor-pointer text-navy-700 font-medium">
                            <input
                              type="checkbox"
                              checked={selectedKeys.has(p.key)}
                              onChange={() => togglePermission(p.key)}
                              className="rounded border-navy-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                  Save Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
