import { useCallback, useRef, useState } from 'react';

// Simple 8-bit style sound generation using Web Audio API
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

type SoundType = 'coin' | 'select' | 'start' | 'powerup' | 'hit' | 'score' | 'gameover' | 'eat' | 'move' | 'blip' | 'shoot' | 'explosion' | 'jump' | 'splash' | 'pop' | 'engine' | 'punch' | 'block' | 'whistle';

const soundConfigs: Record<SoundType, { frequency: number; duration: number; type: OscillatorType; ramp?: boolean }> = {
  coin: { frequency: 1200, duration: 0.1, type: 'square', ramp: true },
  select: { frequency: 600, duration: 0.05, type: 'square' },
  start: { frequency: 400, duration: 0.3, type: 'square', ramp: true },
  powerup: { frequency: 800, duration: 0.2, type: 'triangle', ramp: true },
  hit: { frequency: 150, duration: 0.15, type: 'sawtooth' },
  score: { frequency: 1000, duration: 0.08, type: 'square' },
  gameover: { frequency: 200, duration: 0.5, type: 'sawtooth' },
  eat: { frequency: 500, duration: 0.05, type: 'square' },
  move: { frequency: 300, duration: 0.02, type: 'square' },
  blip: { frequency: 700, duration: 0.08, type: 'square' },
  shoot: { frequency: 400, duration: 0.1, type: 'sawtooth' },
  explosion: { frequency: 100, duration: 0.3, type: 'sawtooth', ramp: true },
  jump: { frequency: 300, duration: 0.15, type: 'triangle', ramp: true },
  splash: { frequency: 200, duration: 0.2, type: 'sine' },
  pop: { frequency: 900, duration: 0.06, type: 'square' },
  engine: { frequency: 80, duration: 0.1, type: 'sawtooth' },
  punch: { frequency: 120, duration: 0.12, type: 'sawtooth' },
  block: { frequency: 250, duration: 0.08, type: 'square' },
  whistle: { frequency: 1400, duration: 0.3, type: 'sine', ramp: true },
};

export const useSound = () => {
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);

  const playSound = useCallback((type: SoundType) => {
    if (!audioContext || isMuted) return;

    const config = soundConfigs[type];
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);

    if (config.ramp) {
      oscillator.frequency.exponentialRampToValueAtTime(
        config.frequency * 1.5,
        audioContext.currentTime + config.duration / 2
      );
    }

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + config.duration);
  }, [volume, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { playSound, volume, setVolume, isMuted, toggleMute };
};

// Background music generator
export const useBackgroundMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  const melody = [
    { freq: 262, duration: 200 }, // C4
    { freq: 294, duration: 200 }, // D4
    { freq: 330, duration: 200 }, // E4
    { freq: 349, duration: 200 }, // F4
    { freq: 392, duration: 400 }, // G4
    { freq: 392, duration: 400 }, // G4
    { freq: 440, duration: 200 }, // A4
    { freq: 440, duration: 200 }, // A4
    { freq: 440, duration: 200 }, // A4
    { freq: 440, duration: 200 }, // A4
    { freq: 392, duration: 800 }, // G4
  ];

  const startMusic = useCallback(() => {
    if (!audioContext || isPlaying) return;
    
    setIsPlaying(true);
    let noteIndex = 0;

    const playNote = () => {
      const note = melody[noteIndex % melody.length];
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(note.freq, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + note.duration / 1000);
      
      oscillatorsRef.current.push(oscillator);
      noteIndex++;
    };

    playNote();
    intervalRef.current = window.setInterval(playNote, 300);
  }, [isPlaying]);

  const stopMusic = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    oscillatorsRef.current.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    oscillatorsRef.current = [];
    setIsPlaying(false);
  }, []);

  const toggleMusic = useCallback(() => {
    if (isPlaying) {
      stopMusic();
    } else {
      startMusic();
    }
  }, [isPlaying, startMusic, stopMusic]);

  return { isPlaying, toggleMusic, startMusic, stopMusic };
};
