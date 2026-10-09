import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { analysisApi, systemApi } from '../services/api';
import { AnalysisRecord, SystemHealthResponse } from '../types';
import { useWebSocket } from '../context/WebSocketContext';
import { StatTile } from '../components/StatTile';
import { StatusBadge } from '../components/StatusBadge';
import { DetectionOverlay } from '../components/DetectionOverlay';
import { getThreatForClass } from '../config/threat';
import {
  Radar,
  UploadCloud,
  CheckCircle2,
  Crosshair,
  Timer,
  Server,
  Cpu,
  Database,
  HardDrive,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const { subscribeToAllAnalyses } = useWebSocket();

  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analyses history and system health
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [historyData, healthData] = await Promise.all([
        analysisApi.getHistory(),
        systemApi.getHealth().catch(() => null),
      ]);
      setAnalyses(historyData);
      setHealth(healthData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to connect to tactical command network');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // STOMP WebSocket Live Updates (update feed and stat tiles instantly with NO polling)
  useEffect(() => {
    const unsubscribe = subscribeToAllAnalyses((updatedRecord: AnalysisRecord) => {
      setAnalyses((prev) => {
        const index = prev.findIndex((item) => item.id === updatedRecord.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedRecord;
          return next;
        } else {
          return [updatedRecord, ...prev];
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [subscribeToAllAnalyses]);

  // Compute 4 Stat Tiles strictly from actual data (Zero placeholder or invented numbers!)
  const stats = useMemo(() => {
    const totalScans = analyses.length;
    const completedScans = analyses.filter((a) => a.status === 'COMPLETED');
    const completedCount = completedScans.length;
    const completedRate = totalScans > 0 ? Math.round((completedCount / totalScans) * 100) : 0;

    let totalTargets = 0;
    const classCountMap: Record<string, number> = {};
    let totalLatencyMs = 0;
    let completedWithLatencyCount = 0;

    analyses.forEach((a) => {
      if (a.detectedObjects) {
        totalTargets += a.detectedObjects.length;
        a.detectedObjects.forEach((target) => {
          classCountMap[target.className] = (classCountMap[target.className] || 0) + 1;
        });
      }
      if (a.status === 'COMPLETED' && a.processingTimeMs != null) {
        totalLatencyMs += a.processingTimeMs;
        completedWithLatencyCount++;
      }
    });

    // Determine top class
    let topClass = '--';
    let topCount = 0;
    Object.entries(classCountMap).forEach(([cls, count]) => {
      if (count > topCount) {
        topCount = count;
        topClass = cls;
      }
    });

    const avgLatency =
      completedWithLatencyCount > 0 ? Math.round(totalLatencyMs / completedWithLatencyCount) : '--';

    return {
      totalScans,
      completedCount,
      completedRate,
      totalTargets,
      topClass,
      avgLatency,
      classCountMap,
    };
  }, [analyses]);

  // Most recent completed analysis for the Operational Viewport
  const latestCompleted = useMemo(() => {
    return analyses.find((a) => a.status === 'COMPLETED') || null;
  }, [analyses]);

  // Last 10 analyses for the Live Activity Feed
  const recentFeed = useMemo(() => {
    return analyses.slice(0, 10);
  }, [analyses]);

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return isoString;
    }
  };

  // Max class count for relative bar width
  const maxClassCount = useMemo(() => {
    const counts = Object.values(stats.classCountMap);
    return counts.length > 0 ? Math.max(...counts) : 1;
  }, [stats.classCountMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', letterSpacing: '0.08em' }}>COMMAND CENTER</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            OPERATIONAL COMMON INTELLIGENCE PICTURE // REAL-TIME THREAT RECOGNITION
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchData}
            disabled={isLoading}
            title="Refresh telemetry"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>POLL TELEMETRY</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/ingest')}
          >
            <UploadCloud size={14} />
            <span>DISPATCH SCAN</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="hud-card"
          style={{
            borderColor: 'var(--threat-hostile)',
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="var(--threat-hostile)" />
            <span style={{ fontSize: '13px', color: 'var(--threat-hostile)' }}>{error}</span>
          </div>
          <button type="button" className="btn btn-secondary" onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* 1. Stat Row (4 Tiles strictly computed) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <StatTile
          label="Total Recon Scans"
          value={isLoading ? '--' : stats.totalScans}
          subtext={stats.totalScans > 0 ? `${stats.completedCount} processed missions` : 'Awaiting sensor uploads'}
          icon={<Radar size={16} color="var(--accent-blue)" />}
        />

        <StatTile
          label="Pipeline Success Rate"
          value={isLoading ? '--' : `${stats.completedRate}%`}
          subtext={`${stats.completedCount} of ${stats.totalScans} successful`}
          icon={<CheckCircle2 size={16} color="var(--status-nominal)" />}
        />

        <StatTile
          label="Identified Targets"
          value={isLoading ? '--' : stats.totalTargets}
          subtext={stats.totalTargets > 0 ? `Leading class: ${stats.topClass}` : 'No targets registered'}
          icon={<Crosshair size={16} color="var(--threat-hostile)" />}
        />

        <StatTile
          label="Average Model Latency"
          value={isLoading ? '--' : typeof stats.avgLatency === 'number' ? `${stats.avgLatency} ms` : stats.avgLatency}
          subtext="YOLOv8 tensor compute time"
          icon={<Timer size={16} color="var(--threat-unknown)" />}
        />
      </div>

      {/* Zero data Empty State Check per BRD Section 7.2 item 2 */}
      {analyses.length === 0 && !isLoading ? (
        <div
          className="hud-card hud-card-bracket"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            <Radar size={32} color="var(--accent-blue)" />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>TACTICAL CONSOLE INITIALIZED</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', marginBottom: '24px', fontSize: '13px' }}>
            No reconnaissance imagery has been analyzed yet. Upload aerial or battlefield sensor feeds to activate live threat overlays and tracking.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/ingest')}
          >
            <UploadCloud size={16} />
            <span>UPLOAD FIRST RECON IMAGE</span>
          </button>
        </div>
      ) : (
        /* Operational Grid: Left 2/3 and Right 1/3 */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '20px' }}>
          {/* Left Column (2/3 width): Operational Viewport + Class Distribution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Operational Viewport */}
            <div className="hud-card hud-card-bracket" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crosshair size={18} color="var(--accent-blue)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em' }}>
                    OPERATIONAL SENSOR VIEWPORT
                  </span>
                </div>
                {latestCompleted && (
                  <Link
                    to={`/analyses/${latestCompleted.id}`}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    <span>OPEN DETAIL</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {latestCompleted ? (
                <div>
                  <DetectionOverlay
                    imageSrc={analysisApi.getImageUrl(latestCompleted.id)}
                    imageAlt={latestCompleted.fileName}
                    detections={latestCompleted.detectedObjects || []}
                    minConfidence={0.25}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-muted)',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span>SCAN: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{latestCompleted.fileName}</strong>
                      <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>[{latestCompleted.id.substring(0, 8)}]</span>
                    </div>
                    <div>
                      <span>TARGETS: </span>
                      <strong style={{ color: 'var(--threat-hostile)' }}>
                        {latestCompleted.detectedObjects?.length || 0}
                      </strong>
                      <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>
                        {formatRelativeTime(latestCompleted.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#04060c',
                    borderRadius: '8px',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}
                >
                  <Radar size={32} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>IMAGE UNAVAILABLE</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Awaiting completion of next sensor scan
                  </span>
                </div>
              )}
            </div>

            {/* Class Distribution Bars (below viewport) */}
            <div className="hud-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.06em' }}>
                  CLASS DISTRIBUTION & THREAT INTEL
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                  ACROSS LOADED ARCHIVES
                </span>
              </div>

              {Object.keys(stats.classCountMap).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No target classifications available in current telemetry.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(stats.classCountMap).map(([className, count]) => {
                    const threat = getThreatForClass(className);
                    const widthPercent = Math.max(Math.round((count / maxClassCount) * 100), 5);

                    return (
                      <div key={className} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: threat.shape === 'diamond' ? '0' : '2px',
                                transform: threat.shape === 'diamond' ? 'rotate(45deg)' : 'none',
                                background: threat.borderColor,
                              }}
                            />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{className}</span>
                          </span>
                          <span className="mono-data" style={{ fontWeight: 700, color: threat.borderColor }}>
                            {count}
                          </span>
                        </div>
                        <div
                          style={{
                            height: '6px',
                            background: 'rgba(148, 163, 184, 0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${widthPercent}%`,
                              backgroundColor: threat.borderColor,
                              borderRadius: '3px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1/3 width): Pipeline Health + Live Activity Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Pipeline Health (calling /api/system/health) */}
            <div className="hud-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Server size={16} color="var(--accent-blue)" />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.06em' }}>
                  PIPELINE HEALTH TILES
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 1. Backend */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(6, 9, 17, 0.5)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={14} color="var(--accent-blue)" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Backend Service</div>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {health?.components?.backend?.details || 'Spring Boot v3.2.3'}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={health?.components?.backend?.status === 'UP' ? 'COMPLETED' : 'FAILED'} />
                </div>

                {/* 2. AI Inference Service */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(6, 9, 17, 0.5)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={14} color="var(--accent-blue)" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>AI Core Engine</div>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {health?.components?.aiService?.details || 'YOLOv8 Engine'}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={health?.components?.aiService?.status === 'UP' ? 'COMPLETED' : 'FAILED'} />
                </div>

                {/* 3. Database */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(6, 9, 17, 0.5)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={14} color="var(--accent-blue)" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Target DB Repository</div>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {health?.components?.database?.details || 'H2 Memory DB'}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={health?.components?.database?.status === 'UP' ? 'COMPLETED' : 'FAILED'} />
                </div>

                {/* 4. Object Storage */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(6, 9, 17, 0.5)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HardDrive size={14} color="var(--accent-blue)" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Imagery Storage</div>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {health?.components?.storage?.status === 'DEGRADED' ? 'Local Disk Fallback' : 'MinIO S3 Bucket'}
                      </div>
                    </div>
                  </div>
                  <span
                    className="status-badge"
                    style={{
                      background: health?.components?.storage?.status === 'UP' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: health?.components?.storage?.status === 'UP' ? 'var(--status-nominal)' : 'var(--threat-unknown)',
                      borderColor: health?.components?.storage?.status === 'UP' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    {health?.components?.storage?.status === 'UP' ? 'ONLINE' : 'FALLBACK'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Activity Feed (last 10 analyses) */}
            <div className="hud-card" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.06em' }}>
                  LIVE ACTIVITY FEED
                </span>
                <span className="mono-data" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                  TOP 10 LOGS
                </span>
              </div>

              {recentFeed.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No recent activities recorded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '380px' }}>
                  {recentFeed.map((scan) => (
                    <div
                      key={scan.id}
                      onClick={() => navigate(`/analyses/${scan.id}`)}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(6, 9, 17, 0.5)',
                        border: '1px solid var(--border-muted)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'border-color var(--transition-fast)',
                      }}
                    >
                      <div style={{ overflow: 'hidden', marginRight: '10px' }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={scan.fileName}
                        >
                          {scan.fileName}
                        </div>
                        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                          {formatRelativeTime(scan.createdAt)} • Targets: {scan.detectedObjects?.length || 0}
                        </div>
                      </div>

                      <StatusBadge status={scan.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
