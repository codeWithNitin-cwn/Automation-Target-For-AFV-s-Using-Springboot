import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { analysisApi } from '../services/api';
import { AnalysisRecord, DetectedObject } from '../types';
import { useWebSocket } from '../context/WebSocketContext';
import { StatusBadge } from '../components/StatusBadge';
import { DetectionOverlay } from '../components/DetectionOverlay';
import { getThreatForClass } from '../config/threat';
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Eye,
  Layers,
  Percent,
  Clock,
  HardDrive,
  Cpu,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const AnalysisDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subscribeToAnalysis } = useWebSocket();

  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Inspector filters & toggles
  const [minConfidence, setMinConfidence] = useState<number>(0.25); // default 25%
  const [enabledClasses, setEnabledClasses] = useState<Set<string>>(new Set());
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);

  // Hover & selection synchronization between list and overlay
  const [hoveredTargetId, setHoveredTargetId] = useState<number | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await analysisApi.getById(id);
      setAnalysis(data);
      // Initialize class filter with all found classes
      if (data.detectedObjects) {
        const classes = new Set(data.detectedObjects.map((o) => o.className));
        setEnabledClasses(classes);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Analysis record not found');
      } else {
        setError(err.response?.data?.message || 'Failed to load analysis details');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // STOMP subscription for in-progress updates
  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToAnalysis(id, (updated) => {
      setAnalysis(updated);
      if (updated.detectedObjects) {
        setEnabledClasses(new Set(updated.detectedObjects.map((o) => o.className)));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [id, subscribeToAnalysis]);

  // Copy ID
  const handleCopyId = () => {
    if (analysis?.id) {
      navigator.clipboard.writeText(analysis.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recon_${analysis.id.substring(0, 8)}_telemetry.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Unique detected classes
  const allClasses = useMemo(() => {
    if (!analysis?.detectedObjects) return [];
    return Array.from(new Set(analysis.detectedObjects.map((o) => o.className)));
  }, [analysis]);

  // Toggle class filter chip
  const toggleClass = (className: string) => {
    setEnabledClasses((prev) => {
      const next = new Set(prev);
      if (next.has(className)) {
        next.delete(className);
      } else {
        next.add(className);
      }
      return next;
    });
  };

  // Reset filters
  const resetFilters = () => {
    setMinConfidence(0.25);
    setEnabledClasses(new Set(allClasses));
    setShowBoxes(true);
    setShowLabels(true);
    setShowConfidence(true);
    setSelectedTargetId(null);
    setHoveredTargetId(null);
  };

  // Filtered detections for inspector list
  const filteredDetections = useMemo(() => {
    if (!analysis?.detectedObjects) return [];
    return analysis.detectedObjects.filter((det) => {
      if (det.confidence < minConfidence) return false;
      if (!enabledClasses.has(det.className)) return false;
      return true;
    });
  }, [analysis, minConfidence, enabledClasses]);

  // Summary strip metrics: Class breakdown & Confidence bands
  const summaryMetrics = useMemo(() => {
    const raw = analysis?.detectedObjects || [];
    let high = 0; // >= 70%
    let medium = 0; // 40% - 70%
    let low = 0; // < 40%

    const classCounts: Record<string, number> = {};

    raw.forEach((d) => {
      classCounts[d.className] = (classCounts[d.className] || 0) + 1;
      if (d.confidence >= 0.7) {
        high++;
      } else if (d.confidence >= 0.4) {
        medium++;
      } else {
        low++;
      }
    });

    return { high, medium, low, classCounts, total: raw.length };
  }, [analysis]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '40px', background: 'rgba(148, 163, 184, 0.08)', borderRadius: '6px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '20px' }}>
          <div style={{ height: '450px', background: 'rgba(148, 163, 184, 0.05)', borderRadius: '10px' }} />
          <div style={{ height: '450px', background: 'rgba(148, 163, 184, 0.05)', borderRadius: '10px' }} />
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="hud-card" style={{ padding: '40px', textAlign: 'center', borderColor: 'var(--threat-hostile)' }}>
        <AlertTriangle size={36} color="var(--threat-hostile)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
          {error === 'Analysis record not found' ? 'ANALYSIS RECORD NOT FOUND (404)' : 'ERROR LOADING TELEMETRY'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '13px' }}>
          The requested reconnaissance scan ID could not be retrieved from tactical archives.
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/archives')}>
          <ArrowLeft size={14} />
          <span>RETURN TO MISSION ARCHIVES</span>
        </button>
      </div>
    );
  }

  const imageUrl = analysisApi.getImageUrl(analysis.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Strip */}
      <div
        className="hud-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/archives"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            title="Back to archives"
          >
            <ArrowLeft size={14} />
            <span>ARCHIVES</span>
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {analysis.fileName}
              </span>
              <StatusBadge status={analysis.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleCopyId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
                title="Copy full UUID"
              >
                <span>ID: {analysis.id}</span>
                {copied ? <Check size={11} color="var(--status-nominal)" /> : <Copy size={11} />}
              </button>
              <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>•</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(analysis.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportJSON}
            style={{ fontSize: '12px', padding: '6px 14px' }}
            title="Export raw JSON telemetry"
          >
            <Download size={14} />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

      {/* 2. Main Studio Canvas & Inspector Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(320px, 3fr)', gap: '20px' }}>
        {/* Left Column: Image Canvas & Detection Overlay */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="hud-card hud-card-bracket" style={{ padding: '16px' }}>
            <DetectionOverlay
              imageSrc={imageUrl}
              imageAlt={analysis.fileName}
              detections={analysis.detectedObjects || []}
              showBoxes={showBoxes}
              showLabels={showLabels}
              showConfidence={showConfidence}
              minConfidence={minConfidence}
              selectedTargetId={selectedTargetId}
              hoveredTargetId={hoveredTargetId}
              onSelectTarget={setSelectedTargetId}
              onHoverTarget={setHoveredTargetId}
              filterClasses={Array.from(enabledClasses)}
            />

            {/* Fixed Caption per BRD section 7.4 item 7 */}
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-muted)',
              }}
            >
              AI-GENERATED CANDIDATES. OPERATOR CONFIRMATION REQUIRED.
            </div>
          </div>

          {/* Summary Strip (under canvas) */}
          <div className="hud-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                TARGET SYMBOLOGY & THREAT BREAKDOWN
              </span>
              <span className="mono-data" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                TOTAL DETECTIONS: {summaryMetrics.total}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {/* Confidence Band: High >= 70% */}
              <div style={{ background: 'rgba(6, 9, 17, 0.6)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-muted)' }}>
                <div style={{ fontSize: '11px', color: 'var(--status-nominal)', fontWeight: 600 }}>HIGH CONFIDENCE (&ge;70%)</div>
                <div className="mono-data" style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                  {summaryMetrics.high}
                </div>
              </div>

              {/* Confidence Band: Medium 40-70% */}
              <div style={{ background: 'rgba(6, 9, 17, 0.6)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-muted)' }}>
                <div style={{ fontSize: '11px', color: 'var(--threat-unknown)', fontWeight: 600 }}>MEDIUM (40% - 70%)</div>
                <div className="mono-data" style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                  {summaryMetrics.medium}
                </div>
              </div>

              {/* Confidence Band: Low < 40% */}
              <div style={{ background: 'rgba(6, 9, 17, 0.6)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-muted)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>LOW CONFIDENCE (&lt;40%)</div>
                <div className="mono-data" style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                  {summaryMetrics.low}
                </div>
              </div>
            </div>

            {/* Per-class breakdown badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
              {Object.entries(summaryMetrics.classCounts).map(([cls, cnt]) => {
                const threat = getThreatForClass(cls);
                return (
                  <span
                    key={cls}
                    style={{
                      background: threat.bgColor,
                      border: `1px solid ${threat.borderColor}`,
                      color: threat.borderColor,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    {cls}: {cnt}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Inspector Controls & Candidates List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Inspector Panel */}
          <div className="hud-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600 }}>
                <Sliders size={16} color="var(--accent-blue)" />
                <span>INSPECTOR CONTROLS</span>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={12} />
                <span>Reset filters</span>
              </button>
            </div>

            {/* 1. Confidence Slider (0 to 100% in 5% steps) */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>CONFIDENCE THRESHOLD</span>
                <span className="mono-data" style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                  {Math.round(minConfidence * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                <span>0% (ALL)</span>
                <span>50%</span>
                <span>100% (STRICT)</span>
              </div>
            </div>

            {/* 2. Overlay Toggles */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                OVERLAY DISPLAY
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowBoxes(!showBoxes)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    background: showBoxes ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    border: showBoxes ? '1px solid var(--accent-blue)' : '1px solid var(--border-muted)',
                    color: showBoxes ? 'var(--accent-blue)' : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Layers size={13} />
                  <span>Boxes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLabels(!showLabels)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    background: showLabels ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    border: showLabels ? '1px solid var(--accent-blue)' : '1px solid var(--border-muted)',
                    color: showLabels ? 'var(--accent-blue)' : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Eye size={13} />
                  <span>Labels</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfidence(!showConfidence)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    background: showConfidence ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    border: showConfidence ? '1px solid var(--accent-blue)' : '1px solid var(--border-muted)',
                    color: showConfidence ? 'var(--accent-blue)' : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Percent size={13} />
                  <span>Conf %</span>
                </button>
              </div>
            </div>

            {/* 3. Class Filter Chips */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                CLASS FILTER CHIPS
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {allClasses.map((cls) => {
                  const isEnabled = enabledClasses.has(cls);
                  const threat = getThreatForClass(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        background: isEnabled ? threat.bgColor : 'rgba(15, 23, 42, 0.4)',
                        border: isEnabled ? `1px solid ${threat.borderColor}` : '1px solid var(--border-muted)',
                        color: isEnabled ? threat.borderColor : 'var(--text-dim)',
                        opacity: isEnabled ? 1 : 0.6,
                      }}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detections Target List (Interactive hover & select sync) */}
          <div className="hud-card" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>
              DETECTED TARGETS ({filteredDetections.length})
            </div>

            {filteredDetections.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                No candidate targets match current filter thresholds.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {filteredDetections.map((det, index) => {
                  const targetId = det.id ?? index;
                  const threat = getThreatForClass(det.className);
                  const isSelected = selectedTargetId === targetId;
                  const isHovered = hoveredTargetId === targetId;

                  return (
                    <div
                      key={targetId}
                      onClick={() => setSelectedTargetId(isSelected ? null : targetId)}
                      onMouseEnter={() => setHoveredTargetId(targetId)}
                      onMouseLeave={() => setHoveredTargetId(null)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: isSelected || isHovered ? threat.bgColor : 'rgba(6, 9, 17, 0.6)',
                        border: isSelected
                          ? `1px solid ${threat.borderColor}`
                          : isHovered
                          ? '1px solid var(--accent-blue)'
                          : '1px solid var(--border-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: threat.shape === 'diamond' ? '0' : '2px',
                            transform: threat.shape === 'diamond' ? 'rotate(45deg)' : 'none',
                            background: threat.borderColor,
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {det.className}
                          </div>
                          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                            BOX: [{det.boxXMin.toFixed(2)}, {det.boxYMin.toFixed(2)}] - [{det.boxXMax.toFixed(2)}, {det.boxYMax.toFixed(2)}]
                          </div>
                        </div>
                      </div>

                      <div className="mono-data" style={{ fontWeight: 700, fontSize: '12px', color: threat.borderColor }}>
                        {Math.round(det.confidence * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Metadata Panel */}
          <div className="hud-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>
              INFERENCE TELEMETRY METADATA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>MODEL VERSION:</span>
                <span style={{ color: 'var(--text-primary)' }}>{analysis.modelVersion || '--'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>LATENCY:</span>
                <span style={{ color: 'var(--accent-blue)' }}>
                  {analysis.processingTimeMs ? `${analysis.processingTimeMs} ms` : '--'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>FILE TYPE:</span>
                <span style={{ color: 'var(--text-primary)' }}>{analysis.fileType || 'image/jpeg'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>FILE SIZE:</span>
                <span style={{ color: 'var(--text-primary)' }}>{(analysis.fileSize / 1024).toFixed(1)} KB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>STORAGE PATH:</span>
                <span style={{ color: 'var(--text-muted)' }} title={analysis.storagePath}>
                  {analysis.storagePath ? analysis.storagePath.substring(0, 24) + '...' : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
