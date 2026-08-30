/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  User,
  Building,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Info,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';
import Select from './ui/Select';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, resendVerification } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [employeeSize, setEmployeeSize] = useState('1-50');
  const [country, setCountry] = useState('Malaysia');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const valLength = password.length >= 8;
  const valNumber = /\d/.test(password);
  const valCapital = /[A-Z]/.test(password);
  const valSpecial = /[^A-Za-z0-9]/.test(password);

  const validateStep1 = () => {
    if (!name.trim()) {
      showToast('Please state your full authorized name.', 'error');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please specify a valid corporate work email address.', 'error');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!company.trim()) {
      showToast('Please state your registered corporate entity name.', 'error');
      return false;
    }
    return true;
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (!valLength || !valNumber || !valCapital || !valSpecial) {
      showToast('Please meet all password strength indicators.', 'error');
      return;
    }
    if (!termsAccepted) {
      showToast('Please accept the general service and compliance terms.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const registeredWith = await register(name, email, company, password);
      setRegisteredEmail(registeredWith);
    } catch (err: any) {
      showToast(err?.message || 'Database connection handshake timed out. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResendState('sending');
    try {
      await resendVerification(registeredEmail);
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  };

  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-auth-photo flex text-gray-900 font-sans relative">
      {/* One scrim across the full width, not per-column — see LoginPage. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E27]/75 via-[#0A0E27]/25 to-transparent pointer-events-none" />


        {/* Left section: Branding & Value Prop */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12">

          <div className="relative z-10">
            <div className="flex items-center space-x-2.5 mb-16">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-xl shadow-lg border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-6 h-6 object-contain" />
            </div>
              <span className="text-2xl font-black text-white tracking-tight">WeSee</span>
            </div>

            <div className="space-y-6 max-w-lg">
              <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.05]">
                Start your ESG <br/>Compliance Journey.
              </h1>
              <p className="text-white/80 text-xl leading-relaxed">
                Create an enterprise account to generate automated sustainability reports aligned with Bursa Malaysia and IFRS frameworks.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-3 text-white text-base font-medium bg-white/10 w-fit px-4 py-2 rounded-full border border-white/25 backdrop-blur-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Bank Negara Climate Risk Aligned</span>
            </div>
            <div className="flex items-center space-x-3 text-white text-base font-medium bg-white/10 w-fit px-4 py-2 rounded-full border border-white/25 backdrop-blur-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>End-to-End Scope 3 Verification</span>
            </div>
          </div>
        </div>

        {/* Right section: Email Confirmation */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative">

          {/* Mobile Header */}
          <div className="lg:hidden absolute top-8 left-6 sm:left-12 flex items-center space-x-2 z-10">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-sm shadow-sm border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tight">WeSee</span>
          </div>

        {/* Back Link */}
        <div className="absolute top-8 right-6 sm:right-12">
           <button 
             onClick={() => navigate('/')}
             className="text-sm font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer bg-[#0A0E27]/55 hover:bg-[#0A0E27]/75 border border-white/30 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg"
           >
             <ArrowLeft className="w-4 h-4" />
             <span>Back</span>
           </button>
        </div>

          <div className="relative w-full max-w-[520px] bg-white/60 backdrop-blur-xl border border-white/45 rounded-[28px] shadow-[0_30px_80px_rgba(5,8,30,.45)] px-9 sm:px-11 pt-10 pb-9 space-y-5">

            {/* Header */}
            <div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">Check your email</h3>
              <p className="text-sm text-gray-500 mt-2">
                We've sent a verification link to <strong className="text-gray-700">{registeredEmail}</strong>. Click it to activate your account, then sign in.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-gray-900">Didn't get the email?</h4>
                <p className="text-[11px] text-gray-500">
                  Check your spam folder, or request a new verification link below.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendState !== 'idle'}
                className="text-xs text-emerald-600 underline hover:text-emerald-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
              >
                {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Verification email sent' : 'Resend verification email'}
              </button>

              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
                  Go to Sign In
                </Button>
              </div>
            </div>
          </div>

          {/* Security context banner — inside the card: on the photograph it was unreadable. */}
          <div className="flex justify-center gap-6 text-[10px] font-medium text-gray-500 pt-1">
            <div className="flex items-center">
              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              <span>Enterprise SSO Integrity Checked</span>
            </div>
            <div className="flex items-center">
              <Lock className="w-3.5 h-3.5 mr-1" />
              <span>PDPA Data Privacy Compliant</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-auth-photo flex text-gray-900 font-sans relative">
      {/* One scrim across the full width, not per-column — see LoginPage. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E27]/75 via-[#0A0E27]/25 to-transparent pointer-events-none" />

      
      {/* Left section: Branding & Value Prop */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12">

        <div className="relative z-10">
          <div className="flex items-center space-x-2.5 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-xl shadow-lg border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">WeSee</span>
          </div>

          <div className="space-y-6 max-w-lg">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.05]">
              Start your ESG <br/>Compliance Journey.
            </h1>
            <p className="text-white/80 text-xl leading-relaxed">
              Create an enterprise account to generate automated sustainability reports aligned with Bursa Malaysia and IFRS frameworks.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-3 text-white text-base font-medium bg-white/10 w-fit px-4 py-2 rounded-full border border-white/25 backdrop-blur-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Bank Negara Climate Risk Aligned</span>
          </div>
          <div className="flex items-center space-x-3 text-white text-base font-medium bg-white/10 w-fit px-4 py-2 rounded-full border border-white/25 backdrop-blur-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Scope 3 Verification</span>
          </div>
        </div>
      </div>

      {/* Right section: Signup Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative">
        
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-8 left-6 sm:left-12 flex items-center space-x-2 z-10">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-sm shadow-sm border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
            </div>
          <span className="text-lg font-black text-gray-900 tracking-tight">WeSee</span>
        </div>

        {/* Back Link */}
        <div className="absolute top-8 right-6 sm:right-12">
           <button 
             onClick={() => navigate('/')}
             className="text-sm font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer bg-[#0A0E27]/55 hover:bg-[#0A0E27]/75 border border-white/30 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg"
           >
             <ArrowLeft className="w-4 h-4" />
             <span>Back</span>
           </button>
        </div>

        <div className="relative w-full max-w-[520px] bg-white/60 backdrop-blur-xl border border-white/45 rounded-[28px] shadow-[0_30px_80px_rgba(5,8,30,.45)] px-9 sm:px-11 pt-10 pb-9 space-y-5">
          
          {/* Header */}
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Provision Account</h3>
            <p className="text-sm text-gray-500 mt-2">Initialize your administrative account to configure the workspace.</p>
          </div>

          <div>
            
            {/* Steps indicator */}
            <div className="flex items-center justify-between mb-8 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full" />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-10 rounded-full transition-all duration-300"
                style={{ width: `${(step - 1) * 50}%` }}
              />
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s ? 'bg-emerald-500 text-white shadow-md' :
                    step > s ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                    'bg-white text-gray-400 border border-gray-200'
                  }`}
                >
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
              ))}
            </div>

            {/* STEP 1: ADMIN PROFILE */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-gray-900">1. Administrative Contact</h4>
                  <p className="text-[11px] text-gray-500">Provide the primary operator details for this reporting entity.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Siti Nurhaliza"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Corporate Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ORG PROFILE */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-gray-900">2. Corporate Entity Details</h4>
                  <p className="text-[11px] text-gray-500">How your organization will be officially listed.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Organization Name</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. WeSee Green Tech Sdn Bhd"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Employee Headcount</label>
                    <Select
                      className="w-full"
                      aria-label="Employee size"
                      value={employeeSize}
                      onChange={setEmployeeSize}
                      options={[
                        { value: '1-50', label: '1 - 50' },
                        { value: '51-200', label: '51 - 200' },
                        { value: '201-1000', label: '201 - 1,000' },
                        { value: '1000+', label: '1,000+' },
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Headquarters</label>
                    <Select
                      className="w-full"
                      aria-label="Country"
                      value={country}
                      onChange={setCountry}
                      options={[
                        { value: 'Malaysia', label: 'Malaysia' },
                        { value: 'Singapore', label: 'Singapore' },
                        { value: 'Indonesia', label: 'Indonesia' },
                        { value: 'Other', label: 'Other International' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PASSWORD SETUP */}
            {step === 3 && (
              <form onSubmit={handleFinalSubmit} className="space-y-5 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-gray-900">3. Create Secure Password</h4>
                  <p className="text-[11px] text-gray-500">Establish your secure administrative password.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Secure Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password validation checklists */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Password Strength</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <div className="flex items-center space-x-1.5">
                      {valLength ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={valLength ? 'text-emerald-700 font-bold' : 'text-gray-500'}>Min 8 chars</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {valCapital ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={valCapital ? 'text-emerald-700 font-bold' : 'text-gray-500'}>Upper case</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {valNumber ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={valNumber ? 'text-emerald-700 font-bold' : 'text-gray-500'}>One number</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {valSpecial ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={valSpecial ? 'text-emerald-700 font-bold' : 'text-gray-500'}>Special symbol</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Verify Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Terms Acceptance checkbox */}
                <div className="flex items-start space-x-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs font-medium text-gray-600 leading-relaxed cursor-pointer select-none">
                    I authorize WeSee to provision my cloud reporting environment and I accept the <span className="text-emerald-600 underline">Service Agreement</span>.
                  </label>
                </div>
              </form>
            )}

            {/* Stepper controls */}
            <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100">
              
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center transition-colors cursor-pointer border border-gray-200 hover:bg-gray-50 rounded-xl"
                >
                  <ChevronRight className="w-4 h-4 mr-1.5 rotate-180" />
                  <span>Previous</span>
                </button>
              ) : (
                <div className="text-xs text-gray-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center transition-all shadow-sm cursor-pointer ml-auto"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4 ml-1.5" />
                </button>
              ) : (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting || !termsAccepted}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center shadow-sm cursor-pointer transition-all ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Provisioning...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <span>Provision</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Security context banner — inside the card: on the photograph it was unreadable. */}
          <div className="flex justify-center gap-6 text-[10px] font-medium text-gray-500 pt-1">
            <div className="flex items-center">
              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              <span>Enterprise SSO Integrity Checked</span>
            </div>
            <div className="flex items-center">
              <Lock className="w-3.5 h-3.5 mr-1" />
              <span>PDPA Data Privacy Compliant</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}