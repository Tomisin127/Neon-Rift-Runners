// /src/app/neon-rift/NeonRiftPage.tsx
/**
 * React wrapper for Neon Rift Runners
 * Provides HUD overlay and integrates rift state machine
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import GameSceneWidget from '../phaser-template/core/GameSceneWidget';
import { useGameStore } from './gameStore';
import { riftMachine } from './riftMachine';
import { audioManager } from './audioManager';
import NeonRiftScene from './NeonRiftScene';
import NeonMobileControls from './NeonMobileControls';

export default function NeonRiftPage() {
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);
  const [sceneInstance, setSceneInstance] = useState<NeonRiftScene | null>(null);
  const [riftState, sendRiftEvent] = useMachine(riftMachine);
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Game state from store
  const score = useGameStore((state) => state.score);
  const combo = useGameStore((state) => state.combo);
  const distance = useGameStore((state) => state.distance);
  const highScore = useGameStore((state) => state.highScore);
  const gameOver = useGameStore((state) => state.gameOver);
  const currentRift = useGameStore((state) => state.currentRift);
  const riftWarning = useGameStore((state) => state.riftWarning);
  
  // Initialize viewport
  useEffect(() => {
    const vw = Math.floor(
      (window.visualViewport?.width ?? 0) || window.innerWidth || document.documentElement.clientWidth || 800
    );
    const vh = Math.floor(
      (window.visualViewport?.height ?? 0) || window.innerHeight || document.documentElement.clientHeight || 600
    );
    setViewport({ w: vw, h: vh });
  }, []);
  
  // Initialize audio on first interaction
  useEffect(() => {
    if (!audioInitialized) {
      const initAudio = async () => {
        await audioManager.init();
        setAudioInitialized(true);
      };
      
      const handler = () => {
        initAudio();
        document.removeEventListener('pointerdown', handler);
      };
      
      document.addEventListener('pointerdown', handler);
      return () => document.removeEventListener('pointerdown', handler);
    }
  }, [audioInitialized]);
  
  // Update audio based on combo
  useEffect(() => {
    if (audioInitialized) {
      audioManager.setComboLevel(combo);
    }
  }, [combo, audioInitialized]);
  
  // Rift timing system
  useEffect(() => {
    if (!sceneInstance) return;
    
    const interval = setInterval(() => {
      const t = useGameStore.getState().score / 100;
      const shouldTrigger = Math.random() < 0.05; // 5% chance per interval
      
      if (shouldTrigger && riftState.value === 'stable') {
        sendRiftEvent({ type: 'TRIGGER_RIFT' });
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [sceneInstance, riftState.value, sendRiftEvent]);
  
  // Handle rift state changes
  useEffect(() => {
    if (!sceneInstance) return;
    
    const state = riftState.value as string;
    const context = riftState.context;
    
    if (state === 'warning') {
      useGameStore.getState().setRiftWarning(true);
      audioManager.playGlitch();
    } else if (state === 'active') {
      useGameStore.getState().setRiftWarning(false);
      
      if (context.currentMutation) {
        const riftType = context.currentMutation === 'GRAVITY_FLIP' ? 'GRAVITY_FLIP' :
                         context.currentMutation === 'REVERSE_SCROLL' ? 'REVERSE_SCROLL' :
                         'PHASE_SHIFT';
        
        useGameStore.getState().setCurrentRift(riftType);
        sceneInstance.applyRift(riftType);
        
        if (context.currentMutation === 'GRAVITY_FLIP') {
          audioManager.pitchBend(-12, 0.2);
        }
      }
    } else if (state === 'cooldown') {
      useGameStore.getState().setCurrentRift('NONE');
      sceneInstance.resetRift();
    }
  }, [riftState.value, riftState.context, sceneInstance]);
  
  const handleRestart = useCallback(() => {
    if (sceneInstance) {
      sceneInstance.restart();
    }
  }, [sceneInstance]);
  
  if (!viewport) {
    return <div style={{ position: 'fixed', inset: 0, background: '#050505' }} />;
  }
  
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#050505' }}>
      {/* Game Canvas */}
      <GameSceneWidget
        scene={NeonRiftScene}
        gameID="neonRiftRunner"
        configOverrides={{
          width: viewport.w,
          height: viewport.h,
          backgroundColor: '#050505',
        }}
        onReady={(scene) => setSceneInstance(scene as NeonRiftScene)}
      />
      
      {/* HUD Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 20,
          pointerEvents: 'none',
          zIndex: 10,
          fontFamily: 'monospace',
        }}
      >
        {/* Score Display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#00FFFF', fontSize: 32, fontWeight: 'bold', textShadow: '0 0 10px #00FFFF' }}>
              {Math.floor(score)}
            </div>
            <div style={{ color: '#00FFFF', fontSize: 14, opacity: 0.7 }}>
              HI: {Math.floor(highScore)}
            </div>
          </div>
          
          {/* Combo Display */}
          {combo > 0 && (
            <div style={{
              background: 'rgba(0,255,255,0.1)',
              border: '2px solid #00FFFF',
              padding: '8px 16px',
              borderRadius: 8,
              animation: combo > 25 ? 'pulse 0.5s infinite' : 'none',
            }}>
              <div style={{ color: '#00FFFF', fontSize: 18, fontWeight: 'bold' }}>
                COMBO x{combo}
              </div>
            </div>
          )}
          
          {/* Debug Status Indicator */}
          <div style={{
            background: sceneInstance ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)',
            border: `2px solid ${sceneInstance ? '#00FF00' : '#FF0000'}`,
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            color: sceneInstance ? '#00FF00' : '#FF0000',
          }}>
            {sceneInstance ? '● GAME ACTIVE' : '○ LOADING...'}
          </div>
        </div>
        
        {/* Rift Warning */}
        {riftWarning && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#CCFF00',
            fontSize: 48,
            fontWeight: 'bold',
            textShadow: '0 0 20px #CCFF00',
            animation: 'glitch 0.1s infinite',
          }}>
            RIFT WARNING
          </div>
        )}
        
        {/* Active Rift Display */}
        {currentRift !== 'NONE' && !riftWarning && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#FF00FF',
            fontSize: 24,
            fontWeight: 'bold',
            textShadow: '0 0 15px #FF00FF',
          }}>
            {currentRift === 'GRAVITY_FLIP' && '⟰ GRAVITY INVERTED'}
            {currentRift === 'REVERSE_SCROLL' && '⟲ REALITY REVERSED'}
            {currentRift === 'PHASE_SHIFT' && '◈ PHASE SHIFT ACTIVE'}
          </div>
        )}
      </div>
      
      {/* Game Over Overlay */}
      {gameOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(5,5,5,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#0a0a0a',
              border: '3px solid #FF00FF',
              borderRadius: 16,
              padding: '40px 60px',
              textAlign: 'center',
              boxShadow: '0 0 30px #FF00FF',
            }}
          >
            <div style={{ color: '#FF00FF', fontSize: 48, fontWeight: 'bold', marginBottom: 20, textShadow: '0 0 20px #FF00FF' }}>
              SYSTEM CRASH
            </div>
            <div style={{ color: '#00FFFF', fontSize: 28, marginBottom: 10 }}>
              Score: {Math.floor(score)}
            </div>
            <div style={{ color: '#CCFF00', fontSize: 20, marginBottom: 30 }}>
              Best: {Math.floor(highScore)}
            </div>
            <button
              onClick={handleRestart}
              style={{
                background: '#FF00FF',
                color: '#050505',
                border: 'none',
                padding: '16px 48px',
                fontSize: 24,
                fontWeight: 'bold',
                borderRadius: 8,
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 0 20px #FF00FF',
                animation: 'pulse 1s infinite',
              }}
            >
              RETRY
            </button>
          </div>
        </div>
      )}
      
      {/* Mobile Controls */}
      <NeonMobileControls />
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes glitch {
          0% { transform: translate(-50%, -50%) translate(0, 0); }
          33% { transform: translate(-50%, -50%) translate(-2px, 2px); }
          66% { transform: translate(-50%, -50%) translate(2px, -2px); }
          100% { transform: translate(-50%, -50%) translate(0, 0); }
        }
      `}</style>
    </div>
  );
}
