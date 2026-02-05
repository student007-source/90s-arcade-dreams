import { useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface PixelRacingGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const W = 400;
const H = 500;
const ROAD_W = 200;
const CAR_W = 24;
const CAR_H = 36;

const PixelRacingGame = ({ onScoreChange, onGameOver, isActive }: PixelRacingGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { playSound } = useSound();

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const s = {
      playerX: W / 2,
      speed: 3,
      score: 0,
      gameOver: false,
      obstacles: [] as { x: number; y: number; w: number; color: string }[],
      roadOffset: 0,
      keys: {} as Record<string, boolean>,
      spawnTimer: 0,
    };

    const handleKey = (e: KeyboardEvent) => { s.keys[e.key] = e.type === 'keydown'; };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    const roadLeft = (W - ROAD_W) / 2;
    const roadRight = roadLeft + ROAD_W;

    const loop = () => {
      if (s.gameOver) return;

      // Input
      if (s.keys['ArrowLeft'] || s.keys['a']) s.playerX = Math.max(roadLeft + CAR_W / 2 + 4, s.playerX - 4);
      if (s.keys['ArrowRight'] || s.keys['d']) s.playerX = Math.min(roadRight - CAR_W / 2 - 4, s.playerX + 4);
      if (s.keys['ArrowUp'] || s.keys['w']) s.speed = Math.min(10, s.speed + 0.1);
      if (s.keys['ArrowDown'] || s.keys['s']) s.speed = Math.max(2, s.speed - 0.1);

      s.score += Math.floor(s.speed);
      onScoreChange(s.score);
      s.roadOffset = (s.roadOffset + s.speed) % 40;

      // Spawn obstacles
      s.spawnTimer++;
      if (s.spawnTimer > Math.max(15, 50 - s.score / 500)) {
        const colors = ['#ff0044', '#ff8800', '#0088ff', '#ffff00'];
        s.obstacles.push({
          x: roadLeft + 20 + Math.random() * (ROAD_W - 60),
          y: -40,
          w: 20 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
        s.spawnTimer = 0;
      }

      // Move obstacles
      s.obstacles = s.obstacles.filter(o => {
        o.y += s.speed;
        return o.y < H + 40;
      });

      // Collision
      const py = H - 60;
      s.obstacles.forEach(o => {
        if (Math.abs(o.x - s.playerX) < (o.w + CAR_W) / 2 && Math.abs(o.y - py) < (CAR_H + 30) / 2) {
          s.gameOver = true;
          playSound('gameover');
          onGameOver(s.score);
        }
      });

      // Draw
      // Grass
      ctx.fillStyle = '#0a3300';
      ctx.fillRect(0, 0, W, H);

      // Road
      ctx.fillStyle = '#222222';
      ctx.fillRect(roadLeft, 0, ROAD_W, H);

      // Road lines
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -s.roadOffset;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Road edges
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(roadLeft, 0); ctx.lineTo(roadLeft, H);
      ctx.moveTo(roadRight, 0); ctx.lineTo(roadRight, H);
      ctx.stroke();

      // Obstacles (other cars)
      s.obstacles.forEach(o => {
        ctx.fillStyle = o.color;
        ctx.fillRect(o.x - o.w / 2, o.y - 15, o.w, 30);
        ctx.fillStyle = '#333';
        ctx.fillRect(o.x - o.w / 2 + 2, o.y - 12, o.w - 4, 8);
      });

      // Player car
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
      ctx.fillRect(s.playerX - CAR_W / 2, py - CAR_H / 2, CAR_W, CAR_H);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#00aa55';
      ctx.fillRect(s.playerX - CAR_W / 2 + 3, py - CAR_H / 2 + 3, CAR_W - 6, 10);

      // Speed indicator
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText(`SPD:${Math.floor(s.speed * 20)}`, 10, 20);

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff00ff';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('CRASH!', W / 2, H / 2 - 10);
        ctx.fillStyle = '#00ffff';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(`SCORE: ${s.score}`, W / 2, H / 2 + 20);
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
      <p className="mt-2 text-[10px] text-muted-foreground">↑↓ SPEED • ←→ STEER</p>
    </div>
  );
};

export default PixelRacingGame;
