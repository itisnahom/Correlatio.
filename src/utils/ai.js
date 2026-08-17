import { analyzePattern, interpretCorrelation } from "./statistics";

/**
 * Mocks an AI generating recommendations based on habit data.
 * In production, this would call Gemini API or Firebase Vertex AI.
 */
export async function generateAiInsight(chain, logs) {
  // Simulate network latency for "AI thinking"
  await new Promise(r => setTimeout(r, 2000));

  if (!logs || logs.length < 3) {
    return "Not enough data points yet. I need at least 3 days of logs to detect meaningful patterns and provide personalized insights!";
  }

  const vars = chain.variables;
  if (!vars || vars.length < 2) return "Insufficient variables.";

  const var1 = vars[0].name;
  const var2 = vars[1].name;

  const xVals = logs.map(l => l.values[0]).filter(v => v != null);
  const yVals = logs.map(l => l.values[1]).filter(v => v != null);
  
  const pattern = analyzePattern(xVals, yVals);
  
  // Calculate recent trend (last 3 days vs overall)
  const recentX = xVals.slice(-3).reduce((a,b)=>a+b,0)/3;
  const overallX = xVals.reduce((a,b)=>a+b,0)/xVals.length;
  const trendX = recentX > overallX ? "increasing" : "decreasing";

  let response = `Based on an analysis of your ${logs.length} logged days, here is your deep context breakdown:\n\n`;

  if (pattern.type === 'linear') {
    const r = pattern.linearR;
    const absR = Math.abs(r);
    
    if (absR < 0.2) {
      response += `**Pattern Analysis:** We found virtually no correlation (r = ${r.toFixed(2)}) between ${var1} and ${var2}. Your data points are scattered, indicating that changes in ${var1} do not predictably drive ${var2} for you. \n\n`;
      response += `**Actionable Advice:** Stop worrying about ${var1} if your primary goal is to improve ${var2}. They are independent variables in your life. Consider tracking a different metric against ${var2}, such as sleep quality or stress levels, to find the true catalyst.`;
    } else if (r > 0) {
      if (absR >= 0.7) {
        response += `**Pattern Analysis:** There is a remarkably strong positive link (r = ${r.toFixed(2)}). The data shows a tight clustering: when you increase ${var1}, your ${var2} consistently rises. \n\n`;
        response += `**Actionable Advice:** Double down on this! Since your recent trend for ${var1} is ${trendX}, you should focus on maintaining this momentum. Try setting a strict daily minimum for ${var1} to guarantee positive outcomes for ${var2}.`;
      } else {
        response += `**Pattern Analysis:** We detected a moderate positive trend (r = ${r.toFixed(2)}). Generally, more ${var1} leads to more ${var2}, but there is noticeable variance, meaning other hidden factors are also at play.\n\n`;
        response += `**Actionable Advice:** While ${var1} is a helpful driver, it's not the complete picture. Try adding a third variable (like 'Time of Day' or 'Diet') to this thread to see what accounts for the missing variance.`;
      }
    } else {
      if (absR >= 0.7) {
        response += `**Pattern Analysis:** We found a highly significant inverse relationship (r = ${r.toFixed(2)}). Your data clearly shows that ${var1} is actively cannibalizing your ${var2}.\n\n`;
        response += `**Actionable Advice:** This is a critical friction point. If ${var2} is your goal, ${var1} is your bottleneck. I recommend implementing a "friction rule" to make ${var1} 20% harder to do tomorrow, and observe the immediate boost to ${var2}.`;
      } else {
        response += `**Pattern Analysis:** There's a noticeable negative pull (r = ${r.toFixed(2)}). High amounts of ${var1} tend to drag down your ${var2} slightly, though it's not a perfect 1:1 trade-off.\n\n`;
        response += `**Actionable Advice:** You don't need to eliminate ${var1} completely, but you should monitor its dosage. Try capping ${var1} at a moderate level for the next 3 days and see if your ${var2} stabilizes.`;
      }
    }
  } else {
    if (pattern.type === 'inverted-u') {
      response += `**Pattern Analysis:** Fascinating! The AI detected an "Inverted-U" (Goldilocks) curve. This means ${var1} boosts ${var2} up to a certain point, but doing *too much* of it actually causes ${var2} to crash entirely.\n\n`;
      response += `**Actionable Advice:** More is not better! You need to find and strictly adhere to your "sweet spot." Look at your middle-range data points for ${var1}—that is your optimal daily dosage.`;
    } else {
      response += `**Pattern Analysis:** The data reveals a "U-shaped" curve. At moderate levels, ${var1} minimizes ${var2}. But at both extremes (very low or very high ${var1}), your ${var2} spikes dramatically.\n\n`;
      response += `**Actionable Advice:** You respond best to extremes. Coasting in the middle is hurting your metrics. Decide whether you want to completely abstain from ${var1} or go all-in, as the middle ground is a dead zone for ${var2}.`;
    }
  }

  // Multi-variable context
  if (vars.length > 2) {
    response += `\n\n**Multi-Variable Insight:** Because you are tracking ${vars.length} variables, I can see a broader ecosystem. Focus on the pairwise combinations with the darkest green in your correlation matrix to find your highest-leverage habits.`;
  }

  return response;
}
