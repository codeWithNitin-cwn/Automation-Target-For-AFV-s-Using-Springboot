import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { analysisApi } from '../services/api';
import { AnalysisRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  UploadCloud,
  FileImage,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Check,
} from 'lucide-react';

type StepStage = 'ACCEPTED' | 'RUNNING' | 'SAVED' | 'COMPLETE' | 'FAILED';

export const ScoutIngestion: React.FC = () => {
  const { user } = useAuth();
  const { isConnected, subscribeToAnalysis } = useWebSocket();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeFormatted: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Model & target parameters
  const [modelVersion, setModelVersion] = useState('yolov8n-afv-v1.0');
  const storageTarget = 'MINIO-S3 // BUCKET: afv-imagery';

  // Analysis execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<StepStage | null>(null);
  const [completedRecord, setCompletedRecord] = useState<AnalysisRecord | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Recent uploads strip (stored locally in state or memory)
  const [recentUploads, setRecentUploads] = useState<{ id: string; name: string; url: string; record?: AnalysisRecord }[]>([]);

  // Permissions check (Operators & Admins only)
  const canDispatch =
    user?.roles?.some((r) => r.includes('OPERATOR') || r.includes('ADMIN')) ?? true;

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle file selection & validation
  const handleFileSelect = (file: File) => {
    setFileError(null);
    setExecutionError(null);
    setCompletedRecord(null);
    setCurrentStage(null);

    // Validate size (15 MB max)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError(`File size exceeds 15 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
      return;
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError('Invalid format. Drop zone accepts JPEG, PNG, or WEBP only.');
      return;
    }

    // Revoke previous URL if any
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);

    // Calculate image dimensions
    const img = new Image();
    img.onload = () => {
      setImageMeta({
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
      });
    };
    img.src = objectUrl;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleReplace = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setImageMeta(null);
    setFileError(null);
    setCurrentStage(null);
    setCompletedRecord(null);
  };

  // Dispatch upload & subscribe to STOMP or fallback to polling
  const handleDispatch = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    setExecutionError(null);
    setCurrentStage('ACCEPTED');

    try {
      const initialResponse = await analysisApi.upload(selectedFile, modelVersion);
      const id = initialResponse.id;
      setActiveAnalysisId(id);

      // Add to recent uploads strip
      if (previewUrl) {
        setRecentUploads((prev) => [
          { id, name: selectedFile.name, url: previewUrl, record: initialResponse },
          ...prev.slice(0, 4),
        ]);
      }

      // If STOMP is connected, subscribe to updates
      if (isConnected) {
        subscribeToAnalysis(id, (update) => {
          if (update.status === 'RUNNING') {
            setCurrentStage('RUNNING');
          } else if (update.status === 'COMPLETED') {
            setCurrentStage('COMPLETE');
            setCompletedRecord(update);
            setIsSubmitting(false);
          } else if (update.status === 'FAILED') {
            setCurrentStage('FAILED');
            setExecutionError('Model inference failed during asset recognition.');
            setIsSubmitting(false);
          }
        });
      } else {
        // Fallback polling every 1.5s for up to 45s per BRD section 7.3
        let pollCount = 0;
        const maxPolls = 30; // 30 * 1.5s = 45s
        const intervalId = setInterval(async () => {
          pollCount++;
          try {
            const polled = await analysisApi.getById(id);
            if (polled.status === 'RUNNING') {
              setCurrentStage('RUNNING');
            } else if (polled.status === 'COMPLETED') {
              clearInterval(intervalId);
              setCurrentStage('COMPLETE');
              setCompletedRecord(polled);
              setIsSubmitting(false);
            } else if (polled.status === 'FAILED') {
              clearInterval(intervalId);
              setCurrentStage('FAILED');
              setExecutionError('Analysis failed during processing.');
              setIsSubmitting(false);
            }
          } catch {
            // ignore temporary poll blips
          }

          if (pollCount >= maxPolls) {
            clearInterval(intervalId);
            setIsSubmitting(false);
            setExecutionError('Still processing, check Mission Archives.');
          }
        }, 1500);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setCurrentStage('FAILED');
      setExecutionError(err?.response?.data?.message || 'Failed to dispatch analysis to ingestion pipeline');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.5rem', letterSpacing: '0.08em' }}>SCOUT INGESTION STUDIO</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          INGEST HIGH-RESOLUTION AERIAL & TACTICAL SENSOR IMAGERY FOR AFV DETECTION
        </p>
      </div>

      {/* Main Studio Card */}
      <div className="hud-card hud-card-bracket" style={{ padding: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          {/* Left Column: Dropzone & Preview */}
          <div>
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'rgba(6, 9, 17, 0.6)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '260px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                  }}
                >
                  <UploadCloud size={28} color="var(--accent-blue)" />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  DRAG & DROP SENSOR IMAGERY
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Supports JPEG, PNG, WEBP (Max 15 MB)
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '16px', fontSize: '11px', padding: '6px 14px' }}
                >
                  BROWSE LOCAL DISK
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    position: 'relative',
                    height: '240px',
                    background: '#04060c',
                    border: '1px solid var(--border-muted)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Reconnaissance preview"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>

                {/* File Metadata in Monospace */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    background: 'rgba(6, 9, 17, 0.7)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-muted)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>FILE: </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedFile.name}</span>
                    {imageMeta && (
                      <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>
                        [{imageMeta.width}x{imageMeta.height} px • {imageMeta.sizeFormatted}]
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleReplace}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textDecoration: 'underline',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Replace
                  </button>
                </div>
              </div>
            )}

            {fileError && (
              <div
                style={{
                  marginTop: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--threat-hostile)',
                }}
              >
                <AlertTriangle size={15} />
                <span>{fileError}</span>
              </div>
            )}
          </div>

          {/* Right Column: Parameters, Target, and Dispatch */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  <Cpu size={14} color="var(--accent-blue)" />
                  AI MODEL ENGINE
                </label>
                <select
                  className="hud-input"
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="yolov8n-afv-v1.0">Ultralytics YOLOv8n (AFV Target Detection v1.0)</option>
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  Active architecture: Deep PyTorch YOLOv8n tensor engine
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  <HardDrive size={14} color="var(--status-nominal)" />
                  STORAGE DISPATCH TARGET (READ-ONLY)
                </label>
                <input
                  type="text"
                  className="hud-input"
                  readOnly
                  value={storageTarget}
                  style={{ background: 'rgba(6, 9, 17, 0.5)', color: 'var(--text-muted)' }}
                />
              </div>
            </div>

            {/* Dispatch Button or Read-Only Notice */}
            <div style={{ marginTop: '24px' }}>
              {!canDispatch ? (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--threat-unknown)',
                  }}
                >
                  Viewer Clearance: Imagery dispatch is restricted to Operators and Administrators.
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDispatch}
                  disabled={!selectedFile || isSubmitting}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      DISPATCHING TO INFERENCE PIPELINE...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      DISPATCH FOR TARGET SCAN
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4-Stage Progress Stepper per BRD Section 7.3 */}
        {currentStage && (
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-muted)' }}>
            <div className="stepper-container">
              {/* Stage 1: Accepted */}
              <div
                className={`stepper-stage ${
                  currentStage === 'ACCEPTED' ? 'active' : currentStage !== 'FAILED' ? 'complete' : ''
                }`}
              >
                <div className="stepper-stage-circle">
                  {currentStage === 'ACCEPTED' ? '1' : <Check size={14} />}
                </div>
                <span>Accepted</span>
              </div>

              {/* Stage 2: Running */}
              <div
                className={`stepper-stage ${
                  currentStage === 'RUNNING'
                    ? 'active'
                    : currentStage === 'COMPLETE' || currentStage === 'SAVED'
                    ? 'complete'
                    : ''
                }`}
              >
                <div className="stepper-stage-circle">
                  {currentStage === 'COMPLETE' || currentStage === 'SAVED' ? <Check size={14} /> : '2'}
                </div>
                <span>Running</span>
              </div>

              {/* Stage 3: Detection saved */}
              <div
                className={`stepper-stage ${
                  currentStage === 'SAVED' ? 'active' : currentStage === 'COMPLETE' ? 'complete' : ''
                }`}
              >
                <div className="stepper-stage-circle">
                  {currentStage === 'COMPLETE' ? <Check size={14} /> : '3'}
                </div>
                <span>Detection Saved</span>
              </div>

              {/* Stage 4: Complete */}
              <div
                className={`stepper-stage ${
                  currentStage === 'COMPLETE' ? 'complete' : currentStage === 'FAILED' ? 'failed' : ''
                }`}
              >
                <div className="stepper-stage-circle">
                  {currentStage === 'COMPLETE' ? <CheckCircle2 size={16} /> : currentStage === 'FAILED' ? '!' : '4'}
                </div>
                <span>{currentStage === 'FAILED' ? 'Failed' : 'Complete'}</span>
              </div>
            </div>

            {/* Error panel with retry button */}
            {executionError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={18} color="var(--threat-hostile)" />
                  <span style={{ fontSize: '13px', color: 'var(--threat-hostile)' }}>{executionError}</span>
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleDispatch}>
                  Retry Scan
                </button>
              </div>
            )}

            {/* Completion View inline with "Open full view" button */}
            {completedRecord && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  padding: '16px 20px',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle2 size={24} color="var(--status-nominal)" />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      Inference Finished: {completedRecord.detectedObjects?.length || 0} Targets Identified
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      PROCESSING LATENCY: {completedRecord.processingTimeMs} ms
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate(`/analyses/${completedRecord.id}`)}
                >
                  <span>OPEN FULL VIEW</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Uploads Strip below the studio */}
      {recentUploads.length > 0 && (
        <div className="hud-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '12px' }}>
            RECENT INGESTIONS (SESSION STRIP)
          </div>
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
            {recentUploads.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/analyses/${item.id}`)}
                style={{
                  width: '170px',
                  flexShrink: 0,
                  background: 'rgba(6, 9, 17, 0.6)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    height: '90px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#04060c',
                    marginBottom: '8px',
                  }}
                >
                  <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={item.record?.status || 'COMPLETED'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
