/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { hasPermission } from '../../permissions';
import { CAPABILITIES } from '../../capabilities';
import { aiDraftApi } from '../../api/aiDraftApi';
import { ApiError } from '../../api/client';

interface DraftWithAiButtonProps {
  draftType: string;
  /** Placeholder values for this draftType's prompt template — see the Prompt Library settings tab for what each draftType expects. */
  context: Record<string, string>;
  onDraft: (text: string) => void;
  className?: string;
}

/**
 * A small, explicitly user-triggered "Draft with AI" action — never fires automatically on save,
 * and never blocks the normal save flow. Hidden entirely where the backend serves no AI endpoints,
 * and for users without the ai.use permission.
 */
export default function DraftWithAiButton({ draftType, context, onDraft, className = '' }: DraftWithAiButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!CAPABILITIES.ai || !hasPermission(user?.role, user?.permissions, 'ai.use')) {
    return null;
  }

  const handleClick = () => {
    setLoading(true);
    aiDraftApi.draft({ draftType, context })
      .then((res) => onDraft(res.text))
      .catch((err: ApiError) => {
        if (err?.status === 409) {
          showToast('AI isn’t set up yet — ask a company admin to configure it in Settings > AI Assistant.', 'error');
        } else {
          showToast(err?.message || 'Failed to generate a draft.', 'error');
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {loading ? 'Drafting…' : 'Draft with AI'}
    </button>
  );
}
