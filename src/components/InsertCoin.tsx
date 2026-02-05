import { useEffect, useState } from 'react';
import { useSound } from '@/hooks/useSound';

interface InsertCoinProps {
  gameName: string;
  onComplete: () => void;
}

const InsertCoin = ({ gameName, onComplete }: InsertCoinProps) => {
  const [phase, setPhase] = useState<'coin' | 'loading' | 'ready'>('coin');
  const { playSound } = useSound();

  useEffect(() => {
    // Coin drop phase
    playSound('coin');
    
    const timer1 = setTimeout(() => {
      setPhase('loading');
    }, 800);

    const timer2 = setTimeout(() => {
      setPhase('ready');
      playSound('powerup');
    }, 1600);

    const timer3 = setTimeout(() => {
      onComplete();
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 crt-screen">
      <div className="text-center">
        {phase === 'coin' && (
          <>
            {/* Animated coin */}
            <div className="relative h-32 mb-8">
              <div className="absolute left-1/2 -translate-x-1/2 animate-coin-drop">
                <div className="w-12 h-12 rounded-full bg-neon-yellow border-4 border-neon-orange flex items-center justify-center shadow-[0_0_20px_hsl(60,100%,50%,0.8)]">
                  <span className="text-background font-pixel text-lg">$</span>
                </div>
              </div>
            </div>
            
            {/* Coin slot */}
            <div className="w-16 h-4 mx-auto bg-muted border-2 border-neon-cyan rounded-sm" />
            
            <p className="mt-8 text-lg neon-text-yellow animate-pulse-glow">
              INSERT COIN
            </p>
          </>
        )}

        {phase === 'loading' && (
          <div className="animate-crt-zoom">
            <p className="text-2xl neon-text-cyan mb-4">LOADING</p>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-4 h-4 bg-neon-magenta animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {phase === 'ready' && (
          <div className="animate-crt-zoom">
            <p className="text-xl neon-text-green mb-4">GET READY!</p>
            <p className="text-2xl neon-text-magenta animate-pulse-glow">
              {gameName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsertCoin;
