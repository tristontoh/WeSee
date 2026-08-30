/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Building2, 
  Compass, 
  CheckSquare, 
  Award, Lock, 
  ArrowRight, 
  Sparkles,
  Layers,
  Database,
  ArrowLeft,
  Briefcase,
  Globe2,
  Check,
  CheckCircle2,
  Info,
  BarChart2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SECTOR_NAME_TO_CODE } from '../api/mappers';
import { canAccess, PLATFORM_ROLES } from '../permissions';
import Button from './ui/Button';
import Select from './ui/Select';

// Sectors available in Malaysia
const MALAYSIAN_SECTORS = [
  'Technology & Software Services',
  'Manufacturing & Heavy Industry',
  'Agriculture & Plantation (Palm Oil)',
  'Construction & Property Development',
  'Energy & Oil & Gas Utilities',
  'Financial Services & Banking',
  'Consumer Products & Retail Services',
  'Healthcare & Pharmaceuticals'
];

// Available Frameworks with detailed visual cues
interface FrameworkOption {
  id: string;
  name: string;
  organization: string;
  description: string;
  recommendedFor: string;
}

const FRAMEWORK_OPTIONS: FrameworkOption[] = [
  {
    id: 'SEDG',
    name: 'SEDG (Simplified ESG Disclosure Guide)',
    organization: 'Capital Markets Malaysia',
    description: 'Specifically designed for Malaysian SMEs to enter ESG reporting without administrative overload. Comprises Core, Sector-Specific, and Transition indicators.',
    recommendedFor: 'SME'
  },
  {
    id: 'Bursa 9-matter',
    name: 'Bursa Malaysia 9-Matter Requirements',
    organization: 'Bursa Malaysia Securities',
    description: 'Mandatory standard common indicators (anti-corruption, diversity, safety, energy, emissions) for Main and ACE market listed corporations.',
    recommendedFor: 'ACE Market'
  },
  {
    id: 'Bursa 11-matter',
    name: 'Bursa Malaysia 11-Matter Requirements',
    organization: 'Bursa Malaysia Securities',
    description: 'Mandatory and sector-specific indicators for large market listed entities with advanced climate integration expectations.',
    recommendedFor: 'Main Market'
  },
  {
    id: 'IFRS S1',
    name: 'IFRS S1 General Requirements',
    organization: 'ISSB (Global Standards)',
    description: 'Global baseline requiring disclosure of material information about sustainability-related risks and opportunities.',
    recommendedFor: 'Main Market'
  },
  {
    id: 'IFRS S2',
    name: 'IFRS S2 Climate-related Disclosures',
    organization: 'ISSB (Global Standards)',
    description: 'Rigorous disclosure of Scope 1, 2, and 3 Greenhouse Gas emissions and climate governance indicators.',
    recommendedFor: 'Main Market'
  }
];

// Priority ESG Topics
interface TopicOption {
  id: string;
  name: string;
  category: 'Environmental' | 'Social' | 'Governance';
  description: string;
}

const TOPIC_OPTIONS: TopicOption[] = [
  { id: 'Carbon Emissions', name: 'Scope 1 & 2 carbon footprint', category: 'Environmental', description: 'Track electricity consumption and fuel burn metrics.' },
  { id: 'Water & Waste Management', name: 'Water withdrawal & Waste treatment', category: 'Environmental', description: 'Monitor resource efficiency and waste streams.' },
  { id: 'Labor Standards', name: 'Fair labor standards & Wages', category: 'Social', description: 'Audit supplier labor rights and internal salaries.' },
  { id: 'Board Diversity', name: 'Board Composition & Diversity', category: 'Governance', description: 'Align with corporate governance codes on gender ratios.' },
  { id: 'Anti-Corruption', name: 'Anti-Corruption & Whistleblowing policies', category: 'Governance', description: 'Deploy mandatory ethical conduct pledges.' },
  { id: 'Health & Safety', name: 'Occupational Health & Safety', category: 'Social', description: 'Log incident rates and training protocols.' }
];

// Higher tiers are supersets of lower tiers — a Main Market issuer can select everything an SME
// can, plus the frameworks/topic budget its listing tier requires. Mirrors PLAN_LEVELS in
// PlanContext.tsx so onboarding restrictions match the plan gating applied after signup.
const MARKET_TIER_ORDER: Record<'SME' | 'ACE Market' | 'Main Market', number> = {
  'SME': 1,
  'ACE Market': 2,
  'Main Market': 3
};

// SME/Starter workspaces get a focused subset of ESG topics; higher listing tiers must cover more
// ground for Bursa's 9/11-matter and IFRS disclosures, so they unlock a larger (or unlimited) budget.
const TOPIC_LIMIT_BY_MARKET: Record<'SME' | 'ACE Market' | 'Main Market', number> = {
  'SME': 3,
  'ACE Market': 5,
  'Main Market': TOPIC_OPTIONS.length
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();
  const { showToast } = useToast();

  // Declared before any early return below so hook order stays stable across renders
  // (user starts null/undefined while the session rehydrates, then resolves to a role).
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4>(1);

  const [market, setMarket] = useState<'SME' | 'ACE Market' | 'Main Market'>('SME');
  const [sector, setSector] = useState(MALAYSIAN_SECTORS[0]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(['SEDG']);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(['Carbon Emissions', 'Anti-Corruption']);

  const [loadingText, setLoadingText] = useState('Generating secure sandbox database...');
  const [loadingProgress, setLoadingProgress] = useState(15);

  /** Drives the last beat of the setup screen: the compass resolves into a tick at 100%. */
  const isComplete = loadingProgress >= 100;

  // Platform-level roles have no company to onboard — send them straight to the operator console.
  if (canAccess(user?.role, PLATFORM_ROLES)) {
    return <Navigate to="/admin" replace />;
  }

  // Frameworks reserved for a higher listing tier than the declared market can never be toggled
  // on, even via a stale click — the visible list is already filtered, but this keeps state
  // consistent if that ever changes.
  const availableFrameworks = FRAMEWORK_OPTIONS.filter(
    (f) => MARKET_TIER_ORDER[f.recommendedFor as keyof typeof MARKET_TIER_ORDER] <= MARKET_TIER_ORDER[market]
  );

  const topicLimit = TOPIC_LIMIT_BY_MARKET[market];

  const handleToggleFramework = (id: string) => {
    if (!availableFrameworks.some((f) => f.id === id)) return;
    setSelectedFrameworks(prev => {
      if (prev.includes(id)) {
        return prev.filter(f => f !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleTogglePriority = (id: string) => {
    setSelectedPriorities(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      }
      if (prev.length >= topicLimit) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleGoToStep2 = () => {
    if (market === 'SME') {
      setSelectedFrameworks(['SEDG']);
    } else if (market === 'ACE Market') {
      setSelectedFrameworks(['Bursa 9-matter', 'SEDG']);
    } else {
      setSelectedFrameworks(['Bursa 11-matter', 'IFRS S1', 'IFRS S2']);
    }
    setOnboardingStep(2);
  };

  const handleGoToStep3 = () => {
    if (selectedFrameworks.length === 0) {
      showToast('Please select at least one disclosure framework to align your reporting cycles.', 'error');
      return;
    }
    setOnboardingStep(3);
  };

  const handleFinishOnboarding = async () => {
    if (selectedPriorities.length === 0) {
      showToast('Please select at least one priority ESG focus area to seed your reporting indicators.', 'error');
      return;
    }
    setOnboardingStep(4);
    
    setTimeout(() => {
      setLoadingText('Mapping mandatory reporting indicators...');
      setLoadingProgress(45);
    }, 1000);
    setTimeout(() => {
      setLoadingText('Pre-configuring materiality metrics...');
      setLoadingProgress(70);
    }, 2000);
    setTimeout(() => {
      setLoadingText('Applying global standard calculations...');
      setLoadingProgress(90);
    }, 3000);
    // The stages above are a timed narration, but 100% is not: it waits for the request to actually
    // return, so the bar filling means the workspace exists rather than that 3.8s have passed.
    setTimeout(async () => {
      try {
        await completeOnboarding({
          market,
          sectorCode: SECTOR_NAME_TO_CODE[sector] ?? '',
          frameworks: selectedFrameworks,
          priorities: selectedPriorities
        });
      } catch (err: any) {
        // Previously this rejection was swallowed inside the timeout and the screen sat at 100%
        // for good. Back to the last step, where the choices are still filled in.
        setOnboardingStep(3);
        setLoadingProgress(15);
        setLoadingText('Generating secure sandbox database...');
        showToast(err?.message || 'Could not finish setting up your workspace. Please try again.', 'error');
        return;
      }

      setLoadingProgress(100);
      setLoadingText('Indicators, materiality and disclosures are in place.');
      // A beat on the finished state — otherwise the tick it resolves into is never seen.
      setTimeout(() => navigate('/dashboard'), 900);
    }, 3800);
  };

  return (
    <div className="min-h-screen w-screen overflow-y-auto bg-app-mesh text-gray-900 flex flex-col font-sans">
      
      {/* 1. Header Row */}
      <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white border border-emerald-100 rounded-xl">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
            </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-gray-900 block">WeSee Onboarding Portal</span>
            <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-widest block leading-none">Workspace Initialization</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium">
          <span>Active Representative:</span>
          <span className="text-gray-900 font-bold bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
            {user?.name || 'Administrator'}
          </span>
        </div>
      </header>

      {/* 2. Main Setup Form Area */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-sky-100/50 rounded-full blur-3xl opacity-60 translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="max-w-4xl w-full bg-white border border-gray-200 rounded-3xl p-7 sm:p-12 shadow-xl relative z-10">
          
          {/* ONBOARDING PROGRESS HEADER BAR */}
          {onboardingStep < 4 && (
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-500">
                <span>Setup Progress</span>
                <span className="text-emerald-600">Step {onboardingStep} of 3</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full flex overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${(onboardingStep / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 1: ORGANIZATION BOUNDARY & CLASSIFICATION */}
          {onboardingStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  Organization Profile
                </div>
                <h3 className="text-2xl font-black text-gray-900">Declare your reporting boundaries</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  WeSee aligns workspace tiers, reports, and calculations to meet your specific market regulations. Under Malaysian NSRF mandates, choose your corporate scale.
                </p>
              </div>

              {/* Three Market Classification Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                
                {/* SME Option */}
                <button
                  type="button"
                  onClick={() => setMarket('SME')}
                  className={`p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-44 ${
                    market === 'SME' 
                      ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className={`p-2 rounded-xl w-10 h-10 flex items-center justify-center ${market === 'SME' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-sm text-gray-900 block">SME Enterprise</span>
                    <span className="text-[11px] text-gray-500 block leading-relaxed">
                      Sectors reporting under SEDG core guides.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 mt-2 block">
                    Starter Tier Included
                  </span>
                </button>

                {/* ACE Market Option */}
                <button
                  type="button"
                  onClick={() => setMarket('ACE Market')}
                  className={`p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-44 ${
                    market === 'ACE Market' 
                      ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className={`p-2 rounded-xl w-10 h-10 flex items-center justify-center ${market === 'ACE Market' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-sm text-gray-900 block">ACE Listed Market</span>
                    <span className="text-[11px] text-gray-500 block leading-relaxed">
                      Small-to-mid capital companies listed on Bursa ACE board.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 mt-2 block">
                    Growth Tier Activated
                  </span>
                </button>

                {/* Main Market Option */}
                <button
                  type="button"
                  onClick={() => setMarket('Main Market')}
                  className={`p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-44 ${
                    market === 'Main Market' 
                      ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className={`p-2 rounded-xl w-10 h-10 flex items-center justify-center ${market === 'Main Market' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-sm text-gray-900 block">Main Listed Market</span>
                    <span className="text-[11px] text-gray-500 block leading-relaxed">
                      Large-cap companies, aligned to global IFRS S1/S2 scope.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 mt-2 block">
                    Issuer-Ready Activated
                  </span>
                </button>

              </div>

              {/* Sector Selection */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-700 block">Select Active Operational Sector</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <Select
                    className="w-full"
                    aria-label="Sector"
                    value={sector}
                    onChange={setSector}
                    options={MALAYSIAN_SECTORS.map((s) => ({ value: s, label: s }))}
                  />
                  {/* Select draws its own chevron. */}
                  <div className="hidden">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleGoToStep2}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center transition-all shadow-sm cursor-pointer"
                >
                  <span>Continue Setup</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: FRAMEWORK ALIGNMENT */}
          {onboardingStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  Compliance Frameworks
                </div>
                <h3 className="text-2xl font-black text-gray-900">Select applicable reporting frameworks</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Based on your classification as a <strong>{market}</strong>, we have pre-selected the recommended reporting frameworks. Only frameworks available at your listing tier are shown — higher-tier frameworks unlock if you register at a higher market classification.
                </p>
              </div>

              {/* Frameworks Selection List */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto overscroll-contain pr-2 no-scrollbar">
                {availableFrameworks.map((f) => {
                  const isChecked = selectedFrameworks.includes(f.id);
                  const isRecommended = 
                    (market === 'SME' && f.recommendedFor === 'SME') ||
                    (market === 'ACE Market' && (f.recommendedFor === 'ACE Market' || f.recommendedFor === 'SME')) ||
                    (market === 'Main Market' && f.recommendedFor === 'Main Market');

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleToggleFramework(f.id)}
                      className={`w-full p-4 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-4 ${
                        isChecked 
                          ? 'bg-white border-emerald-500 ring-1 ring-emerald-500/20 shadow-md' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900 block truncate">{f.name}</span>
                          
                          {isRecommended && (
                            <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-md">
                              Recommended
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 block font-bold uppercase">{f.organization}</span>
                        <p className="text-[11px] text-gray-600 leading-relaxed font-medium">{f.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation controllers */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(1)}
                  className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center transition-colors cursor-pointer border border-gray-200 hover:bg-gray-50 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoToStep3}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center transition-all shadow-sm cursor-pointer"
                >
                  <span>Configure Metrics</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEWS AND KEY TOPICS */}
          {onboardingStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  Disclosure Preconfiguration
                </div>
                <h3 className="text-2xl font-black text-gray-900">Seed priority ESG focus areas</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Pick key environmental, social, or governance themes that are high priority for your company. We will prepare active indicators with input forms in your dashboard.
                </p>
                <p className="text-xs font-bold text-emerald-600">
                  {market} tier: select up to {topicLimit} focus area{topicLimit === 1 ? '' : 's'} ({selectedPriorities.length} of {topicLimit} selected)
                </p>
              </div>

              {/* Topics Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto overscroll-contain pr-1 no-scrollbar">
                {TOPIC_OPTIONS.map((opt) => {
                  const isChecked = selectedPriorities.includes(opt.id);
                  const isDisabled = !isChecked && selectedPriorities.length >= topicLimit;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleTogglePriority(opt.id)}
                      disabled={isDisabled}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start space-x-3.5 ${
                        isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      } ${
                        isChecked
                          ? 'bg-white border-emerald-500 ring-1 ring-emerald-500/20 shadow-md'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-900 block">{opt.id}</span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            opt.category === 'Environmental' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            opt.category === 'Social' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            'bg-purple-50 text-purple-600 border border-purple-100'
                          }`}>
                            {opt.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-normal font-medium">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation controllers */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center transition-colors cursor-pointer border border-gray-200 hover:bg-gray-50 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center transition-all shadow-sm cursor-pointer animate-pulse-slow"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>Initialize ESG Environment</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: INTUITIVE BOOTSTRAPPING ENGINE (Animated loading) */}
          {onboardingStep === 4 && (
            <div className="py-14 flex flex-col items-center justify-center text-center space-y-7 animate-fade-in">
              {/*
                Two haloes on the same easing, offset by half a cycle, so the pulse reads as one
                continuous breath instead of animate-ping's hard restart. The mark itself turns
                slowly rather than spinning — beside a progress bar, a fast spinner competes with it.
              */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-[26px] bg-emerald-500/25 blur-xl animate-aura" />
                <div
                  className="absolute w-20 h-20 rounded-[26px] bg-emerald-400/20 blur-2xl animate-aura"
                  style={{ animationDelay: '1.3s' }}
                />
                <div
                  className={`w-20 h-20 bg-white border border-emerald-100 rounded-[26px] flex items-center justify-center relative z-10 shadow-lg transition-colors duration-500 ${
                    isComplete ? 'text-emerald-600 border-emerald-300' : 'text-emerald-500'
                  }`}
                >
                  {/* The mark resolves into a tick at 100% — the one moment worth marking. */}
                  {isComplete ? (
                    <Check className="w-11 h-11 animate-fade-in" strokeWidth={2.5} />
                  ) : (
                    <Compass className="w-10 h-10 animate-spin-slow" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-gray-900">
                  {isComplete ? 'Your workspace is ready' : 'Initializing your workspace…'}
                </h3>
                {/* Keyed on the text so each stage fades in as its own line rather than swapping
                    characters underneath the reader. */}
                <p key={loadingText} className="text-sm text-gray-500 font-medium animate-fade-in">
                  {loadingText}
                </p>
              </div>

              <div className="max-w-sm w-full pt-2">
                <div
                  className="h-2 bg-gray-100 rounded-full overflow-hidden w-full"
                  role="progressbar"
                  aria-valuenow={loadingProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Workspace setup"
                >
                  {/* The same easing the rest of the app uses, over a longer duration: the jumps
                      between stages are large, and a linear fill of 20% looks like a stutter. */}
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    style={{
                      width: `${loadingProgress}%`,
                      transition: 'width 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-gray-400 pt-2.5 uppercase tracking-wider">
                  <span>{isComplete ? 'Complete' : 'System Setup'}</span>
                  <span className="tabular-nums text-gray-500">{loadingProgress}%</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* 3. Footer Row */}
      <footer className="h-12 border-t border-gray-200 bg-white px-6 flex items-center justify-between text-xs font-medium text-gray-500 shrink-0 sticky bottom-0 z-50">
        <span>© 2026 WeSee Malaysia Onboarding Console</span>
        <div className="flex items-center">
           <Lock className="w-3.5 h-3.5 mr-1.5" />
           <span>Secure ISO/IEC 27001 Certified Host</span>
        </div>
      </footer>

    </div>
  );
}