import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface TypingInvadersGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const WORDS = [
  'PIXEL', 'ARCADE', 'RETRO', 'NEON', 'LASER', 'SCORE', 'COIN', 'FIRE',
  'GHOST', 'BLOCK', 'LEVEL', 'POWER', 'SPEED', 'COMBO', 'BLAST', 'TURBO',
  'GLITCH', 'WARP', 'BOSS', 'SHIELD', 'ROCKET', 'CYBER', 'MATRIX', 'VOXEL',
  'BYTE', 'CODE', 'HACK', 'DATA', 'SYNC', 'PULSE',
];

type Invader = { id: number; word: string; x: number; y: number; speed: number; typed: number };

const W = 400;
const H = 500;

const TypingInvadersGame = ({ onScoreChange, onGameOver, isActive }: TypingInvadersGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { playSound } = useSound();

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let invaders: Invader[] = [];
    let score = 0;
    let gameOver = false;
    let nextId = 0;
    let spawnTimer = 0;
    let targetId: number | null = null;
    let typedSoFar = 0;

    const spawnInvader = () => {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      invaders.push({
        id: nextId++,
        word,
        x: 30 + Math.random() * (W - 60),
        y: -20,
        speed: 0.4 + score / 1000,
        typed: 0,
      });
    };

    const handleKey = (e: KeyboardEvent) => {
      if (gameOver || !isActive) return;
      const char = e.key.toUpperCase();
      if (char.length !== 1 || char < 'A' || char > 'Z') return;

      if (targetId === null) {
        // Find invader starting with this char
        const target = invaders.find(inv => inv.word[0] === char);
        if (target) {
          targetId = target.id;
          typedSoFar = 1;
          target.typed = 1;
          playSound('hit');
          if (typedSoFar >= target.word.length) {
            invaders = invaders.filter(i => i.id !== target.id);
            score += target.word.length * 20;
            onScoreChange(score);
            playSound('eat');
            targetId = null;
            typedSoFar = 0;
          }
        }
      } else {
        const target = invaders.find(i => i.id === targetId);
        if (target && target.word[typedSoFar] === char) {
          typedSoFar++;
          target.typed = typedSoFar;
          playSound('hit');
          if (typedSoFar >= target.word.length) {
            invaders = invaders.filter(i => i.id !== target.id);
            score += target.word.length * 20;
            onScoreChange(score);
            playSound('powerup');
            targetId = null;
            typedSoFar = 0;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKey);

    let frame = 0;
    const loop = () => {
      if (gameOver) return;
      frame++;

      // Spawn
      spawnTimer++;
      if (spawnTimer > Math.max(40, 120 - score / 20)) {
        spawnInvader();
        spawnTimer = 0;
      }

      // Move invaders
      invaders.forEach(inv => { inv.y += inv.speed; });

      // Check if any reached bottom
      if (invaders.some(inv => inv.y > H - 30)) {
        gameOver = true;
        playSound('gameover');
        onGameOver(score);
      }

      // Draw
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.3})`;
        ctx.fillRect((i * 73) % W, (i * 41 + frame * 0.3) % H, 1, 1);
      }

      // Invaders
      invaders.forEach(inv => {
        const isTarget = inv.id === targetId;
        // Body
        ctx.fillStyle = isTarget ? '#ff4444' : '#ff00ff';
        ctx.fillRect(inv.x - 12, inv.y - 10, 24, 20);
        ctx.fillStyle = '#fff';
        ctx.fillRect(inv.x - 6, inv.y - 6, 4, 4);
        ctx.fillRect(inv.x + 2, inv.y - 6, 4, 4);

        // Word
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        for (let i = 0; i < inv.word.length; i++) {
          ctx.fillStyle = i < inv.typed ? '#00ff88' : (isTarget ? '#ffff00' : '#ffffff');
          ctx.fillText(inv.word[i], inv.x - ((inv.word.length - 1) * 6) + i * 12, inv.y + 26);
        }
        ctx.textAlign = 'start';
      });

      // Defense line
      ctx.strokeStyle = '#ff000066';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, H - 30);
      ctx.lineTo(W, H - 30);
      ctx.stroke();
      ctx.setLineDash([]);

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
    };
  }, [isActive, onScoreChange, onGameOver, playSound]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={W} height={H} className="border-2 border-neon-cyan" />
      <p className="mt-2 text-[10px] text-muted-foreground">TYPE WORDS TO DESTROY ENEMIES</p>
    </div>
  );
};

export default TypingInvadersGame;
