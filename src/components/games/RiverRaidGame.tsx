import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface RiverRaidGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 450;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 25;

interface Enemy {
  x: number;
  y: number;
  width: number;
  type: 'helicopter' | 'ship' | 'fuel';
  points: number;
}

interface Bullet {
  x: number;
  y: number;
}

const RiverRaidGame = ({ onScoreChange, onGameOver, isActive }: RiverRaidGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [fuel, setFuel] = useState(100);
  const [riverOffset, setRiverOffset] = useState(0);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const riverWidthRef = useRef(200);
  const riverCenterRef = useRef(CANVAS_WIDTH / 2);

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
      if (e.key === ' ') {
        setBullets(prev => [...prev, { x: playerX + PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - 80 }]);
        playSound('shoot');
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
  }, [isActive, gameOver, isStarting, playerX, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let spawnTimer = 0;

    const gameLoop = () => {
      // Move player
      const speed = 4;
      if (keysRef.current['arrowleft'] || keysRef.current['a']) {
        setPlayerX(prev => Math.max(0, prev - speed));
      }
      if (keysRef.current['arrowright'] || keysRef.current['d']) {
        setPlayerX(prev => Math.min(CANVAS_WIDTH - PLAYER_WIDTH, prev + speed));
      }

      // Update river shape
      setRiverOffset(prev => prev + 2);
      riverCenterRef.current = CANVAS_WIDTH / 2 + Math.sin(riverOffset / 50) * 50;
      riverWidthRef.current = 180 + Math.sin(riverOffset / 80) * 30;

      // Fuel consumption
      setFuel(prev => {
        const newFuel = prev - 0.05;
        if (newFuel <= 0) {
          setGameOver(true);
          playSound('gameover');
          onGameOver(score);
        }
        return Math.max(0, newFuel);
      });

      // Spawn enemies
      spawnTimer++;
      if (spawnTimer > 60) {
        spawnTimer = 0;
        const types: Enemy['type'][] = ['helicopter', 'ship', 'fuel'];
        const type = types[Math.floor(Math.random() * types.length)];
        const riverLeft = riverCenterRef.current - riverWidthRef.current / 2;
        const riverRight = riverCenterRef.current + riverWidthRef.current / 2;
        
        setEnemies(prev => [...prev, {
          x: riverLeft + 20 + Math.random() * (riverWidthRef.current - 60),
          y: -30,
          width: type === 'fuel' ? 25 : 30,
          type,
          points: type === 'fuel' ? 0 : type === 'helicopter' ? 60 : 30,
        }]);
      }

      // Update enemies
      setEnemies(prev => {
        const remaining: Enemy[] = [];
        prev.forEach(enemy => {
          const newY = enemy.y + (enemy.type === 'helicopter' ? 3 : 2);
          if (newY < CANVAS_HEIGHT + 50) {
            remaining.push({ ...enemy, y: newY });
          }
        });
        return remaining;
      });

      // Update bullets
      setBullets(prev => prev.filter(b => b.y > -10).map(b => ({ ...b, y: b.y - 8 })));

      // Bullet-enemy collision
      let enemiesHit: number[] = [];
      bullets.forEach((bullet, bi) => {
        enemies.forEach((enemy, ei) => {
          if (
            bullet.x > enemy.x &&
            bullet.x < enemy.x + enemy.width &&
            bullet.y < enemy.y + 20 &&
            bullet.y > enemy.y
          ) {
            enemiesHit.push(ei);
            setBullets(prev => prev.filter((_, i) => i !== bi));
          }
        });
      });

      if (enemiesHit.length > 0) {
        let points = 0;
        setEnemies(prev => prev.filter((enemy, i) => {
          if (enemiesHit.includes(i)) {
            if (enemy.type === 'fuel') {
              setFuel(f => Math.min(100, f + 30));
              playSound('powerup');
            } else {
              points += enemy.points;
              playSound('explosion');
            }
            return false;
          }
          return true;
        }));
        if (points > 0) {
          const newScore = score + points;
          setScore(newScore);
          onScoreChange(newScore);
        }
      }

      // Player-enemy collision
      const playerY = CANVAS_HEIGHT - 60;
      enemies.forEach(enemy => {
        if (
          playerX < enemy.x + enemy.width &&
          playerX + PLAYER_WIDTH > enemy.x &&
          playerY < enemy.y + 20 &&
          playerY + PLAYER_HEIGHT > enemy.y
        ) {
          if (enemy.type === 'fuel') {
            setFuel(f => Math.min(100, f + 30));
            setEnemies(prev => prev.filter(e => e !== enemy));
            playSound('powerup');
          } else {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
          }
        }
      });

      // River bank collision
      const riverLeft = riverCenterRef.current - riverWidthRef.current / 2;
      const riverRight = riverCenterRef.current + riverWidthRef.current / 2;
      if (playerX < riverLeft || playerX + PLAYER_WIDTH > riverRight) {
        setGameOver(true);
        playSound('gameover');
        onGameOver(score);
        return;
      }

      // Continuous score
      const newScore = score + 1;
      setScore(newScore);
      onScoreChange(newScore);

      // Draw
      // Sky/land
      ctx.fillStyle = 'hsl(120, 40%, 25%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // River
      ctx.fillStyle = 'hsl(210, 60%, 30%)';
      const segments = 20;
      for (let i = 0; i <= segments; i++) {
        const y = (i / segments) * CANVAS_HEIGHT;
        const offset = Math.sin((riverOffset + y) / 50) * 50;
        const width = 180 + Math.sin((riverOffset + y) / 80) * 30;
        const centerX = CANVAS_WIDTH / 2 + offset;
        ctx.fillRect(centerX - width / 2, y, width, CANVAS_HEIGHT / segments + 1);
      }

      // Draw enemies
      enemies.forEach(enemy => {
        if (enemy.type === 'fuel') {
          ctx.fillStyle = 'hsl(60, 80%, 50%)';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, 20);
          ctx.fillStyle = 'black';
          ctx.font = '10px monospace';
          ctx.fillText('F', enemy.x + 8, enemy.y + 14);
        } else if (enemy.type === 'helicopter') {
          ctx.fillStyle = 'hsl(0, 70%, 40%)';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, 15);
          // Rotor
          ctx.fillStyle = 'hsl(0, 0%, 40%)';
          ctx.fillRect(enemy.x - 5, enemy.y - 3, enemy.width + 10, 3);
        } else {
          ctx.fillStyle = 'hsl(0, 70%, 50%)';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, 20);
        }
      });

      // Draw bullets
      ctx.fillStyle = 'hsl(60, 100%, 70%)';
      bullets.forEach(bullet => {
        ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
      });

      // Draw player
      ctx.fillStyle = 'hsl(200, 80%, 50%)';
      // Body
      ctx.beginPath();
      ctx.moveTo(playerX + PLAYER_WIDTH / 2, CANVAS_HEIGHT - 60);
      ctx.lineTo(playerX, CANVAS_HEIGHT - 40);
      ctx.lineTo(playerX + PLAYER_WIDTH, CANVAS_HEIGHT - 40);
      ctx.closePath();
      ctx.fill();
      // Wings
      ctx.fillRect(playerX - 5, CANVAS_HEIGHT - 50, PLAYER_WIDTH + 10, 5);

      // Draw fuel gauge
      ctx.fillStyle = 'hsl(0, 0%, 20%)';
      ctx.fillRect(10, 10, 100, 15);
      ctx.fillStyle = fuel > 30 ? 'hsl(120, 80%, 50%)' : 'hsl(0, 80%, 50%)';
      ctx.fillRect(10, 10, fuel, 15);
      ctx.strokeStyle = 'white';
      ctx.strokeRect(10, 10, 100, 15);
      ctx.fillStyle = 'white';
      ctx.font = '10px monospace';
      ctx.fillText('FUEL', 45, 22);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, bullets, enemies, fuel, riverOffset, score, onGameOver, onScoreChange, playSound]);

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
      <p className="mt-4 text-[10px] text-muted-foreground">←→ TO MOVE • SPACE TO SHOOT • HIT FUEL TO REFUEL</p>
    </div>
  );
};

export default RiverRaidGame;
