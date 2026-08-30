/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, FileText, Hash } from 'lucide-react';
import { activityLogApi } from '../api/activityLogApi';
import { ActivityLog, toActivityLog } from './admin/types';
import { ShowToast } from '../contexts/ToastContext';

interface AuditLogDetailViewProps {
  logId: string;
  onBack: () => void;
  showToast: ShowToast;
}

export default function AuditLogDetailView({ logId, onBack, showToast }: AuditLogDetailViewProps) {
  const [log, setLog] = useState<ActivityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    activityLogApi.getMyCompanyById(logId)
      .then((data) => setLog(toActivityLog(data)))
      .catch((e: any) => {
        if (e?.status === 404) {
          setNotFound(true);
        } else {
          showToast('Failed to load audit log entry.', 'warning');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);

  return (
    <div className="space-y-6">

      {/* Back Navigation Header */}
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Audit Log</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-xs font-medium">
          Loading audit log entry...
        </div>
      ) : notFound || !log ? (
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-10 text-center space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Entry not found</h3>
          <p className="text-xs text-gray-500">This audit log entry doesn't exist or has been removed.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-6 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Audit Log Entry</h3>
                <p className="text-xs text-gray-500 mt-1">Entry ID: <span className="font-mono text-gray-600 font-semibold">{log.id}</span></p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${log.badgeColor}`}>
              {log.eventType}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-start space-x-2.5">
              <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Timestamp</span>
                <span className="text-xs font-bold text-gray-700 mt-0.5 block font-mono">{log.timestamp}</span>
              </div>
            </div>
            <div className="flex items-start space-x-2.5">
              <Hash className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Action Code</span>
                <span className="text-xs font-bold text-gray-700 mt-0.5 block">{log.eventType}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-gray-100 space-y-1.5">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Description</span>
            <p className="text-sm text-gray-700 leading-relaxed">{log.eventDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
}
