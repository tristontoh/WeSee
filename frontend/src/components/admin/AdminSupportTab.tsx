/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { supportTicketAdminApi } from '../../api/supportTicketAdminApi';
import { SupportTicketResponse, TicketStatus } from '../../api/supportTicketApi';
import TicketChatPanel from '../ui/TicketChatPanel';
import { ShowToast } from './types';

const NEXT_TICKET_STATUS: Record<TicketStatus, TicketStatus | null> = { OPEN: 'PENDING', PENDING: 'CLOSED', CLOSED: null };
const TICKET_STATUS_ACTION_LABEL: Record<TicketStatus, string> = { OPEN: 'Claim', PENDING: 'Mark Resolved', CLOSED: 'Resolved' };

interface AdminSupportTabProps {
  currentUserEmail?: string;
  showToast: ShowToast;
}

export default function AdminSupportTab({ currentUserEmail, showToast }: AdminSupportTabProps) {
  const [supportTicketsAdmin, setSupportTicketsAdmin] = useState<SupportTicketResponse[]>([]);
  const [supportTicketsAdminLoading, setSupportTicketsAdminLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketResponse | null>(null);

  useEffect(() => {
    supportTicketAdminApi.listAll()
      .then(setSupportTicketsAdmin)
      .catch(() => showToast('Failed to load tickets.', 'warning'))
      .finally(() => setSupportTicketsAdminLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advanceTicketStatus = (ticket: SupportTicketResponse) => {
    const next = NEXT_TICKET_STATUS[ticket.status];
    if (!next) return;
    supportTicketAdminApi.updateStatus(ticket.id, next)
      .then((updated) => {
        setSupportTicketsAdmin(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelectedTicket(prev => prev && prev.id === updated.id ? updated : prev);
        showToast(`Ticket "${updated.subject}" marked ${next === 'PENDING' ? 'in progress' : 'resolved'}.`, 'success');
      })
      .catch(() => showToast('Failed to update ticket status.', 'warning'));
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Feedback & Support</h2>
        <p className="text-sm text-gray-500 mt-1">Feedback and support requests submitted by tenant users across every workspace.</p>
      </div>

      {/* Tickets listing */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900">Inbox</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Client Tenant</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {supportTicketsAdminLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 text-xs font-medium">Loading tickets…</td>
                </tr>
              )}
              {!supportTicketsAdminLoading && supportTicketsAdmin.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 text-xs font-medium">No feedback or support tickets submitted yet.</td>
                </tr>
              )}
              {supportTicketsAdmin.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 block">{t.subject}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">{t.submittedByName} · {t.createdAt.slice(0, 10)}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {t.companyName ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'FEEDBACK' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {t.type === 'FEEDBACK' ? 'Feedback' : 'Support'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                      t.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'OPEN' ? 'bg-red-50 text-red-700' :
                      t.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {t.status === 'OPEN' ? 'Open' : t.status === 'PENDING' ? 'Pending' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedTicket(t); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); advanceTicketStatus(t); }}
                        disabled={t.status === 'CLOSED'}
                        className={`px-2.5 py-1 font-bold rounded-lg transition-colors ${
                          t.status === 'CLOSED'
                            ? 'bg-gray-50 text-gray-400 cursor-default'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
                        }`}
                      >
                        {TICKET_STATUS_ACTION_LABEL[t.status]}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                  {selectedTicket.type === 'FEEDBACK' ? 'Feedback' : 'Support'}
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
                    selectedTicket.status === 'OPEN' ? 'bg-red-50 text-red-700' : selectedTicket.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {selectedTicket.status === 'OPEN' ? 'Open' : selectedTicket.status === 'PENDING' ? 'Pending' : 'Closed'}
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
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Client Tenant</span>
                  <span className="text-xs font-semibold text-gray-900">{selectedTicket.companyName ?? '—'}</span>
                </div>
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
                  currentUserEmail={currentUserEmail}
                  listMessages={supportTicketAdminApi.listMessages}
                  postMessage={supportTicketAdminApi.postMessage}
                  updateNote={supportTicketAdminApi.updateNote}
                  onNoteSaved={(note) => {
                    setSelectedTicket(prev => prev ? { ...prev, note } : prev);
                    setSupportTicketsAdmin(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, note } : t));
                  }}
                  onError={(msg) => showToast(msg, 'warning')}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => advanceTicketStatus(selectedTicket)}
                disabled={selectedTicket.status === 'CLOSED'}
                className={`w-full flex items-center justify-center px-4 py-2.5 font-bold rounded-full text-sm transition-colors ${
                  selectedTicket.status === 'CLOSED'
                    ? 'bg-gray-50 text-gray-400 cursor-default'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer'
                }`}
              >
                {TICKET_STATUS_ACTION_LABEL[selectedTicket.status]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
