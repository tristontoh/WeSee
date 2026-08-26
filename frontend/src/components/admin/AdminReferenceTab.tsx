/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Info, X } from 'lucide-react';
import { referenceApi, MatterResponse, MatterCategory, MatterSet } from '../../api/referenceApi';
import { referenceAdminApi } from '../../api/referenceAdminApi';
import { MatterFormState, ShowToast } from './types';
import { MATTER_SET_LABELS, MATTER_CATEGORY_LABELS } from './constants';
import Select from '../ui/Select';

const EMPTY_MATTER_FORM: MatterFormState = {
  id: '',
  name: '',
  category: 'ENVIRONMENTAL',
  description: '',
  matterSet: 'SEDG',
};

interface AdminReferenceTabProps {
  showToast: ShowToast;
}

export default function AdminReferenceTab({ showToast }: AdminReferenceTabProps) {
  const [matters, setMatters] = useState<MatterResponse[]>([]);
  const [mattersLoading, setMattersLoading] = useState(true);

  useEffect(() => {
    referenceApi.matters()
      .then(setMatters)
      .catch(() => showToast('Failed to load reference matters.', 'warning'))
      .finally(() => setMattersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [matterFrameworkFilter, setMatterFrameworkFilter] = useState<'all' | MatterSet>('all');

  const [editMatterModalOpen, setEditMatterModalOpen] = useState(false);
  const [addMatterModalOpen, setAddMatterModalOpen] = useState(false);
  const [editingMatterForm, setEditingMatterForm] = useState<MatterFormState>(EMPTY_MATTER_FORM);

  const saveEditedMatter = (e: React.FormEvent) => {
    e.preventDefault();
    referenceAdminApi.upsertMatter(editingMatterForm)
      .then((updated) => {
        setMatters(prev => prev.map(m => m.id === updated.id ? updated : m));
        setEditMatterModalOpen(false);
        showToast(`Reference matter "${updated.id}" updated.`, 'success');
      })
      .catch(() => showToast(`Failed to update matter "${editingMatterForm.id}".`, 'warning'));
  };

  const saveNewMatter = (e: React.FormEvent) => {
    e.preventDefault();
    if (matters.some(m => m.id === editingMatterForm.id)) {
      showToast(`A matter with ID "${editingMatterForm.id}" already exists!`, 'warning');
      return;
    }
    referenceAdminApi.upsertMatter(editingMatterForm)
      .then((created) => {
        setMatters(prev => [...prev, created]);
        setAddMatterModalOpen(false);
        showToast(`Reference matter "${created.id}" created.`, 'success');
      })
      .catch(() => showToast(`Failed to create matter "${editingMatterForm.id}".`, 'warning'));
  };

  const deleteMatter = (id: string) => {
    referenceAdminApi.deleteMatter(id)
      .then(() => {
        setMatters(prev => prev.filter(m => m.id !== id));
        showToast(`Reference matter "${id}" deleted.`, 'info');
      })
      .catch(() => showToast(`Failed to delete "${id}" — it may still be referenced by an indicator.`, 'warning'));
  };

  const filteredMatters = matters.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(matterSearchQuery.toLowerCase()) ||
                          m.id.toLowerCase().includes(matterSearchQuery.toLowerCase());
    const matchesFramework = matterFrameworkFilter === 'all' || m.matterSet === matterFrameworkFilter;

    return matchesSearch && matchesFramework;
  });

  return (
    <div className="space-y-6">

      {/* Top header & Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Reference Framework Matters</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage the matter definitions available across SEDG and Bursa framework sets. Tenant workspaces read this list directly.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingMatterForm(EMPTY_MATTER_FORM);
            setAddMatterModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-full cursor-pointer flex items-center transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add Framework Matter</span>
        </button>
      </div>

      {/* Filter / Search Row for Reference Data */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search framework matters by ID or name..."
              value={matterSearchQuery}
              onChange={(e) => setMatterSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all"
            />
          </div>

          {/* Framework Filter Dropdown */}
          <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
            <span className="text-xs text-gray-500">Framework:</span>
            <Select
              size="sm"
              className="w-full sm:w-[210px]"
              aria-label="Filter by framework"
              value={matterFrameworkFilter}
              onChange={(v) => setMatterFrameworkFilter(v as any)}
              options={[
                { value: 'all', label: 'All Frameworks' },
                ...(Object.keys(MATTER_SET_LABELS) as MatterSet[]).map((set) => ({
                  value: set,
                  label: MATTER_SET_LABELS[set],
                })),
              ]}
            />
          </div>

        </div>
      </div>

      {/* Reference Data table */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Matter ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Framework Set</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {mattersLoading && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs font-medium">Loading matters…</td></tr>
              )}
              {!mattersLoading && filteredMatters.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs font-medium">No matters match this filter.</td></tr>
              )}
              {filteredMatters.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Matter ID */}
                  <td className="px-6 py-4 font-mono font-black text-gray-900">
                    {m.id}
                  </td>

                  {/* Name description */}
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900 block">{m.name}</span>
                    {m.description && <span className="text-[10px] text-gray-500 mt-0.5 block max-w-[280px] truncate">{m.description}</span>}
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      m.category === 'ENVIRONMENTAL' ? 'bg-emerald-50 text-emerald-700' :
                      m.category === 'SOCIAL' ? 'bg-blue-50 text-blue-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {MATTER_CATEGORY_LABELS[m.category]}
                    </span>
                  </td>

                  {/* Framework Set */}
                  <td className="px-6 py-4 font-semibold text-gray-700">
                    {MATTER_SET_LABELS[m.matterSet]}
                  </td>

                  {/* Actions edit / delete */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingMatterForm({
                            id: m.id,
                            name: m.name,
                            category: m.category,
                            description: m.description ?? '',
                            matterSet: m.matterSet
                          });
                          setEditMatterModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                        title="Edit Framework Definition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteMatter(m.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                        title="Delete Matter"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configurable comment info helper */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 flex items-start space-x-3 text-gray-500 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-gray-900">Note to operators:</strong> This list manages the <code>SustainabilityMatter</code> reference table directly — additions, edits, and deletions here take effect immediately for every tenant workspace, without a code deployment. Deleting a matter that still has indicators attached to it will fail.
        </div>
      </div>

      {/* MODAL: EDIT REFERENCE MATTER */}
      {editMatterModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={saveEditedMatter} className="bg-white border border-gray-100 rounded-[24px] max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-gray-700">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-lg font-bold text-gray-900">Edit Regulatory Reference Matter</h4>
              <button type="button" onClick={() => setEditMatterModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Matter ID (Primary Key)</label>
                <input
                  type="text"
                  disabled
                  value={editingMatterForm.id}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 text-xs rounded-xl text-gray-500 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Disclosure Title / Name</label>
                <input
                  type="text"
                  required
                  value={editingMatterForm.name}
                  onChange={(e) => setEditingMatterForm({ ...editingMatterForm, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 text-xs rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Description</label>
                <textarea
                  rows={2}
                  value={editingMatterForm.description}
                  onChange={(e) => setEditingMatterForm({ ...editingMatterForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 text-xs rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Category</label>
                  <Select
                    size="sm"
                    className="w-full mt-1"
                    aria-label="Category"
                    value={editingMatterForm.category}
                    onChange={(v) => setEditingMatterForm({ ...editingMatterForm, category: v as MatterCategory })}
                    options={(Object.keys(MATTER_CATEGORY_LABELS) as MatterCategory[]).map((cat) => ({
                      value: cat,
                      label: MATTER_CATEGORY_LABELS[cat],
                    }))}
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Framework Set</label>
                  <Select
                    size="sm"
                    className="w-full mt-1"
                    aria-label="Framework"
                    value={editingMatterForm.matterSet}
                    onChange={(v) => setEditingMatterForm({ ...editingMatterForm, matterSet: v as MatterSet })}
                    options={(Object.keys(MATTER_SET_LABELS) as MatterSet[]).map((set) => ({
                      value: set,
                      label: MATTER_SET_LABELS[set],
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditMatterModalOpen(false)}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
              >
                Save Matter Reference
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD REFERENCE MATTER */}
      {addMatterModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={saveNewMatter} className="bg-white border border-gray-100 rounded-[24px] max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-gray-700">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-lg font-bold text-gray-900">Create Regulatory Reference Matter</h4>
              <button type="button" onClick={() => setAddMatterModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Matter ID (Unique, e.g. ENV-BIO)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ENV-BIO"
                  value={editingMatterForm.id}
                  onChange={(e) => setEditingMatterForm({ ...editingMatterForm, id: e.target.value.toUpperCase() })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 text-xs rounded-xl text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Disclosure Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biodiversity & Habitat Impact"
                  value={editingMatterForm.name}
                  onChange={(e) => setEditingMatterForm({ ...editingMatterForm, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 text-xs rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional reporting guidance shown to preparers"
                  value={editingMatterForm.description}
                  onChange={(e) => setEditingMatterForm({ ...editingMatterForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 text-xs rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Category</label>
                  <Select
                    size="sm"
                    className="w-full mt-1"
                    aria-label="Category"
                    value={editingMatterForm.category}
                    onChange={(v) => setEditingMatterForm({ ...editingMatterForm, category: v as MatterCategory })}
                    options={(Object.keys(MATTER_CATEGORY_LABELS) as MatterCategory[]).map((cat) => ({
                      value: cat,
                      label: MATTER_CATEGORY_LABELS[cat],
                    }))}
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Framework Set</label>
                  <Select
                    size="sm"
                    className="w-full mt-1"
                    aria-label="Framework"
                    value={editingMatterForm.matterSet}
                    onChange={(v) => setEditingMatterForm({ ...editingMatterForm, matterSet: v as MatterSet })}
                    options={(Object.keys(MATTER_SET_LABELS) as MatterSet[]).map((set) => ({
                      value: set,
                      label: MATTER_SET_LABELS[set],
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setAddMatterModalOpen(false)}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
              >
                Create New Matter
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
