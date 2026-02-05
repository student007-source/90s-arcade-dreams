import { useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface PlatformerGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const W = 480;
const H = 360;
const GRAVITY = 0.5;
const JUMP = -10;
const MOVE_SPEED = 4;

type Platform = { x: number; y: number; w: number };
type Coin = { x: number; y: number; collected: boolean };
type Enemy = { x: number; y: number; dx: number; w: number };

const PlatformerGame = ({ onScoreChange, onGameOver, isActive }: PlatformerGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { playSound } = useSound();

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const platforms: Platform[] = [
      { x: 0, y: H - 20, w: W },
      { x: 60, y: 280, w: 80 },
      { x: 180, y: 230, w: 100 },
      { x: 320, y: 200, w: 80 },
      { x: 100, y: 160, w: 70 },
      { x: 250, y: 120, w: 90 },
      { x: 380, y: 100, w: 80 },
      { x: 50, y: 80, w: 60 },
    ];

    const coins: Coin[] = [
      { x: 90, y: 260, collected: false },
      { x: 220, y: 210, collected: false },
      { x: 350, y: 180, collected: false },
      { x: 130, y: 140, collected: false },
      { x: 280, y: 100, collected: false },
      { x: 410, y: 80, collected: false },
      { x: 70, y: 60, collected: false },
    ];

    const enemies: Enemy[] = [
      { x: 180, y: H - 36, dx: 1, w: 16 },
      { x: 320, y: 184, dx: -1, w: 16 },
    ];

    const player = { x: 40, y: H - 40, dy: 0, grounded: false, width: 16, height: 20 };
    let score = 0;
    let gameOver = false;
    const keys: Record<string, boolean> = {};

    const handleKey = (e: KeyboardEvent) => { keys[e.key] = e.type === 'keydown'; };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    let frame = 0;
    const loop = () => {
      if (gameOver) return;
      frame++;

      // Horizontal movement
      if (keys['ArrowLeft'] || keys['a']) player.x -= MOVE_SPEED;
      if (keys['ArrowRight'] || keys['d']) player.x += MOVE_SPEED;
      player.x = Math.max(0, Math.min(W - player.width, player.x));

      // Jump
      if ((keys['ArrowUp'] || keys[' '] || keys['w']) && player.grounded) {
        player.dy = JUMP;
        player.grounded = false;
        playSound('hit');
      }

      // Gravity
      player.dy += GRAVITY;
      player.y += player.dy;
      player.grounded = false;

      // Platform collision
      platforms.forEach(p => {
        if (player.x + player.width > p.x && player.x < p.x + p.w &&
            player.y + player.height >= p.y && player.y + player.height <= p.y + 10 && player.dy >= 0) {
          player.y = p.y - player.height;
          player.dy = 0;
          player.grounded = true;
        }
      });

      // Fall death
      if (player.y > H + 50) {
        gameOver = true;
        playSound('gameover');
        onGameOver(score);
        return;
      }

      // Coins
      coins.forEach(c => {
        if (!c.collected && Math.abs(player.x + 8 - c.x) < 16 && Math.abs(player.y + 10 - c.y) < 16) {
          c.collected = true;
          score += 50;
          onScoreChange(score);
          playSound('eat');
        }
      });

      // Enemies
      enemies.forEach(e => {
        e.x += e.dx;
        // Reverse on platform edges or walls
        const onPlatform = platforms.some(p => e.x >= p.x && e.x + e.w <= p.x + p.w && Math.abs(e.y + 16 - p.y) < 5);
        if (!onPlatform || e.x < 5 || e.x > W - 20) e.dx = -e.dx;

        if (Math.abs(player.x + 8 - (e.x + 8)) < 18 && Math.abs(player.y + 10 - e.y) < 20) {
          // Stomp from above
          if (player.dy > 0 && player.y < e.y) {
            player.dy = -6;
            e.x = -100;
            score += 100;
            onScoreChange(score);
            playSound('powerup');
          } else {
            gameOver = true;
            playSound('gameover');
            onGameOver(score);
          }
        }
      });

      // Draw
      ctx.fillStyle = '#0a0a2a';
      ctx.fillRect(0, 0, W, H);

      // Platforms
      platforms.forEach(p => {
        ctx.fillStyle = '#44ff44';
        ctx.fillRect(p.x, p.y, p.w, 8);
        ctx.fillStyle = '#227722';
        ctx.fillRect(p.x, p.y + 8, p.w, 12);
      });

      // Coins
      coins.forEach(c => {
        if (c.collected) return;
        ctx.fillStyle = frame % 30 < 15 ? '#ffdd00' : '#ffaa00';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Enemies
      ctx.fillStyle = '#ff4444';
      enemies.forEach(e => {
        if (e.x < -50) return;
        ctx.fillRect(e.x, e.y, e.w, 16);
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x + 3, e.y + 3, 4, 4);
        ctx.fillRect(e.x + 9, e.y + 3, 4, 4);
        ctx.fillStyle = '#ff4444';
      });

      // Player
      ctx.fillStyle = '#00ccff';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      ctx.fillStyle = '#0088cc';
      ctx.fillRect(player.x + 3, player.y + 4, 4, 4);
      ctx.fillRect(player.x + 9, player.y + 4, 4, 4);

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff00ff';
        ctx.font = '16px "Press Start 2P"';
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
      window.removeEventListener('keyup', handleKey);
    };
  }, [isActive, onScoreChange, onGameOver, playSound]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={W} height={H} className="border-2 border-neon-cyan" />
      <p className="mt-2 text-[10px] text-muted-foreground">←→ RUN • SPACE/↑ JUMP</p>
    </div>
  );
};

export default PlatformerGame;
