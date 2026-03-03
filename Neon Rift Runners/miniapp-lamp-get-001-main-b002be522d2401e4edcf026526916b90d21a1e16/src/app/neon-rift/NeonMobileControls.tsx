// /src/app/neon-rift/NeonMobileControls.tsx
/**
 * Mobile touch controls for Neon Rift Runners
 * Optimized for single-touch jump and dash inputs
 */
'use client';

import { useEffect, useState } from 'react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const ua = navigator.userAgent || '';
    const phone = /(Android|iPhone|iPad|iPod|Mobile)/i.test(ua);
    setIsMobile(Boolean(coarse || touch || phone));
  }, []);
  
  return isMobile;
}

function ControlButton({
  label,
  side,
  onDown,
  onUp,
}: {
  label: string;
  side: 'left' | 'right';
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        [side]: 20,
        bottom: 20,
      }}
    >
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onDown();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          onUp();
        }}
        onPointerCancel={(e) => {
          e.preventDefault();
          onUp();
        }}
        onPointerLeave={(e) => {
          e.preventDefault();
          onUp();
        }}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(0,255,255,0.2)',
          border: '3px solid #00FFFF',
          color: '#00FFFF',
          fontSize: 32,
          fontWeight: 'bold',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
          backdropFilter: 'blur(8px)',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0,255,255,0.5)',
          transition: 'all 0.1s',
        }}
      >
        {label}
      </button>
    </div>
  );
}

export default function NeonMobileControls() {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  const handleJumpDown = () => {
    // Simulate keyboard space press
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      keyCode: 32,
      which: 32,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };
  
  const handleJumpUp = () => {
    const event = new KeyboardEvent('keyup', {
      key: ' ',
      code: 'Space',
      keyCode: 32,
      which: 32,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };
  
  const handleDashDown = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      code: 'ArrowRight',
      keyCode: 39,
      which: 39,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };
  
  const handleDashUp = () => {
    const event = new KeyboardEvent('keyup', {
      key: 'ArrowRight',
      code: 'ArrowRight',
      keyCode: 39,
      which: 39,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'auto' }}>
        {/* Jump Button (Left) */}
        <ControlButton
          label="↑"
          side="left"
          onDown={handleJumpDown}
          onUp={handleJumpUp}
        />
        
        {/* Dash Button (Right) */}
        <ControlButton
          label="→"
          side="right"
          onDown={handleDashDown}
          onUp={handleDashUp}
        />
      </div>
      
      {/* Control Legend */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 20,
          transform: 'translateY(-50%)',
          color: '#00FFFF',
          fontSize: 12,
          opacity: 0.5,
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        <div>↑ JUMP</div>
        <div style={{ marginTop: 4 }}>Hold for higher jump</div>
      </div>
      
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: 20,
          transform: 'translateY(-50%)',
          color: '#00FFFF',
          fontSize: 12,
          opacity: 0.5,
          fontFamily: 'monospace',
          textAlign: 'right',
          pointerEvents: 'none',
        }}
      >
        <div>→ DASH</div>
        <div style={{ marginTop: 4 }}>3s cooldown</div>
      </div>
    </div>
  );
}
