import React from 'react';
import { interpretCorrelation } from '../utils/statistics';

export const EXPORT_THEMES = [
  { id: 'emerald', name: 'Emerald', bg: 'linear-gradient(135deg, #064e3b, #059669)', color: '#ecfdf5' },
  { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#f8fafc' },
  { id: 'sunset', name: 'Sunset', bg: 'linear-gradient(135deg, #7c2d12, #ea580c)', color: '#fff7ed' },
  { id: 'ocean', name: 'Ocean', bg: 'linear-gradient(135deg, #0c4a6e, #0284c7)', color: '#f0f9ff' },
  { id: 'amethyst', name: 'Amethyst', bg: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: '#f5f3ff' },
];

const ExportCard = React.forwardRef(({ chain, rValue, logsCount, themeId, user }, ref) => {
  const theme = EXPORT_THEMES.find(t => t.id === themeId) || EXPORT_THEMES[0];
  const absR = rValue !== null ? Math.abs(rValue) : 0;
  
  const getStrengthLabel = (r) => {
    if (r === null) return 'No Data';
    const a = Math.abs(r);
    if (a >= 0.8) return 'Very Strong';
    if (a >= 0.5) return 'Strong';
    if (a >= 0.3) return 'Moderate';
    return 'Weak';
  };

  const interpretation = interpretCorrelation(rValue, chain?.variables[0]?.name, chain?.variables[1]?.name);
  const firstName = user?.displayName?.split(' ')[0] || 'User';

  return (
    <div 
      ref={ref}
      style={{
        width: '800px',
        height: '450px',
        background: theme.bg,
        color: theme.color,
        borderRadius: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box',
        textRendering: 'geometricPrecision',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      {/* Background graphic/glow */}
      <div style={{
        position: 'absolute',
        top: '-20%', right: '-10%',
        width: '400px', height: '400px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />

      {/* Top section: User and App Brand */}
      <div style={{ position: 'absolute', top: '48px', left: '48px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 2 }}>
        {user?.photoURL ? (
          <img 
            src={user.photoURL} 
            alt="User" 
            style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', objectFit: 'cover' }} 
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            👤
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', lineHeight: '1.2em' }}>{firstName}</div>
          <div style={{ opacity: 0.7, fontSize: '0.9rem', lineHeight: '1.2em', marginTop: '4px' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>
      
      <div style={{ position: 'absolute', top: '48px', right: '48px', fontWeight: 700, fontSize: '1.5rem', zIndex: 2 }}>
        Correlatio<span style={{ color: 'rgba(255,255,255,0.5)' }}>.</span>
      </div>

      {/* Center content: Stats */}
      <div style={{ position: 'absolute', top: '160px', left: '48px', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
          <div style={{ fontSize: '7rem', fontWeight: 800, lineHeight: '1em' }}>
            {absR.toFixed(2)}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, opacity: 0.8, paddingBottom: '16px' }}>
            |r| SCORE
          </div>
        </div>
        
        <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '16px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>
          ● {chain.name}
        </div>
      </div>

      {/* Bottom section: Details */}
      <div style={{ position: 'absolute', bottom: '48px', left: '48px', maxWidth: '400px', zIndex: 2 }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', lineHeight: '1.2em' }}>
          {getStrengthLabel(rValue)} Correlation
        </div>
        <div style={{ opacity: 0.8, fontSize: '0.95rem', lineHeight: '1.5em' }}>
          {interpretation}
        </div>
      </div>
      
      <div style={{ position: 'absolute', bottom: '48px', right: '48px', textAlign: 'right', zIndex: 2 }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: '1em', marginBottom: '8px' }}>
          {logsCount}
        </div>
        <div style={{ opacity: 0.8, fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 600 }}>
          Data Points
        </div>
      </div>
    </div>
  );
});

export default ExportCard;
