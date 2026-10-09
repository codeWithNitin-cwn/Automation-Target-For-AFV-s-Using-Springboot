import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { analysisApi } from '../services/api';
import { AnalysisRecord, AnalysisStatus } from '../types';
import { useWebSocket } from '../context/WebSocketContext';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, Column } from '../components/DataTable';
import { getThreatForClass } from '../config/threat';
import {
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  ExternalLink,
  UploadCloud,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';

export const MissionArchives: React.FC = () => {
  const navigate = useNavigate();
  const { subscribeToAllAnalyses } = useWebSocket();

  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AnalysisStatus>('ALL');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Expanded rows and flashing rows on live update
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(new Set());
  const [flashingRowKeys, setFlashingRowKeys] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analysisApi.getHistory();
      setAnalyses(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to retrieve mission archives');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  // Subscribe to live updates over WebSocket STOMP
  useEffect(() => {
    const unsubscribe = subscribeToAllAnalyses((update: AnalysisRecord) => {
      setAnalyses((prev) => {
        const index = prev.findIndex((item) => item.id === update.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = update;
          return updated;
        } else {
          return [update, ...prev];
        }
      });

      // Flash the updated row for 1.5 seconds per BRD section 7.5 item 5
      setFlashingRowKeys((prev) => new Set(prev).add(update.id));
      setTimeout(() => {
        setFlashingRowKeys((prev) => {
          const next = new Set(prev);
          next.delete(update.id);
          return next;
        });
      }, 1500);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribeToAllAnalyses]);

  // Copy ID to clipboard
  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Toggle row expansion
  const handleToggleExpandRow = (key: string) => {
    setExpandedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Column Sort
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Count by status
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: analyses.length,
      COMPLETED: 0,
      RUNNING: 0,
      PENDING: 0,
      FAILED: 0,
    };
    analyses.forEach((a) => {
      if (counts[a.status] !== undefined) {
        counts[a.status]++;
      }
    });
    return counts;
  }, [analyses]);

  // Filtered & Sorted Analyses
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      // Search query (file name or ID)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = item.fileName?.toLowerCase().includes(query);
        const matchesId = item.id?.toLowerCase().includes(query);
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [analyses, statusFilter, searchQuery]);

  const sortedAnalyses = useMemo(() => {
    const list = [...filteredAnalyses];
    list.sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (sortColumn === 'targets') {
        valA = a.detectedObjects?.length || 0;
        valB = b.detectedObjects?.length || 0;
      }

      if (valA == null) return sortDirection === 'asc' ? 1 : -1;
      if (valB == null) return sortDirection === 'asc' ? -1 : 1;

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [filteredAnalyses, sortColumn, sortDirection]);

  // Paginated records
  const totalPages = Math.ceil(sortedAnalyses.length / pageSize) || 1;
  const paginatedAnalyses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedAnalyses.slice(start, start + pageSize);
  }, [sortedAnalyses, page, pageSize]);

  // Export filtered items as CSV per Section 7.5 item 6
  const handleExportCSV = () => {
    if (filteredAnalyses.length === 0) return;

    const headers = ['Analysis ID', 'File Name', 'Status', 'Model Version', 'Targets Count', 'Latency (ms)', 'Created At'];
    const rows = filteredAnalyses.map((item) => [
      item.id,
      `"${item.fileName.replace(/"/g, '""')}"`,
      item.status,
      item.modelVersion || '--',
      item.detectedObjects?.length || 0,
      item.processingTimeMs != null ? item.processingTimeMs : '--',
      item.createdAt,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mission_archives_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format relative time helper
  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  // Define Table Columns
  const columns: Column<AnalysisRecord>[] = [
    {
      key: 'id',
      header: 'Analysis ID',
      sortable: true,
      width: '130px',
      render: (row) => {
        const shortId = row.id.substring(0, 8);
        const isCopied = copiedId === row.id;
        return (
          <button
            type="button"
            onClick={(e) => handleCopyId(row.id, e)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--accent-blue)',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px',
            }}
            title="Click to copy full UUID"
          >
            <span>{shortId}</span>
            {isCopied ? <Check size={12} color="var(--status-nominal)" /> : <Copy size={12} />}
          </button>
        );
      },
    },
    {
      key: 'fileName',
      header: 'File Name',
      sortable: true,
      render: (row) => (
        <span
          title={row.fileName}
          style={{
            maxWidth: '220px',
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 500,
          }}
        >
          {row.fileName}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '130px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'modelVersion',
      header: 'Model',
      sortable: true,
      width: '140px',
      render: (row) => (
        <span className="mono-data" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {row.modelVersion || '--'}
        </span>
      ),
    },
    {
      key: 'targets',
      header: 'Targets',
      sortable: true,
      width: '100px',
      render: (row) => {
        const count = row.detectedObjects?.length || 0;
        const classSummary = row.detectedObjects
          ? Object.entries(
              row.detectedObjects.reduce((acc, curr) => {
                acc[curr.className] = (acc[curr.className] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .map(([cls, cnt]) => `${cls}: ${cnt}`)
              .join('\n')
          : 'None';

        return (
          <span
            className="mono-data"
            title={count > 0 ? classSummary : 'No detections'}
            style={{
              cursor: count > 0 ? 'help' : 'default',
              fontWeight: 600,
              color: count > 0 ? 'var(--text-primary)' : 'var(--text-dim)',
            }}
          >
            {count}
          </span>
        );
      },
    },
    {
      key: 'processingTimeMs',
      header: 'Latency',
      sortable: true,
      width: '110px',
      render: (row) => (
        <span className="mono-data" style={{ fontSize: '12px' }}>
          {row.processingTimeMs != null && row.status === 'COMPLETED'
            ? `${row.processingTimeMs} ms`
            : '--'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      width: '170px',
      render: (row) => {
        const dateObj = new Date(row.createdAt);
        const formatted = isNaN(dateObj.getTime())
          ? row.createdAt
          : dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const relative = getRelativeTime(row.createdAt);
        return (
          <span
            className="mono-data"
            title={relative ? `${relative} (${row.createdAt})` : row.createdAt}
            style={{ fontSize: '11px', color: 'var(--text-muted)' }}
          >
            {formatted}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      width: '90px',
      render: (row) => (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(`/analyses/${row.id}`)}
          style={{ padding: '4px 10px', fontSize: '11px' }}
          title="Open complete tactical inspection"
        >
          <span>OPEN</span>
          <ExternalLink size={12} />
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title & Mission Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', letterSpacing: '0.08em' }}>MISSION ARCHIVES</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            HISTORICAL RECONNAISSANCE SCANS & TARGET TELEMETRY LOGS
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchAnalyses}
            disabled={isLoading}
            title="Refresh logs from database"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>REFRESH</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            disabled={filteredAnalyses.length === 0}
            title="Export filtered records to CSV"
          >
            <Download size={14} />
            <span>EXPORT CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/ingest')}
          >
            <UploadCloud size={14} />
            <span>NEW INGESTION</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Status Filters */}
      <div
        className="hud-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <input
            type="text"
            className="hud-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Search by file name or UUID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
        </div>

        {/* Status Chips with counts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {(['ALL', 'COMPLETED', 'RUNNING', 'PENDING', 'FAILED'] as const).map((status) => {
            const isSelected = statusFilter === status;
            const count = statusCounts[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                style={{
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-muted)',
                  color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{status}</span>
                <span
                  style={{
                    background: isSelected ? 'var(--accent-blue)' : 'rgba(148, 163, 184, 0.15)',
                    color: isSelected ? '#000' : 'var(--text-muted)',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="hud-card"
          style={{
            borderColor: 'var(--threat-hostile)',
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} color="var(--threat-hostile)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--threat-hostile)' }}>Failed to load mission archives</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{error}</div>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={fetchAnalyses}>
            Retry
          </button>
        </div>
      )}

      {/* Data Table with Expandable Row View */}
      <DataTable
        columns={columns}
        data={paginatedAnalyses}
        keyField="id"
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        isLoading={isLoading}
        flashingRowKeys={flashingRowKeys}
        expandedRowKeys={expandedRowKeys}
        onToggleExpandRow={handleToggleExpandRow}
        renderExpandedRow={(row) => (
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Quick view thumbnail */}
            <div
              style={{
                width: '160px',
                height: '110px',
                background: '#04060c',
                border: '1px solid var(--border-muted)',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <img
                src={analysisApi.getImageUrl(row.id)}
                alt={row.fileName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  color: 'var(--text-dim)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                <ImageIcon size={20} />
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>PREVIEW</span>
              </div>
            </div>

            {/* Quick telemetry and detection chips */}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                STORAGE PATH: <span style={{ color: 'var(--text-primary)' }}>{row.storagePath || 'LOCAL TEMP STORAGE'}</span>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  IDENTIFIED CANDIDATES ({row.detectedObjects?.length || 0}):
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {row.detectedObjects && row.detectedObjects.length > 0 ? (
                  row.detectedObjects.map((target, idx) => {
                    const threat = getThreatForClass(target.className);
                    return (
                      <span
                        key={idx}
                        style={{
                          background: threat.bgColor,
                          border: `1px solid ${threat.borderColor}`,
                          color: threat.borderColor,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {target.className} ({Math.round(target.confidence * 100)}%)
                      </span>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    No target signatures detected in imagery
                  </span>
                )}
              </div>

              <div style={{ marginTop: '12px' }}>
                <Link
                  to={`/analyses/${row.id}`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--accent-blue)',
                    textDecoration: 'underline',
                    fontWeight: 600,
                  }}
                >
                  OPEN COMPLETE INSPECTOR STUDIO &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
        emptyMessage={
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              No Mission Scans Found
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter tags.'
                : 'No reconnaissance images have been ingested yet.'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/ingest')}
            >
              <UploadCloud size={14} />
              <span>UPLOAD FIRST RECON IMAGE</span>
            </button>
          </div>
        }
      />

      {/* Pagination Controls */}
      {sortedAnalyses.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedAnalyses.length)} of{' '}
            {sortedAnalyses.length} missions
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Page size:</span>
              <select
                className="hud-input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                Prev
              </button>
              <span style={{ alignSelf: 'center', padding: '0 4px' }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
