/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Send, StickyNote } from 'lucide-react';
import { TicketMessageResponse } from '../../api/supportTicketApi';

interface TicketChatPanelProps {
  ticketId: string;
  note: string;
  currentUserEmail?: string;
  listMessages: (ticketId: string) => Promise<TicketMessageResponse[]>;
  postMessage: (ticketId: string, message: string) => Promise<TicketMessageResponse>;
  updateNote: (ticketId: string, note: string) => Promise<{ note: string | null }>;
  onNoteSaved: (note: string) => void;
  onError: (message: string) => void;
}

export default function TicketChatPanel({
  ticketId,
  note,
  currentUserEmail,
  listMessages,
  postMessage,
  updateNote,
  onNoteSaved,
  onError,
}: TicketChatPanelProps) {
  const [messages, setMessages] = useState<TicketMessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const [noteDraft, setNoteDraft] = useState(note);
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setLoading(true);
    listMessages(ticketId)
      .then(setMessages)
      .catch(() => onError('Failed to load conversation.'))
      .finally(() => setLoading(false));
    setNoteDraft(note);
    setEditingNote(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    postMessage(ticketId, draft.trim())
      .then((created) => {
        setMessages((prev) => [...prev, created]);
        setDraft('');
      })
      .catch(() => onError('Failed to send message.'))
      .finally(() => setSending(false));
  };

  const saveNote = () => {
    setSavingNote(true);
    updateNote(ticketId, noteDraft)
      .then((updated) => {
        onNoteSaved(updated.note ?? '');
        setEditingNote(false);
      })
      .catch(() => onError('Failed to save note.'))
      .finally(() => setSavingNote(false));
  };

  return (
    <div className="space-y-5">
      {/* Shared note */}
      <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-amber-700">
            <StickyNote className="w-3.5 h-3.5 mr-1.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Shared Note</span>
          </div>
          {!editingNote && (
            <button
              onClick={() => setEditingNote(true)}
              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
            >
              {note ? 'Edit' : 'Add note'}
            </button>
          )}
        </div>

        {editingNote ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Visible to both your team and the platform admin…"
              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none"
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => { setEditingNote(false); setNoteDraft(note); }}
                className="px-3 py-1 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="px-3 py-1 text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {savingNote ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
            {note || <span className="text-gray-400 italic">No note yet.</span>}
          </p>
        )}
      </div>

      {/* Chat thread */}
      <div>
        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-2">Conversation</span>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {loading && <p className="text-xs text-gray-400 text-center py-6">Loading conversation…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No messages yet — start the conversation below.</p>
          )}
          {messages.map((m) => {
            const isMine = m.senderEmail === currentUserEmail;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  isMine ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.message}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {isMine ? 'You' : m.senderName} · {new Date(m.createdAt).toLocaleString('en-MY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>

        <form onSubmit={sendMessage} className="flex items-center space-x-2 mt-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-full cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
