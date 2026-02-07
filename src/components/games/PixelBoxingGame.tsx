import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface PixelBoxingGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 350;

interface Fighter {
  x: number;
  health: number;
  blocking: boolean;
  punching: 'none' | 'left' | 'right';
  punchTimer: number;
  stunTimer: number;
}

const PixelBoxingGame = ({ onScoreChange, onGameOver, isActive }: PixelBoxingGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [round, setRound] = useState(1);
  const [player, setPlayer] = useState<Fighter>({ x: 100, health: 100, blocking: false, punching: 'none', punchTimer: 0, stunTimer: 0 });
  const [enemy, setEnemy] = useState<Fighter>({ x: 260, health: 100, blocking: false, punching: 'none', punchTimer: 0, stunTimer: 0 });
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [roundOver, setRoundOver] = useState(false);
  const { playSound } = useSound();

  const keysRef = useRef<{ [key: string]: boolean }>({});

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
      playSound('whistle');
      setIsStarting(false);
    }
  }, [isActive, isStarting, countdown, playSound]);

  // Keyboard controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting || roundOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      
      if (player.stunTimer > 0 || player.punchTimer > 0) return;

      if (e.key === 'z' || e.key === 'Z') {
        setPlayer(prev => ({ ...prev, punching: 'left', punchTimer: 20 }));
        playSound('punch');
      }
      if (e.key === 'x' || e.key === 'X') {
        setPlayer(prev => ({ ...prev, punching: 'right', punchTimer: 20 }));
        playSound('punch');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, gameOver, isStarting, roundOver, player.stunTimer, player.punchTimer, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting || roundOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let frameCount = 0;

    const gameLoop = () => {
      frameCount++;

      // Player movement
      const speed = 3;
      if (player.stunTimer <= 0) {
        if (keysRef.current['arrowleft'] || keysRef.current['a']) {
          setPlayer(prev => ({ ...prev, x: Math.max(50, prev.x - speed) }));
        }
        if (keysRef.current['arrowright'] || keysRef.current['d']) {
          setPlayer(prev => ({ ...prev, x: Math.min(CANVAS_WIDTH / 2 - 20, prev.x + speed) }));
        }
        // Blocking
        setPlayer(prev => ({ ...prev, blocking: keysRef.current[' '] || false }));
      }

      // Update player timers
      setPlayer(prev => ({
        ...prev,
        punchTimer: Math.max(0, prev.punchTimer - 1),
        stunTimer: Math.max(0, prev.stunTimer - 1),
        punching: prev.punchTimer <= 1 ? 'none' : prev.punching,
      }));

      // Enemy AI
      if (enemy.stunTimer <= 0 && enemy.punchTimer <= 0) {
        const dist = enemy.x - player.x;
        
        // Move towards player
        if (frameCount % 3 === 0) {
          if (dist > 80) {
            setEnemy(prev => ({ ...prev, x: prev.x - 2 - round * 0.3 }));
          } else if (dist < 60) {
            setEnemy(prev => ({ ...prev, x: prev.x + 1 }));
          }
        }

        // Attack pattern
        if (dist < 80 && Math.random() < 0.03 + round * 0.01) {
          const attackType = Math.random() < 0.5 ? 'left' : 'right';
          setEnemy(prev => ({ ...prev, punching: attackType, punchTimer: 25 }));
          playSound('punch');
        }

        // Block when player punching
        if (player.punching !== 'none' && dist < 90 && Math.random() < 0.4) {
          setEnemy(prev => ({ ...prev, blocking: true }));
        } else {
          setEnemy(prev => ({ ...prev, blocking: false }));
        }
      }

      // Update enemy timers
      setEnemy(prev => ({
        ...prev,
        punchTimer: Math.max(0, prev.punchTimer - 1),
        stunTimer: Math.max(0, prev.stunTimer - 1),
        punching: prev.punchTimer <= 1 ? 'none' : prev.punching,
      }));

      // Check player hit on enemy
      const pDist = enemy.x - player.x;
      if (player.punching !== 'none' && player.punchTimer === 15 && pDist < 80) {
        if (enemy.blocking) {
          playSound('block');
        } else {
          playSound('hit');
          const damage = 10 + Math.floor(Math.random() * 5);
          setEnemy(prev => ({
            ...prev,
            health: prev.health - damage,
            stunTimer: 15,
          }));
          const newScore = score + damage;
          setScore(newScore);
          onScoreChange(newScore);
        }
      }

      // Check enemy hit on player
      if (enemy.punching !== 'none' && enemy.punchTimer === 15 && pDist < 80) {
        if (player.blocking) {
          playSound('block');
        } else {
          playSound('hit');
          const damage = 8 + Math.floor(Math.random() * 4) + round;
          setPlayer(prev => ({
            ...prev,
            health: prev.health - damage,
            stunTimer: 15,
          }));
        }
      }

      // Check round end
      if (player.health <= 0) {
        setGameOver(true);
        playSound('gameover');
        onGameOver(score);
        return;
      }

      if (enemy.health <= 0) {
        setRoundOver(true);
        playSound('whistle');
        setTimeout(() => {
          const newRound = round + 1;
          setRound(newRound);
          setPlayer(prev => ({ ...prev, x: 100, health: Math.min(100, prev.health + 30), blocking: false, punching: 'none', punchTimer: 0, stunTimer: 0 }));
          setEnemy({ x: 260, health: 100 + newRound * 20, blocking: false, punching: 'none', punchTimer: 0, stunTimer: 0 });
          setRoundOver(false);
        }, 2000);
      }

      // Draw
      ctx.fillStyle = 'hsl(0, 30%, 15%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ring
      ctx.fillStyle = 'hsl(0, 0%, 25%)';
      ctx.fillRect(20, CANVAS_HEIGHT - 100, CANVAS_WIDTH - 40, 80);
      ctx.strokeStyle = 'hsl(0, 80%, 50%)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, CANVAS_HEIGHT - 100, CANVAS_WIDTH - 40, 80);

      // Ropes
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `hsl(${i * 20}, 70%, 50%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(20, 80 + i * 40);
        ctx.lineTo(CANVAS_WIDTH - 20, 80 + i * 40);
        ctx.stroke();
      }

      // Draw fighters
      const drawFighter = (f: Fighter, isPlayer: boolean) => {
        const baseY = CANVAS_HEIGHT - 120;
        const bodyColor = isPlayer ? 'hsl(200, 70%, 50%)' : 'hsl(0, 70%, 50%)';
        const skinColor = 'hsl(30, 60%, 60%)';

        // Stun effect
        if (f.stunTimer > 0 && f.stunTimer % 4 < 2) {
          ctx.globalAlpha = 0.5;
        }

        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(f.x - 15, baseY, 30, 40);

        // Head
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(f.x, baseY - 15, 20, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(f.x - 10, baseY - 20, 6, 6);
        ctx.fillRect(f.x + 4, baseY - 20, 6, 6);

        // Arms
        ctx.fillStyle = skinColor;
        const armOffset = f.blocking ? -10 : 0;
        
        if (f.punching === 'left' || f.punching === 'right') {
          const punchDir = isPlayer ? 1 : -1;
          const punchX = f.punching === 'left' ? f.x - 25 : f.x + 25;
          ctx.fillRect(punchX, baseY - 5 + armOffset, 40 * punchDir, 12);
        } else if (f.blocking) {
          ctx.fillRect(f.x - 25, baseY - 10, 15, 30);
          ctx.fillRect(f.x + 10, baseY - 10, 15, 30);
        } else {
          ctx.fillRect(f.x - 25, baseY + 5, 10, 25);
          ctx.fillRect(f.x + 15, baseY + 5, 10, 25);
        }

        // Gloves
        ctx.fillStyle = isPlayer ? 'hsl(0, 80%, 50%)' : 'hsl(200, 80%, 50%)';
        if (f.punching === 'left' || f.punching === 'right') {
          const punchDir = isPlayer ? 1 : -1;
          const gloveX = f.punching === 'left' ? (isPlayer ? f.x + 15 : f.x - 25) : (isPlayer ? f.x + 15 : f.x - 25);
          ctx.beginPath();
          ctx.arc(f.x + punchDir * 40, baseY + armOffset, 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (f.blocking) {
          ctx.beginPath();
          ctx.arc(f.x - 18, baseY - 10, 8, 0, Math.PI * 2);
          ctx.arc(f.x + 18, baseY - 10, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(f.x - 20, baseY + 28, 8, 0, Math.PI * 2);
          ctx.arc(f.x + 20, baseY + 28, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      };

      drawFighter(player, true);
      drawFighter(enemy, false);

      // Health bars
      ctx.fillStyle = 'hsl(0, 0%, 20%)';
      ctx.fillRect(20, 20, 150, 20);
      ctx.fillRect(CANVAS_WIDTH - 170, 20, 150, 20);

      ctx.fillStyle = 'hsl(120, 80%, 50%)';
      ctx.fillRect(20, 20, Math.max(0, player.health) * 1.5, 20);
      ctx.fillStyle = 'hsl(0, 80%, 50%)';
      ctx.fillRect(CANVAS_WIDTH - 170, 20, Math.max(0, enemy.health / (100 + round * 20) * 150), 20);

      ctx.strokeStyle = 'white';
      ctx.strokeRect(20, 20, 150, 20);
      ctx.strokeRect(CANVAS_WIDTH - 170, 20, 150, 20);

      // Labels
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText('YOU', 20, 55);
      ctx.textAlign = 'right';
      ctx.fillText(`ROUND ${round}`, CANVAS_WIDTH - 20, 55);
      ctx.textAlign = 'left';

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, roundOver, player, enemy, round, score, onGameOver, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">ROUND {round}</p>
          <p className="text-4xl neon-text-green animate-pulse">
            {countdown > 0 ? countdown : 'FIGHT!'}
          </p>
        </div>
      )}
      {roundOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xl neon-text-green mb-4">KNOCKOUT!</p>
          <p className="text-sm neon-text-cyan">NEXT ROUND...</p>
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xl neon-text-magenta mb-4">GAME OVER</p>
          <p className="text-sm neon-text-cyan">SCORE: {score}</p>
        </div>
      )}
      <p className="mt-4 text-[10px] text-muted-foreground">←→ MOVE • Z/X PUNCH • SPACE BLOCK</p>
    </div>
  );
};

export default PixelBoxingGame;
