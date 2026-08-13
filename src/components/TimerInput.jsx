import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, X, Timer } from 'lucide-react';

const TimerInput = ({ value, onChange, unit, isTimeBased }) => {
  const [mode, setMode] = useState('input'); // 'input' | 'timer'
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const handleStartTimerMode = (e) => {
    e.preventDefault();
    setMode('timer');
    setSeconds(0);
    setRunning(true);
    onChange(''); 
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handlePauseResume = (e) => {
    e.preventDefault();
    if (running) {
      clearInterval(timerRef.current);
      setRunning(false);
    } else {
      setRunning(true);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleStopAndLog = (e) => {
    e.preventDefault();
    clearInterval(timerRef.current);
    setRunning(false);
    setMode('input');
    
    // Auto-populate the value based on unit
    const val = (unit === 'min' || unit === 'minutes') ? (seconds / 60) : (seconds / 3600);
    onChange(val.toFixed(2));
  };

  const handleCancel = (e) => {
    e.preventDefault();
    clearInterval(timerRef.current);
    setRunning(false);
    setSeconds(0);
    setMode('input');
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (mode === 'timer') {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '12px', 
        padding: '16px', background: 'rgba(17,17,16,0.6)', 
        border: '1px solid var(--border-bright)', borderRadius: '12px',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Timer size={14} className={running ? "pulse-anim" : ""} /> Focus Mode
          </div>
          <button type="button" onClick={handleCancel} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
        
        <div style={{ 
          fontSize: '2.5rem', fontWeight: 700, fontFamily: 'monospace', 
          textAlign: 'center', color: 'var(--text-1)', letterSpacing: '2px',
          textShadow: running ? '0 0 20px rgba(245, 158, 11, 0.3)' : 'none',
          transition: 'text-shadow 0.3s ease'
        }}>
          {formatTime(seconds)}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button 
            type="button" 
            className="btn btn-surface" 
            onClick={handlePauseResume}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', color: running ? 'var(--amber)' : 'var(--emerald)' }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />} 
            {running ? 'Pause' : 'Resume'}
          </button>
          
          <button 
            type="button" 
            className="btn btn-amber" 
            onClick={handleStopAndLog}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            <Square size={16} fill="currentColor" /> Log Time
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        className="input"
        style={{ flex: 1 }}
        type="number"
        step="any"
        placeholder="Enter value…"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {isTimeBased && (
        <button
          type="button"
          className="btn btn-surface"
          style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={handleStartTimerMode}
        >
          <Timer size={16} /> Focus
        </button>
      )}
    </div>
  );
};

export default TimerInput;
