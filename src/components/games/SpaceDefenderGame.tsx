import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface SpaceDefenderGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const PLAYER_SIZE = 30;

interface Enemy {
  x: number;
  y: number;
  type: number;
  dx: number;
}

interface Bullet {
  x: number;
  y: number;
  isPlayer: boolean;
}

const SpaceDefenderGame = ({ onScoreChange, onGameOver, isActive }: SpaceDefenderGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2 - PLAYER_SIZE / 2);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(3);
  const [enemyDirection, setEnemyDirection] = useState(1);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Spawn wave
  const spawnWave = (waveNum: number) => {
    const newEnemies: Enemy[] = [];
    const rows = 3 + Math.min(2, Math.floor(waveNum / 3));
    const cols = 8;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newEnemies.push({
          x: 30 + col * 42,
          y: 40 + row * 35,
          type: row % 3,
          dx: 1,
        });
      }
    }
    setEnemies(newEnemies);
    setEnemyDirection(1);
  };

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
      spawnWave(1);
    }
  }, [isActive, isStarting, countdown, playSound]);

  // Keyboard controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') {
        const playerBullets = bullets.filter(b => b.isPlayer);
        if (playerBullets.length < 3) {
          setBullets(prev => [...prev, { x: playerX + PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 50, isPlayer: true }]);
          playSound('shoot');
        }
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
  }, [isActive, gameOver, isStarting, playerX, bullets, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let frameCount = 0;

    const gameLoop = () => {
      frameCount++;

      // Move player
      const speed = 5;
      if (keysRef.current['arrowleft'] || keysRef.current['a']) {
        setPlayerX(prev => Math.max(0, prev - speed));
      }
      if (keysRef.current['arrowright'] || keysRef.current['d']) {
        setPlayerX(prev => Math.min(CANVAS_WIDTH - PLAYER_SIZE, prev + speed));
      }

      // Update enemies
      if (frameCount % 3 === 0) {
        let needsReverse = false;
        const moveSpeed = 1 + wave * 0.2;

        setEnemies(prev => {
          const updated = prev.map(enemy => ({
            ...enemy,
            x: enemy.x + enemyDirection * moveSpeed,
          }));

          // Check if any enemy hit wall
          updated.forEach(enemy => {
            if (enemy.x < 10 || enemy.x > CANVAS_WIDTH - 40) {
              needsReverse = true;
            }
          });

          if (needsReverse) {
            setEnemyDirection(d => -d);
            return updated.map(enemy => ({ ...enemy, y: enemy.y + 10 }));
          }

          return updated;
        });
      }

      // Enemy shooting
      if (frameCount % 60 === 0 && enemies.length > 0) {
        const shooter = enemies[Math.floor(Math.random() * enemies.length)];
        setBullets(prev => [...prev, { x: shooter.x + 15, y: shooter.y + 20, isPlayer: false }]);
      }

      // Update bullets
      setBullets(prev => prev
        .filter(b => b.y > -10 && b.y < CANVAS_HEIGHT + 10)
        .map(b => ({
          ...b,
          y: b.isPlayer ? b.y - 8 : b.y + 4,
        })));

      // Bullet-enemy collision
      let enemiesHit: number[] = [];
      bullets.forEach(bullet => {
        if (!bullet.isPlayer) return;
        enemies.forEach((enemy, i) => {
          if (
            bullet.x > enemy.x &&
            bullet.x < enemy.x + 30 &&
            bullet.y < enemy.y + 20 &&
            bullet.y > enemy.y
          ) {
            enemiesHit.push(i);
          }
        });
      });

      if (enemiesHit.length > 0) {
        playSound('explosion');
        setEnemies(prev => prev.filter((_, i) => !enemiesHit.includes(i)));
        setBullets(prev => prev.filter(b => {
          for (const enemy of enemies.filter((_, i) => enemiesHit.includes(i))) {
            if (b.x > enemy.x && b.x < enemy.x + 30 && b.y < enemy.y + 20 && b.y > enemy.y) {
              return false;
            }
          }
          return true;
        }));
        const points = enemiesHit.length * 10 * wave;
        const newScore = score + points;
        setScore(newScore);
        onScoreChange(newScore);
      }

      // Player hit
      bullets.forEach(bullet => {
        if (bullet.isPlayer) return;
        if (
          bullet.x > playerX &&
          bullet.x < playerX + PLAYER_SIZE &&
          bullet.y > CANVAS_HEIGHT - 50 &&
          bullet.y < CANVAS_HEIGHT - 20
        ) {
          playSound('hit');
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
              playSound('gameover');
              onGameOver(score);
            }
            return newLives;
          });
          setBullets(prev => prev.filter(b => b !== bullet));
        }
      });

      // Enemy reached bottom
      enemies.forEach(enemy => {
        if (enemy.y > CANVAS_HEIGHT - 80) {
          setGameOver(true);
          playSound('gameover');
          onGameOver(score);
        }
      });

      // Wave complete
      if (enemies.length === 0) {
        const newWave = wave + 1;
        setWave(newWave);
        spawnWave(newWave);
        playSound('powerup');
      }

      // Draw
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stars
      ctx.fillStyle = 'white';
      for (let i = 0; i < 30; i++) {
        const x = (i * 47 + frameCount * 0.1) % CANVAS_WIDTH;
        const y = (i * 31) % CANVAS_HEIGHT;
        ctx.fillRect(x, y, 1, 1);
      }

      // Draw enemies
      enemies.forEach(enemy => {
        const colors = ['hsl(0, 70%, 50%)', 'hsl(120, 70%, 50%)', 'hsl(270, 70%, 50%)'];
        ctx.fillStyle = colors[enemy.type];
        // Body
        ctx.fillRect(enemy.x + 5, enemy.y, 20, 15);
        // Tentacles
        ctx.fillRect(enemy.x, enemy.y + 10, 8, 10);
        ctx.fillRect(enemy.x + 22, enemy.y + 10, 8, 10);
        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(enemy.x + 8, enemy.y + 4, 4, 4);
        ctx.fillRect(enemy.x + 18, enemy.y + 4, 4, 4);
      });

      // Draw bullets
      bullets.forEach(bullet => {
        ctx.fillStyle = bullet.isPlayer ? 'hsl(120, 100%, 70%)' : 'hsl(0, 100%, 70%)';
        ctx.fillRect(bullet.x - 2, bullet.y, 4, bullet.isPlayer ? 10 : 8);
      });

      // Draw player
      ctx.fillStyle = 'hsl(180, 80%, 50%)';
      ctx.beginPath();
      ctx.moveTo(playerX + PLAYER_SIZE / 2, CANVAS_HEIGHT - 50);
      ctx.lineTo(playerX, CANVAS_HEIGHT - 25);
      ctx.lineTo(playerX + PLAYER_SIZE, CANVAS_HEIGHT - 25);
      ctx.closePath();
      ctx.fill();

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`LIVES: ${lives}`, 10, 20);
      ctx.fillText(`WAVE: ${wave}`, CANVAS_WIDTH - 70, 20);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, bullets, enemies, wave, lives, enemyDirection, score, onGameOver, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">DEFEND EARTH!</p>
          <p className="text-4xl neon-text-green animate-pulse">
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
      <p className="mt-4 text-[10px] text-muted-foreground">←→ TO MOVE • SPACE TO SHOOT</p>
    </div>
  );
};

export default SpaceDefenderGame;
