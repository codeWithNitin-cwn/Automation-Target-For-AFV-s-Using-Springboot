import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, register, sessionExpired, clearSessionExpiredNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Validation & error states
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const redirectPath = (location.state as any)?.from?.pathname || '/';

  const validateLogin = (): boolean => {
    const errors: Record<string, string> = {};
    if (!usernameOrEmail.trim()) {
      errors.usernameOrEmail = 'Username or email is required';
    } else if (usernameOrEmail.trim().length < 3) {
      errors.usernameOrEmail = 'Must be at least 3 characters';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setInlineErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRegister = (): boolean => {
    const errors: Record<string, string> = {};
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.trim().length < 3 || username.trim().length > 50) {
      errors.username = 'Username must be between 3 and 50 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim()) || email.length > 100) {
      errors.email = 'Please provide a valid email (up to 100 characters)';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6 || password.length > 100) {
      errors.password = 'Password must be between 6 and 100 characters';
    }

    setInlineErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopError(null);
    clearSessionExpiredNotice();

    if (!validateLogin()) return;

    setIsSubmitting(true);
    try {
      await login({ usernameOrEmail: usernameOrEmail.trim(), password });
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 401) {
        setTopError('Invalid username or password');
      } else if (err.response?.data?.message) {
        setTopError(err.response.data.message);
      } else if (!err.response) {
        setTopError('Cannot reach server');
      } else {
        setTopError('Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopError(null);
    setSuccessMessage(null);

    if (!validateRegister()) return;

    setIsSubmitting(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setSuccessMessage('Registration successful! Operator credentials initialized.');
      setActiveTab('login');
      setUsernameOrEmail(username.trim());
      setPassword('');
      setUsername('');
      setEmail('');
      setInlineErrors({});
    } catch (err: any) {
      if (err.response?.data?.message) {
        setTopError(err.response.data.message);
      } else if (!err.response) {
        setTopError('Cannot reach server');
      } else {
        setTopError('Registration rejected by server.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (u: string, p: string) => {
    setUsernameOrEmail(u);
    setPassword(p);
    setInlineErrors({});
    setTopError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}
    >
      <div
        className="hud-card hud-card-bracket"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px 28px',
          zIndex: 10,
        }}
      >
        {/* Header with Shield Mark */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 12px auto',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={28} color="var(--accent-blue)" />
          </div>
          <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.1em' }}>
            SECURITY CLEARANCE
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '4px',
              letterSpacing: '0.04em',
            }}
          >
            AFV AUTOMATED TARGET DETECTION PLATFORM
          </p>
        </div>

        {/* Session Expired Notice */}
        {sessionExpired && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--threat-unknown)',
            }}
          >
            <AlertCircle size={16} />
            <span>Session expired. Please log in again to continue.</span>
          </div>
        )}

        {/* Top Error Notice */}
        {topError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--threat-hostile)',
            }}
          >
            <AlertCircle size={16} />
            <span>{topError}</span>
          </div>
        )}

        {/* Success Confirmation Notice */}
        {successMessage && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--status-nominal)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-muted)',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setInlineErrors({});
              setTopError(null);
            }}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'login' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === 'login' ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Operator Login
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setInlineErrors({});
              setTopError(null);
            }}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'register' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === 'register' ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            New Registration
          </button>
        </div>

        {/* Tab 1: Operator Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} noValidate>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="login-ident"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.04em',
                }}
              >
                CALLSIGN / USERNAME OR EMAIL
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-ident"
                  type="text"
                  className="hud-input"
                  style={{
                    paddingLeft: '36px',
                    borderColor: inlineErrors.usernameOrEmail ? 'var(--threat-hostile)' : undefined,
                  }}
                  placeholder="e.g. operator_nitin"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
                <User
                  size={16}
                  color="var(--text-dim)"
                  style={{ position: 'absolute', left: '12px', top: '10px' }}
                />
              </div>
              {inlineErrors.usernameOrEmail && (
                <div style={{ fontSize: '11px', color: 'var(--threat-hostile)', marginTop: '4px' }}>
                  {inlineErrors.usernameOrEmail}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label
                htmlFor="login-pwd"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.04em',
                }}
              >
                SECURITY PASSPHRASE
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-pwd"
                  type={showPassword ? 'text' : 'password'}
                  className="hud-input"
                  style={{
                    paddingLeft: '36px',
                    paddingRight: '36px',
                    borderColor: inlineErrors.password ? 'var(--threat-hostile)' : undefined,
                  }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <Lock
                  size={16}
                  color="var(--text-dim)"
                  style={{ position: 'absolute', left: '12px', top: '10px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {inlineErrors.password && (
                <div style={{ fontSize: '11px', color: 'var(--threat-hostile)', marginTop: '4px' }}>
                  {inlineErrors.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                'ENTER COMMAND CONSOLE'
              )}
            </button>
          </form>
        )}

        {/* Tab 2: New Registration Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} noValidate>
            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="reg-username"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                OPERATOR USERNAME (3-50 CHARS)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-username"
                  type="text"
                  className="hud-input"
                  style={{
                    paddingLeft: '36px',
                    borderColor: inlineErrors.username ? 'var(--threat-hostile)' : undefined,
                  }}
                  placeholder="e.g. operator_bravo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <User
                  size={16}
                  color="var(--text-dim)"
                  style={{ position: 'absolute', left: '12px', top: '10px' }}
                />
              </div>
              {inlineErrors.username && (
                <div style={{ fontSize: '11px', color: 'var(--threat-hostile)', marginTop: '4px' }}>
                  {inlineErrors.username}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="reg-email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                OFFICIAL EMAIL (UP TO 100 CHARS)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-email"
                  type="email"
                  className="hud-input"
                  style={{
                    paddingLeft: '36px',
                    borderColor: inlineErrors.email ? 'var(--threat-hostile)' : undefined,
                  }}
                  placeholder="e.g. operator@recon.afv.mil"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Mail
                  size={16}
                  color="var(--text-dim)"
                  style={{ position: 'absolute', left: '12px', top: '10px' }}
                />
              </div>
              {inlineErrors.email && (
                <div style={{ fontSize: '11px', color: 'var(--threat-hostile)', marginTop: '4px' }}>
                  {inlineErrors.email}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label
                htmlFor="reg-pwd"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                SECURITY PASSPHRASE (6-100 CHARS)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-pwd"
                  type={showPassword ? 'text' : 'password'}
                  className="hud-input"
                  style={{
                    paddingLeft: '36px',
                    paddingRight: '36px',
                    borderColor: inlineErrors.password ? 'var(--threat-hostile)' : undefined,
                  }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Lock
                  size={16}
                  color="var(--text-dim)"
                  style={{ position: 'absolute', left: '12px', top: '10px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {inlineErrors.password && (
                <div style={{ fontSize: '11px', color: 'var(--threat-hostile)', marginTop: '4px' }}>
                  {inlineErrors.password}
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-dim)',
                marginBottom: '16px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              * New accounts are provisioned with default OPERATOR clearance.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  REQUESTING CLEARANCE...
                </>
              ) : (
                'REGISTER AS OPERATOR'
              )}
            </button>
          </form>
        )}

        {/* Demo Credentials - visible only in DEV mode per Section 7.1 */}
        {import.meta.env.DEV && (
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-muted)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              color: 'var(--text-dim)',
            }}
          >
            <div>[DEV ENVIRONMENT DETECTED]</div>
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fillDemoCredentials('operator_nitin', 'Operator@123')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              >
                Load Default Operator
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
