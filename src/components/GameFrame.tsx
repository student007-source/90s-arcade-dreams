import { X, RotateCcw, Info } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

interface GameFrameProps {
  children: React.ReactNode;
  gameName: string;
  score: number;
  onClose: () => void;
  onRestart: () => void;
  onShowInstructions: () => void;
}

const GameFrame = ({ 
  children, 
  gameName, 
  score, 
  onClose, 
  onRestart,
  onShowInstructions 
}: GameFrameProps) => {
  const { playSound } = useSound();

  const handleClose = () => {
    playSound('hit');
    onClose();
  };

  const handleRestart = () => {
    playSound('powerup');
    onRestart();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background p-4 crt-screen animate-crt-zoom">
      {/* Game cabinet frame */}
      <div className="relative w-full max-w-4xl game-frame">
        {/* Top bar */}
        <div className="flex items-center justify-between p-3 border-b-2 border-muted bg-card/50">
          <div className="flex items-center gap-4">
            <h2 className="text-sm neon-text-cyan">{gameName}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm neon-text-yellow">
              SCORE: {score.toLocaleString().padStart(6, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onShowInstructions}
              className="p-2 text-muted-foreground hover:text-neon-cyan transition-colors"
              title="Instructions"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={handleRestart}
              className="p-2 text-muted-foreground hover:text-neon-green transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              title="Exit"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Game screen */}
        <div className="relative bg-background aspect-[4/3] crt-curvature overflow-hidden">
          {/* Scanlines overlay */}
          <div className="absolute inset-0 scanlines pointer-events-none z-10" />
          
          {/* Game content */}
          <div className="absolute inset-0 flex items-center justify-center">
            {children}
          </div>
        </div>

        {/* Bottom decorative panel */}
        <div className="flex justify-center gap-8 p-3 bg-card/50 border-t-2 border-muted">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse" />
            <span className="text-[8px] text-muted-foreground">PLAYER 1</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            INSERT COIN FOR PLAYER 2
          </div>
        </div>

        {/* Decorative corner bolts */}
        <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-muted border border-muted-foreground" />
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-muted border border-muted-foreground" />
        <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-muted border border-muted-foreground" />
        <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-muted border border-muted-foreground" />
      </div>
    </div>
  );
};

export default GameFrame;
