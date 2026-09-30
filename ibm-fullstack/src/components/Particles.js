// Novexa Theme: Particles background component
import React from 'react';

const Particles = () => {
  // Simple animated gradient background (can be replaced with a real particles lib)
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(circle at 20% 30%, #FF6B35 0%, transparent 60%), radial-gradient(circle at 80% 70%, #E91E63 0%, transparent 60%), radial-gradient(circle at 50% 80%, #9C27B0 0%, transparent 60%)',
        opacity: 0.18,
        transition: 'opacity 0.3s',
      }}
    />
  );
};

export default Particles;
