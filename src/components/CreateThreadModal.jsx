import React, { useState, useRef, useEffect, useMemo } from 'react';
import { VARIABLE_TYPES, getVarType } from '../utils/variableTypes';
import { X, ArrowRight, Sparkles, ChevronLeft, Check, Plus, Shuffle, Zap } from 'lucide-react';

const VAR_COLORS = ['#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#a78bfa'];

/* ─── Curated pairing suggestions ─── */
const SUGGESTED_PAIRINGS = [
  { a: { typeId: 'hours', name: 'Hours of Sleep' }, b: { typeId: 'rating', name: 'Mood' }, emoji: '😴', label: 'Sleep & Mood' },
  { a: { typeId: 'cups', name: 'Cups of Coffee' }, b: { typeId: 'hours_foc', name: 'Focus Hours' }, emoji: '☕', label: 'Coffee & Focus' },
  { a: { typeId: 'minutes', name: 'Meditation' }, b: { typeId: 'rating', name: 'Stress Level' }, emoji: '🧘', label: 'Meditation & Stress' },
  { a: { typeId: 'workouts', name: 'Workouts' }, b: { typeId: 'rating', name: 'Energy Level' }, emoji: '💪', label: 'Exercise & Energy' },
  { a: { typeId: 'social', name: 'Screen Time' }, b: { typeId: 'sleep_q', name: 'Sleep Quality' }, emoji: '📱', label: 'Screen Time & Sleep' },
  { a: { typeId: 'glasses', name: 'Water Intake' }, b: { typeId: 'rating', name: 'Headaches' }, emoji: '💧', label: 'Hydration & Headaches' },
  { a: { typeId: 'pages', name: 'Pages Read' }, b: { typeId: 'rating', name: 'Creativity' }, emoji: '📚', label: 'Reading & Creativity' },
  { a: { typeId: 'steps', name: 'Steps Walked' }, b: { typeId: 'rating', name: 'Mood' }, emoji: '🚶', label: 'Walking & Mood' },
  { a: { typeId: 'dollars', name: 'Money Spent' }, b: { typeId: 'rating', name: 'Happiness' }, emoji: '💸', label: 'Spending & Happiness' },
  { a: { typeId: 'calories', name: 'Calories Eaten' }, b: { typeId: 'rating', name: 'Energy' }, emoji: '🍎', label: 'Diet & Energy' },
  { a: { typeId: 'hours', name: 'Hours of Sleep' }, b: { typeId: 'tasks', name: 'Tasks Done' }, emoji: '🛌', label: 'Sleep & Productivity' },
  { a: { typeId: 'boolean', name: 'Journaled?' }, b: { typeId: 'rating', name: 'Clarity' }, emoji: '✍️', label: 'Journaling & Clarity' },
];

/* ─── Step Enum ─── */
const STEP = { INSPIRE: 0, PICK_A: 1, PICK_B: 2, NAME: 3 };

/* Compact type tile for the picker */
const TypeTile = ({ type, selected, onClick, accent }) => (
  <button
    type="button"
    className={`ctm-type-tile${selected ? ' ctm-selected' : ''}`}
    onClick={onClick}
    style={selected ? { borderColor: accent, background: `${accent}12`, boxShadow: `0 0 0 1px ${accent}` } : undefined}
  >
    <span className="ctm-type-icon">{type.icon}</span>
    <span className="ctm-type-label" style={selected ? { color: accent } : undefined}>{type.label}</span>
  </button>
);

const CreateThreadModal = ({ isOpen, onClose, onSubmit, creating, prefillLogs }) => {
  const [step, setStep] = useState(STEP.INSPIRE);
  const [variables, setVariables] = useState([
    { typeId: null, name: '', unit: '' },
    { typeId: null, name: '', unit: '' },
  ]);
  const [threadName, setThreadName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const nameRef = useRef(null);
  const [shuffledPairings, setShuffledPairings] = useState([]);

  // Shuffle pairings on mount
  useEffect(() => {
    if (isOpen) {
      const shuffled = [...SUGGESTED_PAIRINGS].sort(() => Math.random() - 0.5).slice(0, 6);
      setShuffledPairings(shuffled);
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(STEP.INSPIRE);
      setVariables([{ typeId: null, name: '', unit: '' }, { typeId: null, name: '', unit: '' }]);
      setThreadName('');
      setNameEdited(false);
    }
  }, [isOpen]);

  // Auto-generate thread name
  const suggestedName = useMemo(() => {
    const names = variables.filter(v => v.name.trim()).map(v => v.name.trim());
    if (names.length >= 2) return names.join(' & ');
    if (names.length === 1) return names[0];
    return '';
  }, [variables]);

  // When entering Name step, auto-fill if not manually edited
  useEffect(() => {
    if (step === STEP.NAME && !nameEdited) {
      setThreadName(suggestedName);
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [step, suggestedName, nameEdited]);

  const handleSelectPairing = (pairing) => {
    const typeA = getVarType(pairing.a.typeId);
    const typeB = getVarType(pairing.b.typeId);
    setVariables([
      { typeId: pairing.a.typeId, name: pairing.a.name, unit: typeA?.unit || '' },
      { typeId: pairing.b.typeId, name: pairing.b.name, unit: typeB?.unit || '' },
    ]);
    setNameEdited(false);
    setStep(STEP.NAME);
  };

  const handleTypeSelect = (varIdx, typeId) => {
    const type = VARIABLE_TYPES.find(t => t.id === typeId);
    setVariables(prev => prev.map((v, i) =>
      i === varIdx ? { ...v, typeId, unit: type?.unit ?? '' } : v
    ));
  };

  const handleVarNameChange = (varIdx, name) => {
    setVariables(prev => prev.map((v, i) =>
      i === varIdx ? { ...v, name } : v
    ));
  };

  const handleVarUnitChange = (varIdx, unit) => {
    setVariables(prev => prev.map((v, i) =>
      i === varIdx ? { ...v, unit } : v
    ));
  };

  const canProceedFromA = variables[0].typeId && variables[0].name.trim();
  const canProceedFromB = variables[1].typeId && variables[1].name.trim();
  const canCreate = threadName.trim() && variables.every(v => v.typeId && v.name.trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canCreate) return;
    onSubmit({
      threadName,
      variables: variables.map(v => ({
        typeId: v.typeId,
        name: v.name,
        unit: v.unit || getVarType(v.typeId)?.unit || '',
      })),
      prefillLogs,
    });
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Tab' && !threadName.trim() && suggestedName) {
      e.preventDefault();
      setThreadName(suggestedName);
      setNameEdited(true);
    }
  };

  const reshufflePairings = () => {
    const shuffled = [...SUGGESTED_PAIRINGS].sort(() => Math.random() - 0.5).slice(0, 6);
    setShuffledPairings(shuffled);
  };

  const renderStepIndicator = () => {
    const totalSteps = 4;
    const stepLabels = ['Inspire', 'Variable A', 'Variable B', 'Name'];
    return (
      <div className="ctm-steps">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`ctm-step-dot${step === i ? ' active' : ''}${step > i ? ' done' : ''}`}>
            {step > i ? <Check size={10} strokeWidth={3} /> : null}
          </div>
        ))}
        <span className="ctm-step-text">{stepLabels[step]}</span>
      </div>
    );
  };

  const renderVariablePicker = (varIdx) => {
    const v = variables[varIdx];
    const accent = VAR_COLORS[varIdx];
    const selectedTypeDef = v.typeId ? VARIABLE_TYPES.find(t => t.id === v.typeId) : null;
    const nonCustomTypes = VARIABLE_TYPES.filter(t => t.id !== 'custom');

    return (
      <div className="ctm-var-picker fade-in">
        <div className="ctm-var-header">
          <div className="ctm-var-badge" style={{ background: accent }}>
            {String.fromCharCode(65 + varIdx)}
          </div>
          <div>
            <div className="ctm-var-title">
              {varIdx === 0 ? 'What do you want to track?' : 'What might it affect?'}
            </div>
            <div className="ctm-var-subtitle">
              {varIdx === 0 ? 'Pick something you do or experience' : 'Pick the outcome you\'re curious about'}
            </div>
          </div>
        </div>

        <div className="ctm-type-grid">
          {nonCustomTypes.map(type => (
            <TypeTile
              key={type.id}
              type={type}
              selected={v.typeId === type.id}
              onClick={() => handleTypeSelect(varIdx, type.id)}
              accent={accent}
            />
          ))}
        </div>

        {/* Custom option */}
        <button
          type="button"
          className={`ctm-custom-btn${v.typeId === 'custom' ? ' ctm-selected' : ''}`}
          onClick={() => handleTypeSelect(varIdx, 'custom')}
          style={v.typeId === 'custom' ? { borderColor: accent, background: `${accent}12` } : undefined}
        >
          <span>✍️</span> Custom Variable
        </button>

        {/* Name + Unit config — only after type is selected */}
        {v.typeId && (
          <div className="ctm-config fade-in">
            <div className="ctm-config-field">
              <label className="ctm-label">Name</label>
              <input
                className="input"
                type="text"
                placeholder={selectedTypeDef?.placeholder ?? 'Give it a name'}
                value={v.name}
                onChange={e => handleVarNameChange(varIdx, e.target.value)}
                autoFocus
              />
            </div>
            <div className="ctm-config-field">
              <label className="ctm-label">Unit</label>
              <input
                className="input"
                type="text"
                placeholder={selectedTypeDef?.unit || 'e.g. units'}
                value={v.unit}
                onChange={e => handleVarUnitChange(varIdx, e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="glass-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal ctm-modal">
        {/* Header */}
        <div className="ctm-header">
          <div className="ctm-header-left">
            {step > STEP.INSPIRE && (
              <button
                className="ctm-back-btn"
                onClick={() => setStep(s => s - 1)}
                type="button"
              >
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
            )}
            <div>
              <span className="modal-title">New Thread</span>
              {renderStepIndicator()}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ─── Step 0: Inspiration / Suggested Pairings ─── */}
          {step === STEP.INSPIRE && (
            <div className="ctm-inspire fade-in">
              <div className="ctm-inspire-intro">
                <div className="pulsatile-dot" style={{ '--dot-color': 'var(--amber)', '--glow-color': 'rgba(245,158,11,0.5)', width: '10px', height: '10px' }} />
                <span>Pick a pairing or build your own</span>
              </div>

              <div className="ctm-pairing-grid">
                {shuffledPairings.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    className="ctm-pairing-card"
                    onClick={() => handleSelectPairing(p)}
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <span className="ctm-pairing-emoji">{p.emoji}</span>
                    <span className="ctm-pairing-label">{p.label}</span>
                    <ArrowRight size={14} strokeWidth={2} className="ctm-pairing-arrow" />
                  </button>
                ))}
              </div>

              <div className="ctm-inspire-actions">
                <button
                  type="button"
                  className="ctm-shuffle-btn"
                  onClick={reshufflePairings}
                >
                  <Shuffle size={14} strokeWidth={2} /> More ideas
                </button>

                <button
                  type="button"
                  className="ctm-custom-flow-btn"
                  onClick={() => setStep(STEP.PICK_A)}
                >
                  <Zap size={14} strokeWidth={2} /> Build my own
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 1: Pick Variable A ─── */}
          {step === STEP.PICK_A && (
            <div className="fade-in">
              {renderVariablePicker(0)}
              <div className="ctm-nav">
                <button
                  type="button"
                  className="btn btn-amber ctm-next-btn"
                  disabled={!canProceedFromA}
                  onClick={() => setStep(STEP.PICK_B)}
                >
                  Next: Pick Variable B <ArrowRight size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Pick Variable B ─── */}
          {step === STEP.PICK_B && (
            <div className="fade-in">
              {/* Show a mini preview of Variable A */}
              <div className="ctm-mini-preview">
                <div className="ctm-mini-dot" style={{ background: VAR_COLORS[0] }} />
                <span>{variables[0].name || 'Variable A'}</span>
                <span className="ctm-mini-connects">connects with…</span>
              </div>
              {renderVariablePicker(1)}
              <div className="ctm-nav">
                <button
                  type="button"
                  className="btn btn-amber ctm-next-btn"
                  disabled={!canProceedFromB}
                  onClick={() => setStep(STEP.NAME)}
                >
                  Next: Name Your Thread <ArrowRight size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Name ─── */}
          {step === STEP.NAME && (
            <div className="ctm-name-step fade-in">
              {/* Visual summary of what they're tracking */}
              <div className="ctm-summary-card">
                <div className="ctm-summary-var">
                  <span className="ctm-summary-dot" style={{ background: VAR_COLORS[0] }} />
                  <span className="ctm-summary-icon">{getVarType(variables[0].typeId)?.icon}</span>
                  <span>{variables[0].name}</span>
                </div>
                <div className="ctm-summary-thread">
                  <div className="ctm-thread-line" />
                  <span className="ctm-thread-label">threads with</span>
                  <div className="ctm-thread-line" />
                </div>
                <div className="ctm-summary-var">
                  <span className="ctm-summary-dot" style={{ background: VAR_COLORS[1] }} />
                  <span className="ctm-summary-icon">{getVarType(variables[1].typeId)?.icon}</span>
                  <span>{variables[1].name}</span>
                </div>
              </div>

              <div className="ctm-name-field">
                <label className="ctm-label">Thread Name</label>
                <div className="ctm-name-input-wrap">
                  <input
                    ref={nameRef}
                    className="input ctm-name-input"
                    type="text"
                    placeholder={suggestedName || 'e.g. Sleep & Coffee'}
                    value={threadName}
                    onChange={e => { setThreadName(e.target.value); setNameEdited(true); }}
                    onKeyDown={handleNameKeyDown}
                  />
                  {!threadName.trim() && suggestedName && (
                    <span className="ctm-tab-hint">Tab to accept</span>
                  )}
                </div>
              </div>

              <div className="ctm-nav">
                <button
                  type="submit"
                  className="btn btn-amber ctm-create-btn"
                  disabled={!canCreate || creating}
                >
                  {creating ? (
                    <><span className="spinner" style={{ width: 16, height: 16, borderWidth: '2px' }} /> Creating…</>
                  ) : (
                    <><div className="pulsatile-dot" style={{ '--dot-color': '#fff', '--glow-color': 'rgba(255,255,255,0.4)', width: '6px', height: '6px', margin: '0 8px 0 0', flexShrink: 0 }} /> Create Thread</>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateThreadModal;
