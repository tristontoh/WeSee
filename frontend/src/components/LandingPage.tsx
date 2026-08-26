/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Award,
  FileCheck,
  Landmark,
  ClipboardList,
  Users,
  BarChart3,
  ChevronRight,
  Quote,
  Check,
  Building,
  Target,
  FileText,
  MessageSquare,
  UserCog,
  ClipboardCheck,
  ChevronDown
} from 'lucide-react';

import Button from './ui/Button';
import Reveal from './ui/Reveal';
import { useScrolled } from '../hooks/useScrolled';
import Card from './ui/Card';
import StatusPill from './ui/StatusPill';
import ProgressBar from './ui/ProgressBar';
import AvatarStack from './ui/AvatarStack';
import { AvatarUser, Status } from '../types';

interface LandingPageProps {
  onNavigateToDashboard: () => void;
  onNavigateToFeatures: () => void;
  onNavigateToPricing: () => void;
  onNavigateToAbout: () => void;
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

export default function LandingPage({
  onNavigateToDashboard,
  onNavigateToFeatures,
  onNavigateToPricing,
  onNavigateToAbout,
  onNavigateToLogin,
  onNavigateToRegister
}: LandingPageProps) {
  const scrolled = useScrolled();
  // Mock data for the interactive dashboard mockup below the Hero
  const mockUsers: AvatarUser[] = [
    { id: '1', name: 'Sarvesh Veeri', initials: 'SV', bgColor: 'bg-emerald-500 text-white' },
    { id: '2', name: 'Aisha Razak', initials: 'AR', bgColor: 'bg-purple-500 text-white' },
    { id: '3', name: 'Lim Wei Shen', initials: 'LW', bgColor: 'bg-blue-500 text-white' },
  ];

  const mockupDisclosures = [
    {
      id: 'DISC-01',
      metric: 'Scope 1 & 2 Emissions (SEDG Core)',
      status: 'done' as Status,
      progress: 100,
      assignees: [mockUsers[0], mockUsers[1]],
    },
    {
      id: 'DISC-02',
      metric: 'Employee Diversity & Equity Statistics',
      status: 'progress' as Status,
      progress: 65,
      assignees: [mockUsers[1], mockUsers[2]],
    },
    {
      id: 'DISC-03',
      metric: 'Anti-Corruption Policy (Bursa Mandatory)',
      status: 'review' as Status,
      progress: 85,
      assignees: [mockUsers[0], mockUsers[2]],
    },
  ];

  // Testimonial State (for simple interactive slider/grid)
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // PLACEHOLDER SOCIAL PROOF DATA (clearly marked as requested)
  const testimonials = [
    {
      quote: "WeSee made our transition into SEDG compliance incredibly straightforward. We produced our first disclosure report in less than three weeks without needing high-cost sustainability consultants.",
      author: "Ir. Tan Boon Heong",
      role: "Managing Director",
      company: "Apex Precision Components Sdn Bhd (Penang)",
      avatarUrl: "https://ui-avatars.com/api/?name=Tan+Boon+Heong&background=15803D&color=fff",
    },
    {
      quote: "With Bursa Malaysia's enhanced sustainability disclosure rules, our team was feeling overwhelmed. WeSee provided us with preset indicators, audit trails, and instant reports ready for our integrated annual report.",
      author: "Puan Sarah Razak",
      role: "Head of Corporate Governance & ESG",
      company: "Kuala Lumpur Infrastructure Berhad (KLSE)",
      avatarUrl: "https://ui-avatars.com/api/?name=Sarah+Razak&background=1E293B&color=fff",
    },
    {
      quote: "The interface is perfectly aligned with Malaysian regulatory requirements. Having the TCFD framework, National Sustainability Reporting Framework (NSRF) and SEDG core metrics all pre-mapped saved us hundreds of manual hours.",
      author: "Dr. K. Pillay",
      role: "Sustainability Advisor",
      company: "Borneo Agri-Ventures Group",
      avatarUrl: "https://ui-avatars.com/api/?name=K+Pillay&background=7C3AED&color=fff",
    }
  ];

  // FAQ accordion state — index of the currently open question, or null if all collapsed
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Do we still need to hire an ESG consultant?',
      answer: "Most SMEs and mid-market issuers don't. WeSee pre-maps SEDG, Bursa Common Sustainability Matters, and NSRF / IFRS S1-S2 indicators into a guided workflow, and the AI drafting assistant handles first-pass narrative writing. Larger issuers with complex assurance requirements often still use us alongside their existing advisors, not instead of a proper external audit.",
    },
    {
      question: 'How does bringing our own AI API key work?',
      answer: "In Settings, a company admin adds an API key for Anthropic, OpenAI, or Google Gemini. That key is encrypted at rest and only ever used server-side to power \"Draft with AI\" and the Ask AI assistant for your company — you're billed directly by your chosen provider, and WeSee never marks up or caps usage.",
    },
    {
      question: 'Can we control exactly what each team member can see or edit?',
      answer: 'Yes. Company admins create named custom roles with module-and-action-level permissions (for example, "can edit indicators but not approve them") and assign them to teammates or external consultants. Roles are scoped entirely to your own company and never affect any other tenant.',
    },
    {
      question: 'Is our data isolated from other companies on the platform?',
      answer: "Yes — every company's data is strictly tenant-isolated at the database level. Custom roles, indicator values, disclosures, and AI usage logs are all scoped to a single company and are never visible across tenants.",
    },
    {
      question: 'What happens when we outgrow our current plan?',
      answer: 'You can upgrade at any time from Settings > Billing. Your existing materiality assessments, governance records, and indicator history carry over automatically and pre-populate the newly unlocked modules — nothing needs to be re-entered.',
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
          
          {/* Logo segment */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-primary-600 font-semibold cursor-pointer">Home</button>
            <button onClick={onNavigateToFeatures} className="hover:text-primary-600 transition-colors cursor-pointer font-medium">Product</button>
            <button onClick={onNavigateToPricing} className="hover:text-primary-600 transition-colors cursor-pointer font-medium">Pricing</button>
            <button onClick={onNavigateToAbout} className="hover:text-primary-600 transition-colors cursor-pointer font-medium">About</button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={onNavigateToLogin}
              className="text-sm font-semibold text-navy-600 hover:text-navy-900 transition-colors cursor-pointer"
            >
              Log in
            </button>
            <Button variant="primary" size="sm" onClick={onNavigateToRegister}>
              Get Started
            </Button>
          </div>

        </div>
      </nav>

      {/* 2. HERO SECTION */}
      {/* The hero carries the same photograph as the signed-out screens — landing, login and the
          app should not read as three different products. */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36 bg-auth-photo" id="product">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/70 via-[#0A0E27]/45 to-[#0A0E27]/75 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-white/15 backdrop-blur-sm rounded-full border border-white/30 text-xs font-semibold text-white mb-7 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Aligned with SEDG & Bursa Malaysia Requirements</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] drop-shadow-sm">
            Produce SEDG and Bursa-aligned ESG disclosures without hiring a consultant.
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-white/85 max-w-2xl mx-auto mt-6 leading-relaxed">
            The easiest compliance platform designed specifically for Malaysian SMEs and listed issuers — with AI-assisted drafting, custom team roles, and an audit-ready Assurance Workspace built in.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Button variant="primary" size="lg" onClick={onNavigateToRegister} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
              Start Disclosing Now
            </Button>
            <Button variant="ghost" size="lg" className="!text-white hover:!bg-white/15" onClick={() => {
              const el = document.getElementById('how-it-works');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' });
              }
            }}>
              See how it works
            </Button>
          </div>

          {/* Below-the-fold Perspective Dashboard Mockup */}
          <div className="mt-16 md:mt-20 max-w-4xl mx-auto perspective-1000 transform transition-all hover:scale-[1.01] duration-500">
            <div className="relative rotate-x-2 rotate-y-[-1deg] rotate-1 shadow-2xl rounded-[24px] overflow-hidden bg-white/60 backdrop-blur-md border border-white/55 p-1">
              {/* Fake UI Header Bar */}
              <div className="bg-white border-b border-navy-100/50 px-6 py-4 rounded-t-[22px] flex items-center justify-between text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-xs font-semibold text-navy-400 font-mono ml-4">https://app.wesee.my/disclosures</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-navy-400 font-semibold bg-navy-50 px-2 py-1 rounded">SEDG Core Dashboard</span>
                </div>
              </div>

              {/* Fake UI Dashboard Content */}
              <div className="p-6 md:p-8 space-y-6 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card padded="sm" className="bg-white">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block mb-1">Total ESG Scope Complied</span>
                    <span className="text-2xl font-bold text-navy-950 block">82%</span>
                    <ProgressBar value={82} status="done" className="mt-2" />
                  </Card>
                  <Card padded="sm" className="bg-white">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block mb-1">Active Indicators</span>
                    <span className="text-2xl font-bold text-navy-950 block">18 of 22</span>
                    <ProgressBar value={81} status="progress" className="mt-2" />
                  </Card>
                  <Card padded="sm" className="bg-white">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block mb-1">Supply Chain Readiness</span>
                    <span className="text-2xl font-bold text-emerald-600 block">Class A Ready</span>
                    <div className="text-[10px] text-navy-400 mt-2 font-medium">Top Tier Multinational Vendor Approved</div>
                  </Card>
                </div>

                {/* Table representation */}
                <Card padded="none" className="bg-white overflow-hidden">
                  <div className="px-6 py-3 bg-navy-50/50 border-b border-navy-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Active Malaysian Disclosure Metrics</span>
                    <StatusPill status="progress" showDot />
                  </div>
                  <div className="divide-y divide-navy-100">
                    {mockupDisclosures.map((disc) => (
                      <div key={disc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-semibold text-navy-500">{disc.id}</span>
                          <span className="font-semibold text-white/90">{disc.metric}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <AvatarStack users={disc.assignees} size="xs" max={2} />
                          <StatusPill status={disc.status} />
                          <div className="w-24">
                            <ProgressBar value={disc.progress} status={disc.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. "WHO IT'S FOR" SECTION */}
      <section className="py-20 md:py-28 relative" id="who-its-for">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Tailored Reporting Packages</span>
              <h2 className="text-3xl md:text-4xl font-bold text-navy-950">
                Designed for the Malaysian Business Ecosystem
              </h2>
              <p className="text-sm md:text-base text-navy-500 mt-3 leading-relaxed">
                Whether you are an export-driven SME or a public listed company on the Main Market of Bursa Malaysia, we have a curated reporting roadmap for your compliance requirements.
              </p>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Card 1: SME Starter */}
              <Card hoverEffect className="bg-white flex flex-col h-full justify-between" padded="lg">
                <div>
                  <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
                    <Building className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-navy-950 mb-2">SME Starter</h3>
                  <p className="text-xs text-navy-500 font-medium mb-6">
                    Ideal for local Malaysian businesses looking to fulfill basic corporate supply-chain assessments.
                  </p>
                  <div className="border-t border-navy-100/60 pt-6 mb-6">
                    <ul className="space-y-3.5">
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Full Capital Markets Malaysia SEDG Core disclosure tools</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Basic Scope 1 greenhouse gas estimation tool</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>PDF export ready for local vendor assessments</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>AI-assisted drafting and custom team roles included</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <button onClick={onNavigateToDashboard} className="mt-4 inline-flex items-center text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors group cursor-pointer">
                  <span>Learn more</span>
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Card>
  
              {/* Card 2: SME Growth */}
              <Card hoverEffect className="bg-white flex flex-col h-full justify-between relative border-primary-300" padded="lg">
                {/* Popular Badge */}
                <div className="absolute top-4 right-4 px-2.5 py-0.5 bg-primary-100 border border-primary-200 rounded-full text-[10px] font-bold text-primary-700">
                  RECOMMENDED FOR EXPORTERS
                </div>
                <div>
                  <div className="w-12 h-12 bg-primary-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-primary-500/10">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-navy-950 mb-2">SME Growth</h3>
                  <p className="text-xs text-navy-500 font-medium mb-6">
                    For growing suppliers exporting globally and aligned with international sustainability protocols.
                  </p>
                  <div className="border-t border-navy-100/60 pt-6 mb-6">
                    <ul className="space-y-3.5">
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>All Core and Advanced SEDG indicators supported</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Detailed Scope 1 & Scope 2 carbon footprint calculators</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Interactive dashboards for up to 5 multi-user roles</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-primary-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Governance workflows and target tracking, unlocked</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <button onClick={onNavigateToDashboard} className="mt-4 inline-flex items-center text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors group cursor-pointer">
                  <span>Learn more</span>
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Card>
  
              {/* Card 3: Issuer-Ready */}
              <Card hoverEffect className="bg-white flex flex-col h-full justify-between" padded="lg">
                <div>
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-navy-950 mb-2">Issuer-Ready</h3>
                  <p className="text-xs text-navy-500 font-medium mb-6">
                    For listed companies on Bursa Malaysia seeking mandatory compliance with integrated reporting.
                  </p>
                  <div className="border-t border-navy-100/60 pt-6 mb-6">
                    <ul className="space-y-3.5">
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Complete Bursa Sustainability Guide reporting compliance</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Comprehensive Scope 1, 2, and 3 emissions auditing</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>NSRF / ISSB S1 and S2 climate-related disclosures</span>
                      </li>
                      <li className="flex items-start text-xs text-navy-600">
                        <Check className="w-4 h-4 text-purple-500 mr-2.5 shrink-0 mt-0.5" />
                        <span>Assurance Workspace &amp; CSI-compatible export</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <button onClick={onNavigateToDashboard} className="mt-4 inline-flex items-center text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors group cursor-pointer">
                  <span>Learn more</span>
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Card>
  
            </div>
          </div>
        </Reveal>
      </section>

      {/* 4. "HOW IT WORKS" SECTION */}
      <section className="py-20 md:py-28" id="how-it-works">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Our Process</span>
              <h2 className="text-3xl md:text-4xl font-bold text-navy-950">
                The 4-Step Disclosure Engine
              </h2>
              <p className="text-sm text-navy-500 mt-2">
                WeSee handles everything from setup to export in an intuitive, linear workspace.
              </p>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              
              {/* Step 1 */}
              <Card padded="sm" className="bg-white border-navy-100/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 bg-navy-100 text-navy-800 rounded">STEP 01</span>
                    <ClipboardList className="w-5 h-5 text-primary-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-navy-900 mb-1">Materiality Assessment</h4>
                  <p className="text-xs text-navy-500 leading-relaxed mt-2">
                    Select key sustainability indicators relevant to your industry and corporate size.
                  </p>
                </div>
              </Card>
  
              {/* Step 2 */}
              <Card padded="sm" className="bg-white border-navy-100/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 bg-navy-100 text-navy-800 rounded">STEP 02</span>
                    <Users className="w-5 h-5 text-primary-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-navy-900 mb-1">Governance Setup</h4>
                  <p className="text-xs text-navy-500 leading-relaxed mt-2">
                    Appoint responsible team officers and build automated workflows to gather environmental metrics.
                  </p>
                </div>
              </Card>
  
              {/* Step 3 */}
              <Card padded="sm" className="bg-white border-navy-100/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 bg-navy-100 text-navy-800 rounded">STEP 03</span>
                    <BarChart3 className="w-5 h-5 text-primary-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-navy-900 mb-1">Indicator Tracking</h4>
                  <p className="text-xs text-navy-500 leading-relaxed mt-2">
                    Input data on energy consumption, labor ratios, and compliance metrics with full audit trails.
                  </p>
                </div>
              </Card>
  
              {/* Step 4 */}
              <Card padded="sm" className="bg-white border-navy-100/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 bg-navy-100 text-navy-800 rounded">STEP 04</span>
                    <FileText className="w-5 h-5 text-primary-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-navy-900 mb-1">Export & Disclose</h4>
                  <p className="text-xs text-navy-500 leading-relaxed mt-2">
                    Produce audit-ready ESG statements instantly matching SEDG, TCFD, and Bursa reporting guides.
                  </p>
                </div>
              </Card>
  
            </div>
          </div>
        </Reveal>
      </section>

      {/* 4.5 AI & TEAM ACCESS FEATURE SECTION */}
      <section className="py-20 md:py-28" id="ai-assistant">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">What Sets Us Apart</span>
              <h2 className="text-3xl md:text-4xl font-bold text-navy-950">
                AI-assisted, audit-ready, and built around how your team works
              </h2>
              <p className="text-sm text-navy-500 mt-3 leading-relaxed">
                Bring your own AI provider to draft disclosures in seconds, give every team member exactly the access they need, and hand external assurance providers a ready-made audit trail — included on every plan.
              </p>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card padded="lg" className="bg-white border-navy-100/50 h-full">
                <div className="w-11 h-11 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mb-5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-navy-950 mb-2">Draft with AI</h3>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Generate board-ready narrative disclosures for materiality, governance, and IFRS sections in one click — powered by your own Anthropic, OpenAI, or Gemini API key.
                </p>
              </Card>
  
              <Card padded="lg" className="bg-white border-navy-100/50 h-full">
                <div className="w-11 h-11 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mb-5">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-navy-950 mb-2">Ask AI Assistant</h3>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Get instant answers about Bursa disclosure requirements, indicators, or your own reporting data — grounded in your workspace, right where you're working.
                </p>
              </Card>
  
              <Card padded="lg" className="bg-white border-navy-100/50 h-full">
                <div className="w-11 h-11 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-5">
                  <UserCog className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-navy-950 mb-2">Custom Team Roles</h3>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Company admins define exactly which modules each teammate or consultant can view or edit — scoped entirely to your own company, with no effect on anyone else's.
                </p>
              </Card>
  
              <Card padded="lg" className="bg-white border-navy-100/50 h-full">
                <div className="w-11 h-11 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-5">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-navy-950 mb-2">Assurance Workspace</h3>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Package audit-ready evidence trails and collaborate directly with external assurance providers ahead of independent sign-off.
                </p>
              </Card>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 5. REGULATORY CREDIBILITY SECTION */}
      <section className="py-16 border-t border-b border-white/50" id="regulatory">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400">Trusted Framework Alignment</h3>
              <p className="text-xs text-navy-500 mt-1">WeSee is developed in complete concordance with Malaysia's core sustainability regulators.</p>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
              
              <div className="p-4 flex flex-col items-center">
                <div className="p-3 bg-white/70 backdrop-blur-md border border-white/60 rounded-full text-primary-600 mb-3 shadow-sm">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-navy-800 block">SEDG Platform Certified</span>
                <p className="text-[11px] text-navy-400 mt-1 leading-relaxed max-w-xs">Capital Markets Malaysia simplified template for SME value-chains.</p>
              </div>
  
              <div className="p-4 flex flex-col items-center">
                <div className="p-3 bg-white/70 backdrop-blur-md border border-white/60 rounded-full text-primary-600 mb-3 shadow-sm">
                  <Landmark className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-navy-800 block">Bursa Listing Guide</span>
                <p className="text-[11px] text-navy-400 mt-1 leading-relaxed max-w-xs">Supports climate and governance disclosures mandated by Bursa Malaysia.</p>
              </div>
  
              <div className="p-4 flex flex-col items-center">
                <div className="p-3 bg-white/70 backdrop-blur-md border border-white/60 rounded-full text-primary-600 mb-3 shadow-sm">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-navy-800 block">NSRF Compliance</span>
                <p className="text-[11px] text-navy-400 mt-1 leading-relaxed max-w-xs">Pre-mapped variables for ISSB / IFRS Sustainability Reporting standards.</p>
              </div>
  
            </div>
          </div>
        </Reveal>
      </section>

      {/* 6. SOCIAL PROOF SECTION */}
      <section className="py-20">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Social Proof</span>
              <h2 className="text-3xl font-bold text-navy-950">Success Stories Across Malaysian Industries</h2>
              <p className="text-xs text-navy-500 mt-1 leading-relaxed">
                *The following citations represent pre-launch validation tests and compliance studies conducted with pilot vendors.
              </p>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((test, index) => (
                <Card key={index} padded="md" className="bg-white flex flex-col justify-between border-navy-100/60 shadow-sm relative">
                  <div className="absolute top-6 right-6 text-navy-100">
                    <Quote className="w-8 h-8 fill-current" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs text-navy-600 italic leading-relaxed mb-6">
                      "{test.quote}"
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 pt-4 border-t border-navy-100/40">
                    <img
                      src={test.avatarUrl}
                      alt={test.author}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-navy-100"
                    />
                    <div>
                      <span className="text-xs font-bold text-navy-900 block">{test.author}</span>
                      <span className="text-[10px] text-navy-400 block">{test.role}</span>
                      <span className="text-[10px] font-medium text-primary-700 block mt-0.5">{test.company}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* 6.5 FAQ SECTION */}
      <section className="py-20 md:py-28" id="faq">
        <Reveal>
        <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Frequently Asked</span>
              <h2 className="text-3xl font-bold text-navy-950">Common Questions</h2>
            </div>
  
            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <Card key={faq.question} padded="none" className="bg-white border-navy-100/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-bold text-navy-900">{faq.question}</span>
                      <ChevronDown className={`w-4 h-4 text-navy-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 text-xs text-navy-500 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQPage structured data for search result rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      {/* 7. FINAL CTA BAND */}
      <section className="py-24 relative bg-auth-photo overflow-hidden text-white">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-organic-gradient opacity-20 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/80 via-[#0A0E27]/55 to-[#0A0E27]/85 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Ready to secure your corporate supply chain certification?
          </h2>
          <p className="text-sm md:text-base text-primary-200 max-w-2xl mx-auto mb-8 leading-relaxed">
            Create an account in minutes. Gain access to simplified ESG reporting variables mapped directly to Malaysia's latest sustainability guides.
          </p>
          <div className="flex justify-center">
            <Button
              variant="primary"
              size="lg"
              className="px-8 py-4 text-base shadow-xl"
              onClick={onNavigateToDashboard}
              icon={<ArrowRight className="w-4.5 h-4.5" />}
              iconPosition="right"
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
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
              <li><a href="#regulatory" className="hover:text-white transition-colors">Framework Partner</a></li>
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
