import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { calculatePearsonCorrelation } from '../utils/statistics';
import { FlaskConical, X, Zap, ArrowRight, Plus } from 'lucide-react';

const VAR_COLORS = ['#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#a78bfa'];

const Lab = ({ user }) => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [allLogs, setAllLogs] = useState({});
  const [loading, setLoading] = useState(true);

  // Drag and drop state
  const [labSignals, setLabSignals] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const snap = await getDocs(collection(db, `users/${user.uid}/chains`));
      const fetched = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      setThreads(fetched);

      const logsMap = {};
      for (const ch of fetched) {
        const logsSnap = await getDocs(collection(db, `users/${user.uid}/chains/${ch.id}/logs`));
        const logs = [];
        logsSnap.forEach(d => {
          const log = normalizeLog({ id: d.id, ...d.data() });
          logs.push(log);
        });
        logsMap[ch.id] = logs;
      }
      setAllLogs(logsMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const normalizeThread = (ch) => {
    if (ch.variables) return ch;
    return {
      ...ch,
      variables: [
        { name: ch.var1Name, typeId: ch.var1TypeId, icon: ch.var1Icon || '📊', unit: ch.var1Unit },
        { name: ch.var2Name, typeId: ch.var2TypeId, icon: ch.var2Icon || '📈', unit: ch.var2Unit }
      ]
    };
  };

  const normalizeLog = (log) => {
    if (log.values) return log;
    return { ...log, values: [log.val1, log.val2] };
  };

  const getLogValue = (log, index) => log.values[index];

  // Extract all unique variables (signals)
  const signals = useMemo(() => {
    const map = new Map();
    threads.forEach(ch => {
      const chNormalized = normalizeThread(ch);
      const vars = chNormalized.variables;
      vars.forEach((v, index) => {
        const key = v.name?.toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, { ...v, sources: [{ threadId: ch.id, threadName: ch.name, index }] });
        } else if (key) {
          map.get(key).sources.push({ threadId: ch.id, threadName: ch.name, index });
        }
      });
    });
    return Array.from(map.values());
  }, [threads]);

  // Drag and Drop handlers
  const handleDragStart = (e, signal) => {
    e.dataTransfer.setData('application/json', JSON.stringify(signal));
    e.currentTarget.style.opacity = '0.45';
    e.currentTarget.style.transform = 'scale(0.96)';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.transform = 'scale(1)';
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      const signal = JSON.parse(data);
      if (!labSignals.find(s => s.name === signal.name)) {
        setLabSignals(prev => [...prev, signal]);
      }
    }
  };

  const removeSignal = (name) => setLabSignals(prev => prev.filter(s => s.name !== name));
  const clearLab = () => setLabSignals([]);

  // Compute correlations for lab items
  const labResult = useMemo(() => {
    if (labSignals.length < 2) return null;

    const dateMap = {};
    labSignals.forEach(signal => {
      signal.sources.forEach(src => {
        const logs = allLogs[src.threadId] || [];
        logs.forEach(log => {
          if (!log.dateString) return;
          const val = getLogValue(log, src.index);
          if (val !== null) {
            if (!dateMap[log.dateString]) dateMap[log.dateString] = {};
            if (dateMap[log.dateString][signal.name] === undefined) {
              dateMap[log.dateString][signal.name] = val;
            }
          }
        });
      });
    });

    const validDates = Object.keys(dateMap).filter(date =>
      labSignals.every(s => dateMap[date][s.name] !== undefined)
    ).sort();

    if (validDates.length >= 3) {
      const matrix = [];
      for (let i = 0; i < labSignals.length; i++) {
        for (let j = i + 1; j < labSignals.length; j++) {
          const a = labSignals[i];
          const b = labSignals[j];
          const xData = validDates.map(d => dateMap[d][a.name]);
          const yData = validDates.map(d => dateMap[d][b.name]);
          const r = calculatePearsonCorrelation(xData, yData);
          matrix.push({ a, b, r });
        }
      }
      return { type: 'found', count: validDates.length, matrix, validDates, dateMap };
    } else {
      return { type: 'suggest', count: validDates.length, validDates, dateMap };
    }
  }, [labSignals, allLogs]);

  const getRLabel = (r) => r === null || isNaN(r) ? '—' : (r > 0 ? '+' : '') + Number(r).toFixed(2);
  const getRClass = (r) => r === null || isNaN(r) ? 'none' : r > 0.1 ? 'pos' : r < -0.1 ? 'neg' : 'none';

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading your signals…</span></div>;

  return (
    <div className="lab-page fade-up">

      {/* ── Hero dropzone ── */}
      <div
        className={`lab-dropzone${isDragOver ? ' drag-over' : ''}${labSignals.length > 0 ? ' has-items' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {labSignals.length === 0 ? (
          <div className="lab-dropzone-empty">
            <div className="lab-icon-wrap">
              <FlaskConical size={32} strokeWidth={1.5} color="var(--amber)" />
            </div>
            <h1 className="lab-title">Lab</h1>
            <p className="lab-subtitle">
              Drop any two habits below to instantly discover<br />their correlation across your history.
            </p>
          </div>
        ) : (
          <div className="lab-dropzone-active">
            <div className="lab-dropped-signals">
              {labSignals.map((s, i) => (
                <div key={s.name} className="lab-signal-chip">
                  <span className="lab-signal-dot" style={{ background: VAR_COLORS[i % VAR_COLORS.length] }} />
                  <span className="lab-signal-name">{s.name}</span>
                  <button className="lab-signal-remove" onClick={() => removeSignal(s.name)}>
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              {labSignals.length < 3 && (
                <div className="lab-signal-chip lab-signal-placeholder">
                  <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>+ drop another signal</span>
                </div>
              )}
            </div>
            <button className="btn btn-ghost" style={{ marginTop: '20px', fontSize: '0.75rem', padding: '6px 14px' }} onClick={clearLab}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Lab results ── */}
      {labResult && (
        <div className={`lab-result fade-up ${labResult.type}`}>
          {labResult.type === 'found' ? (
            <>
              <div className="lab-result-header">
                <Zap size={14} color="var(--amber)" />
                <span>Based on <strong>{labResult.count}</strong> overlapping days</span>
              </div>
              <div className="lab-matrix">
                {labResult.matrix.map((m, i) => {
                  const cls = getRClass(m.r);
                  const rLabel = getRLabel(m.r);
                  return (
                    <div key={i} className="lab-matrix-row">
                      <span className="lab-matrix-name">{m.a.name}</span>
                      <div className="lab-matrix-score-wrap">
                        <span className={`chain-r-number ${cls}`} style={{ fontSize: '1.4rem' }}>{rLabel}</span>
                        <span className="lab-matrix-label">r</span>
                      </div>
                      <span className="lab-matrix-name">{m.b.name}</span>
                    </div>
                  );
                })}
              </div>
              <button
                className="btn btn-amber"
                style={{ marginTop: '8px' }}
                onClick={() => navigate('/', { state: { prefillVariables: labSignals, prefillLogs: labResult } })}
              >
                Track these together <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <div className="lab-result-header">
                <span>Not enough overlap yet</span>
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', margin: '8px 0 20px' }}>
                {labResult.count > 0
                  ? `Only ${labResult.count} overlapping day${labResult.count !== 1 ? 's' : ''} — need at least 3 to run the algorithm.`
                  : `You haven't tracked these signals on the same day yet.`}
              </p>
              <button
                className="btn btn-amber"
                onClick={() => navigate('/', { state: { prefillVariables: labSignals, prefillLogs: labResult } })}
              >
                <Plus size={14} /> Start tracking this relationship
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Signals grid ── */}
      <div className="lab-signals-section">
        <div className="section-bar" style={{ marginBottom: '16px' }}>
          <span className="section-eyebrow">Your Signals</span>
          <span className="section-count">Drag into the lab to compare</span>
        </div>

        <div className="signals-grid">
          {signals.map((signal, i) => {
            const inLab = labSignals.find(s => s.name === signal.name);
            return (
              <div
                key={signal.name}
                className={`signal-card fade-up${inLab ? ' in-lab' : ''}`}
                draggable={!inLab}
                onDragStart={(e) => handleDragStart(e, signal)}
                onDragEnd={handleDragEnd}
                style={{ cursor: inLab ? 'default' : 'grab', animationDelay: `${i * 40}ms` }}
              >
                <div className="signal-card-dot" style={{ background: VAR_COLORS[i % VAR_COLORS.length] }} />
                <div className="signal-card-name">{signal.name}</div>
                {signal.unit && <div className="signal-card-unit">{signal.unit}</div>}
                <div className="signal-card-sources">
                  {signal.sources.length} thread{signal.sources.length !== 1 ? 's' : ''}
                </div>
                {inLab && <div className="signal-in-lab-badge">in lab</div>}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Lab;

