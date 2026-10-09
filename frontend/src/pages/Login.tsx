import React, { useState } from 'react';
import { Shield, Lock, User, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';
import { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        await authApi.register({
          username,
          email,
          password,
          roles: ['OPERATOR']
        });
        setSuccessMessage('Registration successful! Please login with your credentials.');
        setIsRegister(false);
        setPassword('');
      } else {
        const response = await authApi.login({
          usernameOrEmail: username,
          password: password,
        });

        localStorage.setItem('token', response.token);
        const profile: UserProfile = {
          username: response.username,
          email: response.email,
          roles: response.roles,
        };
        localStorage.setItem('user', JSON.stringify(profile));
        onLoginSuccess(profile);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Authentication failure. Check backend connection.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsername('commander_nitin');
    setPassword('Operator@123');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 180px)', padding: '20px' }}>
      <div 
        className="hud-card hud-card-bracket" 
        style={{ width: '100%', maxWidth: '440px', padding: '36px' }}
      >
        {/* Terminal Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div 
            style={{
              width: '54px',
              height: '54px',
              margin: '0 auto 16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(16, 185, 129, 0.25))',
              border: '1px solid var(--border-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-cyan)'
            }}
          >
            <Shield size={30} color="var(--accent-cyan)" />
          </div>
          <h2 className="hud-title" style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>
            SECURITY CLEARANCE
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            RESTRICTED ACCESS // LEVEL 4 TACTICAL
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: 'rgba(6, 9, 17, 0.6)', padding: '4px', borderRadius: '8px' }}>
          <button
            id="tab-toggle-login"
            type="button"
            onClick={() => { setIsRegister(false); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: !isRegister ? 'var(--accent-cyan)' : 'transparent',
              color: !isRegister ? '#040d1a' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            OPERATOR LOGIN
          </button>
          <button
            id="tab-toggle-register"
            type="button"
            onClick={() => { setIsRegister(true); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: isRegister ? 'var(--accent-cyan)' : 'transparent',
              color: isRegister ? '#040d1a' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            NEW REGISTRATION
          </button>
        </div>

        {/* Alert Notifications */}
        {errorMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--border-danger)', color: 'var(--accent-crimson)', fontSize: '0.8rem', marginBottom: '20px' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--border-emerald)', color: 'var(--accent-emerald)', fontSize: '0.8rem', marginBottom: '20px' }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
              IDENTIFIER (USERNAME OR CALLSIGN)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-auth-username"
                type="text"
                className="hud-input"
                placeholder="e.g. operator_alpha"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                TACTICAL COMM-LINK (EMAIL)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-auth-email"
                  type="email"
                  className="hud-input"
                  placeholder="operator@defense.afv.net"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
              SECURITY PASSPHRASE
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-auth-password"
                type="password"
                className="hud-input"
                placeholder="••••••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
          >
            {loading ? 'AUTHENTICATING...' : isRegister ? 'REGISTER OPERATOR' : 'AUTHORIZE SESSION'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Fast-Fill Helper */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-muted)', textAlign: 'center' }}>
          <button
            id="btn-demo-creds"
            type="button"
            onClick={handleDemoFill}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-cyan)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Quick Fill Demo Credentials
          </button>
        </div>
      </div>
    </div>
  );
};
