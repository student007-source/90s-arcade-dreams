import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface PacManGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const CELL_SIZE = 20;
const GRID_COLS = 20;
const GRID_ROWS = 20;

interface Ghost {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  scared: boolean;
}

// 1 = wall, 0 = path with pellet, 2 = power pellet, 3 = empty path
const maze = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
  [1,2,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,2,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],
  [3,3,3,1,0,1,0,0,0,0,0,0,0,0,1,0,1,3,3,3],
  [1,1,1,1,0,1,0,1,1,3,3,1,1,0,1,0,1,1,1,1],
  [0,0,0,0,0,0,0,1,3,3,3,3,1,0,0,0,0,0,0,0],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [3,3,3,1,0,1,0,0,0,0,0,0,0,0,1,0,1,3,3,3],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
  [1,2,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const PacManGame = ({ onScoreChange, onGameOver, isActive }: PacManGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(10);
  const [playerY, setPlayerY] = useState(15);
  const [direction, setDirection] = useState<'up' | 'down' | 'left' | 'right'>('left');
  const [nextDirection, setNextDirection] = useState<'up' | 'down' | 'left' | 'right'>('left');
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { x: 9, y: 9, dx: 1, dy: 0, color: 'hsl(0, 80%, 50%)', scared: false },
    { x: 10, y: 9, dx: -1, dy: 0, color: 'hsl(300, 80%, 50%)', scared: false },
    { x: 9, y: 10, dx: 0, dy: 1, color: 'hsl(180, 80%, 50%)', scared: false },
    { x: 10, y: 10, dx: 0, dy: -1, color: 'hsl(30, 80%, 50%)', scared: false },
  ]);
  const [pellets, setPellets] = useState<boolean[][]>([]);
  const [powerPellets, setPowerPellets] = useState<boolean[][]>([]);
  const [powerTime, setPowerTime] = useState(0);
  const [lives, setLives] = useState(3);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [mouthOpen, setMouthOpen] = useState(true);
  const { playSound } = useSound();

  // Initialize pellets
  useEffect(() => {
    const initialPellets: boolean[][] = [];
    const initialPower: boolean[][] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      initialPellets[y] = [];
      initialPower[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        initialPellets[y][x] = maze[y][x] === 0;
        initialPower[y][x] = maze[y][x] === 2;
      }
    }
    setPellets(initialPellets);
    setPowerPellets(initialPower);
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
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setNextDirection('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setNextDirection('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setNextDirection('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setNextDirection('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, gameOver, isStarting]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let frameCount = 0;

    const canMove = (x: number, y: number): boolean => {
      if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) {
        // Allow wrapping on row 10
        if (y === 10) return true;
        return false;
      }
      return maze[y][x] !== 1;
    };

    const gameLoop = () => {
      frameCount++;
      setMouthOpen(prev => frameCount % 10 < 5);

      // Move player every few frames
      if (frameCount % 8 === 0) {
        // Try next direction first
        let newX = playerX;
        let newY = playerY;

        const dirs = {
          up: { dx: 0, dy: -1 },
          down: { dx: 0, dy: 1 },
          left: { dx: -1, dy: 0 },
          right: { dx: 1, dy: 0 },
        };

        const next = dirs[nextDirection];
        if (canMove(playerX + next.dx, playerY + next.dy)) {
          setDirection(nextDirection);
          newX = playerX + next.dx;
          newY = playerY + next.dy;
        } else {
          const curr = dirs[direction];
          if (canMove(playerX + curr.dx, playerY + curr.dy)) {
            newX = playerX + curr.dx;
            newY = playerY + curr.dy;
          }
        }

        // Wrap around
        if (newX < 0) newX = GRID_COLS - 1;
        if (newX >= GRID_COLS) newX = 0;

        setPlayerX(newX);
        setPlayerY(newY);

        // Eat pellet
        if (pellets[newY]?.[newX]) {
          setPellets(prev => {
            const updated = [...prev];
            updated[newY] = [...updated[newY]];
            updated[newY][newX] = false;
            return updated;
          });
          const newScore = score + 10;
          setScore(newScore);
          onScoreChange(newScore);
          playSound('eat');
        }

        // Eat power pellet
        if (powerPellets[newY]?.[newX]) {
          setPowerPellets(prev => {
            const updated = [...prev];
            updated[newY] = [...updated[newY]];
            updated[newY][newX] = false;
            return updated;
          });
          setPowerTime(300);
          setGhosts(prev => prev.map(g => ({ ...g, scared: true })));
          playSound('powerup');
        }
      }

      // Power time countdown
      if (powerTime > 0) {
        setPowerTime(prev => {
          if (prev <= 1) {
            setGhosts(g => g.map(ghost => ({ ...ghost, scared: false })));
          }
          return prev - 1;
        });
      }

      // Move ghosts
      if (frameCount % 12 === 0) {
        setGhosts(prev => prev.map(ghost => {
          let { x, y, dx, dy } = ghost;
          let newX = x + dx;
          let newY = y + dy;

          // Wrap
          if (newX < 0) newX = GRID_COLS - 1;
          if (newX >= GRID_COLS) newX = 0;

          // Change direction if blocked or randomly
          if (!canMove(newX, newY) || Math.random() < 0.1) {
            const possibleDirs = [
              { dx: 1, dy: 0 },
              { dx: -1, dy: 0 },
              { dx: 0, dy: 1 },
              { dx: 0, dy: -1 },
            ].filter(d => canMove(x + d.dx, y + d.dy) && !(d.dx === -dx && d.dy === -dy));

            if (possibleDirs.length > 0) {
              const newDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
              dx = newDir.dx;
              dy = newDir.dy;
              newX = x + dx;
              newY = y + dy;
            } else {
              dx = -dx;
              dy = -dy;
              newX = x;
              newY = y;
            }
          }

          return { ...ghost, x: newX, y: newY, dx, dy };
        }));
      }

      // Ghost collision
      for (const ghost of ghosts) {
        if (ghost.x === playerX && ghost.y === playerY) {
          if (ghost.scared) {
            // Eat ghost
            playSound('score');
            const newScore = score + 200;
            setScore(newScore);
            onScoreChange(newScore);
            setGhosts(prev => prev.map(g => 
              g === ghost ? { ...g, x: 9, y: 9, scared: false } : g
            ));
          } else {
            // Die
            playSound('hit');
            const newLives = lives - 1;
            setLives(newLives);
            if (newLives <= 0) {
              setGameOver(true);
              playSound('gameover');
              onGameOver(score);
              return;
            }
            // Reset positions
            setPlayerX(10);
            setPlayerY(15);
            setDirection('left');
          }
        }
      }

      // Check win
      const pelletsLeft = pellets.flat().filter(Boolean).length + powerPellets.flat().filter(Boolean).length;
      if (pelletsLeft === 0) {
        playSound('powerup');
        const newScore = score + 1000;
        setScore(newScore);
        onScoreChange(newScore);
        setGameOver(true);
        onGameOver(newScore);
        return;
      }

      // Draw
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw maze
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          if (maze[y][x] === 1) {
            ctx.fillStyle = 'hsl(240, 80%, 30%)';
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }

      // Draw pellets
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          if (pellets[y]?.[x]) {
            ctx.fillStyle = 'hsl(60, 100%, 70%)';
            ctx.beginPath();
            ctx.arc(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          if (powerPellets[y]?.[x]) {
            ctx.fillStyle = 'hsl(60, 100%, 70%)';
            ctx.beginPath();
            ctx.arc(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw ghosts
      ghosts.forEach(ghost => {
        ctx.fillStyle = ghost.scared ? 'hsl(240, 80%, 50%)' : ghost.color;
        const gx = ghost.x * CELL_SIZE + CELL_SIZE / 2;
        const gy = ghost.y * CELL_SIZE + CELL_SIZE / 2;
        
        // Body
        ctx.beginPath();
        ctx.arc(gx, gy - 2, 8, Math.PI, 0);
        ctx.lineTo(gx + 8, gy + 6);
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(gx + 8 - i * 4 - 2, gy + 3);
          ctx.lineTo(gx + 8 - i * 4 - 4, gy + 6);
        }
        ctx.closePath();
        ctx.fill();

        // Eyes
        if (!ghost.scared) {
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(gx - 3, gy - 3, 3, 0, Math.PI * 2);
          ctx.arc(gx + 3, gy - 3, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'blue';
          ctx.beginPath();
          ctx.arc(gx - 3 + ghost.dx, gy - 3 + ghost.dy, 1.5, 0, Math.PI * 2);
          ctx.arc(gx + 3 + ghost.dx, gy - 3 + ghost.dy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Pac-Man
      const px = playerX * CELL_SIZE + CELL_SIZE / 2;
      const py = playerY * CELL_SIZE + CELL_SIZE / 2;
      const mouthAngle = mouthOpen ? 0.3 : 0.05;
      const angleOffset = {
        right: 0,
        down: Math.PI / 2,
        left: Math.PI,
        up: -Math.PI / 2,
      };
      
      ctx.fillStyle = 'hsl(60, 100%, 50%)';
      ctx.beginPath();
      ctx.arc(px, py, 8, angleOffset[direction] + mouthAngle, angleOffset[direction] + Math.PI * 2 - mouthAngle);
      ctx.lineTo(px, py);
      ctx.closePath();
      ctx.fill();

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '10px monospace';
      ctx.fillText(`SCORE: ${score}`, 5, 12);
      ctx.fillText(`LIVES: ${lives}`, CANVAS_WIDTH - 60, 12);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, playerY, direction, nextDirection, ghosts, pellets, powerPellets, powerTime, lives, score, mouthOpen, onGameOver, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">READY!</p>
          <p className="text-4xl neon-text-yellow animate-pulse">
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
      <p className="mt-4 text-[10px] text-muted-foreground">ARROW KEYS TO MOVE • EAT ALL PELLETS</p>
    </div>
  );
};

export default PacManGame;
