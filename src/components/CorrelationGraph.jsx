import React, { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, AreaChart, ComposedChart, Line,
} from 'recharts';

import { analyzePattern, calculatePearsonCorrelation } from '../utils/statistics';

/* ---- Animated scatter dot with glow ---- */
const Dot = ({ cx, cy, fill, index }) => (
  <g>
    <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.08}>
      <animate attributeName="r" values="10;14;10" dur="3s" repeatCount="indefinite" begin={`${(index || 0) * 0.1}s`} />
    </circle>
    <circle cx={cx} cy={cy} r={5} fill={fill} opacity={0.9}>
      <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx={cx} cy={cy} r={2} fill="#faf8f3" opacity={0.7} />
  </g>
);

/* ---- Enhanced tooltips ---- */
const ScatterTip = ({ active, payload, chain }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,252,245,0.12)',
      borderRadius: 12, padding: '12px 16px', fontSize: '0.8rem', lineHeight: 1.9,
      backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{chain?.var1Icon ?? '📊'}</span>
        {chain?.var1Name}: <strong style={{ color: '#faf8f3' }}>{payload[0]?.value} {chain?.var1Unit}</strong>
      </div>
      <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{chain?.var2Icon ?? '📈'}</span>
        {chain?.var2Name}: <strong style={{ color: '#faf8f3' }}>{payload[1]?.value} {chain?.var2Unit}</strong>
      </div>
      {payload[0]?.payload?.dateString && (
        <div style={{ color: 'rgba(255,252,245,0.3)', fontSize: '0.7rem', marginTop: 4, borderTop: '1px solid rgba(255,252,245,0.06)', paddingTop: 4 }}>
          {payload[0].payload.dateString}
        </div>
      )}
    </div>
  );
};

const LineTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,252,245,0.12)',
      borderRadius: 12, padding: '12px 16px', fontSize: '0.8rem', lineHeight: 1.9,
      backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color: 'rgba(255,252,245,0.4)', marginBottom: 4, fontSize: '0.72rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', alignItems: 'center', gap: 6 }}>
          {p.name}: <strong style={{ color: '#faf8f3' }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ---- Axis styles ---- */
const axisStyle = { fill: '#555047', fontSize: 11, fontFamily: 'Inter, sans-serif' };
const gridStyle = { stroke: 'rgba(255,252,245,0.04)', strokeDasharray: '3 6' };
const axisLine = { stroke: 'rgba(255,252,245,0.06)' };

/* ---- Heatmap Component (built with CSS, no extra library) ---- */
const HeatMap = ({ logs, allVars, varColors }) => {
  const getLogValue = (log, index) => {
    if (log.values) return log.values[index];
    if (index === 0) return log.val1;
    if (index === 1) return log.val2;
    return null;
  };

  const matrix = useMemo(() => {
    const result = [];
    for (let i = 0; i < allVars.length; i++) {
      const row = [];
      for (let j = 0; j < allVars.length; j++) {
        if (i === j) { row.push(1); continue; }
        const x = logs.map(l => getLogValue(l, i)).filter(v => v != null);
        const y = logs.map(l => getLogValue(l, j)).filter(v => v != null);
        const minLen = Math.min(x.length, y.length);
        row.push(calculatePearsonCorrelation(x.slice(0, minLen), y.slice(0, minLen)));
      }
      result.push(row);
    }
    return result;
  }, [logs, allVars]);

  const getCellColor = (r) => {
    if (r === null) return 'rgba(255,252,245,0.03)';
    if (r === 1) return 'rgba(255,252,245,0.08)';
    const a = Math.abs(r);
    if (r > 0) return `rgba(16, 185, 129, ${a * 0.5 + 0.05})`;
    return `rgba(244, 63, 94, ${a * 0.5 + 0.05})`;
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `80px repeat(${allVars.length}, 1fr)`,
        gap: 3,
      }}>
        {/* Header row */}
        <div /> {/* empty corner */}
        {allVars.map((v, j) => (
          <div key={`h-${j}`} style={{
            textAlign: 'center', fontSize: '0.7rem', color: varColors?.[j] || 'var(--text-2)',
            padding: '6px 2px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {v.icon} {v.name}
          </div>
        ))}

        {/* Data rows */}
        {allVars.map((v, i) => (
          <React.Fragment key={`row-${i}`}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.7rem', color: varColors?.[i] || 'var(--text-2)',
              fontWeight: 600, paddingRight: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {v.icon} {v.name}
            </div>
            {matrix[i]?.map((r, j) => (
              <div
                key={`cell-${i}-${j}`}
                className="heatmap-cell"
                style={{
                  background: getCellColor(r),
                  borderRadius: 8,
                  padding: '10px 4px',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: i === j ? 'var(--text-3)' : r > 0.1 ? '#34d399' : r < -0.1 ? '#fb7185' : 'var(--text-3)',
                  cursor: i !== j ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  border: i === j ? '1px solid rgba(255,252,245,0.05)' : '1px solid transparent',
                  minHeight: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={r !== null ? `r = ${r.toFixed(3)}` : 'N/A'}
              >
                {i === j ? '—' : r !== null ? r.toFixed(2) : '—'}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const CorrelationGraph = ({ logs, chain, rValue, mode, allLogs, allVars, varColors }) => {
  const lineColor = rValue > 0.1 ? '#10b981' : rValue < -0.1 ? '#f43f5e' : '#a09b8c';

  /* ---- Scatter data + trend line ---- */
  const scatterData = logs.map(l => ({ x: l.val1, y: l.val2, dateString: l.dateString }));

  const xVals = scatterData.map(d => d.x);
  const yVals = scatterData.map(d => d.y);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);

  const pattern = analyzePattern(xVals, yVals);

  let trendData = [];
  if (pattern.type !== 'linear' && pattern.quad) {
    const step = (xMax - xMin) / 50;
    for (let x = xMin; x <= xMax; x += step) {
      trendData.push({ x, y: pattern.quad.a * (x * x) + pattern.quad.b * x + pattern.quad.c });
    }
  } else {
    const n = scatterData.length;
    const meanX = scatterData.reduce((s, d) => s + d.x, 0) / n;
    const meanY = scatterData.reduce((s, d) => s + d.y, 0) / n;
    const ssXX = scatterData.reduce((s, d) => s + (d.x - meanX) ** 2, 0);
    const ssXY = scatterData.reduce((s, d) => s + (d.x - meanX) * (d.y - meanY), 0);
    const slope = ssXX ? ssXY / ssXX : 0;
    const intercept = meanY - slope * meanX;
    trendData = [{ x: xMin, y: slope * xMin + intercept }, { x: xMax, y: slope * xMax + intercept }];
  }

  /* ---- HEATMAP MODE ---- */
  if (mode === 'heatmap') {
    const heatVars = allVars || [
      { name: chain?.var1Name, icon: chain?.var1Icon || '📊', unit: chain?.var1Unit },
      { name: chain?.var2Name, icon: chain?.var2Icon || '📈', unit: chain?.var2Unit },
    ];
    const heatLogs = allLogs || logs;
    return <HeatMap logs={heatLogs} allVars={heatVars} varColors={varColors} />;
  }

  /* ---- TIMELINE MODE with all variables ---- */
  if (mode === 'timeline') {
    const timeVars = allVars || [
      { name: chain?.var1Name, icon: chain?.var1Icon },
      { name: chain?.var2Name, icon: chain?.var2Icon },
    ];
    const useLogs = allLogs || logs;
    const getVal = (log, idx) => {
      if (log.values) return log.values[idx];
      if (idx === 0) return log.val1;
      if (idx === 1) return log.val2;
      return null;
    };

    const timelineData = useLogs.map((l, i) => {
      const entry = { day: l.dateString ?? `Day ${i + 1}` };
      timeVars.forEach((v, vi) => { entry[v.name] = getVal(l, vi); });
      return entry;
    });

    const colors = varColors || ['#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#a78bfa'];

    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={timelineData} margin={{ top: 10, right: 14, bottom: 10, left: -10 }}>
          <defs>
            {timeVars.map((v, vi) => (
              <linearGradient key={vi} id={`tl-grad-${vi}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[vi]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={colors[vi]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="day" tick={axisStyle} axisLine={axisLine} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={axisLine} tickLine={false} />
          <Tooltip content={<LineTip />} />
          <Legend
            formatter={(val) => <span style={{ color: '#a09b8c', fontSize: '0.78rem' }}>{val}</span>}
            wrapperStyle={{ paddingTop: 12 }}
          />
          {timeVars.map((v, vi) => (
            <Area
              key={vi}
              type="monotone"
              dataKey={v.name}
              stroke={colors[vi]}
              strokeWidth={2}
              fill={`url(#tl-grad-${vi})`}
              dot={{ fill: colors[vi], r: 3, strokeWidth: 0 }}
              animationDuration={800 + vi * 200}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  /* ---- SCATTER MODE (default) ---- */
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 10, right: 14, bottom: 22, left: -10 }}>
        <defs>
          <radialGradient id="scatter-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </radialGradient>
        </defs>
        <CartesianGrid {...gridStyle} />
        <XAxis
          type="number" dataKey="x" name={chain?.var1Name}
          tick={axisStyle} axisLine={axisLine} tickLine={false}
          label={{ value: `${chain?.var1Icon ?? '📊'} ${chain?.var1Name} (${chain?.var1Unit || ''})`, position: 'insideBottom', offset: -12, fill: '#f59e0b', fontSize: 11 }}
        />
        <YAxis
          type="number" dataKey="y" name={chain?.var2Name}
          tick={axisStyle} axisLine={axisLine} tickLine={false}
          label={{ value: `${chain?.var2Icon ?? '📈'} ${chain?.var2Name}`, angle: -90, position: 'insideLeft', fill: '#10b981', fontSize: 11 }}
        />
        <Tooltip content={<ScatterTip chain={chain} />} cursor={false} />

        {/* Trend line with glow */}
        <Scatter
          name="_trend" data={trendData}
          line={{ stroke: lineColor, strokeWidth: 2, strokeDasharray: '6 4', opacity: 0.6 }}
          shape={() => null} legendType="none"
        />
        {/* Trend line glow shadow */}
        <Scatter
          name="_trendglow" data={trendData}
          line={{ stroke: lineColor, strokeWidth: 6, opacity: 0.1 }}
          shape={() => null} legendType="none"
        />
        {/* Data points */}
        <Scatter
          name="Data" data={scatterData}
          shape={(props) => <Dot {...props} fill="#f59e0b" />}
          animationDuration={1200}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default CorrelationGraph;
