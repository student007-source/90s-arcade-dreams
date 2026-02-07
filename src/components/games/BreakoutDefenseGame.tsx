import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface BreakoutDefenseGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 6;

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  speed: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'wide' | 'slow' | 'shield';
}

const BreakoutDefenseGame = ({ onScoreChange, onGameOver, isActive }: BreakoutDefenseGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paddleX, setPaddleX] = useState(CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [paddleWidth, setPaddleWidth] = useState(PADDLE_WIDTH);
  const [ballX, setBallX] = useState(CANVAS_WIDTH / 2);
  const [ballY, setBallY] = useState(CANVAS_HEIGHT - 60);
  const [ballVx, setBallVx] = useState(3);
  const [ballVy, setBallVy] = useState(-4);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [wave, setWave] = useState(1);
  const [hasShield, setHasShield] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [launched, setLaunched] = useState(false);
  const { playSound } = useSound();

  // Spawn wave
  const spawnWave = (waveNum: number) => {
    const newEnemies: Enemy[] = [];
    const numEnemies = 5 + waveNum * 2;
    for (let i = 0; i < numEnemies; i++) {
      newEnemies.push({
        x: 20 + Math.random() * (CANVAS_WIDTH - 60),
        y: -30 - i * 40,
        width: 30 + Math.random() * 20,
        height: 15,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        speed: 0.5 + waveNum * 0.2,
      });
    }
    setEnemies(newEnemies);
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
      spawnWave(1);
    }
  }, [isActive, isStarting, countdown, playSound]);

  // Mouse control
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setPaddleX(Math.max(0, Math.min(CANVAS_WIDTH - paddleWidth, x - paddleWidth / 2)));
    };

    const handleClick = () => {
      if (!launched) {
        setLaunched(true);
        playSound('powerup');
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [isActive, gameOver, isStarting, paddleWidth, launched, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Update ball
      if (launched) {
        setBallX(prev => prev + ballVx);
        setBallY(prev => prev + ballVy);

        // Wall bounce
        if (ballX < BALL_RADIUS || ballX > CANVAS_WIDTH - BALL_RADIUS) {
          setBallVx(-ballVx);
          playSound('hit');
        }
        if (ballY < BALL_RADIUS) {
          setBallVy(-ballVy);
          playSound('hit');
        }

        // Paddle collision
        if (
          ballY + BALL_RADIUS > CANVAS_HEIGHT - PADDLE_HEIGHT - 10 &&
          ballY < CANVAS_HEIGHT - 10 &&
          ballX > paddleX &&
          ballX < paddleX + paddleWidth
        ) {
          setBallVy(-Math.abs(ballVy));
          const hitPos = (ballX - paddleX) / paddleWidth;
          setBallVx((hitPos - 0.5) * 8);
          playSound('hit');
        }

        // Ball lost
        if (ballY > CANVAS_HEIGHT) {
          if (hasShield) {
            setHasShield(false);
            setBallVy(-Math.abs(ballVy));
            playSound('hit');
          } else {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
            return;
          }
        }

        // Enemy collision
        let enemiesHit: number[] = [];
        enemies.forEach((enemy, i) => {
          if (
            ballX > enemy.x &&
            ballX < enemy.x + enemy.width &&
            ballY - BALL_RADIUS < enemy.y + enemy.height &&
            ballY + BALL_RADIUS > enemy.y
          ) {
            enemiesHit.push(i);
            setBallVy(-ballVy);
          }
        });

        if (enemiesHit.length > 0) {
          playSound('explosion');
          setEnemies(prev => {
            const remaining = prev.filter((_, i) => !enemiesHit.includes(i));
            // Drop power-up chance
            if (Math.random() < 0.2) {
              const enemy = prev[enemiesHit[0]];
              const types: PowerUp['type'][] = ['wide', 'slow', 'shield'];
              setPowerUps(p => [...p, {
                x: enemy.x + enemy.width / 2,
                y: enemy.y,
                type: types[Math.floor(Math.random() * types.length)],
              }]);
            }
            return remaining;
          });
          const newScore = score + enemiesHit.length * 10;
          setScore(newScore);
          onScoreChange(newScore);
        }
      } else {
        setBallX(paddleX + paddleWidth / 2);
        setBallY(CANVAS_HEIGHT - PADDLE_HEIGHT - 20);
      }

      // Update enemies
      setEnemies(prev => prev.map(enemy => {
        const newY = enemy.y + enemy.speed;
        if (newY > CANVAS_HEIGHT - PADDLE_HEIGHT - 30) {
          setGameOver(true);
          playSound('gameover');
          onGameOver(score);
        }
        return { ...enemy, y: newY };
      }));

      // Check wave complete
      if (enemies.length === 0 && launched) {
        const newWave = wave + 1;
        setWave(newWave);
        spawnWave(newWave);
        playSound('powerup');
      }

      // Update power-ups
      setPowerUps(prev => {
        const remaining: PowerUp[] = [];
        prev.forEach(p => {
          const newY = p.y + 2;
          // Collect
          if (
            newY + 10 > CANVAS_HEIGHT - PADDLE_HEIGHT - 10 &&
            newY < CANVAS_HEIGHT &&
            p.x > paddleX &&
            p.x < paddleX + paddleWidth
          ) {
            playSound('powerup');
            switch (p.type) {
              case 'wide':
                setPaddleWidth(w => Math.min(150, w + 20));
                break;
              case 'slow':
                setEnemies(e => e.map(en => ({ ...en, speed: en.speed * 0.7 })));
                break;
              case 'shield':
                setHasShield(true);
                break;
            }
          } else if (newY < CANVAS_HEIGHT + 20) {
            remaining.push({ ...p, y: newY });
          }
        });
        return remaining;
      });

      // Draw
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw shield
      if (hasShield) {
        ctx.strokeStyle = 'hsl(180, 100%, 50%)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT - 3);
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 3);
        ctx.stroke();
      }

      // Draw enemies
      enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(enemy.x + 5, enemy.y + 4, 4, 4);
        ctx.fillRect(enemy.x + enemy.width - 9, enemy.y + 4, 4, 4);
      });

      // Draw power-ups
      powerUps.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = p.type === 'wide' ? 'hsl(120, 80%, 50%)' :
                        p.type === 'slow' ? 'hsl(240, 80%, 50%)' : 'hsl(180, 80%, 50%)';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.type[0].toUpperCase(), p.x, p.y + 4);
      });

      // Draw paddle
      ctx.fillStyle = 'hsl(200, 80%, 50%)';
      ctx.fillRect(paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT - 10, paddleWidth, PADDLE_HEIGHT);

      // Draw ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();

      // Draw wave
      ctx.fillStyle = 'hsl(60, 100%, 50%)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`WAVE ${wave}`, 10, 20);

      // Launch instruction
      if (!launched) {
        ctx.fillStyle = 'hsl(60, 100%, 50%)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO LAUNCH', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, ballX, ballY, ballVx, ballVy, paddleX, paddleWidth, enemies, powerUps, wave, hasShield, launched, score, onGameOver, onScoreChange, playSound]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-neon-cyan cursor-none"
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
      <p className="mt-4 text-[10px] text-muted-foreground">MOUSE TO MOVE • CLICK TO LAUNCH</p>
    </div>
  );
};

export default BreakoutDefenseGame;
