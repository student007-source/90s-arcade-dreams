import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface TowerDefenseGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const CELL_SIZE = 40;

interface Tower {
  x: number;
  y: number;
  type: 'basic' | 'fast' | 'splash';
  range: number;
  damage: number;
  cooldown: number;
  currentCooldown: number;
}

interface Enemy {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number;
}

interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  damage: number;
  splash: boolean;
}

const path = [
  { x: 0, y: 4 },
  { x: 1, y: 4 },
  { x: 2, y: 4 },
  { x: 2, y: 3 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 4, y: 2 },
  { x: 5, y: 2 },
  { x: 5, y: 3 },
  { x: 5, y: 4 },
  { x: 5, y: 5 },
  { x: 5, y: 6 },
  { x: 6, y: 6 },
  { x: 7, y: 6 },
  { x: 7, y: 5 },
  { x: 7, y: 4 },
  { x: 8, y: 4 },
  { x: 9, y: 4 },
];

const TowerDefenseGame = ({ onScoreChange, onGameOver, isActive }: TowerDefenseGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [money, setMoney] = useState(100);
  const [lives, setLives] = useState(10);
  const [wave, setWave] = useState(1);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [selectedTower, setSelectedTower] = useState<'basic' | 'fast' | 'splash'>('basic');
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [waveActive, setWaveActive] = useState(false);
  const { playSound } = useSound();

  const towerCosts = { basic: 25, fast: 40, splash: 60 };

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
    }
  }, [isActive, isStarting, countdown, playSound]);

  // Spawn wave
  const spawnWave = (waveNum: number) => {
    const newEnemies: Enemy[] = [];
    const numEnemies = 5 + waveNum * 2;
    for (let i = 0; i < numEnemies; i++) {
      newEnemies.push({
        x: path[0].x * CELL_SIZE + CELL_SIZE / 2,
        y: path[0].y * CELL_SIZE + CELL_SIZE / 2,
        health: 30 + waveNum * 10,
        maxHealth: 30 + waveNum * 10,
        speed: 0.8 + waveNum * 0.1,
        pathIndex: 0 - i * 0.5,
      });
    }
    setEnemies(newEnemies);
    setWaveActive(true);
  };

  // Click handler
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const gridX = Math.floor(x / CELL_SIZE);
      const gridY = Math.floor(y / CELL_SIZE);

      // Check if on path
      if (path.some(p => p.x === gridX && p.y === gridY)) {
        return;
      }

      // Check if tower exists
      if (towers.some(t => t.x === gridX && t.y === gridY)) {
        return;
      }

      // Check if can afford
      if (money < towerCosts[selectedTower]) {
        playSound('hit');
        return;
      }

      // Place tower
      const towerData = {
        basic: { range: 80, damage: 10, cooldown: 30 },
        fast: { range: 60, damage: 5, cooldown: 10 },
        splash: { range: 70, damage: 15, cooldown: 50 },
      };
      const data = towerData[selectedTower];

      setTowers(prev => [...prev, {
        x: gridX,
        y: gridY,
        type: selectedTower,
        range: data.range,
        damage: data.damage,
        cooldown: data.cooldown,
        currentCooldown: 0,
      }]);
      setMoney(prev => prev - towerCosts[selectedTower]);
      playSound('blip');
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [isActive, gameOver, isStarting, towers, money, selectedTower, playSound]);

  // Keyboard for tower selection
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') setSelectedTower('basic');
      if (e.key === '2') setSelectedTower('fast');
      if (e.key === '3') setSelectedTower('splash');
      if (e.key === ' ' && !waveActive) {
        spawnWave(wave);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, gameOver, isStarting, waveActive, wave]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Update enemies
      setEnemies(prev => {
        const updated: Enemy[] = [];
        let enemiesReached = 0;

        prev.forEach(enemy => {
          if (enemy.health <= 0) {
            setMoney(m => m + 10);
            setScore(s => {
              const newScore = s + 10;
              onScoreChange(newScore);
              return newScore;
            });
            return;
          }

          const targetIndex = Math.floor(enemy.pathIndex);
          if (targetIndex >= path.length) {
            enemiesReached++;
            return;
          }

          if (targetIndex >= 0) {
            const target = path[targetIndex];
            const targetX = target.x * CELL_SIZE + CELL_SIZE / 2;
            const targetY = target.y * CELL_SIZE + CELL_SIZE / 2;

            const dx = targetX - enemy.x;
            const dy = targetY - enemy.y;
            const dist = Math.hypot(dx, dy);

            if (dist < enemy.speed) {
              enemy.pathIndex += 0.1;
            } else {
              enemy.x += (dx / dist) * enemy.speed;
              enemy.y += (dy / dist) * enemy.speed;
            }
          } else {
            enemy.pathIndex += 0.1;
          }

          updated.push(enemy);
        });

        if (enemiesReached > 0) {
          setLives(l => {
            const newLives = l - enemiesReached;
            if (newLives <= 0) {
              setGameOver(true);
              playSound('gameover');
              onGameOver(score);
            }
            return newLives;
          });
        }

        return updated;
      });

      // Check wave complete
      if (waveActive && enemies.length === 0) {
        setWaveActive(false);
        setWave(w => w + 1);
        setMoney(m => m + 50);
        playSound('powerup');
      }

      // Tower shooting
      setTowers(prev => prev.map(tower => {
        if (tower.currentCooldown > 0) {
          return { ...tower, currentCooldown: tower.currentCooldown - 1 };
        }

        // Find target
        const towerCenterX = tower.x * CELL_SIZE + CELL_SIZE / 2;
        const towerCenterY = tower.y * CELL_SIZE + CELL_SIZE / 2;

        for (const enemy of enemies) {
          const dist = Math.hypot(enemy.x - towerCenterX, enemy.y - towerCenterY);
          if (dist < tower.range) {
            setProjectiles(p => [...p, {
              x: towerCenterX,
              y: towerCenterY,
              targetX: enemy.x,
              targetY: enemy.y,
              damage: tower.damage,
              splash: tower.type === 'splash',
            }]);
            playSound('shoot');
            return { ...tower, currentCooldown: tower.cooldown };
          }
        }

        return tower;
      }));

      // Update projectiles
      setProjectiles(prev => {
        const remaining: Projectile[] = [];
        prev.forEach(proj => {
          const dx = proj.targetX - proj.x;
          const dy = proj.targetY - proj.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 10) {
            // Hit
            setEnemies(enemies => enemies.map(enemy => {
              const enemyDist = Math.hypot(enemy.x - proj.targetX, enemy.y - proj.targetY);
              if (proj.splash ? enemyDist < 40 : enemyDist < 20) {
                return { ...enemy, health: enemy.health - proj.damage };
              }
              return enemy;
            }));
          } else {
            remaining.push({
              ...proj,
              x: proj.x + (dx / dist) * 8,
              y: proj.y + (dy / dist) * 8,
            });
          }
        });
        return remaining;
      });

      // Draw
      ctx.fillStyle = 'hsl(120, 30%, 20%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw grid
      ctx.strokeStyle = 'hsla(120, 30%, 30%, 0.3)';
      for (let x = 0; x <= CANVAS_WIDTH; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw path
      ctx.fillStyle = 'hsl(30, 30%, 30%)';
      path.forEach(p => {
        ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      });

      // Draw towers
      towers.forEach(tower => {
        const colors = {
          basic: 'hsl(200, 70%, 50%)',
          fast: 'hsl(120, 70%, 50%)',
          splash: 'hsl(0, 70%, 50%)',
        };
        ctx.fillStyle = colors[tower.type];
        ctx.fillRect(tower.x * CELL_SIZE + 5, tower.y * CELL_SIZE + 5, CELL_SIZE - 10, CELL_SIZE - 10);
        // Range indicator (faint)
        ctx.strokeStyle = 'hsla(0, 0%, 100%, 0.1)';
        ctx.beginPath();
        ctx.arc(tower.x * CELL_SIZE + CELL_SIZE / 2, tower.y * CELL_SIZE + CELL_SIZE / 2, tower.range, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw enemies
      enemies.forEach(enemy => {
        // Health bar
        ctx.fillStyle = 'hsl(0, 70%, 40%)';
        ctx.fillRect(enemy.x - 15, enemy.y - 20, 30, 5);
        ctx.fillStyle = 'hsl(120, 70%, 50%)';
        ctx.fillRect(enemy.x - 15, enemy.y - 20, 30 * (enemy.health / enemy.maxHealth), 5);

        // Body
        ctx.fillStyle = 'hsl(270, 70%, 50%)';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw projectiles
      projectiles.forEach(proj => {
        ctx.fillStyle = proj.splash ? 'hsl(0, 100%, 70%)' : 'hsl(60, 100%, 70%)';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`MONEY: $${money}`, 10, 20);
      ctx.fillText(`LIVES: ${lives}`, 10, 35);
      ctx.fillText(`WAVE: ${wave}`, CANVAS_WIDTH - 70, 20);

      // Tower selection
      ctx.fillStyle = selectedTower === 'basic' ? 'hsl(200, 70%, 50%)' : 'hsl(200, 30%, 30%)';
      ctx.fillRect(10, CANVAS_HEIGHT - 45, 30, 30);
      ctx.fillStyle = selectedTower === 'fast' ? 'hsl(120, 70%, 50%)' : 'hsl(120, 30%, 30%)';
      ctx.fillRect(50, CANVAS_HEIGHT - 45, 30, 30);
      ctx.fillStyle = selectedTower === 'splash' ? 'hsl(0, 70%, 50%)' : 'hsl(0, 30%, 30%)';
      ctx.fillRect(90, CANVAS_HEIGHT - 45, 30, 30);

      ctx.fillStyle = 'white';
      ctx.font = '10px monospace';
      ctx.fillText('1', 20, CANVAS_HEIGHT - 25);
      ctx.fillText('2', 60, CANVAS_HEIGHT - 25);
      ctx.fillText('3', 100, CANVAS_HEIGHT - 25);
      ctx.fillText(`$${towerCosts.basic}`, 10, CANVAS_HEIGHT - 8);
      ctx.fillText(`$${towerCosts.fast}`, 50, CANVAS_HEIGHT - 8);
      ctx.fillText(`$${towerCosts.splash}`, 90, CANVAS_HEIGHT - 8);

      if (!waveActive) {
        ctx.fillStyle = 'hsl(60, 100%, 50%)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS SPACE TO START WAVE', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
        ctx.textAlign = 'left';
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, towers, enemies, projectiles, money, lives, wave, waveActive, score, selectedTower, onGameOver, onScoreChange, playSound]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-neon-cyan cursor-crosshair"
      />
      {isStarting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xs neon-text-cyan mb-4">DEFEND!</p>
          <p className="text-4xl neon-text-green animate-pulse">
            {countdown > 0 ? countdown : 'GO!'}
          </p>
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xl neon-text-magenta mb-4">GAME OVER</p>
          <p className="text-sm neon-text-cyan">WAVES: {wave - 1}</p>
          <p className="text-sm neon-text-yellow">SCORE: {score}</p>
        </div>
      )}
      <p className="mt-4 text-[10px] text-muted-foreground">1/2/3 SELECT TOWER • CLICK TO PLACE • SPACE START WAVE</p>
    </div>
  );
};

export default TowerDefenseGame;
