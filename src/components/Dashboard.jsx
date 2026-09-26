import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { calculatePearsonCorrelation } from '../utils/statistics';
import { useToast, ToastPortal } from './Toast';
import confetti from 'canvas-confetti';
import { getVarType, VARIABLE_TYPES } from '../utils/variableTypes';
import VariablePicker from './VariablePicker';
import { StreakWidget, ActivityHeatmap, calculateStreaks } from './Gamification';
import { seedTestData } from '../utils/seed';
import { Flame, BarChart3, CalendarDays, FlaskConical, Plus, X, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

const CARD_ACCENTS = [
  { stripe: 'linear-gradient(135deg,#f59e0b,#f97316)', iconBg: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.15)' },
  { stripe: 'linear-gradient(135deg,#10b981,#38bdf8)', iconBg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.15)' },
  { stripe: 'linear-gradient(135deg,#f43f5e,#ec4899)', iconBg: 'rgba(244,63,94,0.12)', glow: 'rgba(244,63,94,0.15)' },
  { stripe: 'linear-gradient(135deg,#38bdf8,#818cf8)', iconBg: 'rgba(56,189,248,0.12)', glow: 'rgba(56,189,248,0.15)' },
  { stripe: 'linear-gradient(135deg,#a78bfa,#ec4899)', iconBg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.15)' },
  { stripe: 'linear-gradient(135deg,#14b8a6,#10b981)', iconBg: 'rgba(20,184,166,0.12)', glow: 'rgba(20,184,166,0.15)' },
];

const VAR_COLORS = ['#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#a78bfa'];

const getRClass = (r) => r == null || isNaN(r) ? 'none' : r > 0.1 ? 'pos' : r < -0.1 ? 'neg' : 'none';
const getRLabel = (r) => r == null || isNaN(r) ? '—' : (r > 0 ? '+' : '') + Number(r).toFixed(2);

const normalizeThread = (ch) => {
  let t = ch.variables ? ch : {
    ...ch,
    variables: [
      { name: ch.var1Name, typeId: ch.var1TypeId, icon: ch.var1Icon || '📊', unit: ch.var1Unit },
      { name: ch.var2Name, typeId: ch.var2TypeId, icon: ch.var2Icon || '📈', unit: ch.var2Unit },
    ],
  };
  t.variables = t.variables.map(v => {
    const vType = getVarType(v.typeId);
    return { ...v, icon: vType ? vType.icon : v.icon };
  });
  return t;
};

const normalizeLog = (log) => {
  if (log.values) return log;
  return { ...log, values: [log.val1, log.val2] };
};

const Dashboard = ({ user }) => {
  const location = useLocation();
  const [threads, setThreads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showOverthinkWarning, setShowOverthinkWarning] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [prefillLogs, setPrefillLogs] = useState(null);
  
  const handleOpenCreateModal = () => {
    if (threads.length >= 3) {
      setShowOverthinkWarning(true);
    } else {
      setShowModal(true);
    }
  };
  
  useEffect(() => {
    if (location.state?.prefillLogs) {
      setPrefillLogs(location.state.prefillLogs);
      setShowModal(true);
    }
  }, [location.state]);

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
  const { toasts, showToast } = useToast();

  useEffect(() => { 
    fetchAll(); 
    
    // Check if we came from Basket.jsx with prefilled variables
    if (location.state?.prefillVariables) {
      const prefill = location.state.prefillVariables.map(v => ({
        typeId: v.typeId, name: v.name, unit: v.unit
      }));
      // Pad to at least 2 variables
      while (prefill.length < 2) prefill.push({ typeId: null, name: '', unit: '' });
      
      setVariables(prefill.slice(0, 3)); // Max 3
      setShowModal(true);
      // Clear state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, []);

  const fetchAll = async () => {
    try {
      const snap = await getDocs(query(collection(db, `users/${user.uid}/chains`)));
      const fetched = [];
      snap.forEach(d => {
        fetched.push({ id: d.id, ...d.data() });
      });
      setThreads(fetched.map(t => normalizeThread(t)));

      // Fetch all logs to populate gamification
      let allDates = [];
      for (const th of fetched) {
        const logsSnap = await getDocs(collection(db, `users/${user.uid}/chains/${th.id}/logs`));
        logsSnap.forEach(l => {
          const data = l.data();
          if (data.dateString && !data.isTestData) allDates.push(data.dateString);
        });
      }
      setAllLogDates(allDates);
      const computedStreaks = calculateStreaks(allDates);
      setStreaks(computedStreaks);
      if ([7, 14, 30, 50, 100].includes(computedStreaks.current) && computedStreaks.today) {
        setTimeout(() => {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.8 }, colors: ['#f59e0b', '#10b981', '#f43f5e'] });
          showToast(`Milestone: ${computedStreaks.current} Day Streak! 🎉`, 'success', 5000);
        }, 1000);
      }
      
      const st = {};
      for (const ch of fetched) {
        try {
          const ls = await getDocs(collection(db, `users/${user.uid}/chains/${ch.id}/logs`));
          const logs = []; ls.forEach(d => logs.push(normalizeLog(d.data())));
          
          const xData = logs.map(l => l.values[0]);
          const yData = logs.map(l => l.values[1]);
          const r = calculatePearsonCorrelation(xData, yData);
          let shift = null;
          if (logs.length > 7) {
            const sortedLogs = [...logs].sort((a,b) => (a.dateString || '').localeCompare(b.dateString || ''));
            const prevLogs = sortedLogs.slice(0, sortedLogs.length - 7);
            if (prevLogs.length >= 3) {
              const prevR = calculatePearsonCorrelation(prevLogs.map(l => l.values[0]), prevLogs.map(l => l.values[1]));
              if (prevR !== null && r !== null) {
                shift = parseFloat((r - prevR).toFixed(3));
              }
            }
          }
          st[ch.id] = { r, count: logs.length, shift };
        } catch { st[ch.id] = { r: null, count: 0 }; }
      }
      setStats(st);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addVariable = () => {
    if (variables.length >= 3) return; // Max 3 variables
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
    if (!threadName.trim()) {
      showToast('Please provide a name for this thread!', 'error');
      return;
    }
    
    const hasInvalidVars = variables.some(v => !v.name.trim() || !v.typeId);
    if (hasInvalidVars) {
      showToast('Please ensure all variables have a name and type selected.', 'error');
      return;
    }
    
    setCreating(true);
    try {
      const vars = variables.map(v => {
        const vType = getVarType(v.typeId);
        return {
          name: v.name,
          typeId: v.typeId,
          unit: v.unit || vType.unit,
        };
      });

      const docData = {
        name: threadName,
        variables: vars,
        createdAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, `users/${user.uid}/chains`), docData);

      const newThread = normalizeThread({ id: ref.id, ...docData });
      setThreads(prev => [...prev, newThread]);
      setStats(prev => ({ ...prev, [ref.id]: { r: null, count: 0 } }));

      if (prefillLogs && prefillLogs.validDates && prefillLogs.dateMap) {
        let count = 0;
        for (const date of prefillLogs.validDates) {
          const vals = vars.map(v => prefillLogs.dateMap[date][v.name]);
          if (vals.every(val => val !== undefined && val !== null)) {
            await addDoc(collection(db, `users/${user.uid}/chains/${ref.id}/logs`), {
              dateString: date,
              values: vals,
              createdAt: serverTimestamp()
            });
            count++;
          }
        }
        if (count > 0) showToast(`Pre-filled ${count} logs!`, 'success');
      }
      setShowModal(false);
      setThreadName('');
      setVariables([{ typeId: null, name: '', unit: '' }, { typeId: null, name: '', unit: '' }]);
      setPrefillLogs(null);
      fetchAll();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleSeedTestData = async () => {
    setIsSeeding(true);
    try {
      await seedTestData(user.uid);
      showToast('Seeded test data!', 'success');
      setShowSeedModal(false);
      window.location.reload();
    } catch(e) { showToast('Failed', 'error'); } finally { setIsSeeding(false); }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();
  const firstName = user.displayName?.split(' ')[0] ?? 'there';

  return (
    <>
    <div className="fade-up">
      <div className="dashboard-hero">
        <div className="dashboard-hero-row">
          <div>
            <p className="dashboard-greeting-label">{greeting},</p>
            <p className="dashboard-greeting-name">{firstName}</p>
          </div>
          <button className="icon-btn" title="Seed test data" onClick={() => setShowSeedModal(true)}>
            <span style={{ display: 'flex', alignItems: 'center' }}><FlaskConical size={18} strokeWidth={2.5} /></span>
          </button>
        </div>
      </div>

      <div className="quick-stats-row fade-up d2">
        <div className="quick-stat-pill">
          <span className="quick-stat-icon" style={{ display: 'flex' }}><Flame size={16} color="var(--amber)" strokeWidth={2.5} /></span>
          <span className="quick-stat-value">{streaks.current}</span>
          <span className="quick-stat-label">day streak</span>
        </div>
        <div className="quick-stat-pill">
          <span className="quick-stat-icon" style={{ display: 'flex' }}><BarChart3 size={16} color="var(--sky)" strokeWidth={2.5} /></span>
          <span className="quick-stat-value">{allLogDates.length}</span>
          <span className="quick-stat-label">total logs</span>
        </div>
        <div className="quick-stat-pill">
          <span className="quick-stat-icon" style={{ display: 'flex' }}><CalendarDays size={16} color="var(--violet, #a78bfa)" strokeWidth={2.5} /></span>
          <span className="quick-stat-value">{new Set(allLogDates).size}</span>
          <span className="quick-stat-label">active days</span>
        </div>
      </div>

      <ActivityHeatmap allLogDates={allLogDates} />

      <div className="section-bar">
        <span className="section-eyebrow">Your Threads</span>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <span className="section-count">{threads.length} active</span>
          <button className="btn btn-amber btn-sm" onClick={handleOpenCreateModal}>
            <Plus size={16} strokeWidth={2.5} style={{ marginRight: '2px' }} />
            New Thread
          </button>
        </div>
      </div>

      <div className="chains-grid">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={`skel-${i}`} className="chain-card fade-up" style={{ animationDelay: `${i * 0.1}s`, opacity: 0.7, pointerEvents: 'none' }}>
                <div className="chain-card-accent" style={{ background: 'var(--border)' }} />
                <div className="chain-card-body">
                  <div className="chain-card-header">
                    <div style={{ width: '60%', height: '16px', background: 'var(--surface-hover)', borderRadius: '4px' }} className="glow-pulse" />
                    <div style={{ width: '20%', height: '12px', background: 'var(--surface-hover)', borderRadius: '4px' }} />
                  </div>
                  <div className="chain-r-value">
                    <div style={{ width: '40%', height: '36px', background: 'var(--surface-hover)', borderRadius: '6px', margin: '8px 0' }} className="glow-pulse" />
                  </div>
                  <div className="chain-vars-row">
                    <div style={{ width: '80px', height: '24px', background: 'var(--surface-hover)', borderRadius: '12px' }} />
                    <div style={{ width: '80px', height: '24px', background: 'var(--surface-hover)', borderRadius: '12px' }} />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : threads.length === 0 ? (
          <div className="fade-up" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: 'rgba(255,252,245,0.02)', borderRadius: 'var(--r-lg)', border: '1px dashed var(--border)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)', marginBottom: '24px' }}>
              <FlaskConical size={32} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-1)' }}>Your lab is empty</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.95rem', maxWidth: '300px', marginBottom: '24px', lineHeight: '1.5' }}>
              Create your first Thread to start logging habits, tracking symptoms, and discovering hidden correlations.
            </p>
            <button className="btn btn-amber" onClick={handleOpenCreateModal}>
              <Plus size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> Create your first Thread
            </button>
          </div>
        ) : (
          threads.map((thread, i) => {
          const { stripe, glow } = CARD_ACCENTS[i % CARD_ACCENTS.length];
          const s = stats[thread.id] || {};
          const cls = getRClass(s.r);
          const rLabel = getRLabel(s.r);
          const vars = thread.variables || [];
          const rVal = s.r ?? null;
          const barPct = rVal !== null ? Math.abs(rVal) * 50 : 0;
          const barLeft = rVal !== null && rVal >= 0 ? 50 : rVal !== null ? 50 - barPct : 50;
          const barColor = cls === 'pos' ? 'var(--corr-pos)' : cls === 'neg' ? 'var(--corr-neg)' : 'var(--text-3)';

          return (
            <Link to={`/chain/${thread.id}`} key={thread.id} className={`chain-card fade-up d${Math.min(i + 1, 6)}`} style={{ '--card-glow': glow }}>
              {/* Vertical left accent */}
              <div className="chain-card-accent" style={{ background: stripe }} />

              <div className="chain-card-body">
                {/* Thread name + log count row */}
                <div className="chain-card-header">
                  <span className="chain-card-name">{thread.name}</span>
                  <span className="chain-card-count">{s.count ?? 0} log{(s.count ?? 0) !== 1 ? 's' : ''}</span>
                </div>

                {/* Hero: correlation score */}
                <div className="chain-r-hero">
                  <span className={`chain-r-number ${cls}`}>{rLabel}</span>
                  <div className="chain-r-meta">
                    {Math.abs(s.shift || 0) > 0.2 ? (
                      <span className="chain-r-trend" style={{ color: s.shift > 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                        {s.shift > 0
                          ? <><TrendingUp size={11} style={{ display: 'inline', marginRight: 3 }} />trending up</>
                          : <><TrendingDown size={11} style={{ display: 'inline', marginRight: 3 }} />shifting</>
                        }
                      </span>
                    ) : (
                      <span className="chain-r-label-text">correlation</span>
                    )}
                  </div>
                </div>

                {/* Correlation bar */}
                <div className="chain-corr-bar-track">
                  <div className="chain-corr-bar-center" />
                  {rVal !== null && !isNaN(rVal) && (
                    <div className="chain-corr-bar-fill" style={{
                      left: `${barLeft}%`,
                      width: `${barPct}%`,
                      background: barColor,
                    }} />
                  )}
                </div>

                {/* Variable tags — colored dots, no emoji */}
                <div className="chain-card-vars">
                  {vars.map((v, vi) => (
                    <span key={vi} className="chain-var-tag">
                      <span className="chain-var-dot" style={{ background: VAR_COLORS[vi % VAR_COLORS.length] }} />
                      {v.name}
                    </span>
                  ))}
                </div>

                {/* Footer CTA */}
                <div className="chain-card-footer">
                  <span className="chain-card-cta">Explore<ArrowRight size={13} /></span>
                </div>
              </div>
            </Link>
          );
        }))}

        <button className="new-chain-tile" onClick={handleOpenCreateModal}>
          <div className="new-chain-plus"><Plus size={20} strokeWidth={2} /></div>
          <span className="new-chain-label">Track a new relationship</span>
        </button>
      </div>

      </div>

      {/* Create thread modal — now supports N variables */}
      {showModal && (
        <div className="glass-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">New Thread</span>
              <button className="modal-close" onClick={() => { setShowModal(false); }}>
                <X size={18} strokeWidth={2.5} />
              </button>
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
                          cursor: 'pointer', padding: '10px',
                        }}
                      ><X size={16} strokeWidth={2.5} /></button>
                    )}
                  </div>
                </React.Fragment>
              ))}

              {variables.length < 3 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={addVariable}
                  style={{ width: '100%', borderRadius: '10px', padding: '10px', margin: '12px 0 4px', borderStyle: 'dashed' }}
                >
                  <Plus size={16} strokeWidth={2.5} style={{ marginRight: '4px' }} /> Add another variable ({variables.length}/3)
                </button>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-amber"
                  disabled={creating}
                  style={{ flex: 1, borderRadius: '10px', padding: '12px', fontSize: '0.9rem' }}
                >
                  {creating ? 'Creating…' : 'Create Thread'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ borderRadius: '10px', padding: '12px 18px' }} onClick={() => { setShowModal(false); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Seed Test Data Modal */}
      {showSeedModal && (
        <div className="glass-overlay" onClick={e => e.target === e.currentTarget && setShowSeedModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Seed Test Data</span>
              <button className="modal-close" onClick={() => setShowSeedModal(false)}>
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div style={{ padding: '0 0 20px', color: 'var(--text-2)' }}>
              Are you sure you want to seed test data? This will create new threads with mock data. Test data will not affect your activity or streaks.
            </div>
            <div className="form-actions">
              <button
                className="btn btn-amber"
                disabled={isSeeding}
                style={{ flex: 1, borderRadius: '10px', padding: '12px' }}
                onClick={handleSeedTestData}
              >
                {isSeeding ? 'Seeding…' : 'Yes, Seed Data'}
              </button>
              <button className="btn btn-ghost" style={{ borderRadius: '10px', padding: '12px 18px' }} onClick={() => setShowSeedModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overthink Warning Modal */}
      {showOverthinkWarning && (
        <div className="glass-overlay" onClick={e => e.target === e.currentTarget && setShowOverthinkWarning(false)}>
          <div className="modal scale-in" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rose)', margin: '0 auto 24px' }}>
              <Flame size={32} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', color: 'var(--text-1)' }}>Whoa there, scientist!</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '28px', maxWidth: '320px', margin: '0 auto 28px' }}>
              You already have <strong>{threads.length}</strong> active threads. <br/><br/>
              It's great to be curious, but don't fall into the trap of over-analyzing every single detail of your life. Remember to actually <em>live</em> your life too!
            </p>
            <div className="form-actions" style={{ flexDirection: 'column', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setShowOverthinkWarning(false)}
                style={{ width: '100%', borderRadius: '10px', padding: '14px', background: 'var(--surface-hover)', color: 'var(--text-1)' }}
              >
                You're right, I'll go touch grass 🌱
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowOverthinkWarning(false);
                  setShowModal(true);
                }}
                style={{ width: '100%', borderRadius: '10px', padding: '14px', fontSize: '0.85rem', opacity: 0.6 }}
              >
                I know what I'm doing, let me track anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastPortal toasts={toasts} />
    </>
  );
};

export default Dashboard;
