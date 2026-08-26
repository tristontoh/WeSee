/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { companyApi, CompanyGroupMember, UpdateCompanyIdentityRequest } from '../../api/companyApi';
import { ApiError } from '../../api/client';
import { LISTING_BOARDS, COMPANY_TYPES } from './AddCompanyModal';
import Select from '../ui/Select';

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors bg-white';
const labelClass = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1';

interface CompanyIdentityFormProps {
  company: CompanyGroupMember;
  /** Handed the saved company so the parent can refresh without re-fetching the whole group. */
  onSaved: (saved: CompanyGroupMember) => void;
  onCancel: () => void;
}

/** The editable mirror of the identity, classification and contact sections of the details view. */
export default function CompanyIdentityForm({ company, onSaved, onCancel }: CompanyIdentityFormProps) {
  // Seeded from nulls as empty strings: a controlled input given null warns and then behaves as
  // uncontrolled. They go back to null on save — see `orNull` below.
  const [form, setForm] = useState<UpdateCompanyIdentityRequest>({
    name: company.name,
    registrationNumber: company.registrationNumber ?? '',
    tickerCode: company.tickerCode ?? '',
    dateOfIncorporation: company.dateOfIncorporation ?? '',
    countryOfIncorporation: company.countryOfIncorporation ?? '',
    listingBoard: company.listingBoard,
    companyType: company.companyType,
    registeredOfficeAddress: company.registeredOfficeAddress ?? '',
    businessAddress: company.businessAddress ?? '',
    contactPersonName: company.contactPersonName ?? '',
    contactPersonDesignation: company.contactPersonDesignation ?? '',
    contactPersonEmail: company.contactPersonEmail ?? '',
    contactPersonPhone: company.contactPersonPhone ?? '',
    taxIdentificationNumber: company.taxIdentificationNumber ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof UpdateCompanyIdentityRequest>(key: K, value: UpdateCompanyIdentityRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const orNull = (value: string | null) => (value && value.trim() !== '' ? value.trim() : null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('A company needs a name.');
      return;
    }
    setSaving(true);
    setError(null);

    companyApi.updateIdentity(company.id, {
      ...form,
      name: form.name.trim(),
      registrationNumber: orNull(form.registrationNumber),
      tickerCode: orNull(form.tickerCode),
      // An empty date input reads as "", which is not a date the backend can parse.
      dateOfIncorporation: orNull(form.dateOfIncorporation),
      countryOfIncorporation: orNull(form.countryOfIncorporation),
      registeredOfficeAddress: orNull(form.registeredOfficeAddress),
      businessAddress: orNull(form.businessAddress),
      contactPersonName: orNull(form.contactPersonName),
      contactPersonDesignation: orNull(form.contactPersonDesignation),
      contactPersonEmail: orNull(form.contactPersonEmail),
      contactPersonPhone: orNull(form.contactPersonPhone),
      taxIdentificationNumber: orNull(form.taxIdentificationNumber),
    })
      .then(onSaved)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not save the company details.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className={labelClass} htmlFor="company-name">Company name</label>
        <input
          id="company-name"
          type="text"
          maxLength={200}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className={`${inputClass} sm:max-w-md font-semibold`}
          required
        />
      </div>

      {/* The same three groupings the read-only view uses, so a reader edits where they looked. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-4 border-t border-gray-100">
        <section className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Identity</h4>
          <div>
            <label className={labelClass} htmlFor="reg-no">Registration number</label>
            <input id="reg-no" type="text" maxLength={100} className={inputClass}
              value={form.registrationNumber ?? ''} onChange={(e) => set('registrationNumber', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="ticker">Stock / ticker code</label>
            <input id="ticker" type="text" maxLength={20} className={inputClass}
              value={form.tickerCode ?? ''} onChange={(e) => set('tickerCode', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="incorp-date">Date of incorporation</label>
            <input id="incorp-date" type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass}
              value={form.dateOfIncorporation ?? ''} onChange={(e) => set('dateOfIncorporation', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="incorp-country">Country of incorporation</label>
            <input id="incorp-country" type="text" maxLength={100} className={inputClass}
              value={form.countryOfIncorporation ?? ''} onChange={(e) => set('countryOfIncorporation', e.target.value)} />
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Classification</h4>
          <div>
            <label className={labelClass} htmlFor="board">Market / board</label>
            <Select
              id="board"
              className="w-full"
              aria-label="Market or board"
              value={form.listingBoard ?? ''}
              onChange={(v) => set('listingBoard', (v || null) as UpdateCompanyIdentityRequest['listingBoard'])}
              options={[
                { value: '', label: 'Not set' },
                ...LISTING_BOARDS.map((b) => ({ value: b.value, label: b.label })),
              ]}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ctype">Company type</label>
            <Select
              id="ctype"
              className="w-full"
              aria-label="Company type"
              value={form.companyType ?? ''}
              onChange={(v) => set('companyType', (v || null) as UpdateCompanyIdentityRequest['companyType'])}
              options={[
                { value: '', label: 'Not set' },
                ...COMPANY_TYPES.map((t) => ({ value: t.value, label: t.label })),
              ]}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="tin">Tax Identification Number (TIN)</label>
            <input id="tin" type="text" maxLength={100} className={inputClass}
              value={form.taxIdentificationNumber ?? ''} onChange={(e) => set('taxIdentificationNumber', e.target.value)} />
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Contact &amp; Location</h4>
          <div>
            <label className={labelClass} htmlFor="reg-office">Registered office address</label>
            <textarea id="reg-office" rows={3} maxLength={500} className={`${inputClass} resize-y`}
              value={form.registeredOfficeAddress ?? ''} onChange={(e) => set('registeredOfficeAddress', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="biz-address">Business address</label>
            <textarea id="biz-address" rows={3} maxLength={500} className={`${inputClass} resize-y`}
              value={form.businessAddress ?? ''} onChange={(e) => set('businessAddress', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="contact-name">Contact person</label>
            <input id="contact-name" type="text" maxLength={200} className={inputClass}
              value={form.contactPersonName ?? ''} onChange={(e) => set('contactPersonName', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="contact-role">Designation</label>
            <input id="contact-role" type="text" maxLength={150} className={inputClass}
              value={form.contactPersonDesignation ?? ''} onChange={(e) => set('contactPersonDesignation', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="contact-email">Contact email</label>
            <input id="contact-email" type="email" maxLength={255} className={inputClass}
              value={form.contactPersonEmail ?? ''} onChange={(e) => set('contactPersonEmail', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="contact-phone">Contact phone</label>
            <input id="contact-phone" type="tel" maxLength={50} className={inputClass}
              value={form.contactPersonPhone ?? ''} onChange={(e) => set('contactPersonPhone', e.target.value)} />
          </div>
        </section>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-full cursor-pointer transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : 'Save details'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-full cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </form>
  );
}
