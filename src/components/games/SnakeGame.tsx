import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface SnakeGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 5;

const GRACE_PERIOD = 1500; // 1.5 seconds before snake starts moving
const COUNTDOWN_DURATION = 3; // 3 second countdown

const SnakeGame = ({ onScoreChange, onGameOver, isActive }: SnakeGameProps) => {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  
  const directionRef = useRef(direction);
  const { playSound } = useSound();

  // Countdown timer at game start
  useEffect(() => {
    if (!isActive || !isStarting) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
        playSound('blip');
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      playSound('powerup');
      setIsStarting(false);
    }
  }, [isActive, isStarting, countdown, playSound]);

  // Generate random food position
  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (directionRef.current !== 'DOWN') {
            setDirection('UP');
            directionRef.current = 'UP';
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (directionRef.current !== 'UP') {
            setDirection('DOWN');
            directionRef.current = 'DOWN';
          }
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (directionRef.current !== 'RIGHT') {
            setDirection('LEFT');
            directionRef.current = 'LEFT';
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (directionRef.current !== 'LEFT') {
            setDirection('RIGHT');
            directionRef.current = 'RIGHT';
          }
          break;
        case ' ':
          setIsPaused(p => !p);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isPaused || isStarting) return;

    const gameLoop = setInterval(() => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };

        switch (directionRef.current) {
          case 'UP':
            head.y -= 1;
            break;
          case 'DOWN':
            head.y += 1;
            break;
          case 'LEFT':
            head.x -= 1;
            break;
          case 'RIGHT':
            head.x += 1;
            break;
        }

        // Check wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          playSound('gameover');
          onGameOver(score);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          playSound('gameover');
          onGameOver(score);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          playSound('eat');
          const newScore = score + 10;
          setScore(newScore);
          onScoreChange(newScore);
          setFood(generateFood(newSnake));
          setSpeed(prev => Math.max(50, prev - SPEED_INCREASE));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(gameLoop);
  }, [isActive, gameOver, isPaused, isStarting, food, score, speed, generateFood, onScoreChange, onGameOver, playSound]);

  // Reset game
  const resetGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 10 });
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsPaused(false);
    setIsStarting(true);
    setCountdown(COUNTDOWN_DURATION);
    onScoreChange(0);
  }, [onScoreChange]);

  return (
    <div className="flex flex-col items-center">
      {/* Game grid */}
      <div
        className="relative border-2 border-neon-cyan"
        style={{
          width: GRID_SIZE * CELL_SIZE,
          height: GRID_SIZE * CELL_SIZE,
          background: 'linear-gradient(45deg, hsl(270 50% 5%) 0%, hsl(270 60% 8%) 100%)',
        }}
      >
        {/* Grid lines (subtle) */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(180 100% 50%) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(180 100% 50%) 1px, transparent 1px)
            `,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        />

        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute transition-all duration-75"
            style={{
              left: segment.x * CELL_SIZE,
              top: segment.y * CELL_SIZE,
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              margin: 1,
              background: index === 0 
                ? 'hsl(120 100% 50%)' 
                : `hsl(120 100% ${50 - index * 2}%)`,
              boxShadow: index === 0 
                ? '0 0 10px hsl(120 100% 50%)' 
                : 'none',
            }}
          />
        ))}

        {/* Food */}
        <div
          className="absolute animate-pulse"
          style={{
            left: food.x * CELL_SIZE,
            top: food.y * CELL_SIZE,
            width: CELL_SIZE - 2,
            height: CELL_SIZE - 2,
            margin: 1,
            background: 'hsl(0 100% 50%)',
            boxShadow: '0 0 15px hsl(0 100% 50%)',
            borderRadius: '50%',
          }}
        />

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            <p className="text-xl neon-text-magenta mb-4">GAME OVER</p>
            <p className="text-sm neon-text-cyan mb-4">SCORE: {score}</p>
            <button
              onClick={resetGame}
              className="arcade-btn arcade-btn-green text-xs"
            >
              PLAY AGAIN
            </button>
          </div>
        )}

        {/* Pause overlay */}
        {isPaused && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-xl neon-text-yellow animate-blink">PAUSED</p>
          </div>
        )}

        {/* Countdown overlay */}
        {isStarting && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            <p className="text-xs neon-text-cyan mb-4">GET READY!</p>
            <p className="text-4xl neon-text-green animate-pulse">
              {countdown > 0 ? countdown : 'GO!'}
            </p>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="mt-4 text-center">
        <p className="text-[10px] text-muted-foreground">
          ARROW KEYS / WASD TO MOVE • SPACE TO PAUSE
        </p>
      </div>
    </div>
  );
};

export default SnakeGame;
