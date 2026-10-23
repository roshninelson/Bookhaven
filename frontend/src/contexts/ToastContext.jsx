import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Check, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const toast = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const toastError = useCallback((msg) => addToast(msg, 'error', 4000), [addToast]);
  const toastInfo = useCallback((msg) => addToast(msg, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, toast, toastError, toastInfo }}>
      {children}
      <div className="toast-container" style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              borderRadius: '4px',
              fontSize: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              pointerEvents: 'auto',
              background: t.type === 'error' ? '#a83c27' : t.type === 'info' ? '#334c38' : '#254f3b',
              color: '#fff',
            }}
          >
            {t.type === 'success' && <Check size={16} />}
            {t.type === 'error' && <AlertTriangle size={16} />}
            {t.type === 'info' && <Info size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
