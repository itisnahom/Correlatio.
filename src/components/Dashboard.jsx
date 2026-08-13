import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { calculatePearsonCorrelation } from '../utils/statistics';
import { getVarType, VARIABLE_TYPES } from '../utils/variableTypes';
import VariablePicker from './VariablePicker';
import { StreakWidget, ActivityHeatmap, calculateStreaks } from './Gamification';

const CARD_ACCENTS = [
  { stripe: 'linear-gradient(135deg,#f59e0b,#f97316)', iconBg: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.15)' },
  { stripe: 'linear-gradient(135deg,#10b981,#38bdf8)', iconBg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.15)' },
  { stripe: 'linear-gradient(135deg,#f43f5e,#ec4899)', iconBg: 'rgba(244,63,94,0.12)', glow: 'rgba(244,63,94,0.15)' },
  { stripe: 'linear-gradient(135deg,#38bdf8,#818cf8)', iconBg: 'rgba(56,189,248,0.12)', glow: 'rgba(56,189,248,0.15)' },
  { stripe: 'linear-gradient(135deg,#a78bfa,#ec4899)', iconBg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.15)' },
  { stripe: 'linear-gradient(135deg,#14b8a6,#10b981)', iconBg: 'rgba(20,184,166,0.12)', glow: 'rgba(20,184,166,0.15)' },
];

const VAR_COLORS = ['#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#a78bfa'];

const getRClass = (r) => r === null ? 'none' : r > 0.1 ? 'pos' : r < -0.1 ? 'neg' : 'none';
const getRLabel = (r) => r === null ? '—' : (r > 0 ? '+' : '') + r.toFixed(2);

// Helper to normalize old (var1/var2) format to new (variables array) format
const normalizeThread = (ch) => {
  if (ch.variables) return ch; // already new format
  return {
    ...ch,
    variables: [
      { name: ch.var1Name, typeId: ch.var1TypeId, icon: ch.var1Icon || '📊', unit: ch.var1Unit },
      { name: ch.var2Name, typeId: ch.var2TypeId, icon: ch.var2Icon || '📈', unit: ch.var2Unit },
    ],
  };
};

const Dashboard = ({ user }) => {
  const [threads, setThreads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Gamification state
  const [allLogDates, setAllLogDates] = useState([]);
  const [streaks, setStreaks] = useState({ current: 0, longest: 0, today: false });

  // New thread form state — now supports N variables
  const [threadName, setThreadName] = useState('');
  const [variables, setVariables] = useState([
    { typeId: null, name: '', unit: '' },
    { typeId: null, name: '', unit: '' },
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const snap = await getDocs(query(collection(db, `users/${user.uid}/chains`)));
      const fetched = [];
      snap.forEach(d => fetched.push(normalizeThread({ id: d.id, ...d.data() })));
      setThreads(fetched);

      const st = {};
      const dates = [];
      
      for (const ch of fetched) {
        try {
          const ls = await getDocs(collection(db, `users/${user.uid}/chains/${ch.id}/logs`));
          const logs = []; ls.forEach(d => logs.push(d.data()));
          
          logs.forEach(l => {
            if (l.dateString) dates.push(l.dateString);
          });
          
          // For backwards compat, use val1/val2 if present, else values array
          const xData = logs.map(l => l.values ? l.values[0] : l.val1);
          const yData = logs.map(l => l.values ? l.values[1] : l.val2);
          const r = calculatePearsonCorrelation(xData, yData);
          st[ch.id] = { r, count: logs.length };
        } catch { st[ch.id] = { r: null, count: 0 }; }
      }
      setStats(st);
      setAllLogDates(dates);
      setStreaks(calculateStreaks(dates));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addVariable = () => {
    if (variables.length >= 5) return;
    setVariables(prev => [...prev, { typeId: null, name: '', unit: '' }]);
  };

  const removeVariable = (index) => {
    if (variables.length <= 2) return;
    setVariables(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariable = (index, val) => {
    setVariables(prev => prev.map((v, i) => i === index ? val : v));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const allValid = threadName && variables.every(v => v.name && v.typeId);
    if (!allValid) return;
    setCreating(true);
    try {
      const vars = variables.map(v => {
        const vType = getVarType(v.typeId);
        return {
          name: v.name,
          typeId: v.typeId,
          icon: vType.icon,
          unit: v.unit || vType.unit,
        };
      });

      // Store in both old format (for backwards compat) and new format
      const docData = {
        name: threadName,
        variables: vars,
        // Keep old format fields for backwards compat with ChainDetail
        var1Name: vars[0].name,
        var1TypeId: vars[0].typeId,
        var1Icon: vars[0].icon,
        var1Unit: vars[0].unit,
        var2Name: vars[1].name,
        var2TypeId: vars[1].typeId,
        var2Icon: vars[1].icon,
        var2Unit: vars[1].unit,
        createdAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, `users/${user.uid}/chains`), docData);

      const newThread = normalizeThread({ id: ref.id, ...docData });
      setThreads(prev => [...prev, newThread]);
      setStats(prev => ({ ...prev, [ref.id]: { r: null, count: 0 } }));

      setShowModal(false);
      setThreadName('');
      setVariables([{ typeId: null, name: '', unit: '' }, { typeId: null, name: '', unit: '' }]);
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();
  const firstName = user.displayName?.split(' ')[0] ?? 'there';

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading…</span></div>;

  return (
    <div className="fade-up">
      <div className="dashboard-hero">
        <p className="dashboard-greeting">{greeting}, {firstName} 👋</p>
        <p className="dashboard-sub">
          {threads.length === 0
            ? 'Create your first Thread to start discovering hidden correlations.'
            : `${threads.length} active thread${threads.length !== 1 ? 's' : ''}. Keep logging to strengthen your data.`}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StreakWidget current={streaks.current} longest={streaks.longest} today={streaks.today} />
        <ActivityHeatmap allLogDates={allLogDates} />
      </div>

      <div className="section-bar">
        <span className="section-eyebrow">Your Threads</span>
        <button className="btn btn-amber" style={{ padding: '8px 16px', fontSize: '0.82rem' }} onClick={() => setShowModal(true)}>
          + New Thread
        </button>
      </div>

      <div className="chains-grid">
        {threads.map((thread, i) => {
          const { stripe, iconBg, glow } = CARD_ACCENTS[i % CARD_ACCENTS.length];
          const s = stats[thread.id] || {};
          const cls = getRClass(s.r);
          const rLabel = getRLabel(s.r);
          const vars = thread.variables || [];

          return (
            <Link to={`/chain/${thread.id}`} key={thread.id} className={`chain-card fade-up d${Math.min(i + 1, 6)}`} style={{ '--card-glow': glow }}>
              <div className="chain-card-stripe" style={{ background: stripe }} />
              <div className="chain-card-body">
                <div className="chain-card-top">
                  <div className="chain-icon-wrap" style={{ background: iconBg }}>
                    {vars[0]?.icon ?? '📊'}
                  </div>
                  <div className={`r-badge ${cls}`}>{rLabel}</div>
                </div>
                <div className="chain-card-name">{thread.name}</div>
                <div className="chain-card-vars">
                  {vars.map((v, vi) => (
                    <React.Fragment key={vi}>
                      {vi > 0 && <span className="chain-card-sep">×</span>}
                      <span style={{ color: VAR_COLORS[vi % VAR_COLORS.length] }}>{v.icon} {v.name}</span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="chain-card-footer">
                  <span className="chain-card-count">{s.count ?? 0} log{(s.count ?? 0) !== 1 ? 's' : ''}</span>
                  <span className="chain-card-cta">Explore →</span>
                </div>
              </div>
            </Link>
          );
        })}

        <button className="new-chain-tile" onClick={() => setShowModal(true)}>
          <div className="new-chain-plus">+</div>
          <span className="new-chain-label">Track a new relationship</span>
        </button>
      </div>

      {/* Create thread modal — now supports N variables */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">New Thread</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="input-label">Thread Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Sleep & Focus, Coffee & Productivity…"
                  value={threadName}
                  onChange={e => setThreadName(e.target.value)}
                />
              </div>

              {variables.map((v, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <div className="modal-connector">
                      <div className="connector-line" />
                      <span className="connector-dot" style={{ background: VAR_COLORS[i - 1] }} />
                      <span className="connector-text">threads with</span>
                      <span className="connector-dot" style={{ background: VAR_COLORS[i] }} />
                      <div className="connector-line" />
                    </div>
                  )}
                  <div className="modal-section" style={{ position: 'relative' }}>
                    <VariablePicker
                      label={`Variable ${String.fromCharCode(65 + i)}`}
                      value={v}
                      onChange={(val) => updateVariable(i, val)}
                      accentColor={VAR_COLORS[i]}
                    />
                    {variables.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeVariable(i)}
                        style={{
                          position: 'absolute', top: 0, right: 0,
                          background: 'none', border: 'none', color: 'var(--text-3)',
                          cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px',
                        }}
                      >×</button>
                    )}
                  </div>
                </React.Fragment>
              ))}

              {variables.length < 5 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={addVariable}
                  style={{ width: '100%', borderRadius: '10px', padding: '10px', margin: '12px 0 4px', borderStyle: 'dashed' }}
                >
                  + Add another variable ({variables.length}/5)
                </button>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-amber"
                  disabled={creating || !threadName || !variables.every(v => v.name && v.typeId)}
                  style={{ flex: 1, borderRadius: '10px', padding: '12px', fontSize: '0.9rem' }}
                >
                  {creating ? 'Creating…' : 'Create Thread'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ borderRadius: '10px', padding: '12px 18px' }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
