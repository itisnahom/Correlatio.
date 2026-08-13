import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { calculatePearsonCorrelation } from '../utils/statistics';

const Basket = ({ user }) => {
  const [threads, setThreads] = useState([]);
  const [allLogs, setAllLogs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const snap = await getDocs(collection(db, `users/${user.uid}/chains`));
      const fetched = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      setThreads(fetched);

      const logsMap = {};
      for (const ch of fetched) {
        const ls = await getDocs(collection(db, `users/${user.uid}/chains/${ch.id}/logs`));
        const logs = [];
        ls.forEach(d => logs.push({ id: d.id, ...d.data() }));
        logsMap[ch.id] = logs;
      }
      setAllLogs(logsMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Extract all unique variables (eggs) across all threads
  const eggs = useMemo(() => {
    const map = new Map();
    threads.forEach(ch => {
      // Support old format (var1/var2) 
      const vars = [
        { name: ch.var1Name, icon: ch.var1Icon || '📊', unit: ch.var1Unit, threadId: ch.id, threadName: ch.name, index: 0 },
        { name: ch.var2Name, icon: ch.var2Icon || '📈', unit: ch.var2Unit, threadId: ch.id, threadName: ch.name, index: 1 },
      ];
      vars.forEach(v => {
        const key = v.name?.toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, { ...v, sources: [{ threadId: ch.id, threadName: ch.name, index: v.index }] });
        } else if (key) {
          map.get(key).sources.push({ threadId: ch.id, threadName: ch.name, index: v.index });
        }
      });
    });
    return Array.from(map.values());
  }, [threads]);

  // Compute all pairwise correlations between eggs that share data
  const connections = useMemo(() => {
    const results = [];
    
    for (let i = 0; i < eggs.length; i++) {
      for (let j = i + 1; j < eggs.length; j++) {
        const eggA = eggs[i];
        const eggB = eggs[j];
        
        // Find threads where both eggs appear
        for (const srcA of eggA.sources) {
          for (const srcB of eggB.sources) {
            if (srcA.threadId === srcB.threadId) {
              const logs = allLogs[srcA.threadId] || [];
              if (logs.length < 3) continue;
              
              const xData = logs.map(l => srcA.index === 0 ? l.val1 : l.val2);
              const yData = logs.map(l => srcB.index === 0 ? l.val1 : l.val2);
              const r = calculatePearsonCorrelation(xData, yData);
              
              if (r !== null) {
                results.push({
                  eggA, eggB,
                  r,
                  absR: Math.abs(r),
                  threadId: srcA.threadId,
                  threadName: srcA.threadName,
                  count: logs.length,
                });
              }
            }
          }
        }
      }
    }
    
    // Sort by absolute correlation strength
    results.sort((a, b) => b.absR - a.absR);
    return results;
  }, [eggs, allLogs]);

  const getStrengthLabel = (r) => {
    const a = Math.abs(r);
    if (a >= 0.8) return 'Very Strong';
    if (a >= 0.6) return 'Strong';
    if (a >= 0.4) return 'Moderate';
    if (a >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  const getStrengthColor = (r) => {
    const a = Math.abs(r);
    if (a >= 0.6) return r > 0 ? 'var(--emerald)' : 'var(--rose)';
    if (a >= 0.3) return r > 0 ? 'var(--corr-pos-text)' : 'var(--corr-neg-text)';
    return 'var(--text-3)';
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Gathering your habits…</span></div>;

  return (
    <div className="basket-page fade-up">
      <div className="basket-hero">
        <div className="basket-icon-wrap breathe">🧺</div>
        <h1 className="basket-title">The Basket</h1>
        <p className="basket-subtitle">
          All your habits in one place. We find the hidden connections you never knew existed.
        </p>
      </div>

      {/* Eggs Grid */}
      <div className="basket-section">
        <div className="basket-section-header">
          <span className="section-eyebrow">Your Eggs</span>
          <span className="basket-count">{eggs.length} habits tracked</span>
        </div>
        
        <div className="eggs-grid">
          {eggs.map((egg, i) => (
            <div key={egg.name} className={`egg-card fade-up d${Math.min(i + 1, 6)}`}>
              <div className="egg-icon">{egg.icon}</div>
              <div className="egg-name">{egg.name}</div>
              <div className="egg-unit">{egg.unit}</div>
              <div className="egg-sources">
                {egg.sources.length} thread{egg.sources.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discovered Connections */}
      <div className="basket-section">
        <div className="basket-section-header">
          <span className="section-eyebrow">Discovered Connections</span>
          <span className="basket-count">{connections.length} pairs analyzed</span>
        </div>

        {connections.length === 0 ? (
          <div className="basket-empty card">
            <div className="basket-empty-icon">🔍</div>
            <p>Not enough data yet. Keep logging your threads — connections will appear here as patterns emerge.</p>
          </div>
        ) : (
          <div className="connections-list">
            {connections.map((conn, i) => (
              <Link
                to={`/chain/${conn.threadId}`}
                key={`${conn.eggA.name}-${conn.eggB.name}-${i}`}
                className={`connection-card card fade-up d${Math.min(i + 1, 6)}`}
              >
                <div className="conn-rank">#{i + 1}</div>
                
                <div className="conn-pair">
                  <div className="conn-egg">
                    <span className="conn-egg-icon">{conn.eggA.icon}</span>
                    <span>{conn.eggA.name}</span>
                  </div>
                  <div className="conn-link-line">
                    <div className="conn-link-dot" style={{ background: getStrengthColor(conn.r) }} />
                    <div className="conn-link-bar" style={{ background: getStrengthColor(conn.r), opacity: conn.absR }} />
                    <div className="conn-link-dot" style={{ background: getStrengthColor(conn.r) }} />
                  </div>
                  <div className="conn-egg">
                    <span className="conn-egg-icon">{conn.eggB.icon}</span>
                    <span>{conn.eggB.name}</span>
                  </div>
                </div>

                <div className="conn-stats">
                  <div className={`r-badge ${conn.r > 0.1 ? 'pos' : conn.r < -0.1 ? 'neg' : 'none'}`}>
                    r = {conn.r > 0 ? '+' : ''}{conn.r.toFixed(3)}
                  </div>
                  <div className="conn-strength" style={{ color: getStrengthColor(conn.r) }}>
                    {getStrengthLabel(conn.r)}
                  </div>
                  <div className="conn-meta">
                    {conn.count} data points · {conn.threadName}
                  </div>
                </div>

                <div className="conn-cta">Explore →</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Basket;
