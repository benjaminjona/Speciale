import React, { useState, useEffect } from 'react';

interface BookProps {
  progress: number;
}

const BookProgressBar: React.FC<BookProps> = ({ progress }) => {
  const [flipKey, setFlipKey] = useState(0);

  useEffect(() => {
    if (progress > 0) setFlipKey(prev => prev + 1);
  }, [progress]);

  const clamped = Math.min(Math.max(progress, 0), 100);

  // Max width for each stack in pixels
  const maxWidth = 120;
  // Left stack grows, right stack shrinks
  const leftWidth = (clamped / 100) * maxWidth;
  const rightWidth = maxWidth - leftWidth;

  return (
    <div style={containerStyle}>
      <div style={perspectiveWrapper}>

        {/* THE SPINE (Center Anchor) */}
        <div style={spineStyle} />

        {/* LEFT STACK (Read) */}
        <div style={{
          ...stackBase,
          right: '50%',
          width: `${leftWidth}px`,
          backgroundColor: '#fff',
          borderRight: '2px solid #ccc',
          boxShadow: '-2px 4px 10px rgba(0,0,0,0.1)',
          borderRadius: '4px 0 0 4px',
          zIndex: 5
        }}>
          {/* Faked "page edges" texture */}
          <div style={edgeTexture} />
        </div>

        {/* RIGHT STACK (Unread) */}
        <div style={{
          ...stackBase,
          left: '50%',
          width: `${rightWidth}px`,
          backgroundColor: '#fff',
          borderLeft: '2px solid #ccc',
          boxShadow: '2px 4px 10px rgba(0,0,0,0.1)',
          borderRadius: '0 4px 4px 0',
          zIndex: 5
        }}>
          <div style={edgeTexture} />
        </div>

        {/* THE FLIPPING PAGE (Visual indicator of action) */}
        <div
          key={flipKey}
          style={{
            ...flipPageBase,
            left: '50%',
            animation: flipKey > 0 ? 'topDownFlip 0.6s ease-in-out forwards' : 'none',
            zIndex: 10,
          }}
        >
          <div style={pageContent} />
        </div>

      </div>

      <style>{`
        @keyframes topDownFlip {
          0% { transform: rotateY(0deg) scaleX(1); opacity: 1; }
          50% { transform: rotateY(-90deg) scaleX(0.8); opacity: 0.8; }
          100% { transform: rotateY(-180deg) scaleX(1); opacity: 0; }
        }
      `}</style>

      <div style={labelStyle}>
        <span style={{color: '#999'}}>0%</span>
        <span style={{fontSize: '20px', fontWeight: 'bold'}}>{clamped}%</span>
        <span style={{color: '#999'}}>100%</span>
      </div>
    </div>
  );
};

// --- Top-Down Styles ---

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '60px',
  background: '#fcfcfc'
};

const perspectiveWrapper: React.CSSProperties = {
  width: '300px',
  height: '80px', // Shorter height because we are looking at the top edges
  position: 'relative',
  perspective: '1000px',
  display: 'flex',
  alignItems: 'center'
};

const stackBase: React.CSSProperties = {
  position: 'absolute',
  height: '40px',
  top: '20px',
  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden'
};

const flipPageBase: React.CSSProperties = {
  position: 'absolute',
  height: '40px',
  width: '60px', // Width of a single page flip
  top: '20px',
  backgroundColor: '#fff',
  border: '1px solid #ddd',
  transformOrigin: 'left center',
};

const spineStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '15px',
  width: '6px',
  height: '50px',
  backgroundColor: '#4a3728',
  borderRadius: '2px',
  transform: 'translateX(-50%)',
  zIndex: 20,
  boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
};

const edgeTexture: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 3px)',
};

const pageContent: React.CSSProperties = {
  inset: 0,
  position: 'absolute',
  backgroundColor: '#fff',
};

const labelStyle: React.CSSProperties = {
  marginTop: '40px',
  display: 'flex',
  gap: '20px',
  alignItems: 'center',
  fontFamily: 'serif'
};

export default BookProgressBar;