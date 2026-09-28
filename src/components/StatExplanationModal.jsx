import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Activity,
  Sigma,
  Target,
  Compass,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Clock,
  HelpCircle,
  BookOpen,
  Scale,
} from 'lucide-react';
import { calculatePValue, significanceLabel, correlationCI } from '../utils/statistics';

/**
 * Returns event handlers that fire `onDoubleTap` on both desktop double-click
 * and mobile/touchscreen rapid double-tap (two taps within 320ms).
 */
export const createDoubleTapHandler = (onDoubleTap) => {
  let lastTapTime = 0;
  return {
    onDoubleClick: (e) => {
      e.stopPropagation();
      onDoubleTap(e);
    },
    onTouchEnd: (e) => {
      const now = Date.now();
      if (now - lastTapTime <= 340 && now - lastTapTime > 0) {
        e.preventDefault();
        e.stopPropagation();
        lastTapTime = 0;
        onDoubleTap(e);
      } else {
        lastTapTime = now;
      }
    },
  };
};

const STAT_TOPICS = [
  { id: 'r', label: "Pearson's r", icon: Sigma },
  { id: 'r2', label: 'R² Explained', icon: Target },
  { id: 'pvalue', label: 'P-Value', icon: ShieldCheck },
  { id: 'ci', label: '95% CI', icon: Scale },
  { id: 'strength', label: 'Strength', icon: Activity },
  { id: 'direction', label: 'Direction', icon: Compass },
  { id: 'unexplained', label: 'Unexplained', icon: Layers },
  { id: 'n', label: 'Sample Size n', icon: BookOpen },
  { id: 'quality', label: 'Data Quality', icon: Sparkles },
  { id: 'lag', label: 'Lag Effect', icon: Clock },
  { id: 'adherence', label: 'Adherence & Trend', icon: TrendingUp },
];

export const buildStatDeepDive = (topicId, { rValue, n = 0, varA = 'Variable A', varB = 'Variable B', isCurved = false, patternType = 'linear', extra = {} }) => {
  const isNull = rValue === null || rValue === undefined || isNaN(rValue);
  const absR = isNull ? 0 : Math.abs(rValue);
  const rSquared = isNull ? 0 : rValue * rValue;
  const pVal = calculatePValue(rValue, n);
  const ci = correlationCI(rValue, n);
  const qualityScore = Math.min(100, Math.round((Math.min(n, 30) / 30) * 70 + (absR > 0 ? 30 : 0)));
  const rFormatted = isNull ? '—' : `${rValue > 0 ? '+' : ''}${rValue.toFixed(4)}`;
  const rShort = isNull ? '—' : `${rValue > 0 ? '+' : ''}${rValue.toFixed(2)}`;
  const rColor = isNull ? 'var(--text-2)' : rValue > 0.1 ? '#34d399' : rValue < -0.1 ? '#fb7185' : 'var(--amber)';

  switch (topicId) {
    case 'r':
    default: {
      const dirWord = rValue > 0 ? 'increase together' : 'move in opposite directions';
      const dirDetail =
        rValue > 0
          ? `When ${varA} goes up, ${varB} tends to go up as well.`
          : `When ${varA} goes up, ${varB} reliably drops (and vice versa).`;

      return {
        id: 'r',
        title: isCurved ? 'Non-Linear Curve Relationship' : "Pearson's Correlation Coefficient (r)",
        badge: isCurved ? (patternType === 'u-shaped' ? 'U-Shaped' : 'Inverted-U') : `r = ${rFormatted}`,
        badgeColor: rColor,
        subtitle: 'Measures the linear direction and tightness between two variables on a scale from -1.0 to +1.0.',
        personalMeaning: isNull
          ? `There isn't enough variation across your ${n} entries yet to calculate a correlation between ${varA} and ${varB}.`
          : `Across your ${n} logged entries, ${varA} and ${varB} ${dirWord} with a correlation of r = ${rFormatted}. ${dirDetail} Because |r| is ${(absR * 100).toFixed(1)}% of the maximum possible 1.00, the data points cluster ${absR >= 0.8 ? 'extremely tightly' : absR >= 0.5 ? 'moderately closely' : 'loosely'} around the trend line.`,
        formula: 'r = Σ[(xᵢ - x̄)(yᵢ - ȳ)] / √[Σ(xᵢ - x̄)² · Σ(yᵢ - ȳ)²]',
        formulaNote:
          'Standardizes both variables into z-scores so units (e.g., mg, hours, 1–10 ratings) cancel out completely. A value of 0 means zero linear relationship; ±1 means every point falls on a straight line.',
        scalePosition: isNull ? 50 : ((rValue + 1) / 2) * 100,
        scaleLeft: '-1.0 (Perfect Inverse)',
        scaleMid: '0.0 (No Link)',
        scaleRight: '+1.0 (Perfect Direct)',
        tiers: [
          { range: '+0.80 to +1.00', label: 'Strong Positive — Variables rise tightly together', active: !isNull && rValue >= 0.8 },
          { range: '+0.50 to +0.79', label: 'Moderate Positive — Noticeable upward co-movement', active: !isNull && rValue >= 0.5 && rValue < 0.8 },
          { range: '+0.30 to +0.49', label: 'Weak Positive — Subtle upward tendency, noisy', active: !isNull && rValue >= 0.3 && rValue < 0.5 },
          { range: '-0.29 to +0.29', label: 'Negligible / Noise — Little to no linear link', active: !isNull && absR < 0.3 },
          { range: '-0.49 to -0.30', label: 'Weak Negative — Subtle inverse tendency', active: !isNull && rValue <= -0.3 && rValue > -0.5 },
          { range: '-0.79 to -0.50', label: 'Moderate Negative — Noticeable inverse trade-off', active: !isNull && rValue <= -0.5 && rValue > -0.8 },
          { range: '-1.00 to -0.80', label: 'Strong Negative — One rises as the other falls', active: !isNull && rValue <= -0.8 },
        ],
        takeaway:
          absR >= 0.7
            ? `Remember: correlation measures co-movement, not necessarily direct causation. To test if ${varA} directly drives ${varB}, try deliberately varying ${varA} for a few days and watching if ${varB} follows.`
            : `Keep logging consistently across both high and low days for ${varA} to see if this r value stabilizes or sharpens.`,
      };
    }

    case 'r2': {
      const pct = (rSquared * 100).toFixed(1);
      const otherPct = ((1 - rSquared) * 100).toFixed(1);
      return {
        id: 'r2',
        title: 'R² — Coefficient of Determination (Variance Explained)',
        badge: isNull ? '—' : `${pct}%`,
        badgeColor: 'var(--amber)',
        subtitle: 'The exact percentage of day-to-day fluctuation in one variable that can be predicted by the other.',
        personalMeaning: isNull
          ? `Need more varied entries to calculate R² between ${varA} and ${varB}.`
          : `Squaring your Pearson's r (${rShort}² = ${rSquared.toFixed(3)}) reveals that ${pct}% of the variance in ${varB} is statistically accounted for by changes in ${varA}. The remaining ${otherPct}% comes from other life factors, unlogged habits, or natural daily randomness.`,
        formula: 'R² = r² = 1 - (SS_residual / SS_total)',
        formulaNote:
          'People often over-interpret r = 0.50 as "50% explained," when in reality 0.50² = 0.25 (only 25% explained!). R² keeps you honest by showing the true share of variance explained.',
        scalePosition: rSquared * 100,
        scaleLeft: '0% ( explains nothing )',
        scaleMid: '50% ( half of variance )',
        scaleRight: '100% ( total lockstep )',
        tiers: [
          { range: '64% – 100% (|r| ≥ 0.8)', label: 'Dominant Driver — Explains the vast majority of swings', active: rSquared >= 0.64 },
          { range: '25% – 63% (|r| 0.5–0.79)', label: 'Meaningful Contributor — Major piece of the puzzle', active: rSquared >= 0.25 && rSquared < 0.64 },
          { range: '9% – 24% (|r| 0.3–0.49)', label: 'Minor Factor — Noticeable, but other factors dominate', active: rSquared >= 0.09 && rSquared < 0.25 },
          { range: '0% – 8% (|r| < 0.3)', label: 'Background Noise — Almost all variation comes from elsewhere', active: rSquared < 0.09 },
        ],
        takeaway: `In human behavior & health data, an R² above 25% is already substantial, and anything above 60% indicates a powerhouse relationship.`,
      };
    }

    case 'pvalue': {
      const sigText = pVal !== null ? significanceLabel(pVal) : '—';
      const probPct = pVal !== null ? Math.min(100, Math.max(0.01, pVal * 100)).toFixed(2) : null;
      return {
        id: 'pvalue',
        title: 'Two-Tailed P-Value (Statistical Significance)',
        badge: sigText,
        badgeColor: pVal !== null && pVal < 0.05 ? '#34d399' : 'var(--amber)',
        subtitle: 'The probability that a correlation this strong happened purely by random luck or coincidence.',
        personalMeaning:
          pVal === null
            ? `Log at least 3–5 entries with variation to compute a p-value.`
            : pVal < 0.001
            ? `Your p-value is less than 0.001 (less than a 0.1% chance of random fluke). Even with n = ${n} entries, a correlation of r = ${rShort} is so strong that random noise would almost never produce it.`
            : pVal < 0.05
            ? `Your p-value is ${pVal.toFixed(3)} (~${probPct}% chance of random coincidence), which passes the scientific gold-standard threshold of p < 0.05. This pattern between ${varA} and ${varB} is statistically significant.`
            : `Your p-value is ${pVal.toFixed(2)} (${probPct}% chance that random day-to-day noise could look like this). That doesn't mean the relationship is fake—it just means at n = ${n} entries, you need more data points to prove it isn't a coincidence.`,
        formula: 't = r · √[(n - 2) / (1 - r²)],   df = n - 2',
        formulaNote:
          'Converts r and sample size n into a Student t-statistic with (n - 2) degrees of freedom. Small sample sizes require a very high |r| to achieve p < 0.05, whereas large samples can validate smaller correlations.',
        scalePosition: pVal !== null ? Math.max(2, Math.min(98, (1 - Math.min(pVal, 0.2) / 0.2) * 100)) : 20,
        scaleLeft: 'p > 0.20 (Likely Noise)',
        scaleMid: 'p = 0.05 (Threshold)',
        scaleRight: 'p < 0.001 (Rock Solid ✦✦✦)',
        tiers: [
          { range: 'p < 0.001 (✦✦✦)', label: 'Highly Significant — < 0.1% chance of random fluke', active: pVal !== null && pVal < 0.001 },
          { range: 'p < 0.01 (✦✦)', label: 'Very Significant — < 1% chance of random coincidence', active: pVal !== null && pVal >= 0.001 && pVal < 0.01 },
          { range: 'p < 0.05 (✦)', label: 'Statistically Significant — Standard scientific threshold (< 5%)', active: pVal !== null && pVal >= 0.01 && pVal < 0.05 },
          { range: 'p ≥ 0.05 (ns)', label: 'Not Yet Significant — Could still be random noise; log more days', active: pVal === null || pVal >= 0.05 },
        ],
        takeaway: `Significance depends on both effect size (|r|) and sample size (n). Logging more days is the fastest way to shrink your p-value.`,
      };
    }

    case 'ci': {
      const ciText = ci ? `[${ci.lower > 0 ? '+' : ''}${ci.lower.toFixed(2)}, ${ci.upper > 0 ? '+' : ''}${ci.upper.toFixed(2)}]` : 'Need n ≥ 4';
      const crossesZero = ci ? ci.lower < 0 && ci.upper > 0 : true;
      return {
        id: 'ci',
        title: '95% Confidence Interval for Pearson’s r',
        badge: ciText,
        badgeColor: !crossesZero ? '#34d399' : 'var(--amber)',
        subtitle: 'The range where the true long-term correlation between your variables almost certainly lives.',
        personalMeaning: !ci
          ? `At least 4 data points are required to compute a 95% confidence interval via Fisher's z-transform.`
          : `Based on your ${n} entries, your observed correlation is ${rShort}, and we can be 95% confident the true underlying correlation between ${varA} and ${varB} lies between ${ci.lower > 0 ? '+' : ''}${ci.lower.toFixed(2)} and ${ci.upper > 0 ? '+' : ''}${ci.upper.toFixed(2)}. ${
              crossesZero
                ? 'Because this interval crosses 0.00, we cannot yet rule out zero correlation—more entries will narrow this band.'
                : 'Notice that the entire interval stays on one side of 0.00, confirming a reliable directional link!'
            }`,
        formula: 'z = ½ ln[(1 + r)/(1 - r)],   SE_z = 1 / √(n - 3),   z_CI = z ± 1.96 · SE_z',
        formulaNote:
          'Uses Fisher’s r-to-z transformation because sampling distributions of r are skewed near ±1. As n grows, 1/√(n - 3) shrinks and your confidence interval tightens around the true value.',
        scalePosition: ci ? Math.max(5, Math.min(95, (1 - (ci.upper - ci.lower) / 2) * 100)) : 20,
        scaleLeft: 'Wide Band (Uncertain)',
        scaleMid: 'Moderate Precision',
        scaleRight: 'Tight Band (High Precision)',
        tiers: [
          { range: 'Width < 0.20', label: 'High Precision — True correlation is pinned down tightly', active: Boolean(ci && ci.upper - ci.lower < 0.2) },
          { range: 'Width 0.20 – 0.50', label: 'Good Precision — Clear directional range', active: Boolean(ci && ci.upper - ci.lower >= 0.2 && ci.upper - ci.lower <= 0.5) },
          { range: 'Width > 0.50', label: 'Wide Range — Small sample size; band will narrow as n grows', active: Boolean(!ci || ci.upper - ci.lower > 0.5) },
        ],
        takeaway: `Rule of thumb: if the 95% Confidence Interval does NOT cross zero, your correlation is statistically significant at p < 0.05.`,
      };
    }

    case 'strength': {
      const strengthWord = absR >= 0.8 ? 'Strong' : absR >= 0.5 ? 'Moderate' : absR >= 0.3 ? 'Weak' : 'Very Weak';
      return {
        id: 'strength',
        title: 'Correlation Strength (|r| Magnitude)',
        badge: `${strengthWord} (${(absR * 100).toFixed(0)}%)`,
        badgeColor: absR >= 0.5 ? '#34d399' : 'var(--amber)',
        subtitle: 'Measures how tightly the data points hug the trend line, regardless of whether the slope goes up or down.',
        personalMeaning: `Ignoring the + or - sign, the absolute magnitude |r| = ${absR.toFixed(4)} (${(absR * 100).toFixed(0)}%) places the link between ${varA} and ${varB} in the "${strengthWord}" tier. ${
          absR >= 0.8
            ? 'Your data points form a remarkably tight band with very little scatter.'
            : absR >= 0.5
            ? 'There is a clear, unmistakable trend, with moderate day-to-day scatter around the line.'
            : 'Points are fairly spread out; other daily factors play a larger role than this single pair.'
        }`,
        formula: 'Strength = |r| ∈ [0.00, 1.00]',
        formulaNote:
          'An r of -0.95 is just as strong as +0.95! Strength only cares about proximity to ±1.00, while the sign (+ or -) tells you the direction.',
        scalePosition: absR * 100,
        scaleLeft: '0% (Pure Scatter)',
        scaleMid: '50% (Moderate)',
        scaleRight: '100% (Lockstep Line)',
        tiers: [
          { range: '|r| ≥ 0.80 (80–100%)', label: 'Strong — Exceptionally tight predictive signal', active: absR >= 0.8 },
          { range: '|r| = 0.50 – 0.79 (50–79%)', label: 'Moderate — Clear, actionable real-world pattern', active: absR >= 0.5 && absR < 0.8 },
          { range: '|r| = 0.30 – 0.49 (30–49%)', label: 'Weak — Subtle signal amidst daily noise', active: absR >= 0.3 && absR < 0.5 },
          { range: '|r| < 0.30 (0–29%)', label: 'Very Weak — Mostly independent or unlinked', active: absR < 0.3 },
        ],
        takeaway: `A strong negative correlation (like r = -0.90) is just as powerful and actionable as a strong positive one.`,
      };
    }

    case 'direction': {
      const dirLabel = isCurved ? 'Non-Linear Curve' : isNull || absR < 0.1 ? 'Flat / Neutral' : rValue > 0 ? 'Positive ↗' : 'Negative ↘';
      return {
        id: 'direction',
        title: 'Direction of Association (Slope Sign)',
        badge: dirLabel,
        badgeColor: rColor,
        subtitle: 'Tells you whether your two variables move in the same direction or trade off against each other.',
        personalMeaning: isCurved
          ? `${varA} and ${varB} follow a curved (${patternType}) pattern—meaning the direction flips after a sweet-spot threshold!`
          : rValue > 0.1
          ? `Positive Direction (↗): Higher values of ${varA} are associated with higher values of ${varB}, and lower ${varA} goes with lower ${varB}.`
          : rValue < -0.1
          ? `Negative / Inverse Direction (↘): Higher values of ${varA} are associated with lower values of ${varB}. As one rises, the other drops.`
          : `Flat / Neutral: Neither upward nor downward slope dominates between ${varA} and ${varB}.`,
        formula: 'sign(r) = sign(Cov(X, Y)) = sign(slope β₁)',
        formulaNote:
          '"Negative correlation" does NOT mean "no correlation" or "bad data"—it means an inverse relationship (like Caffeine vs. Sleep Score, or Stress vs. Focus).',
        scalePosition: isNull ? 50 : rValue > 0.1 ? 82 : rValue < -0.1 ? 18 : 50,
        scaleLeft: 'Negative ↘ (Inverse)',
        scaleMid: 'Flat → (Independent)',
        scaleRight: 'Positive ↗ (Direct)',
        tiers: [
          { range: 'Positive ↗ (r > +0.10)', label: `Direct — More ${varA} → More ${varB}`, active: !isCurved && !isNull && rValue > 0.1 },
          { range: 'Neutral → (|r| ≤ 0.10)', label: 'Flat — Changes in one do not tilt the other', active: !isCurved && (isNull || absR <= 0.1) },
          { range: 'Negative ↘ (r < -0.10)', label: `Inverse — More ${varA} → Less ${varB}`, active: !isCurved && !isNull && rValue < -0.1 },
          { range: 'Non-Linear ⌒', label: 'Biphasic — Optimal middle zone (U-shape or Inverted-U)', active: isCurved },
        ],
        takeaway: `In habit tracking, discovering a strong Negative (↘) correlation is often the most valuable insight because it exposes hidden trade-offs.`,
      };
    }

    case 'unexplained': {
      const unexpPct = isNull ? 100 : (1 - rSquared) * 100;
      return {
        id: 'unexplained',
        title: 'Unexplained Variance (1 - R²)',
        badge: isNull ? '—' : `${unexpPct.toFixed(1)}%`,
        badgeColor: 'var(--text-1)',
        subtitle: 'The portion of changes in your target variable driven by outside factors not captured by this pair.',
        personalMeaning: isNull
          ? `Cannot separate explained vs. unexplained variance yet.`
          : `While ${varA} explains ${(rSquared * 100).toFixed(1)}% of ${varB}, the remaining ${unexpPct.toFixed(1)}% of variation in ${varB} comes from other variables (sleep quality, stress, nutrition, workload, timing, or measurement noise).`,
        formula: 'Unexplained Variance = 1 - R² = SS_residual / SS_total',
        formulaNote:
          'Even in tight biological systems, 100% explained variance is rare because multiple inputs shape any daily outcome. Adding a 3rd variable to your thread can help capture part of this unexplained slice.',
        scalePosition: unexpPct,
        scaleLeft: '0% (Fully Explained)',
        scaleMid: '50% (Half Outside Factors)',
        scaleRight: '100% (All Outside Factors)',
        tiers: [
          { range: '0% – 35%', label: 'Low Residual Noise — This pair captures almost the whole story', active: unexpPct <= 35 },
          { range: '36% – 75%', label: 'Multi-Factor System — Other habits share responsibility', active: unexpPct > 35 && unexpPct <= 75 },
          { range: '76% – 100%', label: 'High Residual Variance — Look for a different primary driver', active: unexpPct > 75 },
        ],
        takeaway: `If Unexplained Variance is high (> 70%), consider testing a new variable in The Lab to find what else is moving ${varB}.`,
      };
    }

    case 'n': {
      return {
        id: 'n',
        title: 'Sample Size (n) & Statistical Power',
        badge: `n = ${n} entries`,
        badgeColor: n >= 20 ? '#34d399' : n >= 10 ? 'var(--amber)' : '#fb7185',
        subtitle: 'The number of paired daily observations used to calculate your correlation and significance.',
        personalMeaning:
          n < 10
            ? `You currently have n = ${n} logged entries. With fewer than 10 points, a single unusual day (outlier) can swing r dramatically. Keep logging to reach 14+ days!`
            : n < 20
            ? `At n = ${n} entries ("Getting reliable"), strong and moderate correlations (|r| ≥ 0.50) already pass statistical significance, and outlier distortion drops substantially.`
            : `With n = ${n} entries ("Good sample"), your dataset has solid statistical power to detect even moderate-to-subtle patterns reliably.`,
        formula: 'Degrees of Freedom (df) = n - 2',
        formulaNote:
          'Why n - 2? Because any 2 points always form a perfect straight line (r = ±1.00)! True statistical testing only begins on the 3rd point and gains stability around n = 14–30.',
        scalePosition: Math.min(100, (n / 30) * 100),
        scaleLeft: 'n = 3 (Minimum)',
        scaleMid: 'n = 15 (Reliable)',
        scaleRight: 'n = 30+ (High Power)',
        tiers: [
          { range: 'n = 3 – 9 days', label: 'Early Signal — Exploratory; sensitive to single-day outliers', active: n < 10 },
          { range: 'n = 10 – 19 days', label: 'Getting Reliable — Solid for moderate-to-strong effects', active: n >= 10 && n < 20 },
          { range: 'n = 20 – 29 days', label: 'Good Sample — High confidence and narrow error bars', active: n >= 20 && n < 30 },
          { range: 'n ≥ 30 days', label: 'Gold Standard — Central Limit Theorem stability achieved', active: n >= 30 },
        ],
        takeaway: `Each new day you log reduces the standard error by roughly 1/√(n - 3), sharpening both your p-value and 95% confidence interval.`,
      };
    }

    case 'quality': {
      return {
        id: 'quality',
        title: 'Composite Data Quality Score',
        badge: `${qualityScore}%`,
        badgeColor: qualityScore > 70 ? '#34d399' : qualityScore > 40 ? 'var(--amber)' : '#fb7185',
        subtitle: 'Evaluates how trustworthy your statistical readout is based on sample depth and signal variance.',
        personalMeaning: `Your current Data Quality score is ${qualityScore}% (${
          qualityScore > 70 ? 'Reliable' : qualityScore > 40 ? 'Building up' : 'Need more data'
        }). Up to 70 points come from your sample size progress toward 30 entries (currently ${n}/30 = ${Math.round(
          (Math.min(n, 30) / 30) * 70
        )} pts), and 30 points come from having measurable variance across both variables.`,
        formula: 'Quality = min(100, round((min(n, 30) / 30) × 70 + (|r| > 0 ? 30 : 0)))',
        formulaNote:
          'Prevents over-trusting a 100% correlation that only came from 3 or 4 logged days. Once Quality crosses 70%, you can treat the findings as dependable.',
        scalePosition: qualityScore,
        scaleLeft: '0% (Sparse)',
        scaleMid: '50% (Building Up)',
        scaleRight: '100% (30+ Days)',
        tiers: [
          { range: '71% – 100%', label: 'Reliable — Backed by ~20–30+ consistent data points', active: qualityScore > 70 },
          { range: '41% – 70%', label: 'Building Up — Meaningful trend forming; keep logging', active: qualityScore > 40 && qualityScore <= 70 },
          { range: '0% – 40%', label: 'Early Stage — Log more days before drawing conclusions', active: qualityScore <= 40 },
        ],
        takeaway: `Reach 30 logged entries to max out your Data Quality score at 100%.`,
      };
    }

    case 'lag': {
      const lagDays = extra.lag ?? 0;
      const lagR = extra.lagR ?? rValue;
      const lagRText = lagR !== null && lagR !== undefined ? `${lagR > 0 ? '+' : ''}${lagR.toFixed(3)}` : rShort;
      return {
        id: 'lag',
        title: 'Time-Lagged Cross-Correlation Analysis',
        badge: lagDays === 0 ? `Same Day (${lagRText})` : `+${lagDays}d Lag (${lagRText})`,
        badgeColor: 'var(--amber)',
        subtitle: 'Tests whether today’s habit impacts tomorrow’s outcome (or 2–4 days later) more than the same day.',
        personalMeaning:
          lagDays > 0
            ? `At a +${lagDays}-day shift, ${varA} on Day t is paired with ${varB} on Day t+${lagDays}, yielding r = ${lagRText}. If a lagged bar is taller than "Same day", it means ${varA} has a delayed carry-over effect on ${varB}!`
            : `Compares same-day pairs (Lag 0) against shifted pairs (+1 to +4 days) to detect delayed biological or behavioral carry-over effects between ${varA} and ${varB}.`,
        formula: 'r(k) = Corr( X_t ,  Y_{t + k} )   for k ∈ {0, 1, 2, 3, 4}',
        formulaNote:
          'Many real-world habits—like heavy workouts, late-night screen time, alcohol, or deep work—show their strongest impact 24 to 48 hours later (Lag +1 or +2).',
        scalePosition: Math.min(100, Math.abs(lagR || 0) * 100),
        scaleLeft: 'r(k) = 0 (No Carry-over)',
        scaleMid: 'Moderate Delay Effect',
        scaleRight: '|r(k)| = 1.0 (Strong Carry-over)',
        tiers: [
          { range: 'Peak at Same Day (Lag 0)', label: 'Immediate Effect — Variables react within the same 24h window', active: lagDays === 0 },
          { range: 'Peak at +1 Day', label: 'Next-Day Carry-Over — Today’s input shapes tomorrow’s state', active: lagDays === 1 },
          { range: 'Peak at +2 to +4 Days', label: 'Multi-Day Cumulative Lag — Recovery or compounding delay', active: lagDays >= 2 },
        ],
        takeaway: `Whenever a +1d or +2d lag correlation is stronger than Same Day, it’s a strong clue of temporal directionality (since tomorrow cannot cause yesterday!).`,
      };
    }

    case 'adherence': {
      return {
        id: 'adherence',
        title: '30-Day Adherence, Streaks & Rolling Trend',
        badge: extra.badge || `n = ${n}`,
        badgeColor: 'var(--emerald)',
        subtitle: 'Tracks logging consistency over the past 30 calendar days and compares your 7-day rolling average against the prior 2-week baseline.',
        personalMeaning: `High adherence ensures your correlation isn't biased by only logging on "good days" or "bad days" (selection bias). The 7-day rolling trend smooths out single-day spikes to show whether your baseline is genuinely rising or falling.`,
        formula: 'Adherence = (Logged Days in Last 30d) / 30,   Rolling₇(t) = (1/7) Σ_{i=0..6} X_{t-i}',
        formulaNote:
          'In self-tracking science, logging at least 70–80% of days prevents "reporting bias" and makes day-of-week & lag analysis much more accurate.',
        scalePosition: extra.pct ?? Math.min(100, (n / 30) * 100),
        scaleLeft: '0% (Sporadic)',
        scaleMid: '50% (Moderate)',
        scaleRight: '100% (Daily Habit)',
        tiers: [
          { range: '80% – 100% Adherence', label: 'High Fidelity — Minimal missing-day bias; ideal for lag analysis', active: (extra.pct ?? 0) >= 80 },
          { range: '50% – 79% Adherence', label: 'Solid Consistency — Good for same-day correlation', active: (extra.pct ?? 60) >= 50 && (extra.pct ?? 60) < 80 },
          { range: '< 50% Adherence', label: 'Sparse — Try logging daily to capture full weekly cycles', active: (extra.pct ?? 60) < 50 },
        ],
        takeaway: `Even on off-days, logging a quick entry keeps your statistical distribution unbiased and preserves your streak.`,
      };
    }
  }
};

const StatExplanationModal = ({
  isOpen = true,
  topic,
  onClose,
  rValue,
  n,
  chain,
  pattern,
  selectedPair = [0, 1],
  varA: propVarA,
  varB: propVarB,
  isCurved: propIsCurved,
  patternType: propPatternType,
  extra,
}) => {
  useEffect(() => {
    if (!isOpen || !topic) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, topic, onClose]);

  if (!isOpen || !topic) return null;

  const varA = propVarA || chain?.variables?.[selectedPair?.[0]]?.name || 'Variable A';
  const varB = propVarB || chain?.variables?.[selectedPair?.[1]]?.name || 'Variable B';
  const isCurved = propIsCurved ?? Boolean(pattern?.type && pattern.type !== 'linear');
  const patternType = propPatternType ?? (pattern?.type || 'linear');

  const details = buildStatDeepDive(topic, {
    rValue,
    n,
    varA,
    varB,
    isCurved,
    patternType,
    extra,
  });

  const ActiveIcon = STAT_TOPICS.find((t) => t.id === details.id)?.icon || HelpCircle;

  return createPortal(
    <div
      className="glass-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 10000, padding: '18px' }}
    >
      <div
        className="modal scale-in"
        style={{
          maxWidth: '620px',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #161513 0%, #0d0d0c 100%)',
          border: '1px solid rgba(245, 158, 11, 0.28)',
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 252, 245, 0.08)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            background: 'radial-gradient(ellipse 70% 80% at 85% 0%, rgba(245, 158, 11, 0.12), transparent 75%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '13px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--amber)',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <ActiveIcon size={21} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--amber)',
                  }}
                >
                  Statistical Deep-Dive
                </span>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif",
                    padding: '2px 9px',
                    borderRadius: '999px',
                    background: 'rgba(255, 252, 245, 0.06)',
                    border: '1px solid rgba(255, 252, 245, 0.14)',
                    color: details.badgeColor,
                  }}
                >
                  {details.badge}
                </span>
              </div>
              <h3 style={{ fontSize: '1.18rem', margin: 0, color: 'var(--text-1)', lineHeight: 1.3 }}>
                {details.title}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.45 }}>
                {details.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            style={{ flexShrink: 0, marginTop: '-2px' }}
            aria-label="Close statistical explanation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px 24px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. Personalized Meaning for Your Data */}
          <div
            style={{
              padding: '15px 18px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.22)',
            }}
          >
            <div
              style={{
                fontSize: '0.69rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--amber)',
                marginBottom: '6px',
              }}
            >
              What This Means For {varA} × {varB}
            </div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-1)', lineHeight: 1.6 }}>
              {details.personalMeaning}
            </div>
          </div>

          {/* 2. Spectrum Position Bar */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'rgba(255, 252, 245, 0.025)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-2)', marginBottom: '8px', fontWeight: 600 }}>
              <span>Where Your Value Sits on the Scale</span>
              <span style={{ color: details.badgeColor, fontFamily: "'Space Grotesk', sans-serif" }}>{details.badge}</span>
            </div>
            <div
              style={{
                position: 'relative',
                height: '10px',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, rgba(244,63,94,0.35) 0%, rgba(160,155,140,0.2) 50%, rgba(16,185,129,0.4) 100%)',
                border: '1px solid rgba(255, 252, 245, 0.08)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.max(3, Math.min(97, details.scalePosition))}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#faf8f3',
                  border: '3px solid #f59e0b',
                  boxShadow: '0 0 14px rgba(245, 158, 11, 0.8)',
                  transition: 'left 0.3s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: 'var(--text-3)', marginTop: '7px' }}>
              <span>{details.scaleLeft}</span>
              <span>{details.scaleMid}</span>
              <span>{details.scaleRight}</span>
            </div>
          </div>

          {/* 3. Benchmark Tiers Table */}
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-3)',
                marginBottom: '8px',
              }}
            >
              Reference Benchmarks
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {details.tiers.map((tier, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '9px 13px',
                    borderRadius: '10px',
                    background: tier.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 252, 245, 0.02)',
                    border: tier.active ? '1px solid rgba(16, 185, 129, 0.38)' : '1px solid var(--border)',
                    fontSize: '0.78rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', monospace",
                      fontWeight: 700,
                      color: tier.active ? 'var(--emerald)' : 'var(--text-2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tier.range}
                  </span>
                  <span style={{ color: tier.active ? 'var(--text-1)' : 'var(--text-3)', textAlign: 'right', fontWeight: tier.active ? 600 : 400 }}>
                    {tier.label}
                    {tier.active && (
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '0.64rem',
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: 'var(--emerald)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        Yours
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Mathematical Formula & Under the Hood */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.32)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-3)',
                marginBottom: '6px',
              }}
            >
              Mathematical Formula
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                color: 'var(--amber)',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 252, 245, 0.03)',
                border: '1px solid rgba(255, 252, 245, 0.06)',
                marginBottom: '8px',
                overflowX: 'auto',
              }}
            >
              {details.formula}
            </div>
            <div style={{ fontSize: '0.77rem', color: 'var(--text-2)', lineHeight: 1.55 }}>
              {details.formulaNote}
            </div>
          </div>

          {/* 5. Practical Takeaway */}
          <div
            style={{
              padding: '12px 15px',
              borderRadius: '11px',
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: '0.79rem',
              color: 'var(--text-2)',
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: 'var(--sky)' }}>Scientific Takeaway: </strong>
            {details.takeaway}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StatExplanationModal;
