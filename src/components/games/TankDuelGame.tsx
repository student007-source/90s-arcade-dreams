import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface TankDuelGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const TANK_SIZE = 20;
const BULLET_SIZE = 6;
const CELL_SIZE = 40;

interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  bounces: number;
  isPlayer: boolean;
}

interface EnemyTank {
  x: number;
  y: number;
  direction: number;
  shootCooldown: number;
}

const TankDuelGame = ({ onScoreChange, onGameOver, isActive }: TankDuelGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2);
  const [playerY, setPlayerY] = useState(CANVAS_HEIGHT - 60);
  const [playerDirection, setPlayerDirection] = useState(0); // 0=up, 1=right, 2=down, 3=left
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<EnemyTank[]>([]);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [lives, setLives] = useState(3);
  const { playSound } = useSound();

  // Simple maze walls
  const [walls] = useState<{ x: number; y: number; w: number; h: number }[]>(() => [
    { x: 80, y: 80, w: 80, h: 20 },
    { x: 240, y: 80, w: 80, h: 20 },
    { x: 160, y: 160, w: 80, h: 20 },
    { x: 80, y: 240, w: 20, h: 80 },
    { x: 300, y: 200, w: 20, h: 100 },
    { x: 160, y: 280, w: 80, h: 20 },
  ]);

  // Base in center
  const baseX = CANVAS_WIDTH / 2 - 20;
  const baseY = CANVAS_HEIGHT - 50;

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
      // Spawn initial enemies
      setEnemies([
        { x: 40, y: 40, direction: 2, shootCooldown: 0 },
        { x: CANVAS_WIDTH - 60, y: 40, direction: 2, shootCooldown: 50 },
      ]);
    }
  }, [isActive, isStarting, countdown, playSound]);

  // Keyboard controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const speed = 5;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setPlayerDirection(0);
          setPlayerY(prev => {
            const newY = prev - speed;
            for (const wall of walls) {
              if (playerX < wall.x + wall.w && playerX + TANK_SIZE > wall.x &&
                  newY < wall.y + wall.h && newY + TANK_SIZE > wall.y) {
                return prev;
              }
            }
            return Math.max(0, newY);
          });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setPlayerDirection(2);
          setPlayerY(prev => {
            const newY = prev + speed;
            for (const wall of walls) {
              if (playerX < wall.x + wall.w && playerX + TANK_SIZE > wall.x &&
                  newY < wall.y + wall.h && newY + TANK_SIZE > wall.y) {
                return prev;
              }
            }
            return Math.min(CANVAS_HEIGHT - TANK_SIZE, newY);
          });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setPlayerDirection(3);
          setPlayerX(prev => {
            const newX = prev - speed;
            for (const wall of walls) {
              if (newX < wall.x + wall.w && newX + TANK_SIZE > wall.x &&
                  playerY < wall.y + wall.h && playerY + TANK_SIZE > wall.y) {
                return prev;
              }
            }
            return Math.max(0, newX);
          });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setPlayerDirection(1);
          setPlayerX(prev => {
            const newX = prev + speed;
            for (const wall of walls) {
              if (newX < wall.x + wall.w && newX + TANK_SIZE > wall.x &&
                  playerY < wall.y + wall.h && playerY + TANK_SIZE > wall.y) {
                return prev;
              }
            }
            return Math.min(CANVAS_WIDTH - TANK_SIZE, newX);
          });
          break;
        case ' ':
          // Shoot
          const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
          const [dx, dy] = dirs[playerDirection];
          setBullets(prev => [...prev, {
            x: playerX + TANK_SIZE / 2,
            y: playerY + TANK_SIZE / 2,
            dx: dx * 6,
            dy: dy * 6,
            bounces: 0,
            isPlayer: true,
          }]);
          playSound('shoot');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, gameOver, isStarting, playerX, playerY, playerDirection, walls, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Update bullets
      setBullets(prevBullets => {
        const newBullets: Bullet[] = [];
        for (const bullet of prevBullets) {
          let newX = bullet.x + bullet.dx;
          let newY = bullet.y + bullet.dy;
          let newDx = bullet.dx;
          let newDy = bullet.dy;
          let bounces = bullet.bounces;
          let alive = true;

          // Wall bounce
          if (newX < 0 || newX > CANVAS_WIDTH) {
            newDx = -newDx;
            bounces++;
          }
          if (newY < 0 || newY > CANVAS_HEIGHT) {
            newDy = -newDy;
            bounces++;
          }

          // Wall collision
          for (const wall of walls) {
            if (newX > wall.x && newX < wall.x + wall.w &&
                newY > wall.y && newY < wall.y + wall.h) {
              // Bounce off wall
              if (bullet.dx !== 0) newDx = -newDx;
              if (bullet.dy !== 0) newDy = -newDy;
              bounces++;
              break;
            }
          }

          if (bounces > 2) alive = false;

          if (alive) {
            newBullets.push({
              ...bullet,
              x: bullet.x + newDx,
              y: bullet.y + newDy,
              dx: newDx,
              dy: newDy,
              bounces,
            });
          }
        }
        return newBullets;
      });

      // Check bullet-enemy collision
      let enemiesHit: number[] = [];
      bullets.forEach(bullet => {
        if (bullet.isPlayer) {
          enemies.forEach((enemy, i) => {
            const dist = Math.hypot(bullet.x - (enemy.x + TANK_SIZE / 2), bullet.y - (enemy.y + TANK_SIZE / 2));
            if (dist < TANK_SIZE) {
              enemiesHit.push(i);
            }
          });
        }
      });

      if (enemiesHit.length > 0) {
        playSound('explosion');
        setEnemies(prev => prev.filter((_, i) => !enemiesHit.includes(i)));
        const newScore = score + enemiesHit.length * 100;
        setScore(newScore);
        onScoreChange(newScore);

        // Spawn new enemy
        setTimeout(() => {
          setEnemies(prev => [...prev, {
            x: Math.random() < 0.5 ? 40 : CANVAS_WIDTH - 60,
            y: 40,
            direction: 2,
            shootCooldown: 60,
          }]);
        }, 2000);
      }

      // Check bullet-player collision
      bullets.forEach(bullet => {
        if (!bullet.isPlayer) {
          const dist = Math.hypot(bullet.x - (playerX + TANK_SIZE / 2), bullet.y - (playerY + TANK_SIZE / 2));
          if (dist < TANK_SIZE) {
            playSound('hit');
            setLives(prev => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                setGameOver(true);
                playSound('gameover');
                onGameOver(score);
              }
              return newLives;
            });
            setPlayerX(CANVAS_WIDTH / 2);
            setPlayerY(CANVAS_HEIGHT - 60);
            setBullets(prev => prev.filter(b => b !== bullet));
          }
        }
      });

      // Check bullet-base collision
      bullets.forEach(bullet => {
        if (!bullet.isPlayer) {
          if (bullet.x > baseX && bullet.x < baseX + 40 &&
              bullet.y > baseY && bullet.y < baseY + 30) {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
          }
        }
      });

      // Update enemies
      setEnemies(prevEnemies => prevEnemies.map(enemy => {
        let { x, y, direction, shootCooldown } = enemy;
        const speed = 1.5;

        // Move
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const [dx, dy] = dirs[direction];
        let newX = x + dx * speed;
        let newY = y + dy * speed;

        // Wall collision - change direction
        let blocked = false;
        if (newX < 0 || newX > CANVAS_WIDTH - TANK_SIZE || newY < 0 || newY > CANVAS_HEIGHT - TANK_SIZE) {
          blocked = true;
        }
        for (const wall of walls) {
          if (newX < wall.x + wall.w && newX + TANK_SIZE > wall.x &&
              newY < wall.y + wall.h && newY + TANK_SIZE > wall.y) {
            blocked = true;
            break;
          }
        }

        if (blocked) {
          direction = (direction + 1) % 4;
          newX = x;
          newY = y;
        }

        // Shoot
        shootCooldown--;
        if (shootCooldown <= 0) {
          const [bdx, bdy] = dirs[direction];
          setBullets(prev => [...prev, {
            x: x + TANK_SIZE / 2,
            y: y + TANK_SIZE / 2,
            dx: bdx * 4,
            dy: bdy * 4,
            bounces: 0,
            isPlayer: false,
          }]);
          shootCooldown = 80 + Math.random() * 40;
        }

        return { x: newX, y: newY, direction, shootCooldown };
      }));

      // Draw
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw walls
      walls.forEach(wall => {
        ctx.fillStyle = 'hsl(30, 40%, 30%)';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = 'hsl(30, 40%, 40%)';
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      });

      // Draw base
      ctx.fillStyle = 'hsl(60, 80%, 50%)';
      ctx.fillRect(baseX, baseY, 40, 30);
      ctx.fillStyle = '#000';
      ctx.font = '10px monospace';
      ctx.fillText('BASE', baseX + 4, baseY + 18);

      // Draw enemies
      enemies.forEach(enemy => {
        ctx.fillStyle = 'hsl(0, 70%, 40%)';
        ctx.fillRect(enemy.x, enemy.y, TANK_SIZE, TANK_SIZE);
        // Turret
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const [dx, dy] = dirs[enemy.direction];
        ctx.fillStyle = 'hsl(0, 70%, 30%)';
        ctx.fillRect(enemy.x + TANK_SIZE / 2 - 3 + dx * 8, enemy.y + TANK_SIZE / 2 - 3 + dy * 8, 6, 6);
      });

      // Draw player
      ctx.fillStyle = 'hsl(120, 70%, 40%)';
      ctx.fillRect(playerX, playerY, TANK_SIZE, TANK_SIZE);
      // Turret
      const pDirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const [pdx, pdy] = pDirs[playerDirection];
      ctx.fillStyle = 'hsl(120, 70%, 30%)';
      ctx.fillRect(playerX + TANK_SIZE / 2 - 3 + pdx * 8, playerY + TANK_SIZE / 2 - 3 + pdy * 8, 6, 6);

      // Draw bullets
      bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = bullet.isPlayer ? 'hsl(120, 100%, 70%)' : 'hsl(0, 100%, 70%)';
        ctx.fill();
      });

      // Draw lives
      ctx.fillStyle = 'hsl(120, 100%, 50%)';
      ctx.font = '12px monospace';
      ctx.fillText(`LIVES: ${lives}`, 10, 20);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, playerY, playerDirection, bullets, enemies, walls, score, lives, onGameOver, onScoreChange, playSound]);

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
      <p className="mt-4 text-[10px] text-muted-foreground">ARROWS TO MOVE • SPACE TO SHOOT</p>
    </div>
  );
};

export default TankDuelGame;
