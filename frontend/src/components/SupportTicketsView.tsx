/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supportTicketApi, SupportTicketResponse, TicketType, TicketPriority } from '../api/supportTicketApi';
import TicketChatPanel from './ui/TicketChatPanel';
import Select from './ui/Select';

export default function SupportTicketsView() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<SupportTicketResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [formType, setFormType] = useState<TicketType>('SUPPORT_REQUEST');
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formPriority, setFormPriority] = useState<TicketPriority>('MEDIUM');

  const [editingTicket, setEditingTicket] = useState<SupportTicketResponse | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editMessage, setEditMessage] = useState('');

  const [selectedTicket, setSelectedTicket] = useState<SupportTicketResponse | null>(null);

  useEffect(() => {
    supportTicketApi.listMine()
      .then(setTickets)
      .catch(() => showToast('Failed to load your tickets.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // "Call the Expert" in the sidebar navigates here with this flag to jump straight into the New Ticket form
  useEffect(() => {
    const state = location.state as { openNewTicket?: boolean } | null;
    if (state?.openNewTicket) {
      setCreateOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const resetCreateForm = () => {
    setFormType('SUPPORT_REQUEST');
    setFormSubject('');
    setFormMessage('');
    setFormPriority('MEDIUM');
  };

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    supportTicketApi.create(formType, formSubject, formMessage, formType === 'SUPPORT_REQUEST' ? formPriority : undefined)
      .then((created) => {
        setTickets(prev => [created, ...prev]);
        setCreateOpen(false);
        resetCreateForm();
        showToast('Submitted — our team will follow up soon.');
      })
      .catch(() => showToast('Failed to submit. Please try again.', 'error'));
  };

  const openEdit = (ticket: SupportTicketResponse) => {
    setEditingTicket(ticket);
    setEditSubject(ticket.subject);
    setEditMessage(ticket.message);
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    supportTicketApi.update(editingTicket.id, editSubject, editMessage)
      .then((updated) => {
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        setEditingTicket(null);
        setSelectedTicket(prev => prev && prev.id === updated.id ? updated : prev);
        showToast('Updated.');
      })
      .catch(() => showToast('Failed to update — it may no longer be editable.', 'error'));
  };

  const typeLabel = (t: SupportTicketResponse) => t.type === 'FEEDBACK' ? 'Feedback' : 'Support';
  const statusLabel = (t: SupportTicketResponse) => t.status === 'OPEN' ? 'Open' : t.status === 'PENDING' ? 'In Progress' : 'Resolved';

  return (
    <div className="space-y-6 w-full pb-16">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Feedback & Support</h2>
          <p className="text-sm text-gray-500 mt-1">Submit feedback or a support request, and track its status here.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1" /> New Ticket
        </button>
      </div>

      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Submitted By</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs font-medium">Loading tickets…</td></tr>
              )}
              {!loading && tickets.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs font-medium">No tickets yet — click "New Ticket" to submit feedback or ask for help.</td></tr>
              )}
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 max-w-[260px]">
                    <span className="font-semibold text-gray-900 block">{t.subject}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block truncate">{t.message}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'FEEDBACK' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {t.type === 'FEEDBACK' ? 'Feedback' : 'Support'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.priority === 'HIGH' ? 'bg-red-50 text-red-700' : t.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'OPEN' ? 'bg-blue-50 text-blue-700' : t.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      <span className={`w-1 h-1 rounded-full mr-1.5 ${
                        t.status === 'OPEN' ? 'bg-blue-500' : t.status === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      {t.status === 'OPEN' ? 'Open' : t.status === 'PENDING' ? 'In Progress' : 'Resolved'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-[11px]">{t.submittedByName}</td>
                  <td className="px-6 py-4 font-mono text-[11px] text-gray-500">{t.createdAt.slice(0, 10)}</td>
                  <td className="px-6 py-4 text-right">
                    {t.submittedByEmail === user?.email && t.status === 'OPEN' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg cursor-pointer transition-colors text-[11px]"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={submitCreate} className="bg-white border border-gray-100 rounded-[24px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-lg font-bold text-gray-900">New Feedback / Support Ticket</h4>
              <button
                type="button"
                onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-1.5 bg-gray-50 p-1 rounded-full border border-gray-100 w-fit">
              <button
                type="button"
                onClick={() => setFormType('FEEDBACK')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-all ${formType === 'FEEDBACK' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Feedback
              </button>
              <button
                type="button"
                onClick={() => setFormType('SUPPORT_REQUEST')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-all ${formType === 'SUPPORT_REQUEST' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Support Request
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Subject</label>
              <input
                required
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Brief summary"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Message</label>
              <textarea
                required
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={4}
                placeholder="Tell us more…"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>

            {formType === 'SUPPORT_REQUEST' && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Priority</label>
                <Select
                  className="w-full"
                  aria-label="Priority"
                  value={formPriority}
                  onChange={(v) => setFormPriority(v as TicketPriority)}
                  options={[
                    { value: 'HIGH', label: 'High' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'LOW', label: 'Low' },
                  ]}
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTicket && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={submitEdit} className="bg-white border border-gray-100 rounded-[24px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-lg font-bold text-gray-900">Edit Ticket</h4>
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Subject</label>
              <input
                required
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Message</label>
              <textarea
                required
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAIL SIDE PANEL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setSelectedTicket(null)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white border-l border-gray-100 shadow-2xl flex flex-col animate-panel-in">
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="space-y-1.5 pr-4">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedTicket.type === 'FEEDBACK' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                  {typeLabel(selectedTicket)}
                </span>
                <h4 className="text-lg font-bold text-gray-900 leading-snug">{selectedTicket.subject}</h4>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedTicket.status === 'OPEN' ? 'bg-blue-50 text-blue-700' : selectedTicket.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    <span className={`w-1 h-1 rounded-full mr-1.5 ${
                      selectedTicket.status === 'OPEN' ? 'bg-blue-500' : selectedTicket.status === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    {statusLabel(selectedTicket)}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Priority</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedTicket.priority === 'HIGH' ? 'bg-red-50 text-red-700' : selectedTicket.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Submitted By</span>
                  <span className="text-xs font-semibold text-gray-900 block">{selectedTicket.submittedByName}</span>
                  <span className="text-[11px] text-gray-500 block">{selectedTicket.submittedByEmail}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Created</span>
                  <span className="text-xs font-mono text-gray-700">{selectedTicket.createdAt.slice(0, 10)}</span>
                </div>
                {selectedTicket.companyName && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Company</span>
                    <span className="text-xs font-semibold text-gray-900">{selectedTicket.companyName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Message</span>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-xl p-4">
                  {selectedTicket.message}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Ticket ID</span>
                <span className="text-[11px] font-mono text-gray-400">{selectedTicket.id}</span>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <TicketChatPanel
                  ticketId={selectedTicket.id}
                  note={selectedTicket.note ?? ''}
                  currentUserEmail={user?.email}
                  listMessages={supportTicketApi.listMessages}
                  postMessage={supportTicketApi.postMessage}
                  updateNote={supportTicketApi.updateNote}
                  onNoteSaved={(note) => {
                    setSelectedTicket(prev => prev ? { ...prev, note } : prev);
                    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, note } : t));
                  }}
                  onError={(msg) => showToast(msg, 'error')}
                />
              </div>
            </div>

            {selectedTicket.submittedByEmail === user?.email && selectedTicket.status === 'OPEN' && (
              <div className="px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => openEdit(selectedTicket)}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-full cursor-pointer transition-colors text-sm"
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
