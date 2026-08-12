import { analyzePattern, interpretCorrelation } from "./statistics";

/**
 * Mocks an AI generating recommendations based on habit data.
 * In production, this would call Gemini API or Firebase Vertex AI.
 */
export async function generateAiInsight(chain, logs) {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 1500));

  if (!logs || logs.length < 3) {
    return "Not enough data points yet. Keep logging to unlock AI insights!";
  }

  const xVals = logs.map(l => l.val1);
  const yVals = logs.map(l => l.val2);
  const pattern = analyzePattern(xVals, yVals);
  
  const var1 = chain.var1Name;
  const var2 = chain.var2Name;
  
  if (pattern.type === 'linear') {
    const r = pattern.linearR;
    const absR = Math.abs(r);
    
    if (absR < 0.2) {
      return `Our analysis shows virtually no linear relationship between ${var1} and ${var2}. It's highly likely these two factors operate independently in your daily life. Try tracking a different variable against ${var2} to find what really drives it.`;
    }
    
    if (r > 0) {
      if (absR >= 0.7) {
        return `There is a remarkably strong positive link here. The data strongly suggests that increasing ${var1} reliably increases ${var2}. If your goal is to maximize ${var2}, focusing your energy on ${var1} is a proven, data-backed strategy.`;
      }
      return `We've detected a moderate positive trend. More ${var1} generally means more ${var2}. It's a good habit to maintain, but remember that other external factors are also heavily influencing your ${var2}.`;
    } else {
      if (absR >= 0.7) {
        return `We've found a highly significant inverse relationship. When ${var1} goes up, ${var2} consistently plummets. If ${var2} is something you want to preserve, you should seriously consider minimizing your ${var1}.`;
      }
      return `There's a noticeable negative pull. High amounts of ${var1} tend to drag down your ${var2}. It might be worth experimenting with reducing ${var1} for a week to see if ${var2} improves.`;
    }
  } else {
    // Non-linear patterns (Biphasic/Curvy)
    if (pattern.type === 'inverted-u') {
      return `Fascinating! We've detected an "Inverted-U" (Goldilocks) pattern. This means ${var1} boosts ${var2} up to a certain point, but doing *too much* of it actually causes ${var2} to crash. You need to find the sweet spot—neither too little nor too much.`;
    } else {
      // U-shaped
      return `The data reveals a "U-shaped" curve. At moderate levels, ${var1} seems to minimize ${var2}. But at both extremes (very low or very high ${var1}), your ${var2} spikes. Consider whether this polarization is beneficial for your goals.`;
    }
  }
}
