import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface PongGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const PADDLE_HEIGHT = 60;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 4;

const PongGame = ({ onScoreChange, onGameOver, isActive }: PongGameProps) => {
  const [playerY, setPlayerY] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [aiY, setAiY] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ball, setBall] = useState({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const [ballVelocity, setBallVelocity] = useState({ x: INITIAL_BALL_SPEED, y: INITIAL_BALL_SPEED / 2 });
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const { playSound } = useSound();
  const keysPressed = useRef<Set<string>>(new Set());

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      if (e.key === ' ' || e.key === 'p') {
        setIsPaused(p => !p);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isPaused) return;

    const gameLoop = setInterval(() => {
      // Player movement
      if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('w') || keysPressed.current.has('W')) {
        setPlayerY(prev => Math.max(0, prev - PADDLE_SPEED));
      }
      if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('s') || keysPressed.current.has('S')) {
        setPlayerY(prev => Math.min(GAME_HEIGHT - PADDLE_HEIGHT, prev + PADDLE_SPEED));
      }

      // AI movement
      setAiY(prev => {
        const targetY = ball.y - PADDLE_HEIGHT / 2;
        const diff = targetY - prev;
        const aiSpeed = Math.min(PADDLE_SPEED * 0.7, Math.abs(diff));
        return prev + Math.sign(diff) * aiSpeed;
      });

      // Ball movement
      setBall(prev => {
        let newX = prev.x + ballVelocity.x;
        let newY = prev.y + ballVelocity.y;
        let newVelX = ballVelocity.x;
        let newVelY = ballVelocity.y;

        // Top/bottom wall collision
        if (newY <= 0 || newY >= GAME_HEIGHT - BALL_SIZE) {
          newVelY = -newVelY;
          newY = Math.max(0, Math.min(GAME_HEIGHT - BALL_SIZE, newY));
          playSound('hit');
        }

        // Player paddle collision
        if (
          newX <= PADDLE_WIDTH + 10 &&
          newY + BALL_SIZE >= playerY &&
          newY <= playerY + PADDLE_HEIGHT
        ) {
          newVelX = Math.abs(newVelX) * 1.05;
          const hitPos = (newY - playerY) / PADDLE_HEIGHT - 0.5;
          newVelY = hitPos * 8;
          newX = PADDLE_WIDTH + 10;
          playSound('select');
        }

        // AI paddle collision
        if (
          newX >= GAME_WIDTH - PADDLE_WIDTH - 10 - BALL_SIZE &&
          newY + BALL_SIZE >= aiY &&
          newY <= aiY + PADDLE_HEIGHT
        ) {
          newVelX = -Math.abs(newVelX) * 1.05;
          const hitPos = (newY - aiY) / PADDLE_HEIGHT - 0.5;
          newVelY = hitPos * 8;
          newX = GAME_WIDTH - PADDLE_WIDTH - 10 - BALL_SIZE;
          playSound('select');
        }

        // Scoring
        if (newX < 0) {
          // AI scores
          setAiScore(prev => {
            const newScore = prev + 1;
            if (newScore >= 5) {
              setGameOver(true);
              playSound('gameover');
              onGameOver(playerScore);
            }
            return newScore;
          });
          playSound('hit');
          return { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
        }

        if (newX > GAME_WIDTH) {
          // Player scores
          setPlayerScore(prev => {
            const newScore = prev + 1;
            onScoreChange(newScore * 100);
            if (newScore >= 5) {
              setGameOver(true);
              playSound('powerup');
              onGameOver(newScore * 100);
            }
            return newScore;
          });
          playSound('score');
          return { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
        }

        setBallVelocity({ x: newVelX, y: newVelY });
        return { x: newX, y: newY };
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [isActive, gameOver, isPaused, ball, ballVelocity, playerY, aiY, playerScore, onScoreChange, onGameOver, playSound]);

  const resetGame = () => {
    setPlayerY(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    setAiY(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    setBall({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
    setBallVelocity({ x: INITIAL_BALL_SPEED, y: INITIAL_BALL_SPEED / 2 });
    setPlayerScore(0);
    setAiScore(0);
    setGameOver(false);
    setIsPaused(false);
    onScoreChange(0);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Score display */}
      <div className="flex gap-8 mb-4 text-xl">
        <span className="neon-text-green">P1: {playerScore}</span>
        <span className="text-muted-foreground">VS</span>
        <span className="neon-text-magenta">CPU: {aiScore}</span>
      </div>

      {/* Game area */}
      <div
        className="relative border-2 border-neon-cyan"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          background: 'hsl(270 50% 5%)',
        }}
      >
        {/* Center line */}
        <div
          className="absolute left-1/2 top-0 w-0.5 h-full opacity-30"
          style={{
            background: 'repeating-linear-gradient(to bottom, hsl(180 100% 50%) 0px, hsl(180 100% 50%) 10px, transparent 10px, transparent 20px)',
          }}
        />

        {/* Player paddle */}
        <div
          className="absolute left-2"
          style={{
            top: playerY,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
            background: 'hsl(120 100% 50%)',
            boxShadow: '0 0 15px hsl(120 100% 50%)',
          }}
        />

        {/* AI paddle */}
        <div
          className="absolute right-2"
          style={{
            top: aiY,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
            background: 'hsl(300 100% 50%)',
            boxShadow: '0 0 15px hsl(300 100% 50%)',
          }}
        />

        {/* Ball */}
        <div
          className="absolute"
          style={{
            left: ball.x,
            top: ball.y,
            width: BALL_SIZE,
            height: BALL_SIZE,
            background: 'hsl(180 100% 50%)',
            boxShadow: '0 0 15px hsl(180 100% 50%)',
          }}
        />

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            <p className={`text-xl mb-2 ${playerScore >= 5 ? 'neon-text-green' : 'neon-text-magenta'}`}>
              {playerScore >= 5 ? 'YOU WIN!' : 'GAME OVER'}
            </p>
            <button onClick={resetGame} className="arcade-btn arcade-btn-green text-xs">
              PLAY AGAIN
            </button>
          </div>
        )}

        {isPaused && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-xl neon-text-yellow animate-blink">PAUSED</p>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="mt-4 text-center">
        <p className="text-[10px] text-muted-foreground">
          ↑↓ OR W/S TO MOVE • SPACE TO PAUSE • FIRST TO 5 WINS
        </p>
      </div>
    </div>
  );
};

export default PongGame;
