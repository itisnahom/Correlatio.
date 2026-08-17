import React, { useMemo } from 'react';

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const calculateStreaks = (dateStrings) => {
  if (!dateStrings || dateStrings.length === 0) return { current: 0, longest: 0, today: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse all dates and set to midnight local time
  const dates = dateStrings.map(ds => {
    // Parse "YYYY-MM-DD" reliably into local time
    const parts = ds.split('-');
    if (parts.length !== 3) return 0;
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    dateObj.setHours(0, 0, 0, 0);
    return dateObj.getTime();
  }).filter(t => t > 0);

  // Unique and sorted descending (newest first)
  const uniqueTimes = [...new Set(dates)].sort((a, b) => b - a);
  
  const todayTime = today.getTime();
  const yesterdayTime = todayTime - 86400000;

  let currentStreak = 0;
  let longestStreak = 0;
  let loggedToday = false;

  if (uniqueTimes[0] === todayTime) {
    loggedToday = true;
  }

  // Calculate longest streak
  const ascendingTimes = [...uniqueTimes].sort((a, b) => a - b);
  let tempStreak = 0;
  let lastTime = null;

  for (let i = 0; i < ascendingTimes.length; i++) {
    const currTime = ascendingTimes[i];
    if (!lastTime) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((currTime - lastTime) / 86400000);
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }
    lastTime = currTime;
  }
  if (tempStreak > longestStreak) longestStreak = tempStreak;

  // Calculate current streak
  if (uniqueTimes[0] === todayTime || uniqueTimes[0] === yesterdayTime) {
    let curr = 1;
    for (let i = 0; i < uniqueTimes.length - 1; i++) {
      const diffDays = Math.round((uniqueTimes[i] - uniqueTimes[i + 1]) / 86400000);
      if (diffDays === 1) {
        curr++;
      } else {
        break;
      }
    }
    currentStreak = curr;
  }

  return { current: currentStreak, longest: longestStreak, today: loggedToday };
};


export const StreakWidget = ({ current, longest, today }) => {
  const isHot = current >= 3;

  return (
    <div className="streak-widget fade-up" style={{
      display: 'flex', gap: '20px', background: 'var(--surface)',
      border: `1px solid ${isHot ? 'var(--amber)' : 'var(--border)'}`,
      padding: '24px', borderRadius: 'var(--r-lg)',
      boxShadow: isHot ? '0 0 24px rgba(245,158,11,0.1)' : 'none',
      transition: 'all 0.3s ease',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '2.5rem', filter: isHot ? 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' : 'none',
        opacity: isHot ? 1 : 0.4,
        transform: isHot ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.3s ease'
      }}>
        🔥
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
            {current} Day{current !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '0.8rem', color: isHot ? 'var(--amber)' : 'var(--text-3)', fontWeight: 600 }}>
            {isHot ? 'ON FIRE!' : 'Current Streak'}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>
          Best streak: <strong>{longest}</strong>
          {!today && current > 0 && <span style={{ color: 'var(--rose)', marginLeft: '8px' }}>Log today to keep it going!</span>}
        </div>
      </div>
    </div>
  );
};


export const ActivityHeatmap = ({ allLogDates = [] }) => {
  // Show 14 weeks (98 days) to fit well on mobile/desktop
  const WEEKS = 14;
  const TOTAL_DAYS = WEEKS * 7;
  
  const heatmapData = useMemo(() => {
    // Count logs per day
    const counts = {};
    allLogDates.forEach(date => {
      counts[date] = (counts[date] || 0) + 1;
    });

    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate days backward from today
    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const str = formatDate(d);
      data.push({
        date: str,
        count: counts[str] || 0
      });
    }
    
    // Group into columns (weeks)
    const columns = [];
    for (let i = 0; i < data.length; i += 7) {
      columns.push(data.slice(i, i + 7));
    }
    return columns;
  }, [allLogDates, TOTAL_DAYS]);

  const getColor = (count) => {
    if (count === 0) return 'rgba(255,252,245,0.03)';
    if (count === 1) return 'rgba(16, 185, 129, 0.3)';
    if (count === 2) return 'rgba(16, 185, 129, 0.6)';
    return 'rgba(16, 185, 129, 1)';
  };

  return (
    <div className="heatmap-widget fade-up" style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      padding: '24px', borderRadius: 'var(--r-lg)',
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Activity Overview
      </div>
      
      <div style={{ display: 'flex', gap: '4px' }}>
        {heatmapData.map((week, wIdx) => (
          <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {week.map((day, dIdx) => (
              <div 
                key={dIdx} 
                title={`${day.date}: ${day.count} logs`}
                style={{
                  width: '12px', height: '12px', borderRadius: '3px',
                  background: getColor(day.count),
                  transition: 'transform 0.2s, background 0.2s',
                  cursor: 'crosshair',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
