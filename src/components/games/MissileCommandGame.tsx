import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface MissileCommandGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

interface Missile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
}

interface CounterMissile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  exploding: boolean;
  explosionRadius: number;
}

interface City {
  x: number;
  alive: boolean;
}

const MissileCommandGame = ({ onScoreChange, onGameOver, isActive }: MissileCommandGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [missiles, setMissiles] = useState<Missile[]>([]);
  const [counterMissiles, setCounterMissiles] = useState<CounterMissile[]>([]);
  const [ammo, setAmmo] = useState(30);
  const [wave, setWave] = useState(1);
  const [cities, setCities] = useState<City[]>([
    { x: 50, alive: true },
    { x: 120, alive: true },
    { x: 190, alive: true },
    { x: 260, alive: true },
    { x: 330, alive: true },
  ]);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [waveComplete, setWaveComplete] = useState(false);
  const { playSound } = useSound();

  // Spawn wave
  const spawnWave = (waveNum: number) => {
    const newMissiles: Missile[] = [];
    const numMissiles = 5 + waveNum * 3;
    for (let i = 0; i < numMissiles; i++) {
      const cityIndex = Math.floor(Math.random() * cities.length);
      const targetCity = cities[cityIndex];
      newMissiles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: -Math.random() * 100,
        targetX: targetCity.x + 20,
        targetY: CANVAS_HEIGHT - 30,
        speed: 0.5 + waveNum * 0.1,
      });
    }
    setMissiles(newMissiles);
    setAmmo(prev => Math.min(30, prev + 10));
    setWaveComplete(false);
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

  // Mouse click to fire
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      if (ammo <= 0) {
        playSound('hit');
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Launch from base at bottom center
      setCounterMissiles(prev => [...prev, {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 20,
        targetX: x,
        targetY: y,
        speed: 8,
        exploding: false,
        explosionRadius: 0,
      }]);
      
      setAmmo(prev => prev - 1);
      playSound('shoot');
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [isActive, gameOver, isStarting, ammo, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Update enemy missiles
      setMissiles(prevMissiles => {
        const remaining: Missile[] = [];
        prevMissiles.forEach(missile => {
          const dx = missile.targetX - missile.x;
          const dy = missile.targetY - missile.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < missile.speed) {
            // Hit city
            setCities(prev => prev.map(city => {
              if (Math.abs(city.x + 20 - missile.targetX) < 30 && city.alive) {
                playSound('explosion');
                return { ...city, alive: false };
              }
              return city;
            }));
          } else {
            remaining.push({
              ...missile,
              x: missile.x + (dx / dist) * missile.speed,
              y: missile.y + (dy / dist) * missile.speed,
            });
          }
        });
        return remaining;
      });

      // Update counter missiles
      setCounterMissiles(prevCounter => {
        const remaining: CounterMissile[] = [];
        prevCounter.forEach(cm => {
          if (cm.exploding) {
            if (cm.explosionRadius < 40) {
              remaining.push({ ...cm, explosionRadius: cm.explosionRadius + 2 });
            }
          } else {
            const dx = cm.targetX - cm.x;
            const dy = cm.targetY - cm.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < cm.speed) {
              remaining.push({ ...cm, exploding: true, explosionRadius: 5 });
              playSound('explosion');
            } else {
              remaining.push({
                ...cm,
                x: cm.x + (dx / dist) * cm.speed,
                y: cm.y + (dy / dist) * cm.speed,
              });
            }
          }
        });
        return remaining;
      });

      // Check missile destruction by explosions
      setMissiles(prevMissiles => {
        const remaining: Missile[] = [];
        let destroyed = 0;
        prevMissiles.forEach(missile => {
          let hit = false;
          counterMissiles.forEach(cm => {
            if (cm.exploding) {
              const dist = Math.hypot(missile.x - cm.x, missile.y - cm.y);
              if (dist < cm.explosionRadius) {
                hit = true;
                destroyed++;
              }
            }
          });
          if (!hit) {
            remaining.push(missile);
          }
        });
        if (destroyed > 0) {
          playSound('score');
          const newScore = score + destroyed * 25;
          setScore(newScore);
          onScoreChange(newScore);
        }
        return remaining;
      });

      // Check wave complete
      if (missiles.length === 0 && !waveComplete) {
        setWaveComplete(true);
        const newWave = wave + 1;
        setWave(newWave);
        setTimeout(() => {
          spawnWave(newWave);
        }, 2000);
      }

      // Check game over
      if (!cities.some(c => c.alive)) {
        setGameOver(true);
        playSound('gameover');
        onGameOver(score);
        return;
      }

      // Draw
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw stars
      ctx.fillStyle = 'white';
      for (let i = 0; i < 50; i++) {
        const x = (i * 47) % CANVAS_WIDTH;
        const y = (i * 31) % (CANVAS_HEIGHT - 100);
        ctx.fillRect(x, y, 1, 1);
      }

      // Draw ground
      ctx.fillStyle = 'hsl(30, 50%, 25%)';
      ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);

      // Draw cities
      cities.forEach(city => {
        if (city.alive) {
          ctx.fillStyle = 'hsl(200, 70%, 50%)';
          // Building shapes
          ctx.fillRect(city.x, CANVAS_HEIGHT - 50, 15, 20);
          ctx.fillRect(city.x + 18, CANVAS_HEIGHT - 60, 12, 30);
          ctx.fillRect(city.x + 33, CANVAS_HEIGHT - 45, 10, 15);
          // Windows
          ctx.fillStyle = 'hsl(60, 100%, 70%)';
          for (let w = 0; w < 3; w++) {
            ctx.fillRect(city.x + 3, CANVAS_HEIGHT - 48 + w * 6, 3, 3);
            ctx.fillRect(city.x + 9, CANVAS_HEIGHT - 48 + w * 6, 3, 3);
          }
        } else {
          // Rubble
          ctx.fillStyle = 'hsl(0, 0%, 30%)';
          ctx.fillRect(city.x, CANVAS_HEIGHT - 35, 40, 5);
          ctx.fillRect(city.x + 5, CANVAS_HEIGHT - 38, 10, 3);
        }
      });

      // Draw missile base
      ctx.fillStyle = 'hsl(120, 50%, 40%)';
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2 - 25, CANVAS_HEIGHT - 30);
      ctx.lineTo(CANVAS_WIDTH / 2 + 25, CANVAS_HEIGHT - 30);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
      ctx.fill();

      // Draw enemy missiles
      missiles.forEach(missile => {
        // Trail
        ctx.strokeStyle = 'hsl(0, 80%, 50%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(missile.x, 0);
        ctx.lineTo(missile.x, missile.y);
        ctx.stroke();
        // Head
        ctx.fillStyle = 'hsl(0, 100%, 50%)';
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw counter missiles and explosions
      counterMissiles.forEach(cm => {
        if (cm.exploding) {
          ctx.beginPath();
          ctx.arc(cm.targetX, cm.targetY, cm.explosionRadius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${30 + cm.explosionRadius}, 100%, 50%, ${1 - cm.explosionRadius / 50})`;
          ctx.fill();
        } else {
          ctx.strokeStyle = 'hsl(120, 100%, 50%)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
          ctx.lineTo(cm.x, cm.y);
          ctx.stroke();
          ctx.fillStyle = 'hsl(120, 100%, 70%)';
          ctx.beginPath();
          ctx.arc(cm.x, cm.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`AMMO: ${ammo}`, 10, 20);
      ctx.fillText(`WAVE: ${wave}`, CANVAS_WIDTH - 70, 20);

      if (waveComplete && missiles.length === 0) {
        ctx.fillStyle = 'hsl(120, 100%, 50%)';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WAVE COMPLETE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.textAlign = 'left';
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, missiles, counterMissiles, cities, ammo, wave, waveComplete, score, onGameOver, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">DEFEND THE CITIES!</p>
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
      <p className="mt-4 text-[10px] text-muted-foreground">CLICK TO LAUNCH COUNTER-MISSILES</p>
    </div>
  );
};

export default MissileCommandGame;
