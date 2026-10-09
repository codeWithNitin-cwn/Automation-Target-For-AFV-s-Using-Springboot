import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Crosshair, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  FileText,
  RotateCcw,
  Radio
} from 'lucide-react';
import { analysisApi } from '../services/api';
import { AnalysisRecord } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

interface UploadProps {
  onScanComplete?: (record: AnalysisRecord) => void;
}

export const Upload: React.FC<UploadProps> = ({ onScanComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelVersion, setModelVersion] = useState('yolov8n-afv-v1.0');
  const [loading, setLoading] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const { isConnected: wsConnected, subscribeToAnalysis } = useWebSocket();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setActiveAnalysis(null);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setActiveAnalysis(null);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const intervalRef = useRef<any>(null);
  const completedRef = useRef<boolean>(false);

  const pollAnalysis = async (id: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    completedRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      attempts++;
      if (completedRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      try {
        const record = await analysisApi.getById(id);

        if (record.status === 'COMPLETED' || record.status === 'FAILED') {
          completedRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          setLoading(false);
          setActiveAnalysis(record);
          if (record.status === 'COMPLETED' && onScanComplete) {
            onScanComplete(record);
          }
        } else {
          setPollingStatus(`AI INFERENCE IN PROGRESS: ${record.status} (Pass ${attempts})`);
        }
      } catch (err) {
        // Continue trying unless attempts exhausted
      }

      if (attempts >= maxAttempts && !completedRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setLoading(false);
        setErrorMessage('Inference polling timed out. Please check Mission Archives for results.');
      }
    }, 1500);
  };

  const handleDispatch = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setErrorMessage(null);
    completedRef.current = false;
    setPollingStatus('DISPATCHING TO PIPELINE (HTTP 202 ACCEPTED)...');

    try {
      const initialResponse = await analysisApi.upload(selectedFile, modelVersion);
      setPollingStatus(`ACCEPTED // SCANNING (ID: ${initialResponse.id.substring(0, 8)})...`);

      // 1. Subscribe to STOMP WebSocket for instant push
      if (wsConnected) {
        const unsubscribe = subscribeToAnalysis(initialResponse.id, (update) => {
          if (update.status === 'COMPLETED' || update.status === 'FAILED') {
            completedRef.current = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
            setLoading(false);
            setActiveAnalysis(update);
            if (update.status === 'COMPLETED' && onScanComplete) {
              onScanComplete(update);
            }
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
            }
          }
        });
        unsubscribeRef.current = unsubscribe;
      }

      // 2. Resilient fallback polling
      await pollAnalysis(initialResponse.id);
    } catch (err: any) {
      setLoading(false);
      const msg = err.response?.data?.message || 'Upload failed. Ensure backend & MinIO are running.';
      setErrorMessage(msg);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setActiveAnalysis(null);
    setErrorMessage(null);
    setPollingStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h2 className="hud-title" style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>
          Tactical Recon Ingestion Studio
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
          Upload optical/thermal imagery to the Spring Boot &amp; YOLOv8 AI pipeline
        </p>
      </div>

      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--border-danger)', color: 'var(--accent-crimson)', fontSize: '0.85rem' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Studio Card */}
      <div className="hud-card hud-card-bracket" style={{ padding: '32px' }}>
        
        {/* If no analysis completed yet: Upload Zone */}
        {!activeAnalysis && (
          <>
            <div
              id="upload-dropzone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: selectedFile ? '2px solid var(--accent-emerald)' : '2px dashed var(--border-cyan)',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: 'rgba(6, 182, 212, 0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                      maxHeight: '260px',
                      maxWidth: '100%',
                      borderRadius: '8px',
                      border: '1px solid var(--border-cyan)',
                      objectFit: 'contain'
                    }}
                  />
                  <div style={{ marginTop: '14px', fontSize: '0.9rem', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                    TARGET FILE LOADED: {selectedFile?.name} ({(selectedFile?.size! / 1024).toFixed(1)} KB)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Click or drop another file to replace
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud size={52} color="var(--accent-cyan)" style={{ margin: '0 auto 16px' }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Drag and drop tactical reconnaissance image here
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Supports High-Res JPEG, PNG, WEBP &bull; Max 15MB
                  </div>
                  <button 
                    id="btn-trigger-browse"
                    type="button" 
                    className="btn-secondary" 
                    style={{ marginTop: '18px' }}
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Select File
                  </button>
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                  DETECTION MODEL REGISTRY
                </label>
                <select 
                  id="select-model-version"
                  className="hud-input" 
                  value={modelVersion} 
                  onChange={(e) => setModelVersion(e.target.value)}
                >
                  <option value="yolov8n-afv-v1.0">yolov8n-afv-v1.0 (Armored Assets: Tanks, APCs, Artillery)</option>
                  <option value="yolov8s-afv-v1.1">yolov8s-afv-v1.1 (High Precision Recon)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                  STORAGE VAULT TARGET
                </label>
                <div className="hud-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <FileText size={16} color="var(--accent-cyan)" />
                  <span>MinIO Bucket: afv-scouting-media</span>
                </div>
              </div>
            </div>

            {/* Dispatch Action */}
            <div style={{ marginTop: '28px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '8px', border: '1px solid var(--border-cyan)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                    <Loader2 size={20} className="animate-spin" />
                    <span>{pollingStatus}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Asynchronous Spring Boot Worker communicating with FastAPI YOLOv8 Microservice
                  </div>
                </div>
              ) : (
                <button
                  id="btn-dispatch-upload"
                  type="button"
                  disabled={!selectedFile}
                  onClick={handleDispatch}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', opacity: selectedFile ? 1 : 0.5 }}
                >
                  <Crosshair size={18} />
                  Dispatch Analysis to Asynchronous Pipeline
                </button>
              )}
            </div>
          </>
        )}

        {/* Once analysis is complete: Tactical Target Inspection View */}
        {activeAnalysis && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-completed">
                  <CheckCircle2 size={12} /> SCAN COMPLETED
                </span>
                <span className="mono-telemetry" style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ID: {activeAnalysis.id} &bull; LATENCY: {activeAnalysis.processingTimeMs}ms
                </span>
              </div>
              <button 
                id="btn-scan-another"
                onClick={handleReset} 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <RotateCcw size={14} /> Scan Another File
              </button>
            </div>

            {/* Image Canvas with Overlay Bounding Boxes */}
            <div 
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--border-cyan)',
                backgroundColor: '#05070e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '360px'
              }}
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Scanned Target"
                  style={{ maxWidth: '100%', maxHeight: '480px', display: 'block', objectFit: 'contain' }}
                />
              )}

              {/* Draw Bounding Boxes */}
              {activeAnalysis.detectedObjects?.map((target, idx) => {
                const isHighThreat = target.className.toLowerCase().includes('tank');
                const borderColor = isHighThreat ? 'var(--accent-crimson)' : 'var(--accent-amber)';
                const bgColor = isHighThreat ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';

                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      top: `${target.boxYMin * 100}%`,
                      left: `${target.boxXMin * 100}%`,
                      width: `${(target.boxXMax - target.boxXMin) * 100}%`,
                      height: `${(target.boxYMax - target.boxYMin) * 100}%`,
                      border: `2px solid ${borderColor}`,
                      backgroundColor: bgColor,
                      pointerEvents: 'none'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '-22px',
                        left: 0,
                        backgroundColor: borderColor,
                        color: isHighThreat ? '#fff' : '#000',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {target.className.toUpperCase()} [{(target.confidence * 100).toFixed(1)}%]
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detected Targets Breakdown List */}
            <div style={{ marginTop: '24px' }}>
              <h4 className="hud-title" style={{ fontSize: '1rem', marginBottom: '12px' }}>
                Confirmed Threat Identifications ({activeAnalysis.detectedObjects?.length || 0})
              </h4>

              {(!activeAnalysis.detectedObjects || activeAnalysis.detectedObjects.length === 0) ? (
                <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--border-emerald)', color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
                  No hostile armored vehicles detected in this sortie sector.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  {activeAnalysis.detectedObjects.map((target, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--border-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <ShieldAlert size={24} color={target.className.toLowerCase().includes('tank') ? 'var(--accent-crimson)' : 'var(--accent-amber)'} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {target.className}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          CONFIDENCE: {(target.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
