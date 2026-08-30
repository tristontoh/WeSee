/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import {
  ArrowRight,
  Compass,
  ShieldCheck,
  Sliders,
  Target,
  Globe,
  FileText,
  Sparkles,
  MessageSquare,
  UserCog,
  ClipboardCheck,
  KeyRound
} from 'lucide-react';

import Button from './ui/Button';
import Reveal from './ui/Reveal';
import { useScrolled } from '../hooks/useScrolled';
import Card from './ui/Card';
import { COPYRIGHT_LINE } from '../brand';

interface FeaturesPageProps {
  onNavigateToDashboard: () => void;
  onNavigateToPricing: () => void;
  onNavigateToAbout: () => void;
  onNavigateToLanding: (section?: string) => void;
}

interface FeatureEntry {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  plan: string;
  planColor: string;
}

export default function FeaturesPage({
  onNavigateToDashboard,
  onNavigateToPricing,
  onNavigateToAbout,
  onNavigateToLanding
}: FeaturesPageProps) {
  const scrolled = useScrolled();
  const handleNav = (section?: string) => {
    onNavigateToLanding(section);
  };

  const coreFeatures: FeatureEntry[] = [
    {
      icon: <Compass className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
      title: 'Materiality Assessment',
      description: 'Map stakeholder groups, score sustainability matters for financial and impact materiality, and capture the evidence behind every rating in a guided, Bursa-aligned wizard.',
      plan: 'All plans',
      planColor: 'bg-primary-50 text-primary-700 border-primary-100',
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      iconBg: 'bg-blue-100 text-blue-600',
      title: 'Governance & Policy Tracking',
      description: 'Define board oversight, management-level ownership, and policy status for every material matter — with compliance status pulled straight into your dashboard.',
      plan: 'Growth & above',
      planColor: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    {
      icon: <Sliders className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
      title: 'ESG Indicators & Audit Trail',
      description: 'Log annual or monthly values against SEDG and sector-specific indicators, attach evidence documents, and keep a full approval and audit history on every entry.',
      plan: 'All plans',
      planColor: 'bg-primary-50 text-primary-700 border-primary-100',
    },
    {
      icon: <Target className="w-5 h-5" />,
      iconBg: 'bg-blue-100 text-blue-600',
      title: 'Targets & Decarbonization',
      description: 'Set near-term and long-term targets, link them to live indicator data, and track progress automatically as new values are logged.',
      plan: 'Growth & above',
      planColor: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    {
      icon: <Globe className="w-5 h-5" />,
      iconBg: 'bg-purple-100 text-purple-600',
      title: 'IFRS S1 / S2 Disclosures',
      description: 'A dedicated module for general sustainability and climate-related disclosures — governance, strategy, risk management, and metrics & targets, segment by business unit.',
      plan: 'Issuer-Ready',
      planColor: 'bg-purple-50 text-purple-700 border-purple-100',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
      title: 'Reports & Export',
      description: 'Compile everything into board-ready PDF reports, raw CSV data ledgers, and CSI-compatible export files for your Bursa Malaysia submission.',
      plan: 'All plans',
      planColor: 'bg-primary-50 text-primary-700 border-primary-100',
    },
  ];

  const aiAndTeamFeatures: FeatureEntry[] = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
      title: 'Draft with AI',
      description: 'Generate first-draft narrative disclosures for materiality rationale, governance charters, and IFRS sections in one click — using your own Anthropic, OpenAI, or Gemini API key.',
      plan: 'All plans',
      planColor: 'bg-primary-50 text-primary-700 border-primary-100',
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
      title: 'Ask AI Assistant',
      description: 'A workspace-wide assistant for quick questions about disclosure requirements, indicators, or your own reporting data — with clear labeling of grounded vs. general answers.',
      plan: 'All plans',
      planColor: 'bg-primary-50 text-primary-700 border-primary-100',
    },
    {
      icon: <UserCog className="w-5 h-5" />,
      iconBg: 'bg-purple-100 text-purple-600',
      title: 'Custom Team Roles',
      description: 'Company admins build their own named roles with module-and-action-level permissions and assign them to teammates or consultants — scoped entirely to their own company.',
      plan: 'All plans',
      planColor: 'bg-primary-50 text-primary-700 border-primary-100',
    },
    {
      icon: <ClipboardCheck className="w-5 h-5" />,
      iconBg: 'bg-purple-100 text-purple-600',
      title: 'Assurance Workspace',
      description: 'Package audit-ready evidence trails and manage sign-off status directly with external assurance providers ahead of independent verification.',
      plan: 'Issuer-Ready',
      planColor: 'bg-purple-50 text-purple-700 border-purple-100',
    },
    {
      icon: <KeyRound className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
      title: 'API Access',
      description: 'Scoped API tokens for pulling indicator data and disclosure content into your own internal tools, data warehouse, or integrated annual report pipeline.',
      plan: 'All plans',
      planColor: 'bg-primary-50 text-primary-700 border-primary-100',
    },
  ];

  return (
    <div className="min-h-screen bg-app-mesh text-navy-900 font-sans selection:bg-primary-100 selection:text-primary-900 relative">

      {/* 1. STICKY TOP NAV */}
      <nav
        className={`sticky top-0 z-50 px-6 bg-white/70 backdrop-blur-xl border-b transition-all duration-300 ${
          scrolled ? 'border-white/60 py-3 shadow-[0_8px_30px_rgba(5,8,30,.08)]' : 'border-white/40 py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNav()}>
            <div className="p-2 bg-white rounded-xl border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-navy-950 block">WeSee</span>
              <span className="text-[9px] font-semibold text-navy-400 uppercase tracking-widest block leading-none">MALAYSIA</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-navy-600">
            <button onClick={() => handleNav()} className="hover:text-primary-600 transition-colors cursor-pointer">Home</button>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-primary-600 font-semibold cursor-pointer">Product</button>
            <button onClick={onNavigateToPricing} className="hover:text-primary-600 transition-colors cursor-pointer">Pricing</button>
            <button onClick={onNavigateToAbout} className="hover:text-primary-600 transition-colors cursor-pointer">About</button>
          </div>

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

      {/* 2. HEADER */}
      <section className="relative overflow-hidden pt-20 pb-16 bg-auth-photo">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/70 via-[#0A0E27]/45 to-[#0A0E27]/75 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-2">The Platform</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Everything you need to report ESG in Malaysia
          </h1>
          <p className="text-sm md:text-base text-white/85 mt-6 leading-relaxed max-w-3xl mx-auto">
            From your first materiality assessment to an audit-ready Bursa submission — one workspace covers the whole disclosure lifecycle, with AI drafting and role-based access built in from day one.
          </p>
        </div>
      </section>

      {/* 3. CORE REPORTING WORKFLOW */}
      <section className="py-20 md:py-24">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Core Reporting Workflow</span>
              <h2 className="text-2xl md:text-3xl font-bold text-navy-950">From materiality to a finished disclosure</h2>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {coreFeatures.map((feature) => (
                <Card key={feature.title} padded="lg" className="bg-white border-navy-100/50 h-full flex flex-col">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${feature.iconBg}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-bold text-navy-950 mb-2">{feature.title}</h3>
                  <p className="text-xs text-navy-500 leading-relaxed mb-4 flex-1">{feature.description}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border w-fit ${feature.planColor}`}>
                    {feature.plan}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* 4. AI & TEAM ACCESS */}
      <section className="py-20 md:py-24 border-t border-white/50">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">AI & Team Access</span>
              <h2 className="text-2xl md:text-3xl font-bold text-navy-950">Drafted faster, secured properly</h2>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {aiAndTeamFeatures.map((feature) => (
                <Card key={feature.title} padded="lg" className="bg-white border-navy-100/50 h-full flex flex-col">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${feature.iconBg}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-bold text-navy-950 mb-2">{feature.title}</h3>
                  <p className="text-xs text-navy-500 leading-relaxed mb-4 flex-1">{feature.description}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border w-fit ${feature.planColor}`}>
                    {feature.plan}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* 5. FINAL CTA BAND */}
      <section className="py-24 relative bg-auth-photo overflow-hidden text-white">
        <div className="absolute inset-0 bg-organic-gradient opacity-20 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/80 via-[#0A0E27]/55 to-[#0A0E27]/85 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            See the whole platform in action
          </h2>
          <p className="text-sm md:text-base text-primary-200 max-w-2xl mx-auto mb-8 leading-relaxed">
            Create a free account and explore every module yourself — no consultant call required.
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
              Get Started Now
            </Button>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-navy-950 text-navy-400 pt-16 pb-8 border-t border-navy-900 font-sans">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">

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

          <div className="space-y-3.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">Product</span>
            <ul className="space-y-2">
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Disclosure Engine</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Scope 1, 2 & 3 Carbon Calculator</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">AI Drafting Assistant</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Custom Roles & Permissions</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Assurance Workspace</button></li>
            </ul>
          </div>

          <div className="space-y-3.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">Company</span>
            <ul className="space-y-2">
              <li><button onClick={onNavigateToAbout} className="hover:text-white transition-colors cursor-pointer text-left">About Us</button></li>
              <li><button onClick={() => handleNav('regulatory')} className="hover:text-white transition-colors cursor-pointer text-left">Framework Partner</button></li>
              <li><button onClick={() => handleNav('who-its-for')} className="hover:text-white transition-colors cursor-pointer text-left">Case Studies</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Contact Support</button></li>
            </ul>
          </div>

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

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-navy-900 flex flex-col md:flex-row items-center justify-between text-xs text-navy-500">
          <span>{COPYRIGHT_LINE}</span>
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
