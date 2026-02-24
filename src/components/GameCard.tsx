import { useSound } from '@/hooks/useSound';

export interface GameInfo {
  id: string;
  title: string;
  description: string;
  color: 'cyan' | 'magenta' | 'green' | 'yellow' | 'orange' | 'pink' | 'red' | 'blue' | 'purple';
  icon: string;
  controls: string;
  objective: string;
  secret?: string;
}

interface GameCardProps {
  game: GameInfo;
  onSelect: (game: GameInfo) => void;
  index: number;
}

const colorClasses = {
  cyan: 'border-neon-cyan hover:shadow-[0_0_30px_hsl(180,100%,50%,0.5)]',
  magenta: 'border-neon-magenta hover:shadow-[0_0_30px_hsl(300,100%,50%,0.5)]',
  green: 'border-neon-green hover:shadow-[0_0_30px_hsl(120,100%,50%,0.5)]',
  yellow: 'border-neon-yellow hover:shadow-[0_0_30px_hsl(60,100%,50%,0.5)]',
  orange: 'border-neon-orange hover:shadow-[0_0_30px_hsl(30,100%,50%,0.5)]',
  pink: 'border-neon-pink hover:shadow-[0_0_30px_hsl(330,100%,60%,0.5)]',
};

const textClasses = {
  cyan: 'neon-text-cyan',
  magenta: 'neon-text-magenta',
  green: 'neon-text-green',
  yellow: 'neon-text-yellow',
  orange: 'text-neon-orange',
  pink: 'text-neon-pink',
};

const GameCard = ({ game, onSelect, index }: GameCardProps) => {
  const { playSound } = useSound();

  const handleClick = () => {
    playSound('select');
    onSelect(game);
  };

  const handleMouseEnter = () => {
    playSound('move');
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={`arcade-cabinet w-full text-left transition-all duration-300 hover:scale-105 border-2 ${colorClasses[game.color]} group`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Screen area */}
      <div className="relative bg-background/80 p-4 mb-3 crt-curvature overflow-hidden">
        {/* Game icon/preview */}
        <div className="text-4xl mb-2 text-center">{game.icon}</div>
        
        {/* CRT effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity scanlines" />
      </div>

      {/* Cabinet label */}
      <div className="text-center">
        <h3 className={`text-xs ${textClasses[game.color]} mb-1 truncate`}>
          {game.title}
        </h3>
        <p className="text-[8px] text-muted-foreground line-clamp-2">
          {game.description}
        </p>
      </div>

      {/* Insert coin indicator */}
      <div className="mt-3 pt-2 border-t border-muted flex justify-center">
        <span className="text-[8px] text-neon-yellow animate-blink">
          INSERT COIN
        </span>
      </div>

      {/* Decorative LEDs */}
      <div className="absolute top-2 right-2 flex gap-1">
        <div className={`w-2 h-2 rounded-full bg-neon-${game.color} animate-pulse`} />
      </div>
    </button>
  );
};

export default GameCard;
