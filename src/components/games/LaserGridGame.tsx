import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface LaserGridGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const PLAYER_SIZE = 20;
const CELL_SIZE = 40;

interface Laser {
  x: number;
  y: number;
  direction: 'h' | 'v';
  speed: number;
  phase: number;
}

const LaserGridGame = ({ onScoreChange, onGameOver, isActive }: LaserGridGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [playerX, setPlayerX] = useState(40);
  const [playerY, setPlayerY] = useState(360);
  const [exitX, setExitX] = useState(360);
  const [exitY, setExitY] = useState(40);
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Generate level
  const generateLevel = (lvl: number) => {
    const newLasers: Laser[] = [];
    const numLasers = 3 + lvl * 2;

    for (let i = 0; i < numLasers; i++) {
      const isHorizontal = Math.random() < 0.5;
      newLasers.push({
        x: isHorizontal ? 0 : 40 + Math.floor(Math.random() * 8) * CELL_SIZE,
        y: isHorizontal ? 40 + Math.floor(Math.random() * 8) * CELL_SIZE : 0,
        direction: isHorizontal ? 'h' : 'v',
        speed: 0.02 + lvl * 0.005,
        phase: Math.random() * Math.PI * 2,
      });
    }

    setLasers(newLasers);
    setPlayerX(40);
    setPlayerY(360);
    setExitX(320 + Math.floor(Math.random() * 2) * 40);
    setExitY(40);
  };

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
      generateLevel(1);
    }
  }, [isActive, isStarting, countdown, playSound]);

  // Keyboard controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, gameOver, isStarting]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const gameLoop = () => {
      time += 1;

      // Player movement
      const speed = 3;
      if (keysRef.current['arrowup'] || keysRef.current['w']) {
        setPlayerY(prev => Math.max(20, prev - speed));
      }
      if (keysRef.current['arrowdown'] || keysRef.current['s']) {
        setPlayerY(prev => Math.min(CANVAS_HEIGHT - 40, prev + speed));
      }
      if (keysRef.current['arrowleft'] || keysRef.current['a']) {
        setPlayerX(prev => Math.max(20, prev - speed));
      }
      if (keysRef.current['arrowright'] || keysRef.current['d']) {
        setPlayerX(prev => Math.min(CANVAS_WIDTH - 40, prev + speed));
      }

      // Check laser collision
      for (const laser of lasers) {
        const laserActive = Math.sin(time * laser.speed + laser.phase) > 0;
        if (!laserActive) continue;

        if (laser.direction === 'h') {
          // Horizontal laser
          if (
            playerY + PLAYER_SIZE > laser.y - 5 &&
            playerY < laser.y + 5
          ) {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
            return;
          }
        } else {
          // Vertical laser
          if (
            playerX + PLAYER_SIZE > laser.x - 5 &&
            playerX < laser.x + 5
          ) {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
            return;
          }
        }
      }

      // Check exit reached
      if (
        playerX + PLAYER_SIZE > exitX &&
        playerX < exitX + CELL_SIZE &&
        playerY + PLAYER_SIZE > exitY &&
        playerY < exitY + CELL_SIZE
      ) {
        const points = level * 100;
        const newScore = score + points;
        setScore(newScore);
        onScoreChange(newScore);
        playSound('powerup');

        const newLevel = level + 1;
        setLevel(newLevel);
        generateLevel(newLevel);
      }

      // Draw
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw grid
      ctx.strokeStyle = 'hsl(180, 50%, 15%)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_WIDTH; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw exit
      ctx.fillStyle = 'hsl(120, 80%, 40%)';
      ctx.fillRect(exitX, exitY, CELL_SIZE, CELL_SIZE);
      ctx.fillStyle = 'hsl(120, 80%, 60%)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', exitX + CELL_SIZE / 2, exitY + CELL_SIZE / 2 + 4);
      ctx.textAlign = 'left';

      // Draw lasers
      lasers.forEach(laser => {
        const laserActive = Math.sin(time * laser.speed + laser.phase) > 0;
        const alpha = laserActive ? 1 : 0.2;

        if (laser.direction === 'h') {
          // Horizontal laser
          const gradient = ctx.createLinearGradient(0, laser.y - 5, 0, laser.y + 5);
          gradient.addColorStop(0, `hsla(0, 100%, 50%, 0)`);
          gradient.addColorStop(0.5, `hsla(0, 100%, 50%, ${alpha})`);
          gradient.addColorStop(1, `hsla(0, 100%, 50%, 0)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, laser.y - 10, CANVAS_WIDTH, 20);

          if (laserActive) {
            ctx.strokeStyle = 'hsl(0, 100%, 70%)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, laser.y);
            ctx.lineTo(CANVAS_WIDTH, laser.y);
            ctx.stroke();
          }
        } else {
          // Vertical laser
          const gradient = ctx.createLinearGradient(laser.x - 5, 0, laser.x + 5, 0);
          gradient.addColorStop(0, `hsla(0, 100%, 50%, 0)`);
          gradient.addColorStop(0.5, `hsla(0, 100%, 50%, ${alpha})`);
          gradient.addColorStop(1, `hsla(0, 100%, 50%, 0)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(laser.x - 10, 0, 20, CANVAS_HEIGHT);

          if (laserActive) {
            ctx.strokeStyle = 'hsl(0, 100%, 70%)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(laser.x, 0);
            ctx.lineTo(laser.x, CANVAS_HEIGHT);
            ctx.stroke();
          }
        }

        // Emitter
        ctx.fillStyle = laserActive ? 'hsl(0, 80%, 40%)' : 'hsl(0, 30%, 30%)';
        if (laser.direction === 'h') {
          ctx.fillRect(0, laser.y - 8, 10, 16);
          ctx.fillRect(CANVAS_WIDTH - 10, laser.y - 8, 10, 16);
        } else {
          ctx.fillRect(laser.x - 8, 0, 16, 10);
          ctx.fillRect(laser.x - 8, CANVAS_HEIGHT - 10, 16, 10);
        }
      });

      // Draw player
      ctx.fillStyle = 'hsl(180, 100%, 50%)';
      ctx.beginPath();
      ctx.arc(playerX + PLAYER_SIZE / 2, playerY + PLAYER_SIZE / 2, PLAYER_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'hsl(180, 100%, 70%)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`LEVEL: ${level}`, 15, CANVAS_HEIGHT - 10);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, playerY, exitX, exitY, lasers, level, score, onGameOver, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">AVOID THE LASERS!</p>
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
      <p className="mt-4 text-[10px] text-muted-foreground">ARROW KEYS TO MOVE • REACH THE EXIT</p>
    </div>
  );
};

export default LaserGridGame;
