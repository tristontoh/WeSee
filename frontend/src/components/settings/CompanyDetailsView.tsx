/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Check, AlertCircle, Trash2, RefreshCw, ShieldAlert, Pencil } from 'lucide-react';
import { companyApi, CompanyGroupMember } from '../../api/companyApi';
import { marketFromBackend, planFromBackend } from '../../api/mappers';
import { ApiError } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../permissions';
import { LISTING_BOARDS, COMPANY_TYPES } from './AddCompanyModal';
import CompanyIdentityForm from './CompanyIdentityForm';

export default function CompanyDetailsView() {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { showToast } = useToast();

  const [members, setMembers] = useState<CompanyGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  // The route already limits this screen to management roles, but a custom role can hold
  // settings.view without settings.manage — read the details, not rewrite them.
  const { user } = useAuth();
  const canEdit = hasPermission(user?.role, user?.permissions, 'settings.manage');

  useEffect(() => {
    companyApi.getGroup()
      .then(setMembers)
      .catch(() => showToast('Failed to load company details.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const company = members.find((m) => m.id === companyId);

  const formatDate = (value: string | null): string =>
    value ? new Date(value).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  const listingBoardLabel = (value: string | null): string =>
    LISTING_BOARDS.find((b) => b.value === value)?.label ?? '—';

  const companyTypeLabel = (value: string | null): string =>
    COMPANY_TYPES.find((t) => t.value === value)?.label ?? '—';

  const handleSwitch = () => {
    if (!company || company.current) return;
    setSwitching(true);
    companyApi.switchCompany(company.id)
      .then(() => window.location.reload())
      .catch(() => {
        showToast('Failed to switch companies — please try again.', 'error');
        setSwitching(false);
      });
  };

  const handleDelete = () => {
    if (!company || deleteConfirmInput !== company.name) return;
    setDeleting(true);
    companyApi.deleteSubsidiary(company.id)
      .then(() => {
        showToast(`${company.name} and all of its data were permanently deleted.`, 'success');
        navigate('/settings?tab=company');
      })
      .catch((err) => {
        showToast(err instanceof ApiError ? err.message : 'Failed to remove the company — please try again.', 'error');
        setConfirmDelete(false);
      })
      .finally(() => setDeleting(false));
  };

  return (
    <div className="w-full pb-16">
      <button
        type="button"
        onClick={() => navigate('/settings?tab=company')}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Companies
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !company ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-gray-300" />
          <h3 className="text-sm font-bold text-gray-900">Company not found</h3>
          <p className="text-xs text-gray-500 max-w-sm">It may have been removed, or you don&apos;t have access to it.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
                {company.current ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {canEdit && !editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit details
                </button>
              )}

              {!company.current && (
                <button
                  type="button"
                  onClick={handleSwitch}
                  disabled={switching}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-60 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${switching ? 'animate-spin' : ''}`} />
                  {switching ? 'Switching…' : 'Switch to this company'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/40">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sector</span>
              <span className="text-sm font-semibold text-gray-900">{company.sectorCode ?? 'Not set'}</span>
            </div>
            <div className="px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/40">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Market</span>
              <span className="text-sm font-semibold text-gray-900">{marketFromBackend(company.marketClassification)}</span>
            </div>
            <div className="px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/40">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Plan</span>
              <span className="text-sm font-semibold text-gray-900">{planFromBackend(company.subscriptionPlan)}</span>
            </div>
          </div>

          {editing ? (
            <CompanyIdentityForm
              company={company}
              onCancel={() => setEditing(false)}
              onSaved={(saved) => {
                // Replaced in place rather than re-fetching the group: the response is the saved
                // company, and a name change has to show in the heading immediately.
                setMembers((current) => current.map((m) => (m.id === saved.id ? saved : m)));
                setEditing(false);
                showToast('Company details saved.', 'success');
              }}
            />
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Identity</h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registration number</dt>
                  <dd className="text-gray-900">{company.registrationNumber ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock / ticker code</dt>
                  <dd className="text-gray-900">{company.tickerCode ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date of incorporation</dt>
                  <dd className="text-gray-900">{formatDate(company.dateOfIncorporation)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Country of incorporation</dt>
                  <dd className="text-gray-900">{company.countryOfIncorporation ?? '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Classification</h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Market / board</dt>
                  <dd className="text-gray-900">{listingBoardLabel(company.listingBoard)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company type</dt>
                  <dd className="text-gray-900">{companyTypeLabel(company.companyType)}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Contact &amp; Location</h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registered office address</dt>
                  <dd className="text-gray-900 whitespace-pre-line">{company.registeredOfficeAddress ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business address</dt>
                  <dd className="text-gray-900 whitespace-pre-line">{company.businessAddress ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact person</dt>
                  <dd className="text-gray-900">
                    {company.contactPersonName ?? '—'}
                    {company.contactPersonDesignation && <span className="text-gray-400"> · {company.contactPersonDesignation}</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact email</dt>
                  <dd className="text-gray-900">{company.contactPersonEmail ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact phone</dt>
                  <dd className="text-gray-900">{company.contactPersonPhone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tax Identification Number (TIN)</dt>
                  <dd className="text-gray-900">{company.taxIdentificationNumber ?? '—'}</dd>
                </div>
              </dl>
            </section>
          </div>
          )}

          {!company.current && !editing && (
            <div className="pt-4 border-t border-gray-100">
              {confirmDelete ? (
                <div className="border border-rose-100 bg-rose-50/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-xs font-bold text-gray-900">Permanently delete {company.name}?</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    This deletes <strong>all</strong> of its data — indicators, materiality assessments, governance records, emissions, compliance policies, sign-offs, exports, and invoices. This cannot be undone.
                  </p>
                  <div className="space-y-1.5 max-w-sm">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Type <span className="text-gray-900">{company.name}</span> to confirm
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={deleteConfirmInput}
                      onChange={(e) => setDeleteConfirmInput(e.target.value)}
                      placeholder={company.name}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400 transition-colors bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || deleteConfirmInput !== company.name}
                      className="px-3 py-1.5 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
                    >
                      {deleting ? 'Deleting…' : 'Permanently Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConfirmDelete(false); setDeleteConfirmInput(''); }}
                      className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete this company
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
