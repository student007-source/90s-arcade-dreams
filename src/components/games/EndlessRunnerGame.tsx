import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface EndlessRunnerGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;
const PLAYER_SIZE = 30;
const GROUND_Y = CANVAS_HEIGHT - 50;

interface Obstacle {
  x: number;
  width: number;
  height: number;
  type: 'low' | 'high';
}

interface Powerup {
  x: number;
  y: number;
  type: 'coin' | 'shield';
}

const EndlessRunnerGame = ({ onScoreChange, onGameOver, isActive }: EndlessRunnerGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerY, setPlayerY] = useState(GROUND_Y - PLAYER_SIZE);
  const [velocityY, setVelocityY] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [isDucking, setIsDucking] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [powerups, setPowerups] = useState<Powerup[]>([]);
  const [gameSpeed, setGameSpeed] = useState(5);
  const [hasShield, setHasShield] = useState(false);
  const [distance, setDistance] = useState(0);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

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

  // Keyboard controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && !isJumping) {
        setIsJumping(true);
        setVelocityY(-15);
        playSound('jump');
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setIsDucking(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setIsDucking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, gameOver, isStarting, isJumping, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let spawnTimer = 0;
    let powerupTimer = 0;

    const gameLoop = () => {
      // Gravity
      setVelocityY(prev => prev + 0.8);
      setPlayerY(prev => {
        const newY = prev + velocityY;
        if (newY >= GROUND_Y - PLAYER_SIZE) {
          setIsJumping(false);
          setVelocityY(0);
          return GROUND_Y - PLAYER_SIZE;
        }
        return newY;
      });

      // Update distance and score
      setDistance(prev => prev + gameSpeed);
      const newScore = Math.floor(distance / 10);
      setScore(newScore);
      onScoreChange(newScore);

      // Increase speed over time
      setGameSpeed(5 + Math.floor(distance / 500) * 0.5);

      // Spawn obstacles
      spawnTimer++;
      if (spawnTimer > 60 + Math.random() * 60) {
        spawnTimer = 0;
        const isHigh = Math.random() < 0.3;
        setObstacles(prev => [...prev, {
          x: CANVAS_WIDTH + 50,
          width: 20 + Math.random() * 20,
          height: isHigh ? 30 : 40 + Math.random() * 20,
          type: isHigh ? 'high' : 'low',
        }]);
      }

      // Spawn powerups
      powerupTimer++;
      if (powerupTimer > 200 + Math.random() * 100) {
        powerupTimer = 0;
        const type = Math.random() < 0.7 ? 'coin' : 'shield';
        setPowerups(prev => [...prev, {
          x: CANVAS_WIDTH + 50,
          y: GROUND_Y - 80 - Math.random() * 50,
          type,
        }]);
      }

      // Update obstacles
      setObstacles(prev => {
        const remaining: Obstacle[] = [];
        prev.forEach(obs => {
          const newX = obs.x - gameSpeed;
          if (newX > -50) {
            remaining.push({ ...obs, x: newX });
          }
        });
        return remaining;
      });

      // Update powerups
      setPowerups(prev => {
        const remaining: Powerup[] = [];
        prev.forEach(p => {
          const newX = p.x - gameSpeed;
          if (newX > -30) {
            remaining.push({ ...p, x: newX });
          }
        });
        return remaining;
      });

      // Collision detection
      const playerHeight = isDucking ? PLAYER_SIZE / 2 : PLAYER_SIZE;
      const playerTop = isDucking ? GROUND_Y - PLAYER_SIZE / 2 : playerY;
      const playerLeft = 50;
      const playerRight = 50 + PLAYER_SIZE;

      // Obstacle collision
      for (const obs of obstacles) {
        const obsTop = obs.type === 'high' ? GROUND_Y - 60 : GROUND_Y - obs.height;
        const obsBottom = obs.type === 'high' ? GROUND_Y - 30 : GROUND_Y;

        if (
          playerRight > obs.x &&
          playerLeft < obs.x + obs.width &&
          playerTop + playerHeight > obsTop &&
          playerTop < obsBottom
        ) {
          if (hasShield) {
            setHasShield(false);
            setObstacles(prev => prev.filter(o => o !== obs));
            playSound('hit');
          } else {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
            return;
          }
        }
      }

      // Powerup collection
      powerups.forEach(p => {
        if (
          playerRight > p.x &&
          playerLeft < p.x + 20 &&
          playerTop + playerHeight > p.y &&
          playerTop < p.y + 20
        ) {
          setPowerups(prev => prev.filter(pp => pp !== p));
          if (p.type === 'coin') {
            playSound('coin');
            setScore(s => s + 50);
            onScoreChange(score + 50);
          } else {
            playSound('powerup');
            setHasShield(true);
          }
        }
      });

      // Draw
      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, 'hsl(220, 60%, 20%)');
      gradient.addColorStop(1, 'hsl(280, 60%, 15%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ground
      ctx.fillStyle = 'hsl(30, 40%, 20%)';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 50);
      ctx.strokeStyle = 'hsl(30, 40%, 30%)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Draw obstacles
      obstacles.forEach(obs => {
        if (obs.type === 'low') {
          ctx.fillStyle = 'hsl(0, 70%, 40%)';
          ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);
          // Spikes
          ctx.fillStyle = 'hsl(0, 70%, 30%)';
          for (let i = 0; i < obs.width; i += 8) {
            ctx.beginPath();
            ctx.moveTo(obs.x + i, GROUND_Y - obs.height);
            ctx.lineTo(obs.x + i + 4, GROUND_Y - obs.height - 8);
            ctx.lineTo(obs.x + i + 8, GROUND_Y - obs.height);
            ctx.fill();
          }
        } else {
          // Flying obstacle
          ctx.fillStyle = 'hsl(270, 70%, 40%)';
          ctx.fillRect(obs.x, GROUND_Y - 60, obs.width, 30);
        }
      });

      // Draw powerups
      powerups.forEach(p => {
        if (p.type === 'coin') {
          ctx.fillStyle = 'hsl(45, 100%, 50%)';
          ctx.beginPath();
          ctx.arc(p.x + 10, p.y + 10, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'hsl(45, 100%, 70%)';
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('$', p.x + 10, p.y + 14);
          ctx.textAlign = 'left';
        } else {
          ctx.fillStyle = 'hsl(180, 100%, 50%)';
          ctx.beginPath();
          ctx.arc(p.x + 10, p.y + 10, 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'hsla(180, 100%, 50%, 0.3)';
          ctx.fill();
        }
      });

      // Draw player
      const pHeight = isDucking ? PLAYER_SIZE / 2 : PLAYER_SIZE;
      const pY = isDucking ? GROUND_Y - PLAYER_SIZE / 2 : playerY;
      
      // Shield effect
      if (hasShield) {
        ctx.strokeStyle = 'hsl(180, 100%, 50%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(50 + PLAYER_SIZE / 2, pY + pHeight / 2, PLAYER_SIZE * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = 'hsl(120, 70%, 50%)';
      ctx.fillRect(50, pY, PLAYER_SIZE, pHeight);
      
      // Running animation legs
      const legOffset = Math.sin(distance / 10) * 5;
      ctx.fillStyle = 'hsl(120, 70%, 40%)';
      ctx.fillRect(55, pY + pHeight - 5 + legOffset, 5, 8);
      ctx.fillRect(70, pY + pHeight - 5 - legOffset, 5, 8);

      // Eyes
      ctx.fillStyle = 'white';
      ctx.fillRect(70, pY + 5, 5, 5);

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.fillText(`SCORE: ${score}`, 10, 25);
      ctx.fillText(`SPEED: ${gameSpeed.toFixed(1)}`, CANVAS_WIDTH - 100, 25);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerY, velocityY, isDucking, obstacles, powerups, gameSpeed, distance, hasShield, score, onGameOver, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">RUN!</p>
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
      <p className="mt-4 text-[10px] text-muted-foreground">SPACE/↑ TO JUMP • ↓ TO DUCK</p>
    </div>
  );
};

export default EndlessRunnerGame;
