import React from 'react';
import { AnalysisStatus } from '../types';
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: AnalysisStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase() as AnalysisStatus;

  switch (normalized) {
    case 'COMPLETED':
      return (
        <span className={`status-badge badge-completed ${className}`} title="Status: Completed">
          <CheckCircle2 size={13} aria-hidden="true" />
          <span>COMPLETED</span>
        </span>
      );
    case 'RUNNING':
      return (
        <span className={`status-badge badge-running ${className}`} title="Status: Running">
          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          <span>RUNNING</span>
        </span>
      );
    case 'PENDING':
      return (
        <span className={`status-badge badge-pending ${className}`} title="Status: Pending">
          <Clock size={13} aria-hidden="true" />
          <span>PENDING</span>
        </span>
      );
    case 'FAILED':
      return (
        <span className={`status-badge badge-failed ${className}`} title="Status: Failed">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>FAILED</span>
        </span>
      );
    default:
      return (
        <span className={`status-badge ${className}`} style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' }}>
          <span>{status || 'UNKNOWN'}</span>
        </span>
      );
  }
};
