import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface PixelBomberGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const CELL_SIZE = 40;
const GRID_COLS = 10;
const GRID_ROWS = 10;

interface Bomb {
  x: number;
  y: number;
  timer: number;
}

interface Explosion {
  x: number;
  y: number;
  timer: number;
}

interface Enemy {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const PixelBomberGame = ({ onScoreChange, onGameOver, isActive }: PixelBomberGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(1);
  const [playerY, setPlayerY] = useState(1);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [walls, setWalls] = useState<boolean[][]>([]);
  const [breakableWalls, setBreakableWalls] = useState<boolean[][]>([]);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [bombPower, setBombPower] = useState(2);
  const { playSound } = useSound();

  // Initialize level
  useEffect(() => {
    const newWalls: boolean[][] = [];
    const newBreakable: boolean[][] = [];
    
    for (let y = 0; y < GRID_ROWS; y++) {
      newWalls[y] = [];
      newBreakable[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        // Solid walls in checker pattern
        newWalls[y][x] = (x % 2 === 0 && y % 2 === 0);
        // Breakable walls randomly, but not near player spawn
        newBreakable[y][x] = !newWalls[y][x] && 
          Math.random() < 0.4 && 
          !(x <= 2 && y <= 2);
      }
    }
    
    setWalls(newWalls);
    setBreakableWalls(newBreakable);
    
    // Spawn enemies
    setEnemies([
      { x: 7, y: 1, dx: 0, dy: 1 },
      { x: 1, y: 7, dx: 1, dy: 0 },
      { x: 8, y: 8, dx: -1, dy: 0 },
    ]);
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
      let newX = playerX;
      let newY = playerY;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newY = playerY - 1;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newY = playerY + 1;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newX = playerX - 1;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newX = playerX + 1;
          break;
        case ' ':
          // Place bomb
          if (!bombs.some(b => b.x === playerX && b.y === playerY)) {
            setBombs(prev => [...prev, { x: playerX, y: playerY, timer: 180 }]);
            playSound('blip');
          }
          return;
      }

      // Check collision
      if (
        newX >= 0 && newX < GRID_COLS &&
        newY >= 0 && newY < GRID_ROWS &&
        !walls[newY]?.[newX] &&
        !breakableWalls[newY]?.[newX] &&
        !bombs.some(b => b.x === newX && b.y === newY)
      ) {
        setPlayerX(newX);
        setPlayerY(newY);
        playSound('move');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, gameOver, isStarting, playerX, playerY, walls, breakableWalls, bombs, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let frameCount = 0;

    const gameLoop = () => {
      frameCount++;

      // Update bombs
      setBombs(prevBombs => {
        const newBombs: Bomb[] = [];
        const newExplosions: Explosion[] = [...explosions];

        prevBombs.forEach(bomb => {
          if (bomb.timer > 0) {
            newBombs.push({ ...bomb, timer: bomb.timer - 1 });
          } else {
            // Explode
            playSound('explosion');
            
            // Create explosions in 4 directions
            const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
            dirs.forEach(([dx, dy]) => {
              for (let i = 0; i <= bombPower; i++) {
                const ex = bomb.x + dx * i;
                const ey = bomb.y + dy * i;
                
                if (ex < 0 || ex >= GRID_COLS || ey < 0 || ey >= GRID_ROWS) break;
                if (walls[ey]?.[ex]) break;
                
                newExplosions.push({ x: ex, y: ey, timer: 30 });
                
                if (breakableWalls[ey]?.[ex]) {
                  setBreakableWalls(prev => {
                    const updated = [...prev];
                    updated[ey] = [...updated[ey]];
                    updated[ey][ex] = false;
                    return updated;
                  });
                  const newScore = score + 10;
                  setScore(newScore);
                  onScoreChange(newScore);
                  break;
                }
              }
            });
          }
        });

        setExplosions(newExplosions);
        return newBombs;
      });

      // Update explosions
      setExplosions(prev => prev.filter(e => e.timer-- > 0));

      // Check player hit by explosion
      if (explosions.some(e => e.x === playerX && e.y === playerY)) {
        setGameOver(true);
        playSound('gameover');
        onGameOver(score);
        return;
      }

      // Update enemies
      if (frameCount % 30 === 0) {
        setEnemies(prevEnemies => prevEnemies.map(enemy => {
          let { x, y, dx, dy } = enemy;
          let newX = x + dx;
          let newY = y + dy;

          // Check collision
          if (
            newX < 0 || newX >= GRID_COLS ||
            newY < 0 || newY >= GRID_ROWS ||
            walls[newY]?.[newX] ||
            breakableWalls[newY]?.[newX]
          ) {
            // Change direction randomly
            const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const validDirs = directions.filter(([ddx, ddy]) => {
              const checkX = x + ddx;
              const checkY = y + ddy;
              return checkX >= 0 && checkX < GRID_COLS &&
                     checkY >= 0 && checkY < GRID_ROWS &&
                     !walls[checkY]?.[checkX] &&
                     !breakableWalls[checkY]?.[checkX];
            });
            if (validDirs.length > 0) {
              const [ndx, ndy] = validDirs[Math.floor(Math.random() * validDirs.length)];
              dx = ndx;
              dy = ndy;
            }
            newX = x;
            newY = y;
          }

          return { x: newX, y: newY, dx, dy };
        }));
      }

      // Check enemy hit by explosion
      setEnemies(prev => {
        const remaining = prev.filter(e => !explosions.some(ex => ex.x === e.x && ex.y === e.y));
        if (remaining.length < prev.length) {
          playSound('score');
          const killed = prev.length - remaining.length;
          const newScore = score + killed * 100;
          setScore(newScore);
          onScoreChange(newScore);
        }
        return remaining;
      });

      // Check player collision with enemy
      if (enemies.some(e => e.x === playerX && e.y === playerY)) {
        setGameOver(true);
        playSound('gameover');
        onGameOver(score);
        return;
      }

      // Draw
      ctx.fillStyle = 'hsl(120, 30%, 15%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw grid
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;

          if (walls[y]?.[x]) {
            ctx.fillStyle = 'hsl(0, 0%, 30%)';
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          } else if (breakableWalls[y]?.[x]) {
            ctx.fillStyle = 'hsl(30, 50%, 35%)';
            ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          }
        }
      }

      // Draw explosions
      explosions.forEach(e => {
        ctx.fillStyle = `hsla(${30 + e.timer}, 100%, 50%, ${e.timer / 30})`;
        ctx.fillRect(e.x * CELL_SIZE, e.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      });

      // Draw bombs
      bombs.forEach(bomb => {
        ctx.fillStyle = bomb.timer < 60 ? 'hsl(0, 80%, 50%)' : 'hsl(0, 0%, 20%)';
        ctx.beginPath();
        ctx.arc(bomb.x * CELL_SIZE + CELL_SIZE / 2, bomb.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 3, 0, Math.PI * 2);
        ctx.fill();
        // Fuse
        ctx.strokeStyle = 'hsl(30, 80%, 50%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bomb.x * CELL_SIZE + CELL_SIZE / 2, bomb.y * CELL_SIZE + CELL_SIZE / 4);
        ctx.lineTo(bomb.x * CELL_SIZE + CELL_SIZE / 2 + 5, bomb.y * CELL_SIZE + 5);
        ctx.stroke();
      });

      // Draw enemies
      enemies.forEach(enemy => {
        ctx.fillStyle = 'hsl(270, 70%, 50%)';
        ctx.fillRect(enemy.x * CELL_SIZE + 5, enemy.y * CELL_SIZE + 5, CELL_SIZE - 10, CELL_SIZE - 10);
        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(enemy.x * CELL_SIZE + 10, enemy.y * CELL_SIZE + 12, 5, 5);
        ctx.fillRect(enemy.x * CELL_SIZE + 25, enemy.y * CELL_SIZE + 12, 5, 5);
      });

      // Draw player
      ctx.fillStyle = 'hsl(200, 80%, 50%)';
      ctx.fillRect(playerX * CELL_SIZE + 5, playerY * CELL_SIZE + 5, CELL_SIZE - 10, CELL_SIZE - 10);
      // Face
      ctx.fillStyle = 'white';
      ctx.fillRect(playerX * CELL_SIZE + 10, playerY * CELL_SIZE + 12, 4, 4);
      ctx.fillRect(playerX * CELL_SIZE + 26, playerY * CELL_SIZE + 12, 4, 4);
      ctx.fillRect(playerX * CELL_SIZE + 15, playerY * CELL_SIZE + 22, 10, 3);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, playerY, bombs, explosions, enemies, walls, breakableWalls, bombPower, score, onGameOver, onScoreChange, playSound]);

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
      <p className="mt-4 text-[10px] text-muted-foreground">ARROWS TO MOVE • SPACE TO BOMB</p>
    </div>
  );
};

export default PixelBomberGame;
