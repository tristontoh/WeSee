/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { Lock, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';
import { usePlan, PlanType } from '../../contexts/PlanContext';
import Button from './Button';

interface UpgradeGateProps {
  feature: string;
  children: React.ReactNode;
  onUpgrade: () => void;
  /** 'card' (default) blurs and overlays the gated content in place — for a feature embedded
   *  alongside other unlocked content. 'page' is for routes that are gated in full: it skips
   *  mounting the gated page at all (no wasted data-fetching for content the user can't see)
   *  and shows a larger, full-height centered prompt instead of a small floating card. */
  variant?: 'card' | 'page';
}

export default function UpgradeGate({ feature, children, onUpgrade, variant = 'card' }: UpgradeGateProps) {
  const { hasFeature, getFeatureDetails } = usePlan();

  // If the user has access to the feature, just render the content normally
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Retrieve details about the locked feature
  const details = getFeatureDetails(feature);
  const requiredPlanName = details.requiredPlan === 'growth' ? 'Growth' : 'Issuer-Ready';

  if (variant === 'page') {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white border border-navy-100 rounded-2xl shadow-xl p-10 text-center relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-primary-500 to-blue-500" />

          <div className="mx-auto w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 border border-purple-100">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>

          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 inline-block mb-3">
            {requiredPlanName} Plan Feature
          </span>

          <h3 className="text-2xl font-bold text-navy-950 mb-2">
            Unlock {details.name}
          </h3>

          <p className="text-sm text-navy-500 leading-relaxed max-w-sm mx-auto mb-6">
            {details.description || `The ${details.name} module contains premium workflows and intelligence designed for expanding Malaysian corporations.`}
          </p>

          <div className="bg-navy-50 border border-navy-100/50 rounded-xl p-4 text-left mb-6">
            <div className="flex space-x-2 text-xs text-navy-600 leading-normal">
              <Sparkles className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
              <span>
                Upgrade your workspace plan to instantly activate <strong>{details.name}</strong> and every other feature included in the {requiredPlanName} plan.
              </span>
            </div>
          </div>

          <Button
            variant="premium"
            className="w-full justify-center"
            onClick={onUpgrade}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Upgrade Plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full grid [grid-template-areas:'stack']">

      {/* 1. Blurred, non-interactive background preview */}
      <div className="[grid-area:stack] w-full select-none pointer-events-none filter blur-[5px] opacity-40">
        {children}
      </div>

      {/* 2. Lock Overlay Container — same grid cell, so the wrapper always sizes to whichever
           layer (blurred preview or this card) is taller, instead of overflowing a fixed height. */}
      <div className="[grid-area:stack] z-20 flex items-center justify-center p-6 bg-navy-950/5 backdrop-blur-[1px] rounded-2xl">
        <div className="w-full max-w-md bg-white border border-navy-100 rounded-2xl shadow-xl p-8 text-center relative overflow-hidden animate-fade-in">
          {/* Subtle background gradient pattern */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-primary-500 to-blue-500" />
          
          <div className="mx-auto w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 border border-purple-100">
            <Lock className="w-5 h-5 animate-pulse" />
          </div>

          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 inline-block mb-3">
            {requiredPlanName} Plan Feature
          </span>

          <h3 className="text-xl font-bold text-navy-950 mb-2">
            Unlock {details.name}
          </h3>

          <p className="text-xs text-navy-500 leading-relaxed max-w-xs mx-auto mb-6">
            {details.description || `The ${details.name} module contains premium workflows and intelligence designed for expanding Malaysian corporations.`}
          </p>

          <div className="bg-navy-50 border border-navy-100/50 rounded-xl p-3 text-left mb-6">
            <div className="flex space-x-2 text-[11px] text-navy-600 leading-normal">
              <Sparkles className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
              <span>
                Upgrade your workspace plan to instantly activate <strong>{details.name}</strong> and every other feature included in the {requiredPlanName} plan.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              variant="premium" 
              className="w-full justify-center"
              onClick={onUpgrade}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Upgrade Plan
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
