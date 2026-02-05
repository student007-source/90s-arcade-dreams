import { useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface AsteroidsGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const W = 480;
const H = 480;

type Asteroid = { x: number; y: number; dx: number; dy: number; size: number; angle: number };
type Bullet = { x: number; y: number; dx: number; dy: number; life: number };

const AsteroidsGame = ({ onScoreChange, onGameOver, isActive }: AsteroidsGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { playSound } = useSound();

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const ship = { x: W / 2, y: H / 2, angle: -Math.PI / 2, dx: 0, dy: 0 };
    let bullets: Bullet[] = [];
    let asteroids: Asteroid[] = [];
    let score = 0;
    let lives = 3;
    let gameOver = false;
    let shootCooldown = 0;
    const keys: Record<string, boolean> = {};

    // Spawn initial asteroids
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      asteroids.push({
        x: Math.random() * W, y: Math.random() * H,
        dx: Math.cos(angle) * 1.5, dy: Math.sin(angle) * 1.5,
        size: 30, angle: Math.random() * Math.PI * 2,
      });
    }

    const handleKey = (e: KeyboardEvent) => { keys[e.key] = e.type === 'keydown'; };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    const wrap = (v: number, max: number) => ((v % max) + max) % max;

    const loop = () => {
      if (gameOver) return;

      // Input
      if (keys['ArrowLeft'] || keys['a']) ship.angle -= 0.06;
      if (keys['ArrowRight'] || keys['d']) ship.angle += 0.06;
      if (keys['ArrowUp'] || keys['w']) {
        ship.dx += Math.cos(ship.angle) * 0.12;
        ship.dy += Math.sin(ship.angle) * 0.12;
      }
      // Friction
      ship.dx *= 0.99;
      ship.dy *= 0.99;
      ship.x = wrap(ship.x + ship.dx, W);
      ship.y = wrap(ship.y + ship.dy, H);

      // Shoot
      shootCooldown = Math.max(0, shootCooldown - 1);
      if (keys[' '] && shootCooldown === 0) {
        bullets.push({
          x: ship.x + Math.cos(ship.angle) * 15,
          y: ship.y + Math.sin(ship.angle) * 15,
          dx: Math.cos(ship.angle) * 7 + ship.dx,
          dy: Math.sin(ship.angle) * 7 + ship.dy,
          life: 50,
        });
        shootCooldown = 8;
        playSound('hit');
      }

      // Update bullets
      bullets = bullets.filter(b => {
        b.x = wrap(b.x + b.dx, W);
        b.y = wrap(b.y + b.dy, H);
        b.life--;
        return b.life > 0;
      });

      // Update asteroids
      asteroids.forEach(a => {
        a.x = wrap(a.x + a.dx, W);
        a.y = wrap(a.y + a.dy, H);
        a.angle += 0.01;
      });

      // Bullet-asteroid collision
      const newAsteroids: Asteroid[] = [];
      bullets = bullets.filter(b => {
        let hit = false;
        asteroids = asteroids.filter(a => {
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          if (dist < a.size) {
            hit = true;
            score += a.size > 20 ? 20 : a.size > 10 ? 50 : 100;
            onScoreChange(score);
            if (a.size > 10) {
              for (let i = 0; i < 2; i++) {
                const angle = Math.random() * Math.PI * 2;
                newAsteroids.push({
                  x: a.x, y: a.y,
                  dx: Math.cos(angle) * 2, dy: Math.sin(angle) * 2,
                  size: a.size / 2, angle: Math.random() * Math.PI * 2,
                });
              }
            }
            return false;
          }
          return true;
        });
        return !hit;
      });
      asteroids.push(...newAsteroids);

      // Ship-asteroid collision
      asteroids.forEach(a => {
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.size + 8) {
          lives--;
          ship.x = W / 2; ship.y = H / 2; ship.dx = 0; ship.dy = 0;
          playSound('hit');
          if (lives <= 0) {
            gameOver = true;
            playSound('gameover');
            onGameOver(score);
          }
        }
      });

      // Respawn if cleared
      if (asteroids.length === 0) {
        for (let i = 0; i < 5 + score / 200; i++) {
          const angle = Math.random() * Math.PI * 2;
          let x, y;
          do {
            x = Math.random() * W; y = Math.random() * H;
          } while (Math.hypot(x - ship.x, y - ship.y) < 100);
          asteroids.push({ x, y, dx: Math.cos(angle) * 2, dy: Math.sin(angle) * 2, size: 30, angle: 0 });
        }
      }

      // Draw
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, W, H);

      // Ship
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (keys['ArrowUp'] || keys['w']) {
        ctx.strokeStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-14 - Math.random() * 6, 0);
        ctx.lineTo(-8, 4);
        ctx.stroke();
      }
      ctx.restore();

      // Bullets
      ctx.fillStyle = '#ffff00';
      bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Asteroids
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1.5;
      asteroids.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const r = a.size * (0.8 + Math.sin(i * 3) * 0.2);
          if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      });

      // Lives
      ctx.fillStyle = '#00ff88';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText('♥'.repeat(lives), 10, 20);

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
      <p className="mt-2 text-[10px] text-muted-foreground">←→ ROTATE • ↑ THRUST • SPACE SHOOT</p>
    </div>
  );
};

export default AsteroidsGame;
