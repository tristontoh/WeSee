/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, BookOpen } from 'lucide-react';
import Card from './ui/Card';

export interface GettingStartedStep {
  label: string;
  /** What doing it actually gets them — not a restatement of the label. */
  hint: string;
  done: boolean;
  path: string;
}

interface Props {
  steps: GettingStartedStep[];
}

/**
 * What a workspace with no data should show instead of four tiles reading zero.
 *
 * Every tick is derived from the same state the Reporting Readiness panel already loads, so this
 * cannot drift out of step with the rest of the dashboard, and it cannot claim progress the data
 * does not support. That is the reason it is a checklist over real state rather than a tour: a tour
 * is dismissed once and then lies about where you are.
 *
 * The first incomplete step is marked as the next one, because "here are six things" is not an
 * answer to "what do I do now".
 */
export default function GettingStartedCard({ steps }: Props) {
  const navigate = useNavigate();

  const doneCount = steps.filter((s) => s.done).length;
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <Card className="bg-white border-gray-100" padded="none">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900">Getting started</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Your first reporting cycle, in order. Nothing here is optional for a filing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-gray-50 text-gray-600 border-gray-200 tabular-nums">
            {doneCount} of {steps.length} done
          </span>
          <button
            onClick={() => navigate('/guide')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Open the guide
          </button>
        </div>
      </div>

      <ol className="divide-y divide-gray-50">
        {steps.map((step, i) => {
          const isNext = i === nextIndex;
          return (
            <li key={step.label}>
              <button
                onClick={() => navigate(step.path)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors cursor-pointer ${
                  isNext ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-gray-50/50'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : isNext
                        ? 'border-2 border-emerald-500'
                        : 'border-2 border-gray-200'
                  }`}
                >
                  {step.done && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>

                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs font-bold block truncate ${
                      step.done ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-gray-500 block truncate">{step.hint}</span>
                </div>

                {isNext && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 shrink-0">
                    Next
                  </span>
                )}
                {!step.done && <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
