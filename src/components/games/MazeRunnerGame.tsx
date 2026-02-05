import { useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface MazeRunnerGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const TILE = 20;
const COLS = 21;
const ROWS = 21;
const W = COLS * TILE;
const H = ROWS * TILE;

// 1 = wall, 0 = path
const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,1,1,0,0,0,1,1,0,1,0,1,1,1,1],
  [0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,0,1,0,0,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

type Ghost = { x: number; y: number; color: string; dx: number; dy: number; scared: boolean };

const MazeRunnerGame = ({ onScoreChange, onGameOver, isActive }: MazeRunnerGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { playSound } = useSound();

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Build pellet map
    const pellets: boolean[][] = [];
    let totalPellets = 0;
    for (let r = 0; r < ROWS; r++) {
      pellets[r] = [];
      for (let c = 0; c < COLS; c++) {
        pellets[r][c] = MAZE_TEMPLATE[r][c] === 0;
        if (pellets[r][c]) totalPellets++;
      }
    }

    // Power pellets at corners of open area
    const powerPellets = new Set(['1,1', '1,19', '19,1', '19,19']);

    const ghosts: Ghost[] = [
      { x: 9, y: 9, color: '#ff0000', dx: 1, dy: 0, scared: false },
      { x: 10, y: 9, color: '#ffb8ff', dx: -1, dy: 0, scared: false },
      { x: 11, y: 9, color: '#00ffff', dx: 0, dy: 1, scared: false },
    ];

    const s = {
      px: 10, py: 15,
      dx: 0, dy: 0,
      ndx: 0, ndy: 0,
      score: 0,
      pelletsEaten: 0,
      gameOver: false,
      powerTimer: 0,
      moveTimer: 0,
    };

    // Remove player start pellet
    pellets[s.py][s.px] = false;

    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': s.ndx = 0; s.ndy = -1; break;
        case 'ArrowDown': case 's': s.ndx = 0; s.ndy = 1; break;
        case 'ArrowLeft': case 'a': s.ndx = -1; s.ndy = 0; break;
        case 'ArrowRight': case 'd': s.ndx = 1; s.ndy = 0; break;
      }
    };
    window.addEventListener('keydown', handleKey);

    const canMove = (x: number, y: number) => {
      const nx = (x + COLS) % COLS;
      const ny = (y + ROWS) % ROWS;
      return MAZE_TEMPLATE[ny]?.[nx] === 0;
    };

    let frame = 0;
    const loop = () => {
      if (s.gameOver) return;
      frame++;

      // Player movement (every 6 frames)
      if (frame % 6 === 0) {
        if (canMove(s.px + s.ndx, s.py + s.ndy)) {
          s.dx = s.ndx; s.dy = s.ndy;
        }
        if (canMove(s.px + s.dx, s.py + s.dy)) {
          s.px = (s.px + s.dx + COLS) % COLS;
          s.py = (s.py + s.dy + ROWS) % ROWS;
        }

        // Eat pellet
        if (pellets[s.py]?.[s.px]) {
          pellets[s.py][s.px] = false;
          s.pelletsEaten++;
          const key = `${s.py},${s.px}`;
          if (powerPellets.has(key)) {
            s.score += 50;
            s.powerTimer = 180;
            ghosts.forEach(g => g.scared = true);
            playSound('powerup');
          } else {
            s.score += 10;
          }
          onScoreChange(s.score);
          
          if (s.pelletsEaten >= totalPellets - 1) {
            s.score += 500;
            onScoreChange(s.score);
            s.gameOver = true;
            playSound('powerup');
            onGameOver(s.score);
            return;
          }
        }
      }

      // Ghost movement (every 10 frames)
      if (frame % 10 === 0) {
        ghosts.forEach(g => {
          const dirs = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
          ].filter(d => canMove(g.x + d.dx, g.y + d.dy));
          
          if (dirs.length > 0) {
            // Prefer not reversing
            const nonReverse = dirs.filter(d => !(d.dx === -g.dx && d.dy === -g.dy));
            const choices = nonReverse.length > 0 ? nonReverse : dirs;
            const pick = choices[Math.floor(Math.random() * choices.length)];
            g.dx = pick.dx; g.dy = pick.dy;
            g.x = (g.x + g.dx + COLS) % COLS;
            g.y = (g.y + g.dy + ROWS) % ROWS;
          }
        });
      }

      // Power timer
      if (s.powerTimer > 0) {
        s.powerTimer--;
        if (s.powerTimer === 0) ghosts.forEach(g => g.scared = false);
      }

      // Ghost-player collision
      ghosts.forEach(g => {
        if (g.x === s.px && g.y === s.py) {
          if (g.scared) {
            g.x = 10; g.y = 9;
            g.scared = false;
            s.score += 200;
            onScoreChange(s.score);
            playSound('eat');
          } else {
            s.gameOver = true;
            playSound('gameover');
            onGameOver(s.score);
          }
        }
      });

      // Draw
      ctx.fillStyle = '#000011';
      ctx.fillRect(0, 0, W, H);

      // Maze walls
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (MAZE_TEMPLATE[r][c] === 1) {
            ctx.fillStyle = '#1a1a88';
            ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
            ctx.strokeStyle = '#4444ff';
            ctx.strokeRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2);
          }
        }
      }

      // Pellets
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (pellets[r][c]) {
            const key = `${r},${c}`;
            if (powerPellets.has(key)) {
              ctx.beginPath();
              ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, 5, 0, Math.PI * 2);
              ctx.fillStyle = frame % 30 < 15 ? '#ffff00' : '#ff8800';
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, 2, 0, Math.PI * 2);
              ctx.fillStyle = '#ffcc88';
              ctx.fill();
            }
          }
        }
      }

      // Player
      ctx.beginPath();
      const mouthAngle = Math.abs(Math.sin(frame * 0.2)) * 0.5;
      const angle = s.dx === 1 ? 0 : s.dx === -1 ? Math.PI : s.dy === 1 ? Math.PI / 2 : -Math.PI / 2;
      ctx.arc(s.px * TILE + TILE / 2, s.py * TILE + TILE / 2, TILE / 2 - 2, angle + mouthAngle, angle + Math.PI * 2 - mouthAngle);
      ctx.lineTo(s.px * TILE + TILE / 2, s.py * TILE + TILE / 2);
      ctx.fillStyle = '#ffff00';
      ctx.fill();

      // Ghosts
      ghosts.forEach(g => {
        ctx.fillStyle = g.scared ? (frame % 20 < 10 ? '#2222ff' : '#ffffff') : g.color;
        const gx = g.x * TILE + TILE / 2;
        const gy = g.y * TILE + TILE / 2;
        ctx.beginPath();
        ctx.arc(gx, gy - 2, 8, Math.PI, 0);
        ctx.lineTo(gx + 8, gy + 6);
        ctx.lineTo(gx + 4, gy + 3);
        ctx.lineTo(gx, gy + 6);
        ctx.lineTo(gx - 4, gy + 3);
        ctx.lineTo(gx - 8, gy + 6);
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gx - 3, gy - 3, 2.5, 0, Math.PI * 2);
        ctx.arc(gx + 3, gy - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff00ff';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H / 2);
        ctx.textAlign = 'start';
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isActive, onScoreChange, onGameOver, playSound]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={W} height={H} className="border-2 border-neon-cyan" />
      <p className="mt-2 text-[10px] text-muted-foreground">ARROW KEYS / WASD TO MOVE</p>
    </div>
  );
};

export default MazeRunnerGame;
