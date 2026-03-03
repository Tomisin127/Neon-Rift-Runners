// /src/app/neon-rift/gameStore.ts
/**
 * Zustand store for Neon Rift Runners game state
 * Manages score, combo, power-ups, and rift state
 */
import { create } from 'zustand';

export type RiftType = 'GRAVITY_FLIP' | 'REVERSE_SCROLL' | 'PHASE_SHIFT' | 'NONE';
export type PowerUpType = 'PHASE_DASH' | 'TIME_FREEZE' | 'OVERCLOCK' | null;

interface GameState {
  // Core stats
  score: number;
  distance: number;
  combo: number;
  highScore: number;
  
  // Power-ups
  activePowerUp: PowerUpType;
  powerUpTimeLeft: number;
  
  // Rift state
  currentRift: RiftType;
  riftWarning: boolean;
  
  // Game state
  isPlaying: boolean;
  isPaused: boolean;
  gameOver: boolean;
  
  // Actions
  setScore: (score: number) => void;
  addScore: (points: number) => void;
  setDistance: (distance: number) => void;
  setCombo: (combo: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  
  setActivePowerUp: (powerUp: PowerUpType, duration: number) => void;
  updatePowerUpTime: (delta: number) => void;
  clearPowerUp: () => void;
  
  setCurrentRift: (rift: RiftType) => void;
  setRiftWarning: (warning: boolean) => void;
  
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setGameOver: (gameOver: boolean) => void;
  
  reset: () => void;
}

const initialState = {
  score: 0,
  distance: 0,
  combo: 0,
  highScore: 0,
  activePowerUp: null as PowerUpType,
  powerUpTimeLeft: 0,
  currentRift: 'NONE' as RiftType,
  riftWarning: false,
  isPlaying: false,
  isPaused: false,
  gameOver: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  
  setScore: (score: number) => set((state: GameState) => ({
    score,
    highScore: Math.max(score, state.highScore)
  })),
  
  addScore: (points: number) => set((state: GameState) => {
    const newScore = state.score + points;
    return {
      score: newScore,
      highScore: Math.max(newScore, state.highScore)
    };
  }),
  
  setDistance: (distance: number) => set({ distance }),
  
  setCombo: (combo: number) => set({ combo }),
  
  incrementCombo: () => set((state: GameState) => ({
    combo: state.combo + 1
  })),
  
  resetCombo: () => set({ combo: 0 }),
  
  setActivePowerUp: (powerUp: PowerUpType, duration: number) => set({
    activePowerUp: powerUp,
    powerUpTimeLeft: duration
  }),
  
  updatePowerUpTime: (delta: number) => set((state: GameState) => {
    const newTime = Math.max(0, state.powerUpTimeLeft - delta);
    return {
      powerUpTimeLeft: newTime,
      activePowerUp: newTime <= 0 ? null : state.activePowerUp
    };
  }),
  
  clearPowerUp: () => set({
    activePowerUp: null,
    powerUpTimeLeft: 0
  }),
  
  setCurrentRift: (rift: RiftType) => set({ currentRift: rift }),
  
  setRiftWarning: (warning: boolean) => set({ riftWarning: warning }),
  
  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  
  setPaused: (paused: boolean) => set({ isPaused: paused }),
  
  setGameOver: (gameOver: boolean) => set({ gameOver }),
  
  reset: () => set((state: GameState) => ({
    ...initialState,
    highScore: state.highScore
  })),
}));
