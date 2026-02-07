import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface ArcadeFishingGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

interface Fish {
  x: number;
  y: number;
  speed: number;
  type: 'common' | 'rare' | 'legendary' | 'junk';
  points: number;
  size: number;
}

const ArcadeFishingGame = ({ onScoreChange, onGameOver, isActive }: ArcadeFishingGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hookX, setHookX] = useState(CANVAS_WIDTH / 2);
  const [hookY, setHookY] = useState(80);
  const [isCasting, setIsCasting] = useState(false);
  const [isReeling, setIsReeling] = useState(false);
  const [caughtFish, setCaughtFish] = useState<Fish | null>(null);
  const [fish, setFish] = useState<Fish[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [fishCaught, setFishCaught] = useState(0);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  // Spawn fish
  useEffect(() => {
    const spawnFish = () => {
      const types: Fish['type'][] = ['common', 'common', 'common', 'rare', 'rare', 'legendary', 'junk', 'junk'];
      const type = types[Math.floor(Math.random() * types.length)];
      const fishData = {
        common: { points: 10, size: 20, speed: 1 + Math.random() },
        rare: { points: 50, size: 25, speed: 1.5 + Math.random() },
        legendary: { points: 200, size: 35, speed: 2 + Math.random() * 2 },
        junk: { points: -20, size: 15, speed: 0.5 + Math.random() * 0.5 },
      };
      const data = fishData[type];
      
      return {
        x: Math.random() < 0.5 ? -50 : CANVAS_WIDTH + 50,
        y: 120 + Math.random() * (CANVAS_HEIGHT - 170),
        speed: data.speed * (Math.random() < 0.5 ? 1 : -1),
        type,
        points: data.points,
        size: data.size,
      };
    };

    const initialFish: Fish[] = [];
    for (let i = 0; i < 8; i++) {
      initialFish.push(spawnFish());
    }
    setFish(initialFish);
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

  // Game timer
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          playSound('whistle');
          onGameOver(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, gameOver, isStarting, score, onGameOver, playSound]);

  // Keyboard/mouse controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isCasting && !isReeling) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setHookX(Math.max(50, Math.min(CANVAS_WIDTH - 50, x)));
      }
    };

    const handleClick = () => {
      if (!isCasting && !isReeling && !caughtFish) {
        setIsCasting(true);
        playSound('splash');
      } else if (isCasting && !isReeling) {
        setIsReeling(true);
        playSound('blip');
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [isActive, gameOver, isStarting, isCasting, isReeling, caughtFish, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Cast hook down
      if (isCasting && !isReeling) {
        setHookY(prev => {
          if (prev >= CANVAS_HEIGHT - 50) {
            return prev;
          }
          return prev + 4;
        });
      }

      // Reel hook up
      if (isReeling) {
        setHookY(prev => {
          if (prev <= 80) {
            setIsReeling(false);
            setIsCasting(false);
            if (caughtFish) {
              playSound('score');
              const newScore = score + caughtFish.points;
              setScore(Math.max(0, newScore));
              onScoreChange(Math.max(0, newScore));
              if (caughtFish.type !== 'junk') {
                setFishCaught(prev => prev + 1);
              }
              setCaughtFish(null);
            }
            return 80;
          }
          return prev - 5;
        });
      }

      // Update fish
      setFish(prev => {
        const updated = prev.map(f => {
          if (f === caughtFish) {
            return { ...f, x: hookX, y: hookY + 20 };
          }
          let newX = f.x + f.speed;
          // Wrap around
          if (newX > CANVAS_WIDTH + 60) newX = -50;
          if (newX < -60) newX = CANVAS_WIDTH + 50;
          return { ...f, x: newX };
        });

        // Spawn new fish occasionally
        if (Math.random() < 0.01 && updated.length < 12) {
          const types: Fish['type'][] = ['common', 'common', 'rare', 'legendary', 'junk'];
          const type = types[Math.floor(Math.random() * types.length)];
          const fishData = {
            common: { points: 10, size: 20, speed: 1 + Math.random() },
            rare: { points: 50, size: 25, speed: 1.5 + Math.random() },
            legendary: { points: 200, size: 35, speed: 2 + Math.random() * 2 },
            junk: { points: -20, size: 15, speed: 0.5 + Math.random() * 0.5 },
          };
          const data = fishData[type];
          updated.push({
            x: Math.random() < 0.5 ? -50 : CANVAS_WIDTH + 50,
            y: 120 + Math.random() * (CANVAS_HEIGHT - 170),
            speed: data.speed * (Math.random() < 0.5 ? 1 : -1),
            type,
            points: data.points,
            size: data.size,
          });
        }

        return updated;
      });

      // Check fish catch
      if (isCasting && !isReeling && !caughtFish) {
        for (const f of fish) {
          const dist = Math.hypot(hookX - f.x, hookY - f.y);
          if (dist < f.size + 10) {
            setCaughtFish(f);
            setIsReeling(true);
            playSound('powerup');
            break;
          }
        }
      }

      // Draw
      // Sky
      ctx.fillStyle = 'hsl(200, 60%, 70%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, 100);

      // Water
      const waterGradient = ctx.createLinearGradient(0, 100, 0, CANVAS_HEIGHT);
      waterGradient.addColorStop(0, 'hsl(200, 70%, 50%)');
      waterGradient.addColorStop(1, 'hsl(220, 70%, 30%)');
      ctx.fillStyle = waterGradient;
      ctx.fillRect(0, 100, CANVAS_WIDTH, CANVAS_HEIGHT - 100);

      // Waves
      ctx.strokeStyle = 'hsla(200, 80%, 70%, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let x = 0; x < CANVAS_WIDTH; x += 10) {
          const y = 100 + Math.sin((x + Date.now() / 200 + i * 50) / 30) * 5 + i * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Draw fish
      fish.forEach(f => {
        if (f === caughtFish) return;
        
        const colors = {
          common: 'hsl(30, 70%, 50%)',
          rare: 'hsl(180, 70%, 50%)',
          legendary: 'hsl(45, 100%, 50%)',
          junk: 'hsl(0, 0%, 40%)',
        };
        
        ctx.fillStyle = colors[f.type];
        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.speed < 0) ctx.scale(-1, 1);
        
        // Fish body
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.beginPath();
        ctx.moveTo(-f.size, 0);
        ctx.lineTo(-f.size - 10, -8);
        ctx.lineTo(-f.size - 10, 8);
        ctx.closePath();
        ctx.fill();
        
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(f.size / 2, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(f.size / 2 + 1, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Glow for legendary
        if (f.type === 'legendary') {
          ctx.strokeStyle = 'hsla(45, 100%, 70%, 0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, f.size + 5, f.size / 2 + 5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw fishing line
      ctx.strokeStyle = 'hsl(0, 0%, 80%)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hookX, 50);
      ctx.lineTo(hookX, hookY);
      ctx.stroke();

      // Draw hook
      ctx.fillStyle = 'hsl(0, 0%, 60%)';
      ctx.beginPath();
      ctx.arc(hookX, hookY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'hsl(0, 0%, 40%)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hookX, hookY + 5, 6, 0.5, Math.PI - 0.5);
      ctx.stroke();

      // Draw caught fish on hook
      if (caughtFish) {
        const colors = {
          common: 'hsl(30, 70%, 50%)',
          rare: 'hsl(180, 70%, 50%)',
          legendary: 'hsl(45, 100%, 50%)',
          junk: 'hsl(0, 0%, 40%)',
        };
        ctx.fillStyle = colors[caughtFish.type];
        ctx.beginPath();
        ctx.ellipse(hookX, hookY + 25, caughtFish.size, caughtFish.size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw dock
      ctx.fillStyle = 'hsl(30, 40%, 30%)';
      ctx.fillRect(hookX - 30, 40, 60, 15);

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.fillText(`SCORE: ${score}`, 10, 25);
      ctx.fillText(`TIME: ${timeLeft}s`, CANVAS_WIDTH - 90, 25);
      ctx.fillText(`CATCH: ${fishCaught}`, CANVAS_WIDTH / 2 - 35, 25);

      // Instructions
      if (!isCasting) {
        ctx.fillStyle = 'hsla(0, 0%, 100%, 0.8)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO CAST', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
        ctx.textAlign = 'left';
      } else if (!isReeling) {
        ctx.fillStyle = 'hsla(0, 0%, 100%, 0.8)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO REEL', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
        ctx.textAlign = 'left';
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, hookX, hookY, isCasting, isReeling, caughtFish, fish, score, fishCaught, onScoreChange, playSound]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-neon-cyan cursor-pointer"
      />
      {isStarting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xs neon-text-cyan mb-4">CATCH 'EM ALL!</p>
          <p className="text-4xl neon-text-green animate-pulse">
            {countdown > 0 ? countdown : 'GO!'}
          </p>
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xl neon-text-magenta mb-4">TIME'S UP!</p>
          <p className="text-sm neon-text-cyan">FISH CAUGHT: {fishCaught}</p>
          <p className="text-sm neon-text-yellow">SCORE: {score}</p>
        </div>
      )}
      <p className="mt-4 text-[10px] text-muted-foreground">MOVE MOUSE • CLICK TO CAST/REEL</p>
    </div>
  );
};

export default ArcadeFishingGame;
