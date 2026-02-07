import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface DonkeyJumpGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 500;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 30;
const PLATFORM_HEIGHT = 15;

interface Platform {
  x: number;
  y: number;
  width: number;
  type: 'normal' | 'moving' | 'breaking' | 'spring';
  dx?: number;
  broken?: boolean;
}

const DonkeyJumpGame = ({ onScoreChange, onGameOver, isActive }: DonkeyJumpGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2);
  const [playerY, setPlayerY] = useState(CANVAS_HEIGHT - 100);
  const [velocityY, setVelocityY] = useState(0);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [cameraY, setCameraY] = useState(0);
  const [highestY, setHighestY] = useState(CANVAS_HEIGHT);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [facingLeft, setFacingLeft] = useState(false);
  const { playSound } = useSound();

  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Initialize platforms
  useEffect(() => {
    const initialPlatforms: Platform[] = [];
    for (let i = 0; i < 15; i++) {
      initialPlatforms.push({
        x: Math.random() * (CANVAS_WIDTH - 70),
        y: CANVAS_HEIGHT - 50 - i * 40,
        width: 60 + Math.random() * 20,
        type: i < 3 ? 'normal' : 
              Math.random() < 0.1 ? 'spring' :
              Math.random() < 0.15 ? 'breaking' :
              Math.random() < 0.2 ? 'moving' : 'normal',
        dx: (Math.random() - 0.5) * 4,
      });
    }
    setPlatforms(initialPlatforms);
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
      setVelocityY(-12);
    }
  }, [isActive, isStarting, countdown, playSound]);

  // Keyboard controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        setFacingLeft(true);
      }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        setFacingLeft(false);
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
  }, [isActive, gameOver, isStarting]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const gravity = 0.4;
    const moveSpeed = 6;

    const gameLoop = () => {
      // Horizontal movement
      if (keysRef.current['arrowleft'] || keysRef.current['a']) {
        setPlayerX(prev => prev - moveSpeed);
      }
      if (keysRef.current['arrowright'] || keysRef.current['d']) {
        setPlayerX(prev => prev + moveSpeed);
      }

      // Wrap around screen
      setPlayerX(prev => {
        if (prev < -PLAYER_WIDTH) return CANVAS_WIDTH;
        if (prev > CANVAS_WIDTH) return -PLAYER_WIDTH;
        return prev;
      });

      // Apply gravity
      setVelocityY(prev => prev + gravity);
      setPlayerY(prev => prev + velocityY);

      // Update camera
      const screenY = playerY - cameraY;
      if (screenY < CANVAS_HEIGHT / 3) {
        const diff = CANVAS_HEIGHT / 3 - screenY;
        setCameraY(prev => prev - diff);
        
        // Score based on height
        if (playerY < highestY) {
          const points = Math.floor((highestY - playerY) / 10);
          const newScore = score + points;
          setScore(newScore);
          onScoreChange(newScore);
          setHighestY(playerY);
        }
      }

      // Platform collision (only when falling)
      if (velocityY > 0) {
        platforms.forEach((platform, i) => {
          if (platform.broken) return;
          
          const platScreenY = platform.y - cameraY;
          const playerBottom = playerY + PLAYER_HEIGHT - cameraY;
          
          if (
            playerX + PLAYER_WIDTH > platform.x &&
            playerX < platform.x + platform.width &&
            playerBottom > platScreenY &&
            playerBottom < platScreenY + PLATFORM_HEIGHT + velocityY
          ) {
            if (platform.type === 'breaking') {
              setPlatforms(prev => {
                const updated = [...prev];
                updated[i] = { ...platform, broken: true };
                return updated;
              });
              playSound('hit');
            } else if (platform.type === 'spring') {
              setVelocityY(-20);
              playSound('powerup');
            } else {
              setVelocityY(-12);
              playSound('jump');
            }
          }
        });
      }

      // Update moving platforms
      setPlatforms(prev => prev.map(p => {
        if (p.type === 'moving' && p.dx) {
          let newX = p.x + p.dx;
          if (newX < 0 || newX + p.width > CANVAS_WIDTH) {
            return { ...p, x: Math.max(0, Math.min(CANVAS_WIDTH - p.width, newX)), dx: -p.dx };
          }
          return { ...p, x: newX };
        }
        return p;
      }));

      // Generate new platforms
      const lowestVisible = cameraY + CANVAS_HEIGHT;
      const highestPlatform = Math.min(...platforms.map(p => p.y));
      if (highestPlatform > cameraY - 100) {
        const newPlatform: Platform = {
          x: Math.random() * (CANVAS_WIDTH - 70),
          y: highestPlatform - 30 - Math.random() * 30,
          width: 50 + Math.random() * 30,
          type: Math.random() < 0.08 ? 'spring' :
                Math.random() < 0.15 ? 'breaking' :
                Math.random() < 0.2 ? 'moving' : 'normal',
          dx: (Math.random() - 0.5) * 4,
        };
        setPlatforms(prev => [...prev.filter(p => p.y < lowestVisible + 100), newPlatform]);
      }

      // Game over check
      if (playerY - cameraY > CANVAS_HEIGHT + 50) {
        setGameOver(true);
        playSound('gameover');
        onGameOver(score);
        return;
      }

      // Draw
      ctx.fillStyle = 'hsl(210, 30%, 10%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw platforms
      platforms.forEach(platform => {
        if (platform.broken) return;
        const screenY = platform.y - cameraY;
        if (screenY < -20 || screenY > CANVAS_HEIGHT + 20) return;

        switch (platform.type) {
          case 'normal':
            ctx.fillStyle = 'hsl(120, 60%, 40%)';
            break;
          case 'moving':
            ctx.fillStyle = 'hsl(200, 60%, 50%)';
            break;
          case 'breaking':
            ctx.fillStyle = 'hsl(30, 60%, 40%)';
            break;
          case 'spring':
            ctx.fillStyle = 'hsl(60, 80%, 50%)';
            break;
        }
        ctx.fillRect(platform.x, screenY, platform.width, PLATFORM_HEIGHT);
        
        if (platform.type === 'spring') {
          ctx.fillStyle = 'hsl(0, 80%, 50%)';
          ctx.fillRect(platform.x + platform.width / 2 - 5, screenY - 8, 10, 8);
        }
      });

      // Draw player
      const playerScreenY = playerY - cameraY;
      ctx.fillStyle = 'hsl(30, 70%, 50%)';
      ctx.fillRect(playerX, playerScreenY, PLAYER_WIDTH, PLAYER_HEIGHT);
      
      // Face
      ctx.fillStyle = 'hsl(30, 70%, 70%)';
      const eyeX = facingLeft ? playerX + 5 : playerX + PLAYER_WIDTH - 12;
      ctx.fillRect(eyeX, playerScreenY + 8, 4, 4);
      ctx.fillRect(eyeX + 8, playerScreenY + 8, 4, 4);
      
      // Feet animation
      ctx.fillStyle = 'hsl(30, 50%, 30%)';
      const footOffset = Math.sin(Date.now() / 100) * 2;
      ctx.fillRect(playerX + 3, playerScreenY + PLAYER_HEIGHT - 5 + footOffset, 8, 5);
      ctx.fillRect(playerX + PLAYER_WIDTH - 11, playerScreenY + PLAYER_HEIGHT - 5 - footOffset, 8, 5);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, playerY, velocityY, platforms, cameraY, highestY, score, onGameOver, onScoreChange, playSound]);

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
      <p className="mt-4 text-[10px] text-muted-foreground">←→ OR A/D TO MOVE</p>
    </div>
  );
};

export default DonkeyJumpGame;
