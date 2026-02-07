import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface FrogHopperGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const CELL_SIZE = 40;
const FROG_SIZE = 30;

interface Lane {
  type: 'road' | 'water' | 'safe';
  direction: 1 | -1;
  speed: number;
  objects: { x: number; width: number; type: 'car' | 'log' | 'turtle' }[];
}

const FrogHopperGame = ({ onScoreChange, onGameOver, isActive }: FrogHopperGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [frogX, setFrogX] = useState(CANVAS_WIDTH / 2 - FROG_SIZE / 2);
  const [frogY, setFrogY] = useState(CANVAS_HEIGHT - CELL_SIZE);
  const [highestRow, setHighestRow] = useState(0);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  const [lanes] = useState<Lane[]>(() => {
    const laneData: Lane[] = [];
    // Safe zone at top
    laneData.push({ type: 'safe', direction: 1, speed: 0, objects: [] });
    // Water lanes
    for (let i = 0; i < 3; i++) {
      const logs = [];
      const numLogs = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numLogs; j++) {
        logs.push({
          x: j * (CANVAS_WIDTH / numLogs) + Math.random() * 50,
          width: 60 + Math.random() * 40,
          type: 'log' as const,
        });
      }
      laneData.push({
        type: 'water',
        direction: i % 2 === 0 ? 1 : -1,
        speed: 1 + Math.random() * 0.5,
        objects: logs,
      });
    }
    // Safe middle zone
    laneData.push({ type: 'safe', direction: 1, speed: 0, objects: [] });
    // Road lanes
    for (let i = 0; i < 4; i++) {
      const cars = [];
      const numCars = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numCars; j++) {
        cars.push({
          x: j * (CANVAS_WIDTH / numCars) + Math.random() * 50,
          width: 40 + Math.random() * 20,
          type: 'car' as const,
        });
      }
      laneData.push({
        type: 'road',
        direction: i % 2 === 0 ? 1 : -1,
        speed: 1.5 + Math.random() * 1,
        objects: cars,
      });
    }
    // Safe zone at bottom (start)
    laneData.push({ type: 'safe', direction: 1, speed: 0, objects: [] });
    return laneData;
  });

  // Countdown
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

  // Handle keyboard input
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setFrogY(prev => Math.max(0, prev - CELL_SIZE));
          playSound('jump');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setFrogY(prev => Math.min(CANVAS_HEIGHT - CELL_SIZE, prev + CELL_SIZE));
          playSound('jump');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setFrogX(prev => Math.max(0, prev - CELL_SIZE));
          playSound('move');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setFrogX(prev => Math.min(CANVAS_WIDTH - CELL_SIZE, prev + CELL_SIZE));
          playSound('move');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, gameOver, isStarting, playSound]);

  // Check scoring
  useEffect(() => {
    const currentRow = Math.floor((CANVAS_HEIGHT - frogY) / CELL_SIZE);
    if (currentRow > highestRow) {
      setHighestRow(currentRow);
      const newScore = score + 10;
      setScore(newScore);
      onScoreChange(newScore);
      playSound('score');
    }
  }, [frogY, highestRow, score, onScoreChange, playSound]);

  // Check if reached top
  useEffect(() => {
    if (frogY <= 0) {
      const newScore = score + 100;
      setScore(newScore);
      onScoreChange(newScore);
      playSound('powerup');
      // Reset frog position
      setFrogX(CANVAS_WIDTH / 2 - FROG_SIZE / 2);
      setFrogY(CANVAS_HEIGHT - CELL_SIZE);
      setHighestRow(0);
    }
  }, [frogY, score, onScoreChange, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let onLog = false;
    let logVelocity = 0;

    const gameLoop = () => {
      // Update lane objects
      lanes.forEach(lane => {
        lane.objects.forEach(obj => {
          obj.x += lane.speed * lane.direction;
          if (obj.x > CANVAS_WIDTH + obj.width) obj.x = -obj.width;
          if (obj.x < -obj.width) obj.x = CANVAS_WIDTH + obj.width;
        });
      });

      // Get current lane
      const laneIndex = lanes.length - 1 - Math.floor(frogY / CELL_SIZE);
      const currentLane = lanes[laneIndex];

      // Check collisions
      if (currentLane) {
        if (currentLane.type === 'road') {
          // Check car collision
          for (const car of currentLane.objects) {
            if (
              frogX < car.x + car.width &&
              frogX + FROG_SIZE > car.x &&
              frogY < (lanes.length - 1 - laneIndex) * CELL_SIZE + CELL_SIZE &&
              frogY + FROG_SIZE > (lanes.length - 1 - laneIndex) * CELL_SIZE
            ) {
              setGameOver(true);
              playSound('gameover');
              onGameOver(score);
              return;
            }
          }
        } else if (currentLane.type === 'water') {
          onLog = false;
          for (const log of currentLane.objects) {
            if (
              frogX + FROG_SIZE / 2 > log.x &&
              frogX + FROG_SIZE / 2 < log.x + log.width
            ) {
              onLog = true;
              logVelocity = currentLane.speed * currentLane.direction;
              break;
            }
          }
          if (!onLog) {
            setGameOver(true);
            playSound('splash');
            playSound('gameover');
            onGameOver(score);
            return;
          } else {
            setFrogX(prev => {
              const newX = prev + logVelocity;
              if (newX < 0 || newX > CANVAS_WIDTH - FROG_SIZE) {
                setGameOver(true);
                playSound('gameover');
                onGameOver(score);
              }
              return Math.max(0, Math.min(CANVAS_WIDTH - FROG_SIZE, newX));
            });
          }
        }
      }

      // Draw
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw lanes
      lanes.forEach((lane, index) => {
        const y = (lanes.length - 1 - index) * CELL_SIZE;
        if (lane.type === 'water') {
          ctx.fillStyle = 'hsl(210, 80%, 25%)';
          ctx.fillRect(0, y, CANVAS_WIDTH, CELL_SIZE);
          // Draw logs
          lane.objects.forEach(log => {
            ctx.fillStyle = 'hsl(30, 60%, 30%)';
            ctx.fillRect(log.x, y + 5, log.width, CELL_SIZE - 10);
          });
        } else if (lane.type === 'road') {
          ctx.fillStyle = 'hsl(0, 0%, 20%)';
          ctx.fillRect(0, y, CANVAS_WIDTH, CELL_SIZE);
          // Draw road markings
          ctx.setLineDash([10, 10]);
          ctx.strokeStyle = 'hsl(60, 100%, 50%)';
          ctx.beginPath();
          ctx.moveTo(0, y + CELL_SIZE / 2);
          ctx.lineTo(CANVAS_WIDTH, y + CELL_SIZE / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          // Draw cars
          lane.objects.forEach(car => {
            ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
            ctx.fillRect(car.x, y + 8, car.width, CELL_SIZE - 16);
          });
        } else {
          ctx.fillStyle = 'hsl(120, 40%, 20%)';
          ctx.fillRect(0, y, CANVAS_WIDTH, CELL_SIZE);
        }
      });

      // Draw frog
      ctx.fillStyle = 'hsl(120, 100%, 50%)';
      ctx.beginPath();
      ctx.arc(frogX + FROG_SIZE / 2, frogY + FROG_SIZE / 2, FROG_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'hsl(120, 100%, 70%)';
      ctx.beginPath();
      ctx.arc(frogX + FROG_SIZE / 3, frogY + FROG_SIZE / 3, 5, 0, Math.PI * 2);
      ctx.arc(frogX + (2 * FROG_SIZE) / 3, frogY + FROG_SIZE / 3, 5, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, lanes, frogX, frogY, score, onGameOver, playSound]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-neon-cyan"
      />
      {isStarting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xs neon-text-cyan mb-4">GET READY!</p>
          <p className="text-4xl neon-text-green animate-pulse">
            {countdown > 0 ? countdown : 'GO!'}
          </p>
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xl neon-text-magenta mb-4">GAME OVER</p>
          <p className="text-sm neon-text-cyan">SCORE: {score}</p>
        </div>
      )}
      <p className="mt-4 text-[10px] text-muted-foreground">ARROW KEYS TO HOP</p>
    </div>
  );
};

export default FrogHopperGame;
