import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, getDocs, addDoc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useParams, Link } from 'react-router-dom';
import CorrelationGraph from './CorrelationGraph';
import NerdModeStats from './NerdModeStats';
import TimerInput from './TimerInput';
import { calculatePearsonCorrelation, interpretCorrelation } from '../utils/statistics';

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

const ChainDetail = ({ user }) => {
  const { chainId } = useParams();
  const navigate = useNavigate();
  const [chain, setChain] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');
  const [nerdMode, setNerdMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('scatter');

  useEffect(() => { fetchData(); }, [chainId]);

  const fetchData = async () => {
    try {
      const chainSnap = await getDoc(doc(db, `users/${user.uid}/chains/${chainId}`));
      if (chainSnap.exists()) setChain({ id: chainSnap.id, ...chainSnap.data() });
      const q = query(collection(db, `users/${user.uid}/chains/${chainId}/logs`), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setLogs(arr);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this signal? This will delete all logged data and cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/chains/${chainId}`));
      // In a real app we should also batch delete the subcollection, but this works for demo
      navigate('/');
    } catch (err) { console.error(err); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (val1 === '' || val2 === '') return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/chains/${chainId}/logs`), {
        val1: Number(val1), val2: Number(val2),
        createdAt: serverTimestamp(),
        dateString: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
      setVal1(''); setVal2('');
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Crunching numbers…</span></div>;
  if (!chain) return <div className="loading-screen">Chain not found.</div>;

  const xData = logs.map(l => l.val1);
  const yData = logs.map(l => l.val2);
  const rValue = calculatePearsonCorrelation(xData, yData);
  const rClass = getRClass(rValue);
  const rLabel = getRLabel(rValue);
  const interpretation = interpretCorrelation(rValue);
  const strength = getStrength(rValue);
  const absR = rValue !== null ? Math.abs(rValue) : 0;

  return (
    <div className="chain-page fade-up">
      <Link to="/" className="back-btn">← Back to signals</Link>

      {/* Header */}
      <div className="chain-page-header">
        <div>
          <h1 className="chain-page-title">{chain.name}</h1>
          <div className="chain-page-meta">
            <span className="chain-var-tag">
              <span>{chain.var1Icon ?? '📊'}</span>
              <span>{chain.var1Name}</span>
              {chain.var1Unit && <span style={{ color: 'var(--text-3)' }}>{chain.var1Unit}</span>}
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>correlates with</span>
            <span className="chain-var-tag">
              <span>{chain.var2Icon ?? '📈'}</span>
              <span>{chain.var2Name}</span>
              {chain.var2Unit && <span style={{ color: 'var(--text-3)' }}>{chain.var2Unit}</span>}
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>· {logs.length} entries</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label className="toggle-wrap" htmlFor="nerd-mode">
            <input type="checkbox" id="nerd-mode" checked={nerdMode} onChange={e => setNerdMode(e.target.checked)} />
            <div className="toggle-track"><div className="toggle-thumb" /></div>
            <span className="nerd-toggle-text">🤓 Nerd Mode</span>
          </label>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'rgba(244,63,94,0.3)', color: 'var(--rose)' }} onClick={handleDelete}>
            Delete Signal
          </button>
        </div>
      </div>

      {/* Correlation Hero Banner */}
      {logs.length >= 3 && (
        <div className={`corr-hero ${rClass} d1 fade-up`}>
          <div className="corr-hero-r">{rLabel}</div>
          <div className="corr-hero-info">
            <strong>{strength} {rClass === 'pos' ? 'positive' : rClass === 'neg' ? 'negative' : ''} correlation</strong>
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
            <div>
              <div className="log-var-label">
                <span className="log-var-icon">{chain.var1Icon ?? '📊'}</span>
                <span>{chain.var1Name}</span>
                {chain.var1Unit && <span className="log-var-unit">{chain.var1Unit}</span>}
              </div>
              <TimerInput 
                value={val1} 
                onChange={setVal1} 
                unit={chain.var1Unit} 
                isTimeBased={['hours', 'minutes', 'hrs', 'min'].includes(chain.var1TypeId || chain.var1Unit)} 
              />
            </div>
            <div>
              <div className="log-var-label">
                <span className="log-var-icon">{chain.var2Icon ?? '📈'}</span>
                <span>{chain.var2Name}</span>
                {chain.var2Unit && <span className="log-var-unit">{chain.var2Unit}</span>}
              </div>
              <TimerInput 
                value={val2} 
                onChange={setVal2} 
                unit={chain.var2Unit} 
                isTimeBased={['hours', 'minutes', 'hrs', 'min'].includes(chain.var2TypeId || chain.var2Unit)} 
              />
            </div>
            <button type="submit" className="btn btn-amber log-submit" disabled={submitting}>
              {submitting ? 'Saving…' : '+ Log entry'}
            </button>
          </form>

          {logs.length > 0 && (
            <div className="log-history">
              <div className="divider" style={{ margin: '18px 0 14px' }} />
              <div className="log-history-title">Recent entries</div>
              {logs.slice().reverse().slice(0, 8).map(log => (
                <div key={log.id} className="log-row">
                  <span className="log-row-date">{log.dateString}</span>
                  <div className="log-row-vals">
                    <span className="log-val-a">{log.val1}</span>
                    <span className="log-val-sep">→</span>
                    <span className="log-val-b">{log.val2}</span>
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
                  {[['scatter', 'Scatter plot'], ['timeline', 'Timeline']].map(([id, label]) => (
                    <button key={id} className={`chart-tab${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
                      {label}
                    </button>
                  ))}
                </div>
                <CorrelationGraph logs={logs} chain={chain} rValue={rValue} mode={activeTab} />
              </>
            )}
          </div>

          {nerdMode && logs.length >= 3 && (
            <div className="d4 fade-up">
              <NerdModeStats rValue={rValue} n={logs.length} chain={chain} logs={logs} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChainDetail;
