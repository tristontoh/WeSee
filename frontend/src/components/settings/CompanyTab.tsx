/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, AlertCircle, Plus, Trash2, ChevronRight, ShieldAlert, Search, X } from 'lucide-react';
import { companyApi, CompanyGroupMember } from '../../api/companyApi';
import { marketFromBackend } from '../../api/mappers';
import { ApiError } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import AddCompanyModal from './AddCompanyModal';

export default function CompanyTab() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [members, setMembers] = useState<CompanyGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyGroupMember | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadGroup = () => {
    companyApi.getGroup()
      .then(setMembers)
      .catch(() => showToast('Failed to load your companies.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGroup();
  }, []);

  const handleCompanyCreated = (created: CompanyGroupMember) => {
    setMembers((prev) => [...prev, created]);
    showToast(`${created.name} added to your company group.`, 'success');
  };

  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDelete = () => {
    if (!deleteTarget || deleteConfirmInput !== deleteTarget.name) return;
    setDeleting(true);
    companyApi.deleteSubsidiary(deleteTarget.id)
      .then(() => {
        setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        showToast(`${deleteTarget.name} and all of its data were permanently deleted.`, 'success');
        setDeleteTarget(null);
        setDeleteConfirmInput('');
      })
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Failed to remove the company — please try again.', 'error'))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">Companies</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Manage subsidiaries or group entities. Reporting, indicators, and disclosures are kept fully separate per company — use the company switcher in the top bar to change which one you&apos;re working in.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">
                      No companies match &quot;{searchQuery}&quot;.
                    </td>
                  </tr>
                )}
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/settings/companies/${member.id}`)}
                        className="flex items-center gap-2 font-semibold text-gray-900 hover:text-emerald-700 cursor-pointer transition-colors"
                      >
                        <span className="truncate max-w-[220px]">{member.name}</span>
                        {member.current && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                            Active
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{member.sectorCode ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{marketFromBackend(member.marketClassification)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!member.current && (
                          <button
                            type="button"
                            onClick={() => { setDeleteTarget(member); setDeleteConfirmInput(''); }}
                            className="p-1.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete company"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {addModalOpen && (
        <AddCompanyModal onClose={() => setAddModalOpen(false)} onCreated={handleCompanyCreated} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDeleteTarget(null)}
            className="absolute inset-0 bg-gray-950/40 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-2xl border border-rose-100 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-bold text-gray-900">Delete {deleteTarget.name}?</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              This permanently deletes <strong>all</strong> of its data — indicators, materiality assessments, governance records, emissions, compliance policies, sign-offs, exports, and invoices. This cannot be undone.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                Type <span className="text-gray-900">{deleteTarget.name}</span> to confirm
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={deleteTarget.name}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400 transition-colors"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmInput !== deleteTarget.name}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg cursor-pointer transition-all"
              >
                {deleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
