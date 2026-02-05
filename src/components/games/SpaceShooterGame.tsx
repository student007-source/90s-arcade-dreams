import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface SpaceShooterGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

type Position = { x: number; y: number };
type Enemy = Position & { id: number; type: number };
type Bullet = Position & { id: number };
type EnemyBullet = Position & { id: number };

const CANVAS_W = 400;
const CANVAS_H = 500;
const PLAYER_W = 30;
const PLAYER_H = 20;
const BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 4;

const SpaceShooterGame = ({ onScoreChange, onGameOver, isActive }: SpaceShooterGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    playerX: CANVAS_W / 2,
    bullets: [] as Bullet[],
    enemyBullets: [] as EnemyBullet[],
    enemies: [] as Enemy[],
    score: 0,
    gameOver: false,
    paused: false,
    keys: {} as Record<string, boolean>,
    nextId: 0,
    spawnTimer: 0,
    shootTimer: 0,
    lives: 3,
  });
  const animRef = useRef<number>(0);
  const { playSound } = useSound();

  const spawnEnemy = useCallback(() => {
    const s = stateRef.current;
    s.enemies.push({
      x: Math.random() * (CANVAS_W - 24) + 12,
      y: -20,
      id: s.nextId++,
      type: Math.floor(Math.random() * 3),
    });
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        stateRef.current.paused = !stateRef.current.paused;
        return;
      }
      stateRef.current.keys[e.key] = e.type === 'keydown';
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;
    // Reset
    s.playerX = CANVAS_W / 2;
    s.bullets = [];
    s.enemyBullets = [];
    s.enemies = [];
    s.score = 0;
    s.gameOver = false;
    s.paused = false;
    s.keys = {};
    s.lives = 3;
    s.spawnTimer = 0;
    s.shootTimer = 0;

    const loop = () => {
      if (s.gameOver) return;
      if (!s.paused) {
        // Move player
        if (s.keys['ArrowLeft'] || s.keys['a']) s.playerX = Math.max(PLAYER_W / 2, s.playerX - 5);
        if (s.keys['ArrowRight'] || s.keys['d']) s.playerX = Math.min(CANVAS_W - PLAYER_W / 2, s.playerX + 5);

        // Shoot
        s.shootTimer++;
        if (s.keys[' '] && s.shootTimer > 8) {
          s.bullets.push({ x: s.playerX, y: CANVAS_H - 40, id: s.nextId++ });
          s.shootTimer = 0;
        }

        // Move bullets
        s.bullets = s.bullets.filter(b => { b.y -= BULLET_SPEED; return b.y > -10; });
        s.enemyBullets = s.enemyBullets.filter(b => { b.y += ENEMY_BULLET_SPEED; return b.y < CANVAS_H + 10; });

        // Spawn enemies
        s.spawnTimer++;
        if (s.spawnTimer > Math.max(20, 60 - s.score / 50)) {
          spawnEnemy();
          s.spawnTimer = 0;
        }

        // Move enemies
        s.enemies.forEach(e => { e.y += 1.5 + s.score / 500; });

        // Enemy shooting
        s.enemies.forEach(e => {
          if (Math.random() < 0.005) {
            s.enemyBullets.push({ x: e.x, y: e.y + 12, id: s.nextId++ });
          }
        });

        // Bullet-enemy collision
        s.bullets = s.bullets.filter(b => {
          const hit = s.enemies.findIndex(e => Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16);
          if (hit !== -1) {
            s.enemies.splice(hit, 1);
            s.score += 10;
            onScoreChange(s.score);
            playSound('hit');
            return false;
          }
          return true;
        });

        // Enemy-player collision & enemy bullets hitting player
        const playerY = CANVAS_H - 30;
        s.enemies = s.enemies.filter(e => {
          if (e.y > CANVAS_H + 20) return false;
          if (Math.abs(e.x - s.playerX) < 20 && Math.abs(e.y - playerY) < 20) {
            s.lives--;
            playSound('hit');
            if (s.lives <= 0) {
              s.gameOver = true;
              playSound('gameover');
              onGameOver(s.score);
            }
            return false;
          }
          return true;
        });

        s.enemyBullets = s.enemyBullets.filter(b => {
          if (Math.abs(b.x - s.playerX) < 14 && Math.abs(b.y - playerY) < 14) {
            s.lives--;
            playSound('hit');
            if (s.lives <= 0) {
              s.gameOver = true;
              playSound('gameover');
              onGameOver(s.score);
            }
            return false;
          }
          return true;
        });
      }

      // Draw
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.4})`;
        ctx.fillRect((i * 97 + s.score) % CANVAS_W, (i * 53 + s.score * 0.5) % CANVAS_H, 1, 1);
      }

      // Player ship
      const px = s.playerX;
      const py = CANVAS_H - 30;
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.moveTo(px, py - PLAYER_H / 2);
      ctx.lineTo(px - PLAYER_W / 2, py + PLAYER_H / 2);
      ctx.lineTo(px + PLAYER_W / 2, py + PLAYER_H / 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bullets
      ctx.fillStyle = '#ffff00';
      s.bullets.forEach(b => {
        ctx.fillRect(b.x - 2, b.y - 6, 4, 12);
      });

      // Enemy bullets
      ctx.fillStyle = '#ff4444';
      s.enemyBullets.forEach(b => {
        ctx.fillRect(b.x - 2, b.y - 4, 4, 8);
      });

      // Enemies
      const colors = ['#ff00ff', '#ff4400', '#ff0088'];
      s.enemies.forEach(e => {
        ctx.fillStyle = colors[e.type];
        ctx.fillRect(e.x - 12, e.y - 8, 24, 16);
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x - 6, e.y - 4, 4, 4);
        ctx.fillRect(e.x + 2, e.y - 4, 4, 4);
      });

      // Lives
      ctx.fillStyle = '#00ff88';
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText('♥'.repeat(s.lives), 10, 20);

      if (s.paused && !s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ffff00';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2);
        ctx.textAlign = 'start';
      }

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ff00ff';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText(`SCORE: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.textAlign = 'start';
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive, onScoreChange, onGameOver, playSound, spawnEnemy]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="border-2 border-neon-cyan" />
      <p className="mt-2 text-[10px] text-muted-foreground">←→ MOVE • SPACE FIRE • P PAUSE</p>
    </div>
  );
};

export default SpaceShooterGame;
