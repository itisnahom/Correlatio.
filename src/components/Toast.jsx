import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, leaving: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
    }, duration);
  }, []);
  return { toasts, showToast };
}

const TYPE_STYLES = {
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', dot: '#10b981', glow: 'rgba(16,185,129,0.5)' },
  error:   { bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.35)',  dot: '#fb7185', glow: 'rgba(244,63,94,0.5)' },
  info:    { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', dot: '#38bdf8', glow: 'rgba(56,189,248,0.5)' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', dot: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
};

function Toast({ message, type, leaving }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.info;
  
  // Clean up any emojis that were hardcoded into the toast messages previously
  const cleanMessage = typeof message === 'string' 
    ? message.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
    : message;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: 'rgba(17,17,16,0.92)',
      border: `1px solid ${s.border}`,
      borderRadius: '14px', padding: '13px 20px',
      fontSize: '0.875rem', fontWeight: 500, color: '#faf8f3',
      backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      maxWidth: '400px', width: 'max-content',
      transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
      opacity: leaving ? 0 : 1,
      transform: leaving ? 'translateY(12px) scale(0.95)' : 'translateY(0) scale(1)',
      pointerEvents: 'none',
      '--dot-color': s.dot,
      '--glow-color': s.glow
    }}>
      <div className="pulsatile-dot" />
      <span>{cleanMessage}</span>
    </div>
  );
}

export function ToastPortal({ toasts }) {
  return createPortal(
    <div style={{
      position: 'fixed', bottom: '28px', left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      zIndex: 99999, pointerEvents: 'none',
    }}>
      {toasts.map(t => <Toast key={t.id} {...t} />)}
    </div>,
    document.body
  );
}
