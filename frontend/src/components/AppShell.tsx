import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useToast } from '../context/ToastContext';
import { systemApi } from '../services/api';
import { SystemHealthResponse, AnalysisRecord } from '../types';
import {
  Crosshair,
  Radar,
  UploadCloud,
  Database,
  LogOut,
  Radio,
  Server,
  Cpu,
  Shield,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, subscribeToAllAnalyses } = useWebSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [health, setHealth] = useState<SystemHealthResponse | null>(null);

  // Poll system health every 15 seconds to display real telemetry
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const data = await systemApi.getHealth();
        if (isMounted) setHealth(data);
      } catch {
        if (isMounted) {
          setHealth(null);
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Listen to STOMP live analyses to show the 7-second banner when scan completes
  useEffect(() => {
    const unsubscribe = subscribeToAllAnalyses((record: AnalysisRecord) => {
      if (record.status === 'COMPLETED') {
        const targetCount = record.detectedObjects?.length || 0;
        addToast({
          type: 'success',
          title: `Scan Completed: ${record.fileName}`,
          message: `Identified ${targetCount} candidate targets with YOLOv8`,
          analysisId: record.id,
          duration: 7000,
        });
      } else if (record.status === 'FAILED') {
        addToast({
          type: 'error',
          title: `Scan Failed: ${record.fileName}`,
          message: 'Inference pipeline encountered an error',
          analysisId: record.id,
          duration: 7000,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribeToAllAnalyses, addToast]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const operatorInitials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : 'OP';
  const primaryRole =
    user?.roles && user.roles.length > 0
      ? user.roles[0].replace('ROLE_', '')
      : 'OPERATOR';

  const backendOk = health?.components?.backend?.status === 'UP';
  const aiOk = health?.components?.aiService?.status === 'UP';

  return (
    <div className="app-shell">
      {/* 1. Real Telemetry Top Ticker */}
      <div className="top-telemetry-ticker">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="ticker-item">
            <Radio
              size={12}
              color={isConnected ? 'var(--status-nominal)' : 'var(--threat-unknown)'}
            />
            <span>
              FEED:{' '}
              <strong style={{ color: isConnected ? 'var(--status-nominal)' : 'var(--threat-unknown)' }}>
                {isConnected ? 'LIVE PUSH' : 'STANDBY'}
              </strong>
            </span>
          </div>

          <div className="ticker-item">
            <Server
              size={12}
              color={backendOk ? 'var(--status-nominal)' : 'var(--threat-hostile)'}
            />
            <span>
              BACKEND:{' '}
              <strong style={{ color: backendOk ? 'var(--status-nominal)' : 'var(--threat-hostile)' }}>
                {backendOk ? 'ONLINE (8080)' : 'UNREACHABLE'}
              </strong>
            </span>
          </div>

          <div className="ticker-item">
            <Cpu
              size={12}
              color={aiOk ? 'var(--status-nominal)' : 'var(--threat-hostile)'}
            />
            <span>
              AI CORE:{' '}
              <strong style={{ color: aiOk ? 'var(--status-nominal)' : 'var(--threat-hostile)' }}>
                {aiOk ? 'YOLOv8 ACTIVE' : 'OFFLINE'}
              </strong>
            </span>
          </div>
        </div>

        <div className="ticker-item" style={{ color: 'var(--text-dim)' }}>
          <span>STANAG 4609 / NATO APP-6 TELEMETRY STREAM</span>
        </div>
      </div>

      {/* 2. Tactical Nav Header */}
      <header className="nav-header">
        <NavLink to="/" className="brand-section">
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Crosshair size={20} color="var(--accent-blue)" />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '0.08em',
                lineHeight: 1.1,
              }}
            >
              AFV TARGET DETECT
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-dim)',
                letterSpacing: '0.06em',
              }}
            >
              TACTICAL COMMAND PLATFORM
            </div>
          </div>
        </NavLink>

        <nav className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Radar size={16} />
            <span>Command Center</span>
          </NavLink>
          <NavLink
            to="/ingest"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <UploadCloud size={16} />
            <span>Scout Ingestion</span>
          </NavLink>
          <NavLink
            to="/archives"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Database size={16} />
            <span>Mission Archives</span>
          </NavLink>
        </nav>

        <div className="operator-badge">
          <div className="operator-avatar" title={`User ID: ${user?.id || 'N/A'}`}>
            {operatorInitials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              {user?.username || 'Operator'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--accent-blue)',
                letterSpacing: '0.04em',
              }}
            >
              {primaryRole}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLogout}
            style={{ padding: '6px 10px', marginLeft: '6px' }}
            title="Sign out of console"
            aria-label="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* 3. Main Content Container */}
      <main className="app-content">
        <Outlet />
      </main>

      {/* 4. Footer Classification Banner */}
      <footer className="footer-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={13} color="#f59e0b" />
          <span className="classification-text">
            NATO UNCLASSIFIED // SIMULATION COMMAND HUD
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>LATENCY BUDGET: &lt;100ms</span>
          <span>BUILD: v2.4.0-DEV (STOMP/WS ACTIVE)</span>
        </div>
      </footer>
    </div>
  );
};
