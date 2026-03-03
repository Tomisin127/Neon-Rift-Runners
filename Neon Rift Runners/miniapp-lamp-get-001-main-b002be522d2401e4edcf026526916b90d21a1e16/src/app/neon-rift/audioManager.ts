// /src/app/neon-rift/audioManager.ts
/**
 * Audio Manager using Tone.js for dynamic music layering
 * Manages background music with layers that activate based on combo
 */
import * as Tone from 'tone';

class AudioManager {
  private initialized = false;
  private bassDronePlayer: Tone.Player | null = null;
  private percussionPlayer: Tone.Player | null = null;
  private arpPlayer: Tone.Player | null = null;
  private bassVolume: Tone.Volume | null = null;
  private percVolume: Tone.Volume | null = null;
  private arpVolume: Tone.Volume | null = null;
  
  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await Tone.start();
      
      // Create volume controls for each layer
      this.bassVolume = new Tone.Volume(-8).toDestination();
      this.percVolume = new Tone.Volume(-Infinity).toDestination(); // Start muted
      this.arpVolume = new Tone.Volume(-Infinity).toDestination(); // Start muted
      
      // Note: In production, load actual audio files
      // For now, using Tone.js synthesizers as placeholder
      this.createSynthLayers();
      
      this.initialized = true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }
  
  private createSynthLayers(): void {
    // Create bass drone synth
    const bassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0, sustain: 1, release: 0.1 }
    }).connect(this.bassVolume!);
    
    // Create percussion synth
    const percSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' }
    }).connect(this.percVolume!);
    
    // Create arp synth
    const arpSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 }
    }).connect(this.arpVolume!);
    
    // Start bass drone (continuous)
    Tone.Transport.scheduleRepeat((time) => {
      bassSynth.triggerAttackRelease('C2', '2n', time);
    }, '2n');
    
    // Percussion pattern (activated by combo)
    Tone.Transport.scheduleRepeat((time) => {
      percSynth.triggerAttackRelease('C1', '16n', time);
    }, '4n');
    
    // Arp pattern (activated by high combo)
    const arpNotes = ['C4', 'E4', 'G4', 'B4'];
    let arpIndex = 0;
    Tone.Transport.scheduleRepeat((time) => {
      arpSynth.triggerAttackRelease(arpNotes[arpIndex], '16n', time);
      arpIndex = (arpIndex + 1) % arpNotes.length;
    }, '16n');
    
    Tone.Transport.bpm.value = 140;
    Tone.Transport.start();
  }
  
  setComboLevel(combo: number): void {
    if (!this.initialized) return;
    
    try {
      // Unmute percussion at combo 10+
      if (combo >= 10 && this.percVolume) {
        this.percVolume.volume.rampTo(-12, 0.5);
      } else if (this.percVolume) {
        this.percVolume.volume.rampTo(-Infinity, 0.5);
      }
      
      // Unmute arp at combo 25+
      if (combo >= 25 && this.arpVolume) {
        this.arpVolume.volume.rampTo(-10, 0.5);
      } else if (this.arpVolume) {
        this.arpVolume.volume.rampTo(-Infinity, 0.5);
      }
    } catch (error) {
      console.warn('Failed to adjust combo level:', error);
    }
  }
  
  pitchBend(semitones: number, duration: number = 0.2): void {
    if (!this.initialized || !Tone.Transport) return;
    
    try {
      const currentBPM = Tone.Transport.bpm.value;
      const targetBPM = currentBPM * Math.pow(2, semitones / 12);
      Tone.Transport.bpm.rampTo(targetBPM, duration);
      
      // Reset after duration
      setTimeout(() => {
        Tone.Transport.bpm.rampTo(140, duration);
      }, duration * 1000 + 100);
    } catch (error) {
      console.warn('Failed to pitch bend:', error);
    }
  }
  
  playWhoosh(): void {
    if (!this.initialized) return;
    
    try {
      const synth = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
      }).toDestination();
      
      synth.triggerAttackRelease('A5', '32n', Tone.now());
      setTimeout(() => synth.dispose(), 200);
    } catch (error) {
      console.warn('Failed to play whoosh:', error);
    }
  }
  
  playGlitch(): void {
    if (!this.initialized) return;
    
    try {
      const noise = new Tone.Noise('pink').toDestination();
      noise.start();
      noise.stop('+0.05');
      setTimeout(() => noise.dispose(), 100);
    } catch (error) {
      console.warn('Failed to play glitch:', error);
    }
  }
  
  stop(): void {
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    } catch (error) {
      console.warn('Failed to stop audio:', error);
    }
  }
}

export const audioManager = new AudioManager();
