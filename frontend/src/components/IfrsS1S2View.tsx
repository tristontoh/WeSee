/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Globe, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { usePlan } from '../contexts/PlanContext';
import { IfrsS1Form, IfrsS2Form } from './IfrsDisclosureForm';

export default function IfrsS1S2View() {
  const { plan } = usePlan();
  const [activeTab, setActiveTab] = useState<'s1' | 's2'>('s1');

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-navy-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight">
              IFRS Sustainability Disclosures (S1/S2)
            </h3>
            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
              Listed Corporate Premium
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Fulfill direct compliance requirements aligned with the International Sustainability Standards Board (ISSB) frameworks.
          </p>
        </div>

        {/* Audit / Compliance indicator */}
        <div className="flex items-center space-x-2.5 bg-navy-50/60 px-4 py-2.5 rounded-2xl border border-navy-100/50">
          <ShieldCheck className="text-emerald-500 w-4 h-4 shrink-0" />
          <div className="text-[10px] font-semibold text-navy-600">
            <span>Framework: </span>
            <strong className="text-navy-900 font-bold uppercase font-mono">ISSB Standard S1 & S2</strong>
          </div>
        </div>
      </div>

      {/* Module tab bar */}
      <div className="flex space-x-1 border-b border-navy-100 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('s1')}
          className={`px-6 py-3.5 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 's1'
              ? 'border-primary-500 text-primary-600 font-black'
              : 'border-transparent text-navy-500 hover:text-navy-900 hover:border-navy-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>IFRS S1 — General Disclosures</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('s2')}
          className={`px-6 py-3.5 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 's2'
              ? 'border-primary-500 text-primary-600 font-black'
              : 'border-transparent text-navy-500 hover:text-navy-900 hover:border-navy-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5" />
            <span>IFRS S2 — Climate Disclosures</span>
          </div>
        </button>
      </div>

      {/* Render active form */}
      <div className="animate-fade-in">
        {activeTab === 's1' ? <IfrsS1Form /> : <IfrsS2Form />}
      </div>

    </div>
  );
}
