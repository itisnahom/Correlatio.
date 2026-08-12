/**
 * Calculates the Pearson correlation coefficient (r) between two arrays of numbers.
 * @param {number[]} x - First array of numerical data
 * @param {number[]} y - Second array of numerical data
 * @returns {number|null} Pearson correlation coefficient between -1 and 1, or null if invalid.
 */
export function calculatePearsonCorrelation(x, y) {
  if (!x || !y || x.length !== y.length || x.length === 0) {
    return null;
  }

  const n = x.length;
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    
    numerator += diffX * diffY;
    denominatorX += diffX * diffX;
    denominatorY += diffY * diffY;
  }

  if (denominatorX === 0 || denominatorY === 0) {
    return 0; // Avoid division by zero if all values in an array are identical
  }

  const r = numerator / Math.sqrt(denominatorX * denominatorY);
  
  // Clamp between -1 and 1 just in case of floating point inaccuracies
  return Math.max(-1, Math.min(1, r));
}

/**
 * Returns a human-readable interpretation of the correlation coefficient.
 * @param {number} r - Pearson correlation coefficient
 * @returns {string} Interpretation string
 */
export function interpretCorrelation(r) {
  if (r === null) return "Not enough data";
  const absR = Math.abs(r);
  
  let strength = "";
  if (absR >= 0.8) strength = "Strong";
  else if (absR >= 0.5) strength = "Moderate";
  else if (absR >= 0.3) strength = "Weak";
  else strength = "Very weak or no";

  const direction = r > 0 ? "positive" : (r < 0 ? "negative" : "");
  
  return direction ? `${strength} ${direction} correlation` : "No correlation";
}

/**
 * Calculates a quadratic regression (y = ax^2 + bx + c).
 * Returns the coefficients {a, b, c} and R-squared.
 */
export function calculateQuadraticRegression(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 3) return null;
  
  const n = x.length;
  let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
  let sumY = 0, sumXY = 0, sumX2Y = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    const x2 = xi * xi;
    sumX += xi;
    sumX2 += x2;
    sumX3 += x2 * xi;
    sumX4 += x2 * x2;
    sumY += yi;
    sumXY += xi * yi;
    sumX2Y += x2 * yi;
  }
  
  const denom = (sumX4 * (sumX2 * n - sumX * sumX)) - 
                (sumX3 * (sumX3 * n - sumX * sumX2)) + 
                (sumX2 * (sumX3 * sumX - sumX2 * sumX2));
                
  if (denom === 0) return null;

  const a = ((sumX2Y * (sumX2 * n - sumX * sumX)) - 
             (sumX3 * (sumXY * n - sumY * sumX)) + 
             (sumX2 * (sumXY * sumX - sumY * sumX2))) / denom;

  const b = ((sumX4 * (sumXY * n - sumY * sumX)) - 
             (sumX2Y * (sumX3 * n - sumX * sumX2)) + 
             (sumX2 * (sumX3 * sumY - sumXY * sumX2))) / denom;

  const c = ((sumX4 * (sumX2 * sumY - sumX * sumXY)) - 
             (sumX3 * (sumX3 * sumY - sumX2 * sumXY)) + 
             (sumX2Y * (sumX3 * sumX - sumX2 * sumX2))) / denom;

  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;

  for (let i = 0; i < n; i++) {
    const yi = y[i];
    const fi = a * (x[i] * x[i]) + b * x[i] + c;
    ssTot += (yi - meanY) ** 2;
    ssRes += (yi - fi) ** 2;
  }

  const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
  return { a, b, c, rSquared };
}

/**
 * Analyzes the pattern to determine if it's linear, u-shaped, or inverted-u.
 */
export function analyzePattern(x, y) {
  const linearR = calculatePearsonCorrelation(x, y);
  const linearR2 = linearR !== null ? linearR * linearR : 0;
  
  const quad = calculateQuadraticRegression(x, y);
  
  // If quadratic model explains at least 15% more variance, it's curvy
  if (quad && quad.rSquared > linearR2 + 0.15 && Math.abs(quad.a) > 0.00001) {
    if (quad.a > 0) return { type: 'u-shaped', quad, linearR };
    return { type: 'inverted-u', quad, linearR };
  }
  
  return { type: 'linear', linearR, quad };
}
