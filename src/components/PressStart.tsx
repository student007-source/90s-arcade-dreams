import { useState, useEffect } from 'react';
import { useSound, useBackgroundMusic } from '@/hooks/useSound';

interface PressStartProps {
  onStart: () => void;
}

const PressStart = ({ onStart }: PressStartProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPressed, setIsPressed] = useState(false);
  const { playSound } = useSound();
  const { startMusic } = useBackgroundMusic();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') {
        handleStart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleStart = () => {
    if (isPressed) return;
    setIsPressed(true);
    playSound('start');
    startMusic();
    
    setTimeout(() => {
      setIsVisible(false);
      onStart();
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background crt-screen"
      onClick={handleStart}
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanlines pointer-events-none" />
      
      {/* Arcade title */}
      <div className="mb-12 text-center vhs-glitch">
        <h1 className="text-4xl md:text-6xl neon-text-cyan mb-4 animate-pulse-glow">
          RETRO
        </h1>
        <h1 className="text-4xl md:text-6xl neon-text-magenta animate-pulse-glow">
          ARCADE
        </h1>
      </div>

      {/* Coin graphic */}
      <div className="mb-8 w-16 h-16 rounded-full bg-neon-yellow border-4 border-neon-orange flex items-center justify-center animate-float">
        <span className="text-background font-pixel text-xl">$</span>
      </div>

      {/* Press Start text */}
      <div className={`transition-all duration-200 ${isPressed ? 'scale-110 opacity-0' : ''}`}>
        <p className="text-xl md:text-2xl neon-text-green animate-blink">
          PRESS START
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground mb-2">
          CLICK ANYWHERE OR PRESS ENTER
        </p>
        <div className="flex gap-4 justify-center text-xs">
          <span className="neon-text-cyan">● 12 GAMES</span>
          <span className="neon-text-magenta">● HIGH SCORES</span>
          <span className="neon-text-green">● SECRETS</span>
        </div>
      </div>

      {/* CRT corner effects */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-neon-cyan opacity-50" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-neon-cyan opacity-50" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-neon-cyan opacity-50" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-neon-cyan opacity-50" />
    </div>
  );
};

export default PressStart;
