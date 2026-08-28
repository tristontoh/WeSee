/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Minus,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Info,
  HelpCircle,
  Building,
  Target,
  Landmark
} from 'lucide-react';

import Button from './ui/Button';
import Reveal from './ui/Reveal';
import { useScrolled } from '../hooks/useScrolled';
import Card from './ui/Card';
import { publicApi, PublicPlanPricing } from '../api/publicApi';

interface PricingPageProps {
  onNavigateToDashboard: () => void;
  onNavigateToFeatures: () => void;
  onNavigateToLanding: (section?: string) => void;
  onNavigateToAbout: () => void;
}

/**
 * Issuer-Ready is quoted, not listed, so its call to action has to reach a person. There is no
 * sales inbox or contact form in the product yet, so it goes to support — previously this button
 * ran the same handler as "Start free trial" and dropped an enterprise enquiry on the signup form.
 */
const SALES_MAILTO = `mailto:support@wesee.my?subject=${encodeURIComponent('Issuer-Ready plan enquiry')}`;

/**
 * Last resort, shown only if the pricing call fails — the marketing page must not render a card
 * with a blank price. These mirror the seeded figures (migrations V15/V49/V76), so they go stale
 * the moment an admin changes a price; that is the accepted cost of never showing an empty card.
 */
const FALLBACK_PRICING: PublicPlanPricing[] = [
  { plan: 'STARTER', monthlyPrice: 99, annualMonthlyPrice: 83 },
  { plan: 'GROWTH', monthlyPrice: 699, annualMonthlyPrice: 583 },
];

/** `99` -> `RM 99`, `99.5` -> `RM 99.50`. Prices are NUMERIC(10,2), so cents are possible. */
function ringgit(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The largest saving any plan actually offers, as a whole percent, or 0 if none does.
 *
 * Derived rather than written down: the badge here read "Save over 30%" while the seeded annual
 * price equalled the monthly one, so the page was advertising a discount that did not exist and
 * would have gone on doing so through every future price change.
 */
function maxSavingPercent(rows: PublicPlanPricing[] | null): number {
  const source = rows && rows.length > 0 ? rows : FALLBACK_PRICING;
  const best = Math.max(
    0,
    ...source
      .filter((r) => r.monthlyPrice > 0)
      .map((r) => 1 - r.annualMonthlyPrice / r.monthlyPrice),
  );
  return Math.round(best * 100);
}

function buildPrices(rows: PublicPlanPricing[] | null) {
  const source = rows && rows.length > 0 ? rows : FALLBACK_PRICING;
  const forPlan = (plan: PublicPlanPricing['plan']) => {
    const row = source.find((r) => r.plan === plan)
      ?? FALLBACK_PRICING.find((r) => r.plan === plan)!;
    return {
      monthly: ringgit(row.monthlyPrice),
      annual: ringgit(row.annualMonthlyPrice),
      // The headline is per month either way; this is what the year actually costs.
      annualBilled: ringgit(row.annualMonthlyPrice * 12),
    };
  };
  return { starter: forPlan('STARTER'), growth: forPlan('GROWTH') };
}

export default function PricingPage({ onNavigateToDashboard, onNavigateToFeatures, onNavigateToLanding, onNavigateToAbout }: PricingPageProps) {
  const scrolled = useScrolled();
  // Billing cycle state: false = Monthly, true = Annual
  const [isAnnual, setIsAnnual] = useState(true);

  // What an admin has set in Platform Admin -> Plan Management. Until this arrives the fallback
  // below is shown; the Issuer-Ready tier is quoted, not listed, so it takes no figure from here.
  const [pricing, setPricing] = useState<PublicPlanPricing[] | null>(null);

  useEffect(() => {
    publicApi.planPricing().then(setPricing).catch(() => setPricing(null));
  }, []);

  const prices = useMemo(() => buildPrices(pricing), [pricing]);
  const savingPercent = useMemo(() => maxSavingPercent(pricing), [pricing]);

  // FAQ state: open questions indexes
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({
    0: true, // open the first FAQ by default
  });

  const toggleFaq = (index: number) => {
    setOpenFaqs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Mobile Accordion state for Comparison table
  const [openMobilePlan, setOpenMobilePlan] = useState<'starter' | 'growth' | 'issuer' | null>('growth');

  const faqs = [
    {
      question: "What's the difference between SEDG and Bursa's Common Sustainability Matters?",
      answer: "The Simplified ESG Disclosure Guide (SEDG) is developed by Capital Markets Malaysia primarily for small-to-medium enterprises (SMEs) to simplify tracking across common global supply chain demands. Bursa Malaysia's Common Sustainability Matters are a broader, more rigorous set of mandated disclosure metrics specifically required for companies listed on the Main and ACE markets. WeSee seamlessly supports both frameworks and maps overlapping indicators to save you double entry."
    },
    {
      question: "Can I upgrade from Growth to Issuer-Ready?",
      answer: "Absolutely. You can upgrade your account at any time. All of your existing materiality assessments, governance documents, and historical emissions data will automatically migrate and pre-populate the corresponding fields in the expanded Bursa Malaysia / NSRF framework."
    },
    {
      question: "Does this replace Bursa Malaysia's CSI platform?",
      answer: "No, WeSee is an internal readiness, data consolidation, and compliance prep layer. Bursa Malaysia's Centralised Sustainability Intelligence (CSI) platform remains the official mandatory submission channel for listed issuers. WeSee acts as your team's internal collaboration workspace to compile, verify, and export CSI-compatible datasets so you can submit with absolute confidence."
    },
    {
      question: "Are our greenhouse gas (GHG) calculations audit-ready?",
      answer: "Yes, our Scope 1, 2, and 3 emissions engine is built strictly in accordance with the Greenhouse Gas Protocol Corporate Standard. We pre-populate localized emission factors (such as grid electricity intensity from the Energy Commission of Malaysia) and provide complete audit trails, source-document attachments, and version history."
    },
    {
      question: "What is transition-relief handling in Issuer-Ready?",
      answer: "Under the National Sustainability Reporting Framework (NSRF) aligned with ISSB S1/S2 standards, listed companies are granted specific transition relief in the first 1-2 years of mandatory compliance (e.g., regarding Scope 3 emissions or specific climate resilience metrics). Our Issuer-Ready plan handles these reliefs dynamically, allowing you to flag and note them in compliance with official regulatory guidelines."
    },
    {
      question: "What support SLA is provided for Malaysian listed issuers?",
      answer: "Issuer-Ready subscribers are assigned a dedicated sustainability advisor and have access to our priority technical support team with a guaranteed 4-hour response time SLA, ensuring uninterrupted report preparation ahead of annual reporting deadlines."
    }
  ];

  // Comparison Table Structure
  const tableData = [
    {
      section: "Materiality & Governance",
      features: [
        { name: "Materiality Assessment Tool", starter: "Basic guided", growth: "Standard guided", issuer: "Full multi-stakeholder assessment" },
        { name: "Governance Structure Setup", starter: "Basic template", growth: "Interactive governance mapping", issuer: "Assurance-ready board-level workflows" },
        { name: "Internal ESG Policies", starter: "3 essential templates", growth: "10+ custom templates", issuer: "Unlimited fully customized policies" },
        { name: "Materiality Heatmaps", starter: false, growth: true, issuer: true },
      ]
    },
    {
      section: "Indicator Coverage",
      features: [
        { name: "SEDG Mapped Disclosures", starter: "Core indicators only", growth: "All 35 core + advanced indicators", issuer: "Full SEDG library" },
        { name: "Bursa Common Sustainability Matters", starter: false, starterText: "—", growth: false, growthText: "—", issuer: "All 9/11 Common matters by market sector" },
        { name: "IFRS S1 General Disclosures Module", starter: false, starterText: "—", growth: false, growthText: "—", issuer: true },
        { name: "IFRS S2 Climate Disclosures Module", starter: false, starterText: "—", growth: false, growthText: "—", issuer: true },
        { name: "Sector-Specific Modules", starter: false, starterText: "—", growth: "1 Sector module included", issuer: "Unlimited sector library access" },
      ]
    },
    {
      section: "Data & Tracking",
      features: [
        { name: "Historical Tracking Range", starter: "Single-year entry", growth: "3-year range with target tracking", issuer: "Unlimited historical tracking & multi-scenario targets" },
        { name: "Scope 1 Emissions", starter: "Basic estimation calculator", growth: "Full calculation engine", issuer: "Auditable real-time emissions monitoring" },
        { name: "Scope 2 Emissions", starter: false, starterText: "—", growth: "Grid-factor emissions calculator", issuer: "Location and market-based tracking" },
        { name: "Scope 3 Emissions", starter: false, starterText: "—", growth: false, growthText: "—", issuer: "Complete Scope 3 tracking with supplier portal" },
        { name: "Transition-Relief Handling", starter: false, starterText: "—", growth: false, growthText: "—", issuer: "Fully built-in regulatory reliefs" },
      ]
    },
    {
      section: "Assurance & Export",
      features: [
        { name: "Audit Trail Logging", starter: "Basic system log", growth: "Comprehensive user-change audit log", issuer: "Cryptographically verified immutable audit log" },
        { name: "Internal Sign-off Workflows", starter: false, starterText: "—", growth: "Single reviewer approval", issuer: "Multi-level department & board sign-off" },
        { name: "Assurance-Readiness Workspace", starter: false, starterText: "—", growth: false, growthText: "—", issuer: "Full third-party assurance auditor login portal" },
        { name: "Export Formats", starter: "Summary PDF", growth: "Excel, PDF & standard Word", issuer: "CSI-compatible JSON, Custom PDF/Excel & slide decks" },
      ]
    },
    {
      section: "Support & Access",
      features: [
        { name: "Team Collaborators", starter: "1 user limit", growth: "Up to 5 seats", issuer: "Unlimited multi-department seats" },
        { name: "Department Role Controls", starter: false, starterText: "—", growth: "Standard manager role", issuer: "Granular multi-department permissions & RBAC" },
        { name: "Customer Support Support", starter: "Knowledge Base", growth: "Next business day email/chat", issuer: "Dedicated Sustainability Advisor + 4hr SLA" },
      ]
    }
  ];

  const handleNav = (section?: string) => {
    onNavigateToLanding(section);
  };

  return (
    <div className="min-h-screen bg-app-mesh text-navy-900 font-sans selection:bg-primary-100 selection:text-primary-900 relative">
      
      {/* 1. STICKY TOP NAV */}
      <nav
        className={`sticky top-0 z-50 px-6 bg-white/70 backdrop-blur-xl border-b transition-all duration-300 ${
          scrolled ? 'border-white/60 py-3 shadow-[0_8px_30px_rgba(5,8,30,.08)]' : 'border-white/40 py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo segment */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNav()}>
            <div className="p-2 bg-white rounded-xl border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-navy-950 block">WeSee</span>
              <span className="text-[9px] font-semibold text-navy-400 uppercase tracking-widest block leading-none">MALAYSIA</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-navy-600">
            <button onClick={() => handleNav()} className="hover:text-primary-600 transition-colors cursor-pointer">Home</button>
            <button onClick={onNavigateToFeatures} className="hover:text-primary-600 transition-colors cursor-pointer">Product</button>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-primary-600 font-semibold cursor-pointer">Pricing</button>
            <button onClick={onNavigateToAbout} className="hover:text-primary-600 transition-colors cursor-pointer">About</button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={onNavigateToDashboard}
              className="text-sm font-semibold text-navy-600 hover:text-navy-900 transition-colors cursor-pointer"
            >
              Log in
            </button>
            <Button variant="primary" size="sm" onClick={onNavigateToDashboard}>
              Get Started
            </Button>
          </div>

        </div>
      </nav>

      {/* 2. PAGE HEADER + TOGGLE */}
      <section className="relative overflow-hidden pt-16 pb-12 bg-auth-photo">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/70 via-[#0A0E27]/45 to-[#0A0E27]/75 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-2">Flexible Corporate Pricing</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto">
            Plans built to scale with your ESG reporting needs
          </h1>
          <p className="text-sm md:text-base text-white/75 max-w-2xl mx-auto mt-4 leading-relaxed">
            Whether preparing your first Simplified ESG Disclosure Guide (SEDG) report or aligning with mandatory Bursa Malaysia disclosures, choose a plan suited for your audit readiness.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <span className={`text-xs font-semibold transition-colors ${!isAnnual ? 'text-white font-bold' : 'text-white/60'}`}>Billed Monthly</span>
            
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Toggle Billing Cycle"
            >
              <span 
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAnnual ? 'translate-x-5 bg-primary-600' : 'translate-x-0'}`} 
              />
            </button>

            <span className={`text-xs font-semibold transition-colors ${isAnnual ? 'text-white font-bold' : 'text-white/60'}`}>Billed Annually</span>
            
            {savingPercent > 0 && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-100 border border-emerald-200 rounded-full text-[10px] font-bold text-emerald-800 animate-pulse">
                <Sparkles className="w-3 h-3" />
                <span>Save up to {savingPercent}%</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 3. THREE PRICING CARDS */}
      <section className="py-12 relative">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* PLAN 1: STARTER */}
              <Card hoverEffect className="bg-bg-light border border-navy-100 flex flex-col justify-between h-full" padded="lg">
                <div>
                  <div className="flex items-center space-x-2.5 mb-4">
                    <div className="p-2 bg-navy-100 text-navy-800 rounded-xl">
                      <Building className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-navy-950">SME Starter</h3>
                  </div>
                  <p className="text-xs text-navy-500 font-medium min-h-[32px]">
                    Fulfill basic local supply-chain assessments with CMM's core SEDG standards.
                  </p>
  
                  {/* Price */}
                  <div className="my-6">
                    <div className="flex items-baseline text-navy-950">
                      <span className="text-3xl md:text-4xl font-extrabold tracking-tight">
                        {isAnnual ? prices.starter.annual : prices.starter.monthly}
                      </span>
                      <span className="ml-1 text-xs font-medium text-navy-500">/ month</span>
                    </div>
                    <span className="text-[10px] text-navy-400 font-medium block mt-1">
                      {isAnnual ? `Billed annually at ${prices.starter.annualBilled}/year` : 'Billed monthly'}
                    </span>
                  </div>
  
                  {/* Bullet capabilities */}
                  <div className="border-t border-navy-200/60 pt-5 mt-5">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block mb-4">Included capabilities</span>
                    <ul className="space-y-3">
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>SEDG Basic tier template</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Guided materiality assessment</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Single-year indicator data entry</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Exportable disclosure summary PDF</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Standard email support</span>
                      </li>
                    </ul>
                  </div>
                </div>
  
                <div className="mt-8">
                  <Button variant="secondary" size="md" className="w-full text-center" onClick={onNavigateToDashboard}>
                    Start free trial
                  </Button>
                </div>
              </Card>
  
              {/* PLAN 2: GROWTH (RECOMMENDED / Visually Emphasized) */}
              {/* The badge straddles the card's top edge, so it cannot live inside Card — Card
                  clips its own overflow to contain the organic-gradient blobs. It hangs off this
                  wrapper instead, above the card in the stack. */}
              <div className="relative h-full">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-primary-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-md whitespace-nowrap">
                  MOST POPULAR
                </div>
              <Card className="bg-white border-2 border-primary-500 relative flex flex-col justify-between h-full shadow-xl shadow-primary-500/5" padded="lg">
  
                <div>
                  <div className="flex items-center space-x-2.5 mb-4">
                    <div className="p-2 bg-primary-100 text-primary-600 rounded-xl">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-navy-950">SME Growth</h3>
                  </div>
                  <p className="text-xs text-navy-500 font-medium min-h-[32px]">
                    Robust multi-year tracking for suppliers with advanced export and audit needs.
                  </p>
  
                  {/* Price */}
                  <div className="my-6">
                    <div className="flex items-baseline text-navy-950">
                      <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary-600">
                        {isAnnual ? prices.growth.annual : prices.growth.monthly}
                      </span>
                      <span className="ml-1 text-xs font-medium text-navy-500">/ month</span>
                    </div>
                    <span className="text-[10px] text-navy-400 font-medium block mt-1">
                      {isAnnual ? `Billed annually at ${prices.growth.annualBilled}/year` : 'Billed monthly'}
                    </span>
                  </div>
  
                  {/* Bullet capabilities */}
                  <div className="border-t border-navy-200/60 pt-5 mt-5">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block mb-4">Everything in Starter plus:</span>
                    <ul className="space-y-3">
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span className="font-semibold text-navy-900">Full SEDG (All 35 disclosures)</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>3-year data tracking with targets</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Governance structure documentation</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>1 localized sector-specific module</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Comprehensive interactive audit trail</span>
                      </li>
                    </ul>
                  </div>
                </div>
  
                <div className="mt-8">
                  <Button variant="primary" size="md" className="w-full text-center" onClick={onNavigateToDashboard}>
                    Start free trial
                  </Button>
                </div>
              </Card>
              </div>
  
              {/* PLAN 3: ISSUER READY */}
              <Card hoverEffect className="bg-bg-light border border-navy-100 flex flex-col justify-between h-full" padded="lg">
                <div>
                  <div className="flex items-center space-x-2.5 mb-4">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-navy-950">Issuer-Ready</h3>
                  </div>
                  <p className="text-xs text-navy-500 font-medium min-h-[32px]">
                    Enterprise-grade platform for public listed companies and high-impact non-listed enterprises.
                  </p>
  
                  {/* Price */}
                  <div className="my-6">
                    <div className="flex items-baseline text-navy-950">
                      <span className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        Contact Sales
                      </span>
                    </div>
                    <span className="text-[10px] text-navy-400 font-medium block mt-1">
                      Bespoke SLA & Custom Enterprise Agreement
                    </span>
                  </div>
  
                  {/* Bullet capabilities */}
                  <div className="border-t border-navy-200/60 pt-5 mt-5">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block mb-4">Enterprise Capabilites</span>
                    <ul className="space-y-3">
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span className="font-semibold text-navy-900">Bursa Common Sustainability Matters</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>IFRS S1 and S2 Climate Modules</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Full Scope 1-3 greenhouse gas tracking</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Assurance-readiness workspace + sign-off</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-700">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>CSI-compatible JSON export formats</span>
                      </li>
                    </ul>
                  </div>
                </div>
  
                <div className="mt-8">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full text-center hover:bg-navy-100"
                    onClick={() => { window.location.href = SALES_MAILTO; }}
                  >
                    Contact Sales
                  </Button>
                </div>
              </Card>
  
            </div>
          </div>
        </Reveal>
      </section>

      {/* 4. FULL COMPARISON TABLE SECTION */}
      <section className="py-16 md:py-24 border-t border-white/50">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Granular Details</span>
              <h2 className="text-2xl md:text-3xl font-bold text-navy-950">Detailed Feature Comparison</h2>
              <p className="text-sm text-navy-500 mt-2">See how our custom reporting modules map to different business goals.</p>
            </div>
  
            {/* DESKTOP STICKY COMPARISON TABLE (hidden on mobile) */}
            <div className="hidden lg:block relative overflow-visible border border-navy-100/70 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                {/* Sticky Table Header */}
                <thead className="sticky top-[73px] z-30 bg-navy-50 border-b border-navy-200/80 shadow-sm">
                  <tr>
                    <th className="py-4.5 px-6 text-xs font-bold text-navy-900 uppercase tracking-wider w-1/3">Feature Capabilities</th>
                    <th className="py-4.5 px-6 text-xs font-bold text-navy-900 uppercase tracking-wider text-center w-1/5">SME Starter</th>
                    <th className="py-4.5 px-6 text-xs font-bold text-navy-900 uppercase tracking-wider text-center w-1/5 bg-primary-50/40">SME Growth</th>
                    <th className="py-4.5 px-6 text-xs font-bold text-navy-900 uppercase tracking-wider text-center w-1/5">Issuer-Ready</th>
                  </tr>
                </thead>
  
                {/* Table Content */}
                <tbody className="divide-y divide-navy-100">
                  {tableData.map((section, sIdx) => (
                    <React.Fragment key={sIdx}>
                      {/* Section Row */}
                      <tr className="bg-navy-50/40">
                        <td colSpan={4} className="py-3 px-6 text-xs font-bold text-primary-800 uppercase tracking-widest bg-navy-50/50">
                          {section.section}
                        </td>
                      </tr>
                      {section.features.map((feat, fIdx) => (
                        <tr key={fIdx} className="hover:bg-navy-50/30 transition-colors">
                          <td className="py-4 px-6 text-xs font-semibold text-navy-900 flex items-center space-x-2">
                            <span>{feat.name}</span>
                          </td>
                          
                          {/* Starter Column */}
                          <td className="py-4 px-6 text-xs text-navy-600 text-center">
                            {typeof feat.starter === 'boolean' ? (
                              feat.starter ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <Minus className="w-4 h-4 text-navy-300 mx-auto" />
                              )
                            ) : (
                              <span className="font-medium text-navy-800">{feat.starter}</span>
                            )}
                          </td>
  
                          {/* Growth Column (Emphasized) */}
                          <td className="py-4 px-6 text-xs text-navy-600 text-center bg-primary-50/10 font-medium">
                            {typeof feat.growth === 'boolean' ? (
                              feat.growth ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto font-bold" />
                              ) : (
                                <Minus className="w-4 h-4 text-navy-300 mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold text-primary-700">{feat.growth}</span>
                            )}
                          </td>
  
                          {/* Issuer Ready Column */}
                          <td className="py-4 px-6 text-xs text-navy-600 text-center">
                            {typeof feat.issuer === 'boolean' ? (
                              feat.issuer ? (
                                <Check className="w-5 h-5 text-purple-600 mx-auto" />
                              ) : (
                                <Minus className="w-4 h-4 text-navy-300 mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold text-navy-950">{feat.issuer}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
  
            {/* MOBILE ACCORDION (shown on mobile, collapsed per plan) */}
            <div className="lg:hidden space-y-4">
              
              {/* Toggle buttons for Mobile comparison */}
              <div className="flex bg-navy-100/60 p-1 rounded-xl">
                <button 
                  onClick={() => setOpenMobilePlan('starter')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${openMobilePlan === 'starter' ? 'bg-white text-navy-950 shadow-sm' : 'text-navy-500'}`}
                >
                  Starter
                </button>
                <button 
                  onClick={() => setOpenMobilePlan('growth')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${openMobilePlan === 'growth' ? 'bg-white text-navy-950 shadow-sm' : 'text-navy-500'}`}
                >
                  Growth
                </button>
                <button 
                  onClick={() => setOpenMobilePlan('issuer')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${openMobilePlan === 'issuer' ? 'bg-white text-navy-950 shadow-sm' : 'text-navy-500'}`}
                >
                  Issuer
                </button>
              </div>
  
              {/* Render selected mobile plan comparison card */}
              <Card className="bg-white/70 backdrop-blur-md border border-white/60" padded="md">
                <div className="border-b border-navy-100 pb-3 mb-4 flex justify-between items-center">
                  <span className="text-sm font-bold text-navy-950">
                    {openMobilePlan === 'starter' && "SME Starter Package Details"}
                    {openMobilePlan === 'growth' && "SME Growth Package Details"}
                    {openMobilePlan === 'issuer' && "Issuer-Ready Package Details"}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                    {openMobilePlan === 'starter' && `${isAnnual ? prices.starter.annual : prices.starter.monthly}/mo`}
                    {openMobilePlan === 'growth' && `${isAnnual ? prices.growth.annual : prices.growth.monthly}/mo`}
                    {openMobilePlan === 'issuer' && "Custom SLA"}
                  </span>
                </div>
  
                <div className="space-y-6">
                  {tableData.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-2">
                      <h4 className="text-[10px] font-bold text-primary-700 uppercase tracking-widest">{section.section}</h4>
                      <ul className="divide-y divide-navy-50">
                        {section.features.map((feat, fIdx) => {
                          let val: string | boolean = false;
                          if (openMobilePlan === 'starter') val = feat.starter;
                          if (openMobilePlan === 'growth') val = feat.growth;
                          if (openMobilePlan === 'issuer') val = feat.issuer;
  
                          return (
                            <li key={fIdx} className="py-2.5 flex items-center justify-between text-xs">
                              <span className="text-navy-500 font-medium">{feat.name}</span>
                              <span className="text-right font-bold text-navy-800">
                                {typeof val === 'boolean' ? (
                                  val ? (
                                    <span className="text-emerald-600 font-bold">Included</span>
                                  ) : (
                                    <span className="text-navy-300 font-medium">—</span>
                                  )
                                ) : (
                                  <span className="text-navy-900">{val}</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
  
            </div>
          </div>
        </Reveal>
      </section>

      {/* 5. FAQ SECTION */}
      <section className="py-20 md:py-28">
        <Reveal>
        <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <HelpCircle className="w-10 h-10 text-primary-500 mx-auto mb-3" />
              <h2 className="text-3xl font-bold tracking-tight text-navy-950">Frequently Asked Questions</h2>
              <p className="text-sm text-navy-500 mt-2">Everything you need to know about Malaysia's changing ESG regulatory landscape.</p>
            </div>
  
            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaqs[index];
                return (
                  <div 
                    key={index} 
                    className="bg-white/70 backdrop-blur-md border border-white/60/80 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-5 text-left text-navy-950 font-bold text-xs md:text-sm hover:bg-navy-50/40 transition-colors focus:outline-none"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4.5 h-4.5 text-navy-500 shrink-0 ml-4" />
                      ) : (
                        <ChevronDown className="w-4.5 h-4.5 text-navy-500 shrink-0 ml-4" />
                      )}
                    </button>
                    
                    {isOpen && (
                      <div className="p-5 pt-0 text-xs md:text-sm text-navy-600 leading-relaxed border-t border-navy-50 bg-navy-50/20">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* 6. FINAL CTA BAND */}
      <section className="py-24 relative bg-auth-photo overflow-hidden text-white">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-organic-gradient opacity-20 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/80 via-[#0A0E27]/55 to-[#0A0E27]/85 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Accelerate your corporate ESG compliance today
          </h2>
          <p className="text-sm md:text-base text-primary-200 max-w-2xl mx-auto mb-8 leading-relaxed">
            Configure your company profile in 10 minutes. Begin tracking your sustainability scope under Malaysia's regulatory guide.
          </p>
          <div className="flex justify-center">
            <Button
              variant="premium"
              size="lg"
              className="px-8 py-4 text-base"
              onClick={onNavigateToDashboard}
              icon={<ArrowRight className="w-4.5 h-4.5" />}
              iconPosition="right"
            >
              Get Started for Free
            </Button>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-navy-950 text-navy-400 pt-16 pb-8 border-t border-navy-900 font-sans">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          
          {/* Column 1 - Brand info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center space-x-3 text-white">
              <div className="p-1.5 bg-white rounded-lg border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
            </div>
              <span className="text-base font-bold tracking-tight">WeSee</span>
            </div>
            <p className="text-xs text-navy-400 max-w-sm leading-relaxed">
              Leading Malaysian ESG compliance and sustainability disclosures automation framework. Assisting small enterprises and listed issuers meet modern regulatory compliance.
            </p>
          </div>

          {/* Column 2 - Product */}
          <div className="space-y-3.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">Product</span>
            <ul className="space-y-2">
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer">Disclosure Engine</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer">Scope 1, 2 & 3 Carbon Calculator</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer">SEDG Templates</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer">AI Drafting Assistant</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer">Custom Roles & Permissions</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer">Assurance Workspace</button></li>
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div className="space-y-3.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">Company</span>
            <ul className="space-y-2">
              <li><button onClick={onNavigateToAbout} className="hover:text-white transition-colors cursor-pointer text-left">About Us</button></li>
              <li><button onClick={() => handleNav('regulatory')} className="hover:text-white transition-colors cursor-pointer text-left">Framework Partner</button></li>
              <li><button onClick={onNavigateToAbout} className="hover:text-white transition-colors cursor-pointer text-left">Case Studies</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer">Contact Support</button></li>
            </ul>
          </div>

          {/* Column 4 - Resources & Legal */}
          <div className="space-y-3.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">Resources & Legal</span>
            <ul className="space-y-2">
              <li><a href="https://www.bursamalaysia.com/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Bursa Sustainability Guide</a></li>
              <li><a href="https://www.capitalmarketsmalaysia.com/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">SEDG Directives</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright segment */}
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-navy-900 flex flex-col md:flex-row items-center justify-between text-xs text-navy-500">
          <span>© 2026 WeSee Corporation Sdn Bhd. All rights reserved.</span>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="hover:text-white cursor-pointer">FB</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer">LN</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer">TW</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
