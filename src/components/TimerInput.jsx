import React, { useState, useEffect, useRef } from 'react';

const TimerInput = ({ value, onChange, unit, isTimeBased }) => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const toggleTimer = (e) => {
    e.preventDefault();
    if (running) {
      clearInterval(timerRef.current);
      setRunning(false);
      // Auto-populate the value based on unit
      const val = unit === 'min' ? (seconds / 60) : (seconds / 3600);
      onChange(val.toFixed(2));
    } else {
      setSeconds(0);
      setRunning(true);
      onChange(''); // clear previous value
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        className="input"
        style={{ flex: 1 }}
        type="number"
        step="any"
        placeholder={running ? formatTime(seconds) : "Enter value…"}
        value={running ? '' : value}
        onChange={e => onChange(e.target.value)}
        disabled={running}
      />
      {isTimeBased && (
        <button
          type="button"
          className="btn btn-surface"
          style={{ 
            padding: '0 16px', 
            color: running ? 'var(--amber)' : 'var(--text-1)',
            borderColor: running ? 'var(--amber)' : 'var(--border)'
          }}
          onClick={toggleTimer}
        >
          {running ? 'Stop' : 'Start Timer'}
        </button>
      )}
    </div>
  );
};

export default TimerInput;
