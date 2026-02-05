import { useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface BrickBreakerGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const W = 400;
const H = 500;
const PADDLE_W = 80;
const PADDLE_H = 12;
const BALL_R = 6;
const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_W = W / BRICK_COLS - 4;
const BRICK_H = 18;
const BRICK_PAD = 4;

const COLORS = ['#ff0055', '#ff8800', '#ffff00', '#00ff88', '#00ccff', '#ff00ff'];

const BrickBreakerGame = ({ onScoreChange, onGameOver, isActive }: BrickBreakerGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { playSound } = useSound();

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const bricks: { x: number; y: number; alive: boolean; color: string }[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: c * (BRICK_W + BRICK_PAD) + BRICK_PAD + BRICK_W / 2,
          y: r * (BRICK_H + BRICK_PAD) + 40 + BRICK_H / 2,
          alive: true,
          color: COLORS[r],
        });
      }
    }

    const s = {
      paddleX: W / 2,
      ballX: W / 2, ballY: H - 60,
      dx: 3, dy: -3,
      score: 0,
      lives: 3,
      launched: false,
      gameOver: false,
      keys: {} as Record<string, boolean>,
    };

    const handleKey = (e: KeyboardEvent) => {
      s.keys[e.key] = e.type === 'keydown';
      if (e.key === ' ' && !s.launched) s.launched = true;
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    const loop = () => {
      if (s.gameOver) return;

      // Input
      if (s.keys['ArrowLeft'] || s.keys['a']) s.paddleX = Math.max(PADDLE_W / 2, s.paddleX - 6);
      if (s.keys['ArrowRight'] || s.keys['d']) s.paddleX = Math.min(W - PADDLE_W / 2, s.paddleX + 6);

      if (!s.launched) {
        s.ballX = s.paddleX;
        s.ballY = H - 40 - BALL_R;
      } else {
        s.ballX += s.dx;
        s.ballY += s.dy;

        // Wall bounce
        if (s.ballX < BALL_R || s.ballX > W - BALL_R) s.dx = -s.dx;
        if (s.ballY < BALL_R) s.dy = -s.dy;

        // Paddle bounce
        if (s.ballY > H - 40 - BALL_R && s.ballY < H - 40 + PADDLE_H &&
            s.ballX > s.paddleX - PADDLE_W / 2 && s.ballX < s.paddleX + PADDLE_W / 2) {
          s.dy = -Math.abs(s.dy);
          s.dx = (s.ballX - s.paddleX) / (PADDLE_W / 2) * 4;
          playSound('hit');
        }

        // Brick collision
        bricks.forEach(b => {
          if (!b.alive) return;
          if (Math.abs(s.ballX - b.x) < BRICK_W / 2 + BALL_R &&
              Math.abs(s.ballY - b.y) < BRICK_H / 2 + BALL_R) {
            b.alive = false;
            s.dy = -s.dy;
            s.score += 10;
            onScoreChange(s.score);
            playSound('eat');
          }
        });

        // Ball lost
        if (s.ballY > H + 10) {
          s.lives--;
          if (s.lives <= 0) {
            s.gameOver = true;
            playSound('gameover');
            onGameOver(s.score);
            return;
          }
          s.launched = false;
          s.dx = 3;
          s.dy = -3;
          playSound('hit');
        }

        // Win check
        if (bricks.every(b => !b.alive)) {
          s.gameOver = true;
          s.score += 100;
          onScoreChange(s.score);
          playSound('powerup');
          onGameOver(s.score);
          return;
        }
      }

      // Draw
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Bricks
      bricks.forEach(b => {
        if (!b.alive) return;
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(b.x - BRICK_W / 2, b.y - BRICK_H / 2, BRICK_W, BRICK_H);
        ctx.shadowBlur = 0;
      });

      // Paddle
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.fillRect(s.paddleX - PADDLE_W / 2, H - 40, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;

      // Ball
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Lives
      ctx.fillStyle = '#00ff88';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText('♥'.repeat(s.lives), 10, H - 8);

      if (!s.launched && !s.gameOver) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE TO LAUNCH', W / 2, H / 2);
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
      <p className="mt-2 text-[10px] text-muted-foreground">←→ MOVE PADDLE • SPACE LAUNCH</p>
    </div>
  );
};

export default BrickBreakerGame;
