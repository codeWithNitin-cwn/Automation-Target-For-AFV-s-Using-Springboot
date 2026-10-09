import React, { createContext, useContext, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  analysisId?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
  removeToast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, analysisId, duration = 7000 }: Omit<ToastMessage, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = { id, type, title, message, analysisId, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-banner"
            role="status"
            style={{
              borderColor:
                toast.type === 'success'
                  ? 'var(--status-nominal)'
                  : toast.type === 'error'
                  ? 'var(--threat-hostile)'
                  : 'var(--accent-blue)',
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} color="var(--status-nominal)" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : toast.type === 'error' ? (
              <AlertTriangle size={18} color="var(--threat-hostile)" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <Info size={18} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                {toast.title}
              </div>
              {toast.message && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {toast.message}
                </div>
              )}
              {toast.analysisId && (
                <div style={{ marginTop: '6px' }}>
                  <Link
                    to={`/analyses/${toast.analysisId}`}
                    onClick={() => removeToast(toast.id)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--accent-blue)',
                      textDecoration: 'underline',
                      fontWeight: 600,
                    }}
                  >
                    INSPECT ANALYSIS [{toast.analysisId.substring(0, 8)}] &rarr;
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
