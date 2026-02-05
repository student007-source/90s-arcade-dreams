import { useState, useEffect } from 'react';

const Header = () => {
  const [konamiProgress, setKonamiProgress] = useState(0);
  const [showSecret, setShowSecret] = useState(false);
  
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KONAMI_CODE[konamiProgress]) {
        const newProgress = konamiProgress + 1;
        setKonamiProgress(newProgress);
        
        if (newProgress === KONAMI_CODE.length) {
          setShowSecret(true);
          setKonamiProgress(0);
          setTimeout(() => setShowSecret(false), 3000);
        }
      } else {
        setKonamiProgress(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiProgress]);

  return (
    <header className="relative py-8 text-center">
      {/* Main title */}
      <div className="vhs-glitch">
        <h1 className="text-3xl md:text-5xl neon-text-cyan mb-2 animate-pulse-glow tracking-wider">
          RETRO ARCADE
        </h1>
        <p className="text-sm md:text-base neon-text-magenta">
          12 CLASSIC GAMES • HIGH SCORES • SECRETS
        </p>
      </div>

      {/* Konami code easter egg message */}
      {showSecret && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 px-6 py-3 bg-card border-2 border-neon-yellow animate-crt-zoom z-50">
          <p className="text-sm neon-text-yellow">★ 30 LIVES UNLOCKED ★</p>
          <p className="text-xs text-muted-foreground">You know the code!</p>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute top-4 left-8 flex gap-2">
        <div className="w-3 h-3 bg-neon-green rounded-full animate-pulse" />
        <div className="w-3 h-3 bg-neon-yellow rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-3 h-3 bg-neon-magenta rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
      
      <div className="absolute top-4 right-8 text-xs text-muted-foreground">
        <span className="neon-text-green">●</span> ONLINE
      </div>
    </header>
  );
};

export default Header;
