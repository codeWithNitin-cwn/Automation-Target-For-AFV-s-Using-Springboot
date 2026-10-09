import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  FileText 
} from 'lucide-react';
import { analysisApi } from '../services/api';
import { AnalysisRecord } from '../types';

export const History: React.FC = () => {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analysisApi.getHistory();
      setRecords(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load mission history from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredRecords = records.filter((rec) => {
    const matchesSearch = 
      rec.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="hud-title" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            Mission Recon Archives
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Historical sortie scans, detected armored assets, and latency telemetry
          </p>
        </div>

        <button 
          id="btn-refresh-history-data"
          onClick={fetchHistory} 
          disabled={loading}
          className="btn-secondary" 
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <RotateCcw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Feed'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="hud-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
          <input
            id="input-search-history"
            type="text"
            className="hud-input"
            placeholder="Search by file name or analysis ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Status Filter Badges */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'COMPLETED', 'RUNNING', 'PENDING', 'FAILED'].map((st) => (
            <button
              key={st}
              id={`filter-status-${st.toLowerCase()}`}
              onClick={() => setStatusFilter(st)}
              style={{
                background: statusFilter === st ? 'rgba(6, 182, 212, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                border: statusFilter === st ? '1px solid var(--accent-cyan)' : '1px solid var(--border-muted)',
                color: statusFilter === st ? 'var(--accent-cyan)' : 'var(--text-muted)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--border-danger)', color: 'var(--accent-crimson)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Table Card */}
      <div className="hud-card hud-card-bracket" style={{ padding: '24px' }}>
        {filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <HistoryIcon size={44} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>No mission archives matching your query</div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Submit a scouting image in Ingestion Studio to view records here</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <th style={{ padding: '12px 16px' }}>ANALYSIS ID</th>
                  <th style={{ padding: '12px 16px' }}>FILE NAME</th>
                  <th style={{ padding: '12px 16px' }}>STATUS</th>
                  <th style={{ padding: '12px 16px' }}>MODEL</th>
                  <th style={{ padding: '12px 16px' }}>TARGETS</th>
                  <th style={{ padding: '12px 16px' }}>LATENCY</th>
                  <th style={{ padding: '12px 16px' }}>TIMESTAMP</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>DETAILS</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'var(--font-mono)' }}>
                {filteredRecords.map((rec) => (
                  <React.Fragment key={rec.id}>
                    <tr 
                      onClick={() => toggleExpand(rec.id)}
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', color: 'var(--accent-cyan)' }}>
                        {rec.id?.substring(0, 8)}...
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {rec.fileName}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {rec.status === 'COMPLETED' && <span className="badge badge-completed"><CheckCircle2 size={12} /> {rec.status}</span>}
                        {rec.status === 'RUNNING' && <span className="badge badge-running"><Clock size={12} /> {rec.status}</span>}
                        {rec.status === 'PENDING' && <span className="badge badge-pending"><Clock size={12} /> {rec.status}</span>}
                        {rec.status === 'FAILED' && <span className="badge badge-failed"><XCircle size={12} /> {rec.status}</span>}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {rec.modelVersion || 'yolov8n-afv-v1.0'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {rec.detectedObjects && rec.detectedObjects.length > 0 ? (
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                            {rec.detectedObjects.length} Targets
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0 Targets</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--accent-emerald)' }}>
                        {rec.processingTimeMs ? `${rec.processingTimeMs} ms` : '--'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {rec.createdAt ? new Date(rec.createdAt).toLocaleString() : '--'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent-cyan)' }}>
                        {expandedId === rec.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                    </tr>

                    {/* Expandable row showing detected targets */}
                    {expandedId === rec.id && (
                      <tr style={{ backgroundColor: 'rgba(6, 9, 17, 0.6)' }}>
                        <td colSpan={8} style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                              <FileText size={14} color="var(--accent-cyan)" />
                              <span>STORAGE PATH: <strong style={{ color: 'var(--text-primary)' }}>{rec.storagePath || 'analyses/' + rec.id}</strong></span>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                DETECTED TARGET DETAILS:
                              </div>
                              {(!rec.detectedObjects || rec.detectedObjects.length === 0) ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  No object detections registered for this image.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                  {rec.detectedObjects.map((obj, i) => (
                                    <div 
                                      key={i} 
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        background: 'rgba(15, 23, 42, 0.9)',
                                        border: '1px solid var(--border-cyan)',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                      }}
                                    >
                                      <ShieldAlert size={14} color="var(--accent-amber)" />
                                      <span><strong>{obj.className}</strong> ({(obj.confidence * 100).toFixed(1)}%)</span>
                                      <span style={{ color: 'var(--text-muted)' }}>
                                        [{obj.boxXMin.toFixed(2)}, {obj.boxYMin.toFixed(2)}, {obj.boxXMax.toFixed(2)}, {obj.boxYMax.toFixed(2)}]
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
