import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Area, AreaChart, ReferenceLine,
} from 'recharts';

import { analyzePattern } from '../utils/statistics';

/* ---- Custom scatter dot ---- */
const Dot = ({ cx, cy, fill }) => (
  <g>
    <circle cx={cx} cy={cy} r={8} fill={fill} opacity={0.15} />
    <circle cx={cx} cy={cy} r={4.5} fill={fill} />
    <circle cx={cx} cy={cy} r={2} fill="white" opacity={0.6} />
  </g>
);

/* ---- Tooltip ---- */
const ScatterTip = ({ active, payload, chain }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(17,17,16,0.96)', border: '1px solid rgba(255,252,245,0.12)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', lineHeight: 1.9 }}>
      <div style={{ color: '#f59e0b' }}>{chain?.var1Name}: <strong style={{ color: '#faf8f3' }}>{payload[0]?.value} {chain?.var1Unit}</strong></div>
      <div style={{ color: '#10b981' }}>{chain?.var2Name}: <strong style={{ color: '#faf8f3' }}>{payload[1]?.value} {chain?.var2Unit}</strong></div>
      {payload[0]?.payload?.dateString && <div style={{ color: 'rgba(255,252,245,0.3)', fontSize: '0.72rem', marginTop: 2 }}>{payload[0].payload.dateString}</div>}
    </div>
  );
};

const LineTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(17,17,16,0.96)', border: '1px solid rgba(255,252,245,0.12)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', lineHeight: 1.9 }}>
      <div style={{ color: 'rgba(255,252,245,0.5)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong style={{ color: '#faf8f3' }}>{p.value}</strong></div>
      ))}
    </div>
  );
};

/* ---- Axis styles ---- */
const axisStyle = { fill: '#555047', fontSize: 11 };
const gridStyle = { stroke: 'rgba(255,252,245,0.05)', strokeDasharray: '3 4' };
const axisLine  = { stroke: 'rgba(255,252,245,0.06)' };

const CorrelationGraph = ({ logs, chain, rValue, mode }) => {
  const lineColor = rValue > 0.1 ? '#10b981' : rValue < -0.1 ? '#f43f5e' : '#a09b8c';

  /* ---- Scatter data + trend line ---- */
  const scatterData = logs.map(l => ({ x: l.val1, y: l.val2, dateString: l.dateString }));
  
  const xVals = scatterData.map(d => d.x);
  const yVals = scatterData.map(d => d.y);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  
  const pattern = analyzePattern(xVals, yVals);
  
  let trendData = [];
  if (pattern.type !== 'linear' && pattern.quad) {
    // Generate 50 points for the quadratic curve
    const step = (xMax - xMin) / 50;
    for (let x = xMin; x <= xMax; x += step) {
      trendData.push({ x, y: pattern.quad.a * (x * x) + pattern.quad.b * x + pattern.quad.c });
    }
  } else {
    // Linear regression
    const n = scatterData.length;
    const meanX = scatterData.reduce((s, d) => s + d.x, 0) / n;
    const meanY = scatterData.reduce((s, d) => s + d.y, 0) / n;
    const ssXX  = scatterData.reduce((s, d) => s + (d.x - meanX) ** 2, 0);
    const ssXY  = scatterData.reduce((s, d) => s + (d.x - meanX) * (d.y - meanY), 0);
    const slope = ssXX ? ssXY / ssXX : 0;
    const intercept = meanY - slope * meanX;
    trendData = [{ x: xMin, y: slope * xMin + intercept }, { x: xMax, y: slope * xMax + intercept }];
  }

  /* ---- Timeline data ---- */
  const timelineData = logs.map((l, i) => ({
    day: l.dateString ?? `Day ${i + 1}`,
    [chain?.var1Name]: l.val1,
    [chain?.var2Name]: l.val2,
  }));

  if (mode === 'timeline') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={timelineData} margin={{ top: 10, right: 14, bottom: 10, left: -10 }}>
          <defs>
            <linearGradient id="grad-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="day" tick={axisStyle} axisLine={axisLine} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={axisLine} tickLine={false} />
          <Tooltip content={<LineTip />} />
          <Legend
            formatter={(val) => <span style={{ color: '#a09b8c', fontSize: '0.78rem' }}>{val}</span>}
            wrapperStyle={{ paddingTop: 12 }}
          />
          <Area type="monotone" dataKey={chain?.var1Name} stroke="#f59e0b" strokeWidth={2} fill="url(#grad-a)" dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }} />
          <Area type="monotone" dataKey={chain?.var2Name} stroke="#10b981" strokeWidth={2} fill="url(#grad-b)" dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Scatter mode (default)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 14, bottom: 22, left: -10 }}>
        <CartesianGrid {...gridStyle} />
        <XAxis
          type="number" dataKey="x" name={chain?.var1Name}
          tick={axisStyle} axisLine={axisLine} tickLine={false}
          label={{ value: `${chain?.var1Name} (${chain?.var1Unit || ''})`, position: 'insideBottom', offset: -10, fill: '#555047', fontSize: 11 }}
        />
        <YAxis
          type="number" dataKey="y" name={chain?.var2Name}
          tick={axisStyle} axisLine={axisLine} tickLine={false}
          label={{ value: chain?.var2Name, angle: -90, position: 'insideLeft', fill: '#555047', fontSize: 11 }}
        />
        <Tooltip content={<ScatterTip chain={chain} />} cursor={false} />

        {/* Trend line */}
        <Scatter
          name="_trend" data={trendData}
          line={{ stroke: lineColor, strokeWidth: 1.5, strokeDasharray: '6 5', opacity: 0.55 }}
          shape={() => null} legendType="none"
        />
        {/* Data points */}
        <Scatter
          name="Data" data={scatterData}
          shape={(props) => <Dot {...props} fill="#f59e0b" />}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default CorrelationGraph;
