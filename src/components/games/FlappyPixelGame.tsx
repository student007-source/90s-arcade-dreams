import { useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface FlappyPixelGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const W = 320;
const H = 480;
const BIRD_SIZE = 16;
const PIPE_W = 40;
const GAP = 120;
const GRAVITY = 0.4;
const FLAP = -7;

type Pipe = { x: number; gapY: number; scored: boolean };

const FlappyPixelGame = ({ onScoreChange, onGameOver, isActive }: FlappyPixelGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { playSound } = useSound();

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let birdY = H / 2;
    let birdDy = 0;
    let pipes: Pipe[] = [];
    let score = 0;
    let gameOver = false;
    let started = false;
    let pipeTimer = 0;

    const flap = () => {
      if (gameOver) return;
      if (!started) started = true;
      birdDy = FLAP;
      playSound('hit');
    };

    const handleKey = (e: KeyboardEvent) => { if (e.key === ' ') flap(); };
    const handleClick = () => flap();
    window.addEventListener('keydown', handleKey);
    canvas.addEventListener('click', handleClick);

    let frame = 0;
    const loop = () => {
      if (gameOver) return;
      frame++;

      if (started) {
        birdDy += GRAVITY;
        birdY += birdDy;

        // Spawn pipes
        pipeTimer++;
        if (pipeTimer > 90) {
          pipes.push({
            x: W + 10,
            gapY: 80 + Math.random() * (H - 80 - GAP - 60),
            scored: false,
          });
          pipeTimer = 0;
        }

        // Move pipes
        const speed = 2.5;
        pipes = pipes.filter(p => {
          p.x -= speed;
          return p.x > -PIPE_W - 10;
        });

        // Score
        pipes.forEach(p => {
          if (!p.scored && p.x + PIPE_W < 50) {
            p.scored = true;
            score++;
            onScoreChange(score);
            playSound('eat');
          }
        });

        // Collision
        const bx = 50, by = birdY;
        if (by < 0 || by > H - BIRD_SIZE) {
          gameOver = true;
          playSound('gameover');
          onGameOver(score);
        }
        pipes.forEach(p => {
          if (bx + BIRD_SIZE > p.x && bx < p.x + PIPE_W) {
            if (by < p.gapY || by + BIRD_SIZE > p.gapY + GAP) {
              gameOver = true;
              playSound('gameover');
              onGameOver(score);
            }
          }
        });
      }

      // Draw
      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#001133');
      grad.addColorStop(1, '#003366');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = '#ffffff44';
        ctx.fillRect((i * 53 + frame * 0.5) % W, (i * 31) % (H / 2), 1, 1);
      }

      // Pipes
      ctx.fillStyle = '#00cc44';
      pipes.forEach(p => {
        // Top pipe
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
        ctx.fillStyle = '#00ff55';
        ctx.fillRect(p.x - 3, p.gapY - 15, PIPE_W + 6, 15);
        ctx.fillStyle = '#00cc44';
        // Bottom pipe
        ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP);
        ctx.fillStyle = '#00ff55';
        ctx.fillRect(p.x - 3, p.gapY + GAP, PIPE_W + 6, 15);
        ctx.fillStyle = '#00cc44';
      });

      // Bird
      ctx.fillStyle = '#ffdd00';
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 8;
      ctx.fillRect(50, birdY, BIRD_SIZE, BIRD_SIZE);
      ctx.shadowBlur = 0;
      // Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(50 + 10, birdY + 3, 3, 3);
      // Beak
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(50 + BIRD_SIZE, birdY + 6, 5, 4);

      // Score display
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(`${score}`, W / 2, 40);
      ctx.textAlign = 'start';

      if (!started) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE / CLICK', W / 2, H / 2 + 40);
        ctx.fillText('TO FLAP', W / 2, H / 2 + 60);
        ctx.textAlign = 'start';
      }

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff00ff';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
        ctx.fillStyle = '#00ffff';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(`SCORE: ${score}`, W / 2, H / 2 + 20);
        ctx.textAlign = 'start';
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('click', handleClick);
    };
  }, [isActive, onScoreChange, onGameOver, playSound]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={W} height={H} className="border-2 border-neon-cyan" />
      <p className="mt-2 text-[10px] text-muted-foreground">SPACE / CLICK TO FLAP</p>
    </div>
  );
};

export default FlappyPixelGame;
