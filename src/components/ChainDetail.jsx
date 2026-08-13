import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, getDocs, addDoc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useParams, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import CorrelationGraph from './CorrelationGraph';
import NerdModeStats from './NerdModeStats';
import TimerInput from './TimerInput';
import { calculatePearsonCorrelation, interpretCorrelation } from '../utils/statistics';

const VAR_COLORS = ['#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#a78bfa'];

const getRClass = (r) => r === null ? 'none' : r > 0.1 ? 'pos' : r < -0.1 ? 'neg' : 'none';
const getRLabel = (r) => r === null ? '—' : (r > 0 ? '+' : '') + r.toFixed(3);
const getStrength = (r) => {
  if (r === null) return '—';
  const a = Math.abs(r);
  if (a >= 0.8) return 'Strong';
  if (a >= 0.5) return 'Moderate';
  if (a >= 0.3) return 'Weak';
  return 'Very weak';
};

// Normalize old format to new variables array
const normalizeChain = (ch) => {
  if (ch.variables) return ch;
  return {
    ...ch,
    variables: [
      { name: ch.var1Name, typeId: ch.var1TypeId, icon: ch.var1Icon || '📊', unit: ch.var1Unit },
      { name: ch.var2Name, typeId: ch.var2TypeId, icon: ch.var2Icon || '📈', unit: ch.var2Unit },
    ],
  };
};

// Extract value for a given variable index from a log entry (compat with old/new format)
const getLogValue = (log, index) => {
  if (log.values) return log.values[index];
  if (index === 0) return log.val1;
  if (index === 1) return log.val2;
  return null;
};

const ChainDetail = ({ user }) => {
  const { chainId } = useParams();
  const navigate = useNavigate();
  const [chain, setChain] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic values for N variables
  const [values, setValues] = useState([]);
  const [nerdMode, setNerdMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('scatter');
  const [note, setNote] = useState('');
  // Selected pair for scatter plot: [indexA, indexB]
  const [selectedPair, setSelectedPair] = useState([0, 1]);
  const exportRef = useRef(null);

  useEffect(() => { fetchData(); }, [chainId]);

  const fetchData = async () => {
    try {
      const chainSnap = await getDoc(doc(db, `users/${user.uid}/chains/${chainId}`));
      if (chainSnap.exists()) {
        const normalized = normalizeChain({ id: chainSnap.id, ...chainSnap.data() });
        setChain(normalized);
        setValues(new Array(normalized.variables.length).fill(''));
      }
      const q = query(collection(db, `users/${user.uid}/chains/${chainId}/logs`), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setLogs(arr);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this thread? This will delete all logged data and cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/chains/${chainId}`));
      navigate('/');
    } catch (err) { console.error(err); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (values.some(v => v === '')) return;
    setSubmitting(true);
    try {
      const numValues = values.map(Number);
      const logDoc = {
        values: numValues,
        // Backwards compat for old 2-var format
        val1: numValues[0],
        val2: numValues[1],
        note: note.trim(),
        createdAt: serverTimestamp(),
        dateString: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
      await addDoc(collection(db, `users/${user.uid}/chains/${chainId}/logs`), logDoc);
      setValues(new Array(chain.variables.length).fill(''));
      setNote('');
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  // Compute correlation matrix for all variable pairs
  const corrMatrix = useMemo(() => {
    if (!chain || logs.length < 3) return [];
    const vars = chain.variables;
    const matrix = [];
    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        const xData = logs.map(l => getLogValue(l, i)).filter(v => v !== null && v !== undefined);
        const yData = logs.map(l => getLogValue(l, j)).filter(v => v !== null && v !== undefined);
        const minLen = Math.min(xData.length, yData.length);
        const r = calculatePearsonCorrelation(xData.slice(0, minLen), yData.slice(0, minLen));
        matrix.push({ i, j, r, nameA: vars[i].name, nameB: vars[j].name, iconA: vars[i].icon, iconB: vars[j].icon });
      }
    }
    return matrix;
  }, [chain, logs]);

  // Currently selected pair's r value
  const currentCorr = useMemo(() => {
    return corrMatrix.find(m => m.i === selectedPair[0] && m.j === selectedPair[1]) || { r: null };
  }, [corrMatrix, selectedPair]);

  const rValue = currentCorr.r;
  const absR = rValue !== null ? Math.abs(rValue) : 0;
  const strength = getStrength(absR);
  const interpretation = interpretCorrelation(rValue, chain?.variables[selectedPair[0]]?.name, chain?.variables[selectedPair[1]]?.name);

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#09090b',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `Correlatio-${chain.name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export graph', err);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading…</span></div>;
  if (!chain) return <div className="loading-screen">Thread not found.</div>;

  const vars = chain.variables;
  const rClass = getRClass(rValue);
  const rLabel = getRLabel(rValue);

  // Build compatible chain object for CorrelationGraph (selected pair)
  const graphChain = {
    ...chain,
    var1Name: vars[selectedPair[0]]?.name,
    var1Unit: vars[selectedPair[0]]?.unit,
    var1Icon: vars[selectedPair[0]]?.icon,
    var2Name: vars[selectedPair[1]]?.name,
    var2Unit: vars[selectedPair[1]]?.unit,
    var2Icon: vars[selectedPair[1]]?.icon,
  };

  // Build compatible logs for the selected pair
  const graphLogs = logs.map(l => ({
    ...l,
    val1: getLogValue(l, selectedPair[0]),
    val2: getLogValue(l, selectedPair[1]),
  }));

  return (
    <div className="chain-page fade-up">
      <Link to="/" className="back-btn" data-html2canvas-ignore="true">← Back to threads</Link>

      <div ref={exportRef} style={{ background: 'var(--bg)', padding: '20px', borderRadius: '16px', margin: '-20px' }}>
      {/* Header */}
      <div className="chain-page-header">
        <div>
          <h1 className="chain-page-title">{chain.name}</h1>
          <div className="chain-page-meta">
            {vars.map((v, vi) => (
              <React.Fragment key={vi}>
                {vi > 0 && <span className="thread-connector-mini">
                  <span className="thread-dot" style={{ background: VAR_COLORS[vi - 1] }} />
                  <span className="thread-line" />
                  <span className="thread-dot" style={{ background: VAR_COLORS[vi] }} />
                </span>}
                <span className="chain-var-tag" style={{ borderColor: `${VAR_COLORS[vi]}33` }}>
                  <span>{v.icon}</span>
                  <span style={{ color: VAR_COLORS[vi] }}>{v.name}</span>
                  {v.unit && <span style={{ color: 'var(--text-3)' }}>{v.unit}</span>}
                </span>
              </React.Fragment>
            ))}
            <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>· {logs.length} entries</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--amber)' }} onClick={handleExport}>
            📸 Export
          </button>
          <label className="toggle-wrap" htmlFor="nerd-mode">
            <input type="checkbox" id="nerd-mode" checked={nerdMode} onChange={e => setNerdMode(e.target.checked)} />
            <div className="toggle-track"><div className="toggle-thumb" /></div>
            <span className="nerd-toggle-text">🤓 Nerd Mode</span>
          </label>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'rgba(244,63,94,0.3)', color: 'var(--rose)' }} onClick={handleDelete}>
            Delete Thread
          </button>
        </div>
      </div>

      {/* Correlation Matrix (for 3+ variables) */}
      {vars.length > 2 && logs.length >= 3 && (
        <div className="card corr-matrix-panel d1 fade-up">
          <div className="corr-matrix-title">Correlation Matrix</div>
          <div className="corr-matrix-grid" style={{ gridTemplateColumns: `repeat(${corrMatrix.length}, 1fr)` }}>
            {corrMatrix.map((pair, idx) => {
              const isActive = selectedPair[0] === pair.i && selectedPair[1] === pair.j;
              const pairR = pair.r;
              const pairClass = getRClass(pairR);
              return (
                <button
                  key={idx}
                  className={`corr-matrix-cell ${pairClass}${isActive ? ' active' : ''}`}
                  onClick={() => setSelectedPair([pair.i, pair.j])}
                >
                  <div className="corr-matrix-pair">
                    <span style={{ color: VAR_COLORS[pair.i] }}>{pair.iconA}</span>
                    <span className="corr-matrix-x">×</span>
                    <span style={{ color: VAR_COLORS[pair.j] }}>{pair.iconB}</span>
                  </div>
                  <div className="corr-matrix-names">{pair.nameA} & {pair.nameB}</div>
                  <div className={`r-badge ${pairClass}`} style={{ fontSize: '0.72rem' }}>
                    {pairR !== null ? (pairR > 0 ? '+' : '') + pairR.toFixed(2) : '—'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Correlation Hero Banner */}
      {logs.length >= 3 && (
        <div className={`corr-hero ${rClass} d1 fade-up`}>
          <div className="corr-hero-r">{rLabel}</div>
          <div className="corr-hero-info">
            <strong>
              {strength} {rClass === 'pos' ? 'positive' : rClass === 'neg' ? 'negative' : ''} correlation
              {vars.length > 2 && ` (${vars[selectedPair[0]]?.name} × ${vars[selectedPair[1]]?.name})`}
            </strong>
            <span>{interpretation} · {logs.length} data points</span>
          </div>
          <div className="corr-bar-wrap">
            <div className="corr-bar-track">
              <div className="corr-bar-fill" style={{ width: `${absR * 100}%` }} />
            </div>
            <div className="corr-bar-labels">
              <span>0 (none)</span>
              <span>|r| = {absR.toFixed(2)}</span>
              <span>1 (perfect)</span>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="chain-layout">
        {/* Log Panel */}
        <div className="card log-panel d2 fade-up">
          <div className="log-panel-title">Log today's values</div>
          <form onSubmit={handleAdd} className="log-form">
            {vars.map((v, vi) => (
              <div key={vi}>
                <div className="log-var-label">
                  <span className="log-var-icon">{v.icon}</span>
                  <span style={{ color: VAR_COLORS[vi] }}>{v.name}</span>
                  {v.unit && <span className="log-var-unit">{v.unit}</span>}
                </div>
                <TimerInput
                  value={values[vi] || ''}
                  onChange={(val) => {
                    setValues(prev => prev.map((pv, pi) => pi === vi ? val : pv));
                  }}
                  unit={v.unit}
                  isTimeBased={['hours', 'minutes', 'hrs', 'min'].includes(v.typeId || v.unit)}
                />
              </div>
            ))}
            
            <div className="log-var-label" style={{ marginTop: '8px' }}>
              <span className="log-var-icon">📓</span>
              <span style={{ color: 'var(--text-2)' }}>Journal Note (optional)</span>
            </div>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: '60px', padding: '10px', resize: 'vertical' }}
              placeholder="Any context for today?"
              value={note}
              onChange={e => setNote(e.target.value)}
            />

            <button type="submit" className="btn btn-amber log-submit" disabled={submitting}>
              {submitting ? 'Saving…' : '+ Log entry'}
            </button>
          </form>

          {logs.length > 0 && (
            <div className="log-history">
              <div className="divider" style={{ margin: '18px 0 14px' }} />
              <div className="log-history-title">Recent entries</div>
              {logs.slice().reverse().slice(0, 8).map((log, li) => (
                <div key={log.id} className="log-row slide-in-right" style={{ animationDelay: `${li * 0.05}s` }}>
                  <span className="log-row-date">{log.dateString}</span>
                  <div className="log-row-vals">
                    {vars.map((v, vi) => (
                      <React.Fragment key={vi}>
                        {vi > 0 && <span className="log-val-sep">·</span>}
                        <span style={{ color: VAR_COLORS[vi], fontWeight: 500, fontSize: '0.82rem' }}>
                          {getLogValue(log, vi)}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Charts */}
        <div>
          <div className="card chart-panel d3 fade-up">
            {logs.length < 3 ? (
              <div className="empty-chart">
                <div className="empty-chart-icon">📈</div>
                <p>Log at least <strong>3 entries</strong> to generate your correlation chart.</p>
              </div>
            ) : (
              <>
                <div className="chart-tabs">
                  {[['scatter', 'Scatter Plot'], ['timeline', 'Timeline'], ['heatmap', 'Heat Map']].map(([id, label]) => (
                    <button key={id} className={`chart-tab${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
                      {label}
                    </button>
                  ))}
                </div>
                {vars.length > 2 && activeTab === 'scatter' && (
                  <div className="pair-selector">
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Viewing:</span>
                    <span style={{ color: VAR_COLORS[selectedPair[0]], fontWeight: 600, fontSize: '0.82rem' }}>
                      {vars[selectedPair[0]]?.icon} {vars[selectedPair[0]]?.name}
                    </span>
                    <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>vs</span>
                    <span style={{ color: VAR_COLORS[selectedPair[1]], fontWeight: 600, fontSize: '0.82rem' }}>
                      {vars[selectedPair[1]]?.icon} {vars[selectedPair[1]]?.name}
                    </span>
                  </div>
                )}
                <CorrelationGraph
                  logs={graphLogs}
                  chain={graphChain}
                  rValue={rValue}
                  mode={activeTab}
                  allLogs={logs}
                  allVars={vars}
                  varColors={VAR_COLORS}
                />
              </>
            )}
          </div>

          {nerdMode && logs.length >= 3 && (
            <div className="d4 fade-up">
              <NerdModeStats rValue={rValue} n={logs.length} chain={graphChain} logs={graphLogs} />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default ChainDetail;
