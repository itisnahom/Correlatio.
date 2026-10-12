import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast, ToastPortal } from './Toast';
import { Zap, Check, Loader, Sparkles, ArrowRight } from 'lucide-react';

const VAR_COLORS = ['#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#a78bfa'];

const todayDateString = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const SmartLogPanel = ({ user, threads = [], todayLogs = {}, onLogSuccess }) => {
  // Mode 1 state: shared trunk values & branch-specific values
  const [sharedValues, setSharedValues] = useState({});
  const [branchValues, setBranchValues] = useState({});

  // Mode 2 state: quick-log values per thread variable (`${threadId}_${varIndex}`)
  const [quickValues, setQuickValues] = useState({});

  // Active thread selection tab for Quick Log mode when multiple threads exist
  const [activeThreadIndex, setActiveThreadIndex] = useState(0);

  // Submission tracking
  const [submittingThreadId, setSubmittingThreadId] = useState(null);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [justSavedThreadId, setJustSavedThreadId] = useState(null);

  const { toasts, showToast } = useToast();
  const today = useMemo(() => todayDateString(), []);

  // Compute shared trunks
  const trunks = useMemo(() => {
    const map = new Map();
    threads.forEach(ch => {
      (ch.variables || []).forEach((v, vi) => {
        const key = (v.name || '').toLowerCase().trim();
        if (!key) return;
        if (!map.has(key)) map.set(key, { variable: v, branches: [] });
        map.get(key).branches.push({ thread: ch, varIndex: vi });
      });
    });
    return [...map.values()].filter(t => t.branches.length >= 2);
  }, [threads]);

  // Overall progress stats
  const totalThreads = threads.length;
  const loggedCount = useMemo(() => {
    return threads.filter(t => Boolean(todayLogs[t.id])).length;
  }, [threads, todayLogs]);
  const allLoggedToday = totalThreads > 0 && loggedCount === totalThreads;

  // Auto-focus unlogged thread
  useEffect(() => {
    const firstUnloggedIdx = threads.findIndex(t => !todayLogs[t.id]);
    if (firstUnloggedIdx !== -1) {
      setActiveThreadIndex(firstUnloggedIdx);
    }
  }, [threads, todayLogs]);

  // Listen for navigation focus
  useEffect(() => {
    const handleFocus = () => {
      const el = document.getElementById('smart-log-panel');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.addEventListener('correlatio-expand-smartlog', handleFocus);
    if (window.location.search.includes('focus=tree') || window.location.search.includes('focus=quicklog')) {
      handleFocus();
    }

    return () => {
      window.removeEventListener('correlatio-expand-smartlog', handleFocus);
    };
  }, []);

  const triggerSavePulse = (threadId) => {
    setJustSavedThreadId(threadId);
    setTimeout(() => {
      setJustSavedThreadId(null);
    }, 1200);
  };

  const isBoolVar = (v) => {
    if (!v) return false;
    return v.typeId === 'boolean' || v.unit === 'bool';
  };

  // Log single thread from Quick Log Mode
  const handleQuickLog = async (thread) => {
    if (!user) return;
    setSubmittingThreadId(thread.id);

    try {
      const vars = thread.variables || [];
      const values = [];

      for (let i = 0; i < vars.length; i++) {
        const val = quickValues[`${thread.id}_${i}`];
        if (val === undefined || val === null || val === '') {
          showToast(`Please enter ${vars[i].name}`, 'error');
          setSubmittingThreadId(null);
          return;
        }
        values.push(Number(val));
      }

      await addDoc(collection(db, 'users/' + user.uid + '/chains/' + thread.id + '/logs'), {
        values,
        note: '',
        createdAt: serverTimestamp(),
        dateString: today,
      });

      triggerSavePulse(thread.id);
      showToast(`Logged entry for ${thread.name} 🔥`, 'success');

      setQuickValues(prev => {
        const next = { ...prev };
        vars.forEach((_, i) => {
          delete next[`${thread.id}_${i}`];
        });
        return next;
      });

      if (onLogSuccess) onLogSuccess();
    } catch (err) {
      console.error('Failed to log thread:', err);
      showToast('Failed to save log. Please try again.', 'error');
    } finally {
      setSubmittingThreadId(null);
    }
  };

  // Log single branch from Trunk Mode
  const handleBranchLog = async (thread, trunkVarName, trunkVarIndex) => {
    if (!user) return;
    setSubmittingThreadId(thread.id);

    try {
      const vars = thread.variables || [];
      const finalValues = [];

      for (let i = 0; i < vars.length; i++) {
        let val;
        if (i === trunkVarIndex) {
          val = sharedValues[trunkVarName];
        } else {
          val = branchValues[`${thread.id}_${i}`];
        }

        if (val === undefined || val === null || val === '') {
          showToast(`Please fill ${vars[i].name} for ${thread.name}`, 'error');
          setSubmittingThreadId(null);
          return;
        }
        finalValues.push(Number(val));
      }

      await addDoc(collection(db, 'users/' + user.uid + '/chains/' + thread.id + '/logs'), {
        values: finalValues,
        note: '',
        createdAt: serverTimestamp(),
        dateString: today,
      });

      triggerSavePulse(thread.id);
      showToast(`Logged ${thread.name} 🔥`, 'success');

      setBranchValues(prev => {
        const next = { ...prev };
        vars.forEach((_, i) => {
          delete next[`${thread.id}_${i}`];
        });
        return next;
      });

      if (onLogSuccess) onLogSuccess();
    } catch (err) {
      console.error('Failed to log branch:', err);
      showToast('Failed to save log. Please try again.', 'error');
    } finally {
      setSubmittingThreadId(null);
    }
  };

  // Batch Save all unlogged branches for a trunk
  const handleBatchLogTrunk = async (trunkObj) => {
    if (!user) return;
    const trunkVarName = trunkObj.variable.name;
    const trunkSharedVal = sharedValues[trunkVarName];

    if (trunkSharedVal === undefined || trunkSharedVal === null || trunkSharedVal === '') {
      showToast(`Please enter shared ${trunkVarName} value first`, 'error');
      return;
    }

    const unloggedBranches = trunkObj.branches.filter(b => !todayLogs[b.thread.id]);
    if (unloggedBranches.length === 0) {
      showToast('All connected threads are already logged today', 'info');
      return;
    }

    const readyToLog = [];
    for (const b of unloggedBranches) {
      const { thread, varIndex } = b;
      const vars = thread.variables || [];
      const values = [];
      let isMissing = false;

      for (let i = 0; i < vars.length; i++) {
        let val = (i === varIndex) ? trunkSharedVal : branchValues[`${thread.id}_${i}`];
        if (val === undefined || val === null || val === '') {
          isMissing = true;
          break;
        }
        values.push(Number(val));
      }

      if (isMissing) {
        showToast(`Please fill all variables for "${thread.name}"`, 'error');
        return;
      }

      readyToLog.push({ thread, values });
    }

    setIsBatchSaving(true);
    try {
      await Promise.all(
        readyToLog.map(({ thread, values }) =>
          addDoc(collection(db, 'users/' + user.uid + '/chains/' + thread.id + '/logs'), {
            values,
            note: '',
            createdAt: serverTimestamp(),
            dateString: today,
          })
        )
      );

      readyToLog.forEach(({ thread }) => triggerSavePulse(thread.id));
      showToast(`Batch saved ${readyToLog.length} threads! 🎉`, 'success');

      setBranchValues(prev => {
        const next = { ...prev };
        readyToLog.forEach(({ thread }) => {
          (thread.variables || []).forEach((_, i) => {
            delete next[`${thread.id}_${i}`];
          });
        });
        return next;
      });

      if (onLogSuccess) onLogSuccess();
    } catch (err) {
      console.error('Failed to batch save:', err);
      showToast('Failed to batch save. Please try again.', 'error');
    } finally {
      setIsBatchSaving(false);
    }
  };

  if (totalThreads === 0) {
    return null;
  }

  const hasTrunks = trunks.length > 0;
  const currentThread = threads[activeThreadIndex] || threads[0];
  const isCurrentLogged = Boolean(todayLogs[currentThread?.id]);

  return (
    <>
      <div
        id="smart-log-panel"
        className="card quick-log-card fade-up d3"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '200px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        {/* Subtle top amber highlight line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.4), transparent)',
          }}
        />

        {/* ─── Header: Mirroring ActivityHeatmap header ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--amber)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Zap size={13} strokeWidth={2.6} />
              {hasTrunks ? 'Tree Log' : 'Quick Log'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem' }}>
              <strong
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  color: allLoggedToday ? 'var(--emerald)' : 'var(--text-1)',
                }}
              >
                {loggedCount} of {totalThreads}
              </strong>
              <span style={{ color: 'var(--text-3)', marginLeft: '4px', fontSize: '0.7rem' }}>logged today</span>
            </span>
            {allLoggedToday && (
              <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', display: 'flex', alignItems: 'center' }}>
                <Check size={14} strokeWidth={3} />
              </span>
            )}
          </div>
        </div>

        {/* ─── Card Body ─── */}
        {allLoggedToday ? (
          /* State: All threads logged today */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '16px 8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--emerald)',
                marginBottom: '10px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)',
              }}
            >
              <Check size={20} strokeWidth={3} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-1)', marginBottom: '4px' }}>
              All Caught Up for Today!
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', maxWidth: '280px', lineHeight: 1.4 }}>
              Your streak is safe. Explore correlations below or come back tomorrow.
            </div>
          </div>
        ) : hasTrunks ? (
          /* State: Mode 1 - Tree Trunks Exist */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {trunks.map(({ variable: v, branches }) => {
              const isBool = isBoolVar(v);
              const sharedVal = sharedValues[v.name] ?? '';
              const unloggedBranches = branches.filter(b => !todayLogs[b.thread.id]);

              return (
                <div
                  key={v.name}
                  style={{
                    background: 'rgba(245, 158, 11, 0.04)',
                    border: '1px dashed rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                  }}
                >
                  {/* Shared Variable Input Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{v.icon || '🌱'}</span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{v.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--amber)' }}>Shared across {branches.length} threads</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isBool ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.75rem',
                              borderColor: sharedVal === 1 ? 'var(--emerald)' : 'var(--border)',
                              color: sharedVal === 1 ? 'var(--emerald)' : 'var(--text-2)',
                              background: sharedVal === 1 ? 'rgba(16,185,129,0.1)' : 'transparent',
                            }}
                            onClick={() => setSharedValues(prev => ({ ...prev, [v.name]: 1 }))}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.75rem',
                              borderColor: sharedVal === 0 ? 'var(--rose)' : 'var(--border)',
                              color: sharedVal === 0 ? 'var(--rose)' : 'var(--text-2)',
                              background: sharedVal === 0 ? 'rgba(244,63,94,0.1)' : 'transparent',
                            }}
                            onClick={() => setSharedValues(prev => ({ ...prev, [v.name]: 0 }))}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <input
                          className="input"
                          type="number"
                          placeholder={v.unit || 'Value'}
                          value={sharedVal}
                          onChange={e => setSharedValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                          style={{ width: '90px', padding: '4px 8px', fontSize: '0.82rem' }}
                        />
                      )}

                      {unloggedBranches.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-amber"
                          disabled={isBatchSaving || sharedVal === ''}
                          onClick={() => handleBatchLogTrunk({ variable: v, branches })}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          {isBatchSaving ? <Loader size={12} className="spin" /> : null}
                          Save All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Connected branches */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {branches.map(({ thread, varIndex }) => {
                      const isLogged = Boolean(todayLogs[thread.id]);
                      if (isLogged) return null;

                      return (
                        <div
                          key={thread.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 500, minWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {thread.name}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {thread.variables.map((tVar, i) => {
                              if (i === varIndex) return null;
                              const bVal = branchValues[`${thread.id}_${i}`] ?? '';
                              const vIsBool = isBoolVar(tVar);

                              return vIsBool ? (
                                <div key={i} style={{ display: 'flex', gap: '2px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: '2px 6px', fontSize: '0.7rem', borderColor: bVal === 1 ? 'var(--emerald)' : 'var(--border)' }}
                                    onClick={() => setBranchValues(prev => ({ ...prev, [`${thread.id}_${i}`]: 1 }))}
                                  >
                                    Y
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: '2px 6px', fontSize: '0.7rem', borderColor: bVal === 0 ? 'var(--rose)' : 'var(--border)' }}
                                    onClick={() => setBranchValues(prev => ({ ...prev, [`${thread.id}_${i}`]: 0 }))}
                                  >
                                    N
                                  </button>
                                </div>
                              ) : (
                                <input
                                  key={i}
                                  className="input"
                                  type="number"
                                  placeholder={tVar.name}
                                  value={bVal}
                                  onChange={e => setBranchValues(prev => ({ ...prev, [`${thread.id}_${i}`]: e.target.value }))}
                                  style={{ width: '80px', padding: '3px 6px', fontSize: '0.78rem' }}
                                />
                              );
                            })}

                            <button
                              type="button"
                              className="btn btn-amber"
                              disabled={submittingThreadId === thread.id || sharedVal === ''}
                              onClick={() => handleBranchLog(thread, v.name, varIndex)}
                              style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Log
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* State: Mode 2 - Clean Inline Quick Entry */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {/* Thread selector tabs if multiple threads exist */}
            {threads.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {threads.map((t, idx) => {
                  const isLogged = Boolean(todayLogs[t.id]);
                  const isActive = idx === activeThreadIndex;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveThreadIndex(idx)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--amber)' : isLogged ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                        background: isActive ? 'rgba(245,158,11,0.1)' : isLogged ? 'rgba(16,185,129,0.05)' : 'transparent',
                        color: isActive ? 'var(--amber)' : isLogged ? 'var(--emerald)' : 'var(--text-3)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isLogged && <Check size={11} strokeWidth={3} />}
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Current Thread Header and Inputs */}
            {currentThread && !isCurrentLogged ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>
                    {currentThread.name}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>Today's values</span>
                </div>

                {/* Horizontal inputs layout */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(currentThread.variables || []).map((v, i) => {
                    const isBool = isBoolVar(v);
                    const curVal = quickValues[`${currentThread.id}_${i}`] ?? '';
                    const dotColor = VAR_COLORS[i % VAR_COLORS.length];

                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          minWidth: '110px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-2)' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.name}
                          </span>
                        </div>

                        {isBool ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                flex: 1,
                                padding: '5px',
                                fontSize: '0.72rem',
                                borderColor: curVal === 1 ? 'var(--emerald)' : 'var(--border)',
                                color: curVal === 1 ? 'var(--emerald)' : 'var(--text-2)',
                                background: curVal === 1 ? 'rgba(16,185,129,0.1)' : 'transparent',
                              }}
                              onClick={() => setQuickValues(prev => ({ ...prev, [`${currentThread.id}_${i}`]: 1 }))}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                flex: 1,
                                padding: '5px',
                                fontSize: '0.72rem',
                                borderColor: curVal === 0 ? 'var(--rose)' : 'var(--border)',
                                color: curVal === 0 ? 'var(--rose)' : 'var(--text-2)',
                                background: curVal === 0 ? 'rgba(244,63,94,0.1)' : 'transparent',
                              }}
                              onClick={() => setQuickValues(prev => ({ ...prev, [`${currentThread.id}_${i}`]: 0 }))}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              className="input"
                              type="number"
                              placeholder={v.unit || '0'}
                              value={curVal}
                              onChange={e => setQuickValues(prev => ({ ...prev, [`${currentThread.id}_${i}`]: e.target.value }))}
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem' }}
                            />
                            {v.unit && (
                              <span style={{ position: 'absolute', right: '8px', fontSize: '0.68rem', color: 'var(--text-3)', pointerEvents: 'none' }}>
                                {v.unit}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Save Button */}
                  <div style={{ alignSelf: 'flex-end', minWidth: '80px' }}>
                    <button
                      type="button"
                      className="btn btn-amber"
                      disabled={submittingThreadId === currentThread.id}
                      onClick={() => handleQuickLog(currentThread)}
                      style={{
                        width: '100%',
                        padding: '7px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      {submittingThreadId === currentThread.id ? <Loader size={12} className="spin" /> : 'Log'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: 'var(--emerald)',
                  fontSize: '0.82rem',
                  gap: '6px',
                }}
              >
                <Check size={14} strokeWidth={3} /> {currentThread?.name} already logged today!
              </div>
            )}
          </div>
        )}
      </div>

      <ToastPortal toasts={toasts} />
    </>
  );
};

export default SmartLogPanel;
