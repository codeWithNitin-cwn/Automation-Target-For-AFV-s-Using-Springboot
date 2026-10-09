import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Activity, 
  UploadCloud, 
  History as HistoryIcon, 
  Server, 
  Cpu, 
  Database, 
  LogOut,
  UserCheck,
  Radio,
  Bell
} from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { History } from './pages/History';
import { Login } from './pages/Login';
import { UserProfile, AnalysisRecord } from './types';
import { useWebSocket } from './hooks/useWebSocket';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'history' | 'login'>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);

  const handleGlobalUpdate = useCallback((update: AnalysisRecord) => {
    if (update.status === 'COMPLETED') {
      const targetCount = update.detectedObjects?.length || 0;
      setLiveAlert(`LIVE RECON PUSH: Scan #${update.id.substring(0, 8)} completed with ${targetCount} confirmed target(s) [${update.processingTimeMs || 0}ms]`);
      setTimeout(() => setLiveAlert(null), 7000);
    }
  }, []);

  const { isConnected: wsConnected } = useWebSocket({
    onAnalysisUpdate: handleGlobalUpdate,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setActiveTab('login');
  };

  const handleScanComplete = (record: AnalysisRecord) => {
    // Optionally switch to history or stay on upload to inspect targets
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* =========================================================================
          TOP TELEMETRY & SYSTEM STATUS TICKER
         ========================================================================= */}
      <div 
        id="telemetry-bar"
        style={{
          height: '32px',
          backgroundColor: 'rgba(6, 9, 17, 0.95)',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="radar-blip"></span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>SYS-READY // DEFCON-4</span>
          </div>
          <span>GRID: 28.6139° N, 77.2090° E</span>
          <span style={{ color: 'var(--text-dim)' }}>|</span>
          <span>PROTOCOL: SPRING-3.3-REACTIVE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={13} color={wsConnected ? 'var(--accent-emerald)' : 'var(--text-dim)'} />
            <span>STOMP WS: <strong style={{ color: wsConnected ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{wsConnected ? 'LIVE PUSH' : 'STANDBY'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={13} color="var(--accent-cyan)" />
            <span>SPRING BOOT: <strong style={{ color: 'var(--text-secondary)' }}>ONLINE (8080)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={13} color="var(--accent-cyan)" />
            <span>YOLOv8 ENGINE: <strong style={{ color: 'var(--text-secondary)' }}>READY (8000)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} color="var(--accent-cyan)" />
            <span>MINIO S3: <strong style={{ color: 'var(--text-secondary)' }}>CONNECTED</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN NAVIGATION HEADER
         ========================================================================= */}
      <header 
        id="main-nav-header"
        style={{
          height: 'var(--nav-height)',
          backgroundColor: 'rgba(10, 15, 29, 0.85)',
          backdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--border-cyan)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        {/* Unit & Project Branding */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
          onClick={() => setActiveTab('dashboard')}
        >
          <div 
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.2))',
              border: '1px solid var(--border-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-cyan)'
            }}
          >
            <Shield size={24} color="var(--accent-cyan)" />
          </div>
          <div>
            <div className="hud-title" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AFV TARGET INTELLIGENCE
              <span className="badge badge-running" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>v1.0-PROD</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              AUTOMATED THREAT RECOGNITION PLATFORM
            </div>
          </div>
        </div>

        {/* Tactical Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}
          >
            <Activity size={16} />
            Command Center
          </button>

          <button
            id="nav-tab-upload"
            onClick={() => setActiveTab('upload')}
            className={activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}
          >
            <UploadCloud size={16} />
            Scout Ingestion
          </button>

          <button
            id="nav-tab-history"
            onClick={() => setActiveTab('history')}
            className={activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}
          >
            <HistoryIcon size={16} />
            Mission Archives
          </button>
        </nav>

        {/* Operator Profile Credentials or Login Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser ? (
            <div 
              id="operator-profile-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-muted)'
              }}
            >
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {currentUser.username.toUpperCase()}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                  {currentUser.roles?.[0] || 'ROLE_OPERATOR'}
                </div>
              </div>

              <button
                id="btn-logout"
                title="Log Out Session"
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  marginLeft: '4px'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-login"
              onClick={() => setActiveTab('login')}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <UserCheck size={16} />
              Authenticate
            </button>
          )}
        </div>
      </header>

      {/* Live STOMP Notification Banner */}
      {liveAlert && (
        <div 
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderBottom: '1px solid var(--accent-emerald)',
            color: 'var(--accent-emerald)',
            padding: '10px 24px',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <Bell size={16} />
          <span>{liveAlert}</span>
        </div>
      )}

      {/* =========================================================================
          MAIN APPLICATION VIEW CONTAINER
         ========================================================================= */}
      <main className="hud-container" style={{ flex: 1, paddingBottom: '40px' }}>
        {activeTab === 'login' && (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            onNavigateUpload={() => setActiveTab('upload')} 
            onNavigateHistory={() => setActiveTab('history')} 
          />
        )}

        {activeTab === 'upload' && (
          <Upload onScanComplete={handleScanComplete} />
        )}

        {activeTab === 'history' && (
          <History />
        )}
      </main>

      {/* =========================================================================
          FOOTER CLASSIFICATION BANNER
         ========================================================================= */}
      <footer 
        style={{
          borderTop: '1px solid var(--border-muted)',
          padding: '16px 28px',
          backgroundColor: 'var(--bg-deep)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <div>RESTRICTED // ARMORED FIGHTING VEHICLE EMBEDDED CVIS SYSTEM</div>
        <div>SPRING BOOT 3.3.2 &bull; FASTAPI 0.111.0 &bull; POSTGRESQL 16 &bull; MINIO S3</div>
      </footer>
    </div>
  );
};

export default App;
