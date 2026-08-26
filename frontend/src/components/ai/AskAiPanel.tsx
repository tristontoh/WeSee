/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { aiQaApi } from '../../api/aiQaApi';
import { ApiError } from '../../api/client';

interface AskAiPanelProps {
  open: boolean;
  onClose: () => void;
}

interface Exchange {
  question: string;
  answer?: string;
  grounded?: boolean;
  error?: string;
}

/**
 * A lightweight, general-purpose Q&A assistant — not wired to any specific page's data (no
 * matter/indicator context is auto-captured here), so answers lean on general model knowledge.
 * Grounded answers (when a future caller does pass context) are visually distinguished via the
 * "grounded" chip.
 */
export default function AskAiPanel({ open, onClose }: AskAiPanelProps) {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setHistory((prev) => [...prev, { question: q }]);
    setQuestion('');
    setLoading(true);

    aiQaApi.ask({ question: q })
      .then((res) => {
        setHistory((prev) => prev.map((ex, i) => (i === prev.length - 1 ? { ...ex, answer: res.answer, grounded: res.grounded } : ex)));
      })
      .catch((err: ApiError) => {
        const message = err?.status === 409
          ? 'AI isn’t set up yet — ask a company admin to configure it in Settings > AI Assistant.'
          : err?.message || 'Failed to get an answer.';
        setHistory((prev) => prev.map((ex, i) => (i === prev.length - 1 ? { ...ex, error: message } : ex)));
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="absolute inset-0 bg-navy-950/30 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Ask AI</h4>
              <p className="text-[10px] text-gray-400">General guidance — not a substitute for your auditor or consultant</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center h-full text-gray-400 space-y-2">
              <MessageCircle className="w-8 h-8 text-gray-300" />
              <p className="text-xs max-w-[220px]">Ask about a sustainability matter, an indicator, or a disclosure requirement.</p>
            </div>
          )}

          {history.map((ex, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-end">
                <div className="bg-emerald-600 text-white text-xs font-medium rounded-2xl rounded-br-md px-3.5 py-2 max-w-[85%]">
                  {ex.question}
                </div>
              </div>
              {ex.answer && (
                <div className="flex flex-col items-start gap-1">
                  {ex.grounded !== undefined && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide ${
                      ex.grounded ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-gray-500 bg-gray-100 border-gray-200'
                    }`}>
                      {ex.grounded ? 'Grounded in context' : 'General knowledge'}
                    </span>
                  )}
                  <div className="bg-gray-50 text-gray-800 text-xs rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[85%] whitespace-pre-wrap leading-relaxed">
                    {ex.answer}
                  </div>
                </div>
              )}
              {ex.error && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 max-w-[85%]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {ex.error}
                </div>
              )}
              {loading && i === history.length - 1 && !ex.answer && !ex.error && (
                <div className="flex items-center gap-2 text-gray-400 text-xs px-3.5 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking…
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAsk} className="p-4 border-t border-gray-100 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What does Scope 3 emissions reporting require?"
            className="flex-1 px-3.5 py-2.5 text-xs text-gray-900 bg-gray-50 border border-gray-200 rounded-full outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
