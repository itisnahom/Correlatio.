import React, { useState } from 'react';
import { interpretCorrelation, analyzePattern } from '../utils/statistics';
import { generateAiInsight } from '../utils/ai';

const NerdModeStats = ({ rValue, n, chain, logs }) => {
  const isNull = rValue === null || isNaN(rValue);
  
  let xVals = [], yVals = [];
  if (logs) {
    xVals = logs.map(l => l.val1);
    yVals = logs.map(l => l.val2);
  }
  const pattern = logs ? analyzePattern(xVals, yVals) : { type: 'linear', linearR: rValue };
  
  const absR = isNull ? 0 : Math.abs(rValue);
  
  // R-squared: if curved, use quadratic R-squared. Otherwise linear.
  const rSquared = isNull ? 0 : (pattern.type !== 'linear' && pattern.quad) ? pattern.quad.rSquared : (rValue * rValue);
  const isCurved = pattern.type !== 'linear';
  
  const rClass = isNull ? 'none' : rValue > 0.1 ? 'pos' : rValue < -0.1 ? 'neg' : 'none';
  const rColor = rClass === 'pos' ? 'var(--corr-pos-text)' : rClass === 'neg' ? 'var(--corr-neg-text)' : 'var(--text-2)';
  const barGrad = rClass === 'pos'
    ? 'linear-gradient(90deg, #10b981, #34d399)'
    : rClass === 'neg'
    ? 'linear-gradient(90deg, #f43f5e, #fb7185)'
    : 'var(--border-bright)';

  const getInsight = () => {
    if (isNull) return 'Not enough variation to compute statistics.';
    
    if (isCurved) {
      return `Fascinating! The data shows a ${pattern.type === 'u-shaped' ? 'U-shaped (biphasic)' : 'inverted U-shaped'} curve rather than a straight line. This means ${chain?.var1Name} affects ${chain?.var2Name} differently at low vs. high extremes.`;
    }
    
    if (absR >= 0.8) return `An exceptionally tight relationship. ${chain?.var1Name} is a powerful predictor of ${chain?.var2Name} — ${(rSquared * 100).toFixed(1)}% of its variance is explained.`;
    if (absR >= 0.5) return `A meaningful signal. ${chain?.var1Name} noticeably predicts ${chain?.var2Name}, though other factors matter too.`;
    if (absR >= 0.3) return `A weak but real pattern is forming. More data will clarify if ${chain?.var1Name} genuinely affects ${chain?.var2Name}.`;
    return `No clear linear relationship yet. These variables may be independent, or you may need more data to see the signal.`;
  };

  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAskAI = async () => {
    setAiLoading(true);
    try {
      const insight = await generateAiInsight(chain, logs);
      setAiInsight(insight);
    } catch (e) {
      console.error(e);
      setAiInsight("Failed to reach AI. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const stats = [
    { label: isCurved ? 'Curve Type' : "Pearson's r", value: isCurved ? (pattern.type === 'u-shaped' ? 'U-Shape' : 'Inverted U') : (isNull ? '—' : (rValue > 0 ? '+' : '') + rValue.toFixed(4)), color: isCurved ? 'var(--amber)' : rColor },
    { label: 'R² (variance explained)', value: isNull ? '—' : (rSquared * 100).toFixed(1) + '%', color: 'var(--text-1)' },
    { label: 'Sample size n', value: n, color: 'var(--text-1)' },
    { label: 'Strength', value: absR >= 0.8 ? 'Strong' : absR >= 0.5 ? 'Moderate' : absR >= 0.3 ? 'Weak' : 'Very weak', color: 'var(--text-1)' },
    { label: 'Direction', value: isCurved ? 'Non-linear' : (isNull || absR < 0.1 ? 'None' : rValue > 0 ? 'Positive ↗' : 'Negative ↘'), color: isCurved ? 'var(--amber)' : rColor },
    { label: 'Unexplained variance', value: isNull ? '—' : ((1 - rSquared) * 100).toFixed(1) + '%', color: 'var(--text-1)' },
  ];

  return (
    <div className="card nerd-panel">
      <div className="nerd-header">
        <span>⚛</span>
        <span>Statistical Breakdown</span>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-cell">
            <div className="stat-cell-label">{s.label}</div>
            <div className="stat-cell-val" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Strength bar */}
      {!isNull && (
        <div className="stat-bar-wrap">
          <div className="stat-bar-label">
            Correlation strength: <strong style={{ color: 'var(--text-1)' }}>{(absR * 100).toFixed(0)}%</strong>
          </div>
          <div className="stat-bar-track">
            <div className="stat-bar-fill" style={{ width: `${absR * 100}%`, background: barGrad }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 5 }}>
            <span>No correlation (r = 0)</span>
            <span>Perfect (r = ±1)</span>
          </div>
        </div>
      )}

      {/* AI Insight Section */}
      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>✨ AI Recommendations</div>
          {!aiInsight && !aiLoading && (
            <button className="btn btn-amber" style={{ padding: '6px 14px', fontSize: '0.75rem' }} onClick={handleAskAI}>
              Ask AI
            </button>
          )}
        </div>
        
        {aiLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-2)' }}>
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyzing your data...
          </div>
        )}
        
        {aiInsight && !aiLoading && (
          <div className="insight-card fade-in" style={{ background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.2)', color: 'var(--text-1)' }}>
            🤖 <strong>Gemini says:</strong> {aiInsight}
          </div>
        )}
      </div>
    </div>
  );
};

export default NerdModeStats;
