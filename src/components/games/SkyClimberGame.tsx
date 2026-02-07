import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface SkyClimberGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 500;
const PLAYER_SIZE = 25;

interface Ledge {
  x: number;
  y: number;
  width: number;
  moving?: boolean;
  dx?: number;
}

interface Hazard {
  x: number;
  y: number;
  type: 'bird' | 'debris';
  dx: number;
}

const SkyClimberGame = ({ onScoreChange, onGameOver, isActive }: SkyClimberGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2);
  const [playerY, setPlayerY] = useState(CANVAS_HEIGHT - 100);
  const [velocityY, setVelocityY] = useState(0);
  const [isOnLedge, setIsOnLedge] = useState(true);
  const [ledges, setLedges] = useState<Ledge[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [cameraY, setCameraY] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Initialize ledges
  useEffect(() => {
    const initialLedges: Ledge[] = [];
    for (let i = 0; i < 15; i++) {
      initialLedges.push({
        x: 30 + Math.random() * (CANVAS_WIDTH - 130),
        y: CANVAS_HEIGHT - 50 - i * 50,
        width: 60 + Math.random() * 40,
        moving: i > 5 && Math.random() < 0.3,
        dx: (Math.random() - 0.5) * 3,
      });
    }
    setLedges(initialLedges);
  }, []);

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
      keysRef.current[e.key.toLowerCase()] = true;
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && isOnLedge) {
        setVelocityY(-12);
        setIsOnLedge(false);
        playSound('jump');
      }
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
  }, [isActive, gameOver, isStarting, isOnLedge, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let hazardTimer = 0;

    const gameLoop = () => {
      // Horizontal movement
      const speed = 4;
      if (keysRef.current['arrowleft'] || keysRef.current['a']) {
        setPlayerX(prev => Math.max(0, prev - speed));
      }
      if (keysRef.current['arrowright'] || keysRef.current['d']) {
        setPlayerX(prev => Math.min(CANVAS_WIDTH - PLAYER_SIZE, prev + speed));
      }

      // Gravity
      setVelocityY(prev => Math.min(prev + 0.5, 10));
      setPlayerY(prev => prev + velocityY);

      // Auto scroll up
      setCameraY(prev => prev - scrollSpeed);
      setScrollSpeed(prev => Math.min(3, prev + 0.001));

      // Update score based on height
      const height = Math.floor(-cameraY / 10);
      if (height > score) {
        setScore(height);
        onScoreChange(height);
      }

      // Update ledges
      setLedges(prev => {
        const updated = prev.map(ledge => {
          if (ledge.moving && ledge.dx) {
            let newX = ledge.x + ledge.dx;
            if (newX < 20 || newX + ledge.width > CANVAS_WIDTH - 20) {
              ledge.dx = -ledge.dx;
            }
            return { ...ledge, x: newX };
          }
          return ledge;
        });

        // Remove ledges below screen and add new ones above
        const screenBottom = -cameraY + CANVAS_HEIGHT;
        const filtered = updated.filter(l => l.y < screenBottom + 100);
        
        // Add new ledges
        const highestLedge = Math.min(...filtered.map(l => l.y));
        if (highestLedge > -cameraY - 100) {
          const newLedge: Ledge = {
            x: 30 + Math.random() * (CANVAS_WIDTH - 130),
            y: highestLedge - 40 - Math.random() * 30,
            width: 50 + Math.random() * 50,
            moving: Math.random() < 0.3,
            dx: (Math.random() - 0.5) * 4,
          };
          filtered.push(newLedge);
        }

        return filtered;
      });

      // Spawn hazards
      hazardTimer++;
      if (hazardTimer > 120 + Math.random() * 60) {
        hazardTimer = 0;
        const fromLeft = Math.random() < 0.5;
        setHazards(prev => [...prev, {
          x: fromLeft ? -30 : CANVAS_WIDTH + 30,
          y: -cameraY + 100 + Math.random() * 200,
          type: Math.random() < 0.6 ? 'bird' : 'debris',
          dx: fromLeft ? 3 : -3,
        }]);
      }

      // Update hazards
      setHazards(prev => prev.filter(h => {
        h.x += h.dx;
        return h.x > -50 && h.x < CANVAS_WIDTH + 50;
      }));

      // Ledge collision
      let onPlatform = false;
      if (velocityY > 0) {
        for (const ledge of ledges) {
          const screenLedgeY = ledge.y - cameraY;
          const screenPlayerY = playerY - cameraY;
          
          if (
            playerX + PLAYER_SIZE > ledge.x &&
            playerX < ledge.x + ledge.width &&
            screenPlayerY + PLAYER_SIZE > screenLedgeY &&
            screenPlayerY + PLAYER_SIZE < screenLedgeY + 15
          ) {
            setPlayerY(ledge.y + cameraY - PLAYER_SIZE);
            setVelocityY(0);
            setIsOnLedge(true);
            onPlatform = true;
            
            // Move with platform
            if (ledge.moving && ledge.dx) {
              setPlayerX(prev => Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, prev + ledge.dx)));
            }
            break;
          }
        }
      }

      if (!onPlatform && velocityY >= 0) {
        setIsOnLedge(false);
      }

      // Hazard collision
      const screenPlayerY = playerY - cameraY;
      for (const hazard of hazards) {
        const screenHazardY = hazard.y - cameraY;
        if (
          playerX + PLAYER_SIZE > hazard.x &&
          playerX < hazard.x + 30 &&
          screenPlayerY + PLAYER_SIZE > screenHazardY &&
          screenPlayerY < screenHazardY + 20
        ) {
          setGameOver(true);
          playSound('gameover');
          onGameOver(score);
          return;
        }
      }

      // Fall below screen
      if (screenPlayerY > CANVAS_HEIGHT + 50) {
        setGameOver(true);
        playSound('gameover');
        onGameOver(score);
        return;
      }

      // Draw
      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, 'hsl(200, 60%, 30%)');
      gradient.addColorStop(1, 'hsl(200, 60%, 60%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Clouds (parallax)
      ctx.fillStyle = 'hsla(0, 0%, 100%, 0.3)';
      for (let i = 0; i < 5; i++) {
        const cloudY = ((i * 150 - cameraY * 0.3) % CANVAS_HEIGHT + CANVAS_HEIGHT) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.arc(50 + i * 70, cloudY, 30, 0, Math.PI * 2);
        ctx.arc(80 + i * 70, cloudY - 10, 25, 0, Math.PI * 2);
        ctx.arc(110 + i * 70, cloudY, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw ledges
      ledges.forEach(ledge => {
        const screenY = ledge.y - cameraY;
        if (screenY > -20 && screenY < CANVAS_HEIGHT + 20) {
          ctx.fillStyle = ledge.moving ? 'hsl(30, 60%, 40%)' : 'hsl(120, 40%, 35%)';
          ctx.fillRect(ledge.x, screenY, ledge.width, 15);
          ctx.strokeStyle = ledge.moving ? 'hsl(30, 60%, 50%)' : 'hsl(120, 40%, 45%)';
          ctx.strokeRect(ledge.x, screenY, ledge.width, 15);
        }
      });

      // Draw hazards
      hazards.forEach(hazard => {
        const screenY = hazard.y - cameraY;
        if (hazard.type === 'bird') {
          ctx.fillStyle = 'hsl(0, 70%, 40%)';
          // Body
          ctx.beginPath();
          ctx.ellipse(hazard.x + 15, screenY + 10, 15, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          // Wing
          ctx.beginPath();
          ctx.moveTo(hazard.x + 10, screenY + 8);
          ctx.lineTo(hazard.x + 5, screenY - 5 + Math.sin(Date.now() / 50) * 5);
          ctx.lineTo(hazard.x + 20, screenY + 8);
          ctx.fill();
        } else {
          ctx.fillStyle = 'hsl(0, 0%, 40%)';
          ctx.fillRect(hazard.x, screenY, 20, 20);
        }
      });

      // Draw player
      const pScreenY = playerY - cameraY;
      ctx.fillStyle = 'hsl(45, 80%, 50%)';
      ctx.fillRect(playerX, pScreenY, PLAYER_SIZE, PLAYER_SIZE);
      // Hard hat
      ctx.fillStyle = 'hsl(45, 80%, 60%)';
      ctx.fillRect(playerX - 2, pScreenY - 5, PLAYER_SIZE + 4, 8);
      // Face
      ctx.fillStyle = 'hsl(30, 60%, 60%)';
      ctx.fillRect(playerX + 5, pScreenY + 5, 15, 12);
      // Eyes
      ctx.fillStyle = 'white';
      ctx.fillRect(playerX + 8, pScreenY + 8, 4, 4);
      ctx.fillRect(playerX + 14, pScreenY + 8, 4, 4);

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.fillText(`HEIGHT: ${score}m`, 10, 25);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, playerY, velocityY, isOnLedge, ledges, hazards, cameraY, scrollSpeed, score, onGameOver, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">CLIMB!</p>
          <p className="text-4xl neon-text-green animate-pulse">
            {countdown > 0 ? countdown : 'GO!'}
          </p>
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xl neon-text-magenta mb-4">GAME OVER</p>
          <p className="text-sm neon-text-cyan">HEIGHT: {score}m</p>
        </div>
      )}
      <p className="mt-4 text-[10px] text-muted-foreground">←→ TO MOVE • SPACE/↑ TO JUMP</p>
    </div>
  );
};

export default SkyClimberGame;
