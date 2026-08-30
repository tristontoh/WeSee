/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import {
  ArrowRight,
  ShieldAlert,
  Coins,
  Compass,
  ArrowUpRight,
  Building,
  Target,
  Landmark,
  Layers,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';

import Button from './ui/Button';
import Reveal from './ui/Reveal';
import { useScrolled } from '../hooks/useScrolled';
import Card from './ui/Card';
import { COPYRIGHT_LINE } from '../brand';

interface AboutPageProps {
  onNavigateToDashboard: () => void;
  onNavigateToFeatures: () => void;
  onNavigateToPricing: () => void;
  onNavigateToLanding: (section?: string) => void;
}

export default function AboutPage({ onNavigateToDashboard, onNavigateToFeatures, onNavigateToPricing, onNavigateToLanding }: AboutPageProps) {
  const scrolled = useScrolled();
  
  // Timeline Items of Regulatory Landscape
  const timelineEvents = [
    {
      date: "Oct 2023",
      title: "SEDG Launch",
      description: "Capital Markets Malaysia introduced the Simplified ESG Disclosure Guide (SEDG), simplifying tracking demands for local value chains.",
      badge: "CMM Standard",
      color: "border-emerald-500 text-emerald-700 bg-emerald-50"
    },
    {
      date: "Sep 2024",
      title: "NSRF Framework",
      description: "The National Sustainability Reporting Framework (NSRF) launched, bringing ISSB standards S1 and S2 into local operations.",
      badge: "National Policy",
      color: "border-purple-500 text-purple-700 bg-purple-50"
    },
    {
      date: "Dec 2024",
      title: "Bursa Listing Amendments",
      description: "Bursa Malaysia amended its listing rules, requiring Main and ACE Market issuers to mandate structured ESG disclosure variables.",
      badge: "Mandatory Rule",
      color: "border-amber-500 text-amber-700 bg-amber-50"
    },
    {
      date: "Dec 2025",
      title: "CSI Platform Integration",
      description: "The Centralised Sustainability Intelligence (CSI) platform goes live as the mandatory submission portal for listed enterprises.",
      badge: "Bursa Portal",
      color: "border-blue-500 text-blue-700 bg-blue-50"
    },
    {
      date: "2025 – 2027",
      title: "Phased ISSB Rollout",
      description: "A multi-year phased compliance schedule requiring full disclosure of climate-related risks (IFRS S2) down the tier-1 supply chain.",
      badge: "SGP Mandates",
      color: "border-rose-500 text-rose-700 bg-rose-50"
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
            <button onClick={onNavigateToPricing} className="hover:text-primary-600 transition-colors cursor-pointer">Pricing</button>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-primary-600 font-semibold cursor-pointer">About</button>
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

      {/* 2. HEADER: Page title + one-paragraph mission statement */}
      <section className="relative overflow-hidden pt-20 pb-16 bg-auth-photo">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/70 via-[#0A0E27]/45 to-[#0A0E27]/75 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-2">Our Core Purpose</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Closing the ESG adoption gap
          </h1>
          
          <p className="text-sm md:text-base text-white/85 mt-6 leading-relaxed text-left md:text-center max-w-3xl mx-auto">
            Malaysia is undertaking a generational shift toward sustainable corporate responsibility, anchored by the Securities Commission's National Sustainability Reporting Framework (NSRF), amended Bursa Malaysia listing requirements, and CMM's Simplified ESG Disclosure Guide (SEDG). However, a stark tooling and expertise gap exists. While large conglomerates hire elite tier-one consultants, local SMEs and mid-market listed issuers are left to navigate complex regulatory requirements manually. <strong>WeSee</strong> acts as the vital digital translator—democratizing enterprise-grade sustainability disclosures, automations, and carbon footprint tracking for every Malaysian enterprise.
          </p>

          <div className="flex justify-center gap-4 mt-8">
            <Button variant="primary" size="sm" onClick={onNavigateToDashboard} icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
              Open App Sandbox
            </Button>
            <Button variant="ghost" size="sm" onClick={onNavigateToPricing}>
              View Plan Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* 3. "THE PROBLEM" SECTION (3-column layout) */}
      <section className="py-20 md:py-28">
        <Reveal>
        <div className="max-w-7xl mx-auto px-6">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Market Realities</span>
              <h2 className="text-3xl font-bold text-navy-950">Why Malaysian SMEs Face Unprecedented Pressure</h2>
              <p className="text-xs text-navy-500 mt-2">The dual forces of domestic regulations and global corporate supply chains are shifting local vendor criteria.</p>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Column A: Regulatory Cascade */}
              <Card hoverEffect className="bg-white border-navy-100/50 flex flex-col h-full" padded="lg">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy-950 mb-3">1. Regulatory Cascade</h3>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Large listed companies on the Bursa Main and ACE markets are now required to submit complete ESG variables. Because their disclosures mandate Scope 3 supply chain metrics, they are passing compliance requirements directly down to their SME vendors. Failing to disclose means losing your status as a preferred supplier.
                </p>
              </Card>
  
              {/* Column B: Commercial Pressure */}
              <Card hoverEffect className="bg-white border-navy-100/50 flex flex-col h-full" padded="lg">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy-950 mb-3">2. Commercial & Bank Demands</h3>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Malaysian commercial banks are rapidly tying corporate borrowing and revolving credits to green parameters. Without structured disclosure summaries aligned with national frameworks, SMEs face higher interest rates, reduced credit lines, or outright capital exclusion from sustainability-focused financial institutions.
                </p>
              </Card>
  
              {/* Column C: The Adoption Gap */}
              <Card hoverEffect className="bg-white border-navy-100/50 flex flex-col h-full" padded="lg">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy-950 mb-3">3. The documented adoption gap</h3>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Over 80% of local companies report lacking internal expertise, appropriate toolkits, or the multi-million dollar budgets required to contract dedicated sustainability consultants. This leaves internal compliance teams buried under convoluted spreadsheets with no clear verification audit trail.
                </p>
              </Card>
  
            </div>
          </div>
        </Reveal>
      </section>

      {/* 4. "THE REGULATORY LANDSCAPE WE TRACK" SECTION */}
      <section className="py-20 md:py-28 border-t border-b border-white/50">
        <div className="max-w-5xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Our Regulatory Engine</span>
            <h2 className="text-3xl font-bold text-navy-950">We Track the Codes, You Run Your Business</h2>
            <p className="text-xs text-navy-500 mt-2">
              WeSee constantly updates its calculations and questionnaires to map seamlessly with Malaysian mandates.
              <span className="block font-medium text-[10px] text-navy-400 mt-1 italic">*This section is for reference only and does not constitute formal legal advice.</span>
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 bg-bg-light border border-navy-100/80 rounded-2xl hover:border-primary-300 transition-colors">
                {/* Date segment */}
                <div className="flex items-center space-x-2.5 md:w-36 shrink-0">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-bold text-navy-950 font-mono">{evt.date}</span>
                </div>

                {/* Vertical Divider for desktop */}
                <div className="hidden md:block h-8 w-px bg-navy-200" />

                {/* Info segment */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs md:text-sm font-bold text-navy-950">{evt.title}</h3>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 border rounded-full uppercase tracking-wider ${evt.color}`}>
                      {evt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-navy-500 leading-relaxed">{evt.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Integration Note Banner */}
          <div className="bg-navy-50 border border-navy-100 rounded-xl p-4 mt-8 flex items-start space-x-3 text-xs text-navy-600">
            <span className="text-primary-600 font-bold mt-0.5">Note:</span>
            <p>Our calculation standards are fully mapped to localized emissions factors published by the <strong>Energy Commission of Malaysia (Suruhanjaya Tenaga)</strong>, the <strong>Malaysian Green Technology and Climate Change Corporation (MGTC)</strong>, and international GHG Protocols.</p>
          </div>

        </div>
      </section>

      {/* 5. "PRODUCT PHILOSOPHY" SECTION (Horizontal step/path graphic) */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-2">Growth Vector</span>
            <h2 className="text-3xl font-bold text-navy-950">One Platform, Seamless Growth</h2>
            <p className="text-xs text-navy-500 mt-2">We believe sustainability disclosures are an evolutionary journey. Our software scales transparently alongside your organization's legal maturity.</p>
          </div>

          {/* Step path graphic container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative">
            
            {/* Connection Arrow lines for desktop */}
            <div className="hidden md:block absolute top-[44px] left-[25%] right-[25%] h-0.5 bg-gradient-to-r from-emerald-200 via-primary-300 to-purple-200 -z-0" />

            {/* Stage 1 */}
            <Card className="bg-white border-navy-100 flex flex-col items-center text-center p-6 relative z-10" padded="md">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm mb-4 border-2 border-emerald-300">
                <Building className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Starter Scope</span>
              <h4 className="text-sm font-bold text-navy-950 mt-3">SEDG Core Metrics</h4>
              <p className="text-[11px] text-navy-400 mt-2 leading-relaxed">Perfect for micro-enterprises. Simple inputs for energy and payroll statistics to satisfy domestic tier-1 vendor audits.</p>
            </Card>

            {/* Stage 2 */}
            <Card className="bg-white border-primary-300 flex flex-col items-center text-center p-6 relative z-10" padded="md">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm mb-4 border-2 border-primary-400">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wider bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">Growth Scope</span>
              <h4 className="text-sm font-bold text-navy-950 mt-3">Full SEDG & Scope 1-2</h4>
              <p className="text-[11px] text-navy-400 mt-2 leading-relaxed">Automated calculations for carbon grid intensities, customized policy templates, and multi-user auditor logs.</p>
            </Card>

            {/* Stage 3 */}
            <Card className="bg-white border-purple-300 flex flex-col items-center text-center p-6 relative z-10" padded="md">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm mb-4 border-2 border-purple-300">
                <Landmark className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">Issuer Scope</span>
              <h4 className="text-sm font-bold text-navy-950 mt-3">Bursa Listing & Scope 3</h4>
              <p className="text-[11px] text-navy-400 mt-2 leading-relaxed">Compliance readiness for Main Market listed companies, including third-party sign-offs and full Scope 3 emissions tracing.</p>
            </Card>

          </div>
        </div>
      </section>

      {/* 6. TEAM / COMPANY SECTION (Built in Penang placeholder) */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 items-center">
            
            {/* Visual Block */}
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-primary-50 border border-primary-100 rounded-full text-xs font-semibold text-primary-700">
                <MapPin className="w-3.5 h-3.5 text-primary-600" />
                <span>Made for Malaysian Enterprises</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-navy-950">
                Proudly Built in Penang, Malaysia
              </h2>
              <p className="text-sm text-navy-500 leading-relaxed">
                WeSee is conceptualized and engineered by a dedicated group of software craftsmen and sustainability specialists based in Penang. We are deeply committed to empowering Malaysian business owners, ensuring our regulatory engines stay perfectly synchronized with domestic authorities while presenting global-grade visual reports.
              </p>
              
              <div className="border-t border-navy-100 pt-6 space-y-3">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="font-bold text-navy-900">Headquarters:</span>
                  <span className="text-navy-500">George Town, Penang</span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="font-bold text-navy-900">Framework Focus:</span>
                  <span className="text-navy-500">SEDG, Bursa Malaysia Common Matters, NSRF, ISSB</span>
                </div>
              </div>
            </div>

            {/* Placeholder Founder / Team Card (as explicitly requested) */}
            <div className="space-y-4">
              <Card padded="lg" className="bg-bg-light border-navy-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/30 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block mb-4">Pilot Engineering Team Note</span>
                
                <p className="text-xs text-navy-600 italic leading-relaxed mb-6">
                  "Our goal was never to replace standard regulatory portals like Bursa's CSI or Capital Markets Malaysia's direct guides. We set out to build the ultimate preparation layer—allowing multi-department teams to collaborate seamlessly and compile audit-proof ESG data in a stunning visual interface."
                </p>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs">
                    LE
                  </div>
                  <div>
                    <span className="text-xs font-bold text-navy-900 block">WeSee Engineering</span>
                    <span className="text-[10px] text-navy-400 block">George Town Sandbox Team</span>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* 7. FINAL CTA BAND */}
      <section className="py-24 relative bg-auth-photo overflow-hidden text-white">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-organic-gradient opacity-20 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/80 via-[#0A0E27]/55 to-[#0A0E27]/85 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Embrace seamless Malaysian ESG alignment
          </h2>
          <p className="text-sm md:text-base text-primary-200 max-w-2xl mx-auto mb-8 leading-relaxed">
            Configure your enterprise workspace today and explore our preset templates in less than ten minutes.
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
              Start Free Trial Sandbox
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
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Disclosure Engine</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Scope 1, 2 & 3 Carbon Calculator</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">SEDG Templates</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">AI Drafting Assistant</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Custom Roles & Permissions</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Assurance Workspace</button></li>
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div className="space-y-3.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">Company</span>
            <ul className="space-y-2">
              <li><button onClick={() => handleNav('product')} className="hover:text-white transition-colors cursor-pointer text-left">About Us</button></li>
              <li><button onClick={() => handleNav('regulatory')} className="hover:text-white transition-colors cursor-pointer text-left">Framework Partner</button></li>
              <li><button onClick={() => handleNav('who-its-for')} className="hover:text-white transition-colors cursor-pointer text-left">Case Studies</button></li>
              <li><button onClick={onNavigateToDashboard} className="hover:text-white transition-colors cursor-pointer text-left">Contact Support</button></li>
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
