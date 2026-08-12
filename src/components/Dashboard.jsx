import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { calculatePearsonCorrelation } from '../utils/statistics';
import { getVarType } from '../utils/variableTypes';
import VariablePicker from './VariablePicker';

const CARD_ACCENTS = [
  { stripe: 'linear-gradient(90deg,#f59e0b,#f97316)', iconBg: 'rgba(245,158,11,0.12)' },
  { stripe: 'linear-gradient(90deg,#10b981,#38bdf8)', iconBg: 'rgba(16,185,129,0.12)' },
  { stripe: 'linear-gradient(90deg,#f43f5e,#f59e0b)', iconBg: 'rgba(244,63,94,0.12)' },
  { stripe: 'linear-gradient(90deg,#38bdf8,#818cf8)', iconBg: 'rgba(56,189,248,0.12)' },
  { stripe: 'linear-gradient(90deg,#a78bfa,#f43f5e)', iconBg: 'rgba(167,139,250,0.12)' },
];

const getRClass = (r) => r === null ? 'none' : r > 0.1 ? 'pos' : r < -0.1 ? 'neg' : 'none';
const getRLabel = (r) => r === null ? '—' : (r > 0 ? '+' : '') + r.toFixed(2);

const Dashboard = ({ user }) => {
  const [signals, setSignals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New signal form state
  const [signalName, setSignalName] = useState('');
  const [var1, setVar1] = useState({ typeId: null, name: '', unit: '' });
  const [var2, setVar2] = useState({ typeId: null, name: '', unit: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const snap = await getDocs(query(collection(db, `users/${user.uid}/chains`)));
      const fetched = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      setSignals(fetched);

      const st = {};
      for (const ch of fetched) {
        try {
          const ls = await getDocs(collection(db, `users/${user.uid}/chains/${ch.id}/logs`));
          const logs = []; ls.forEach(d => logs.push(d.data()));
          const r = calculatePearsonCorrelation(logs.map(l => l.val1), logs.map(l => l.val2));
          st[ch.id] = { r, count: logs.length };
        } catch { st[ch.id] = { r: null, count: 0 }; }
      }
      setStats(st);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!signalName || !var1.name || !var2.name || !var1.typeId || !var2.typeId) return;
    setCreating(true);
    try {
      const v1Type = getVarType(var1.typeId);
      const v2Type = getVarType(var2.typeId);
      const ref = await addDoc(collection(db, `users/${user.uid}/chains`), {
        name: signalName,
        var1Name: var1.name,
        var1TypeId: var1.typeId,
        var1Icon: v1Type.icon,
        var1Unit: var1.unit || v1Type.unit,
        var2Name: var2.name,
        var2TypeId: var2.typeId,
        var2Icon: v2Type.icon,
        var2Unit: var2.unit || v2Type.unit,
        createdAt: serverTimestamp(),
      });

      // Optimistically add the new signal to state (avoids double-fetch race)
      const newSignal = {
        id: ref.id,
        name: signalName,
        var1Name: var1.name, var1TypeId: var1.typeId,
        var1Icon: v1Type.icon, var1Unit: var1.unit || v1Type.unit,
        var2Name: var2.name, var2TypeId: var2.typeId,
        var2Icon: v2Type.icon, var2Unit: var2.unit || v2Type.unit,
      };
      setSignals(prev => [...prev, newSignal]);
      setStats(prev => ({ ...prev, [ref.id]: { r: null, count: 0 } }));

      setShowModal(false);
      setSignalName('');
      setVar1({ typeId: null, name: '', unit: '' });
      setVar2({ typeId: null, name: '', unit: '' });
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
          {signals.length === 0
            ? 'Create your first Signal to start discovering hidden correlations.'
            : `${signals.length} active signal${signals.length !== 1 ? 's' : ''}. Keep logging to strengthen your data.`}
        </p>
      </div>

      <div className="section-bar">
        <span className="section-eyebrow">Your Signals</span>
        <button className="btn btn-amber" style={{ padding: '8px 16px', fontSize: '0.82rem' }} onClick={() => setShowModal(true)}>
          + New signal
        </button>
      </div>

      <div className="chains-grid">
        {signals.map((signal, i) => {
          const { stripe, iconBg } = CARD_ACCENTS[i % CARD_ACCENTS.length];
          const s = stats[signal.id] || {};
          const cls = getRClass(s.r);
          const rLabel = getRLabel(s.r);
          const icon = signal.var1Icon ?? '📊';

          return (
            <Link to={`/chain/${signal.id}`} key={signal.id} className={`chain-card fade-up d${Math.min(i + 1, 6)}`}>
              <div className="chain-card-stripe" style={{ background: stripe }} />
              <div className="chain-card-body">
                <div className="chain-card-top">
                  <div className="chain-icon-wrap" style={{ background: iconBg }}>{icon}</div>
                  <div className={`r-badge ${cls}`}>{rLabel}</div>
                </div>
                <div className="chain-card-name">{signal.name}</div>
                <div className="chain-card-vars">
                  <span>{signal.var1Name}</span>
                  <span className="chain-card-sep">×</span>
                  <span>{signal.var2Name}</span>
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

      {/* Create signal modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">New Signal</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="input-label">Signal Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Sleep & Focus, Coffee & Productivity…"
                  value={signalName}
                  onChange={e => setSignalName(e.target.value)}
                />
              </div>

              <div className="modal-section">
                <VariablePicker label="Variable A" value={var1} onChange={setVar1} />
              </div>

              <div className="modal-connector">correlates with</div>

              <div className="modal-section">
                <VariablePicker label="Variable B" value={var2} onChange={setVar2} />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-amber"
                  disabled={creating || !signalName || !var1.name || !var2.name || !var1.typeId || !var2.typeId}
                  style={{ flex: 1, borderRadius: '10px', padding: '12px', fontSize: '0.9rem' }}
                >
                  {creating ? 'Creating…' : 'Create Signal'}
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
