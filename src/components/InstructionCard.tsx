import { X } from 'lucide-react';
import type { GameInfo } from './GameCard';

interface InstructionCardProps {
  game: GameInfo;
  onClose: () => void;
  onPlay: () => void;
}

const InstructionCard = ({ game, onClose, onPlay }: InstructionCardProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4">
      <div className="relative max-w-md w-full pixel-border bg-card p-6 animate-crt-zoom">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Game icon */}
        <div className="text-center mb-4">
          <span className="text-5xl">{game.icon}</span>
        </div>

        {/* Title */}
        <h2 className="text-xl neon-text-cyan text-center mb-6">
          {game.title}
        </h2>

        {/* Instructions with typewriter effect */}
        <div className="space-y-4 text-xs">
          {/* Objective */}
          <div>
            <h3 className="neon-text-magenta mb-1">[ OBJECTIVE ]</h3>
            <p className="text-muted-foreground leading-relaxed">
              {game.objective}
            </p>
          </div>

          {/* Controls */}
          <div>
            <h3 className="neon-text-green mb-1">[ CONTROLS ]</h3>
            <p className="text-muted-foreground leading-relaxed">
              {game.controls}
            </p>
          </div>

          {/* Secret hint */}
          {game.secret && (
            <div>
              <h3 className="neon-text-yellow mb-1">[ SECRET ]</h3>
              <p className="text-muted-foreground leading-relaxed italic">
                {game.secret}
              </p>
            </div>
          )}
        </div>

        {/* Play button */}
        <button
          onClick={onPlay}
          className="arcade-btn arcade-btn-green w-full mt-6 text-primary-foreground"
        >
          START GAME
        </button>

        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-neon-cyan" />
        <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-neon-cyan" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-neon-cyan" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-neon-cyan" />
      </div>
    </div>
  );
};

export default InstructionCard;
