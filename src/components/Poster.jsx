import React from 'react';
import { CorrelatioLogo } from './Auth';

const Poster = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1c1c1a 0%, #0a0a0a 100%)',
      color: 'white',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, rgba(16,185,129,0.07) 50%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '64px 84px',
        background: 'rgba(25, 25, 23, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '32px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)'
      }}>
        <div style={{
          filter: 'drop-shadow(0 0 32px rgba(245, 158, 11, 0.4)) drop-shadow(0 0 32px rgba(16, 185, 129, 0.4))',
          transform: 'scale(1.2)'
        }}>
          <CorrelatioLogo size={120} />
        </div>
        
        <h1 style={{
          fontSize: '4.5rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          margin: 0,
          background: 'linear-gradient(180deg, #ffffff 0%, #a09b8c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
        }}>
          Correlatio.
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--text-3)',
          fontWeight: 500,
          margin: 0,
          letterSpacing: '-0.01em'
        }}>
          Discover the hidden patterns in your life.
        </p>
      </div>
    </div>
  );
};

export default Poster;
