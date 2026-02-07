import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface RoadRunnerGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const PLAYER_SIZE = 20;
const CAR_HEIGHT = 30;

interface Car {
  x: number;
  y: number;
  width: number;
  speed: number;
  color: string;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

const RoadRunnerGame = ({ onScoreChange, onGameOver, isActive }: RoadRunnerGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2);
  const [playerY, setPlayerY] = useState(CANVAS_HEIGHT - 40);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  const [cars, setCars] = useState<Car[]>(() => {
    const initialCars: Car[] = [];
    for (let lane = 0; lane < 6; lane++) {
      const y = 60 + lane * 50;
      const direction = lane % 2 === 0 ? 1 : -1;
      for (let i = 0; i < 2; i++) {
        initialCars.push({
          x: Math.random() * CANVAS_WIDTH,
          y,
          width: 40 + Math.random() * 30,
          speed: (2 + Math.random() * 2) * direction,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        });
      }
    }
    return initialCars;
  });

  const [coins, setCoins] = useState<Coin[]>(() => {
    const initialCoins: Coin[] = [];
    for (let i = 0; i < 5; i++) {
      initialCoins.push({
        x: 50 + Math.random() * (CANVAS_WIDTH - 100),
        y: 80 + Math.random() * 250,
        collected: false,
      });
    }
    return initialCoins;
  });

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

  // Keyboard controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const keys: { [key: string]: boolean } = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const moveInterval = setInterval(() => {
      const speed = 5;
      if (keys['arrowup'] || keys['w']) {
        setPlayerY(prev => Math.max(0, prev - speed));
      }
      if (keys['arrowdown'] || keys['s']) {
        setPlayerY(prev => Math.min(CANVAS_HEIGHT - PLAYER_SIZE, prev + speed));
      }
      if (keys['arrowleft'] || keys['a']) {
        setPlayerX(prev => Math.max(0, prev - speed));
      }
      if (keys['arrowright'] || keys['d']) {
        setPlayerX(prev => Math.min(CANVAS_WIDTH - PLAYER_SIZE, prev + speed));
      }
    }, 16);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(moveInterval);
    };
  }, [isActive, gameOver, isStarting]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Update cars
      setCars(prevCars => prevCars.map(car => {
        let newX = car.x + car.speed;
        if (newX > CANVAS_WIDTH + car.width) newX = -car.width;
        if (newX < -car.width) newX = CANVAS_WIDTH + car.width;
        return { ...car, x: newX };
      }));

      // Check car collision
      for (const car of cars) {
        if (
          playerX < car.x + car.width &&
          playerX + PLAYER_SIZE > car.x &&
          playerY < car.y + CAR_HEIGHT &&
          playerY + PLAYER_SIZE > car.y
        ) {
          setGameOver(true);
          playSound('gameover');
          onGameOver(score);
          return;
        }
      }

      // Check coin collection
      setCoins(prevCoins => {
        const newCoins = [...prevCoins];
        let collected = false;
        newCoins.forEach((coin, i) => {
          if (!coin.collected) {
            const dist = Math.hypot(playerX + PLAYER_SIZE / 2 - coin.x, playerY + PLAYER_SIZE / 2 - coin.y);
            if (dist < 15) {
              newCoins[i] = { ...coin, collected: true };
              collected = true;
            }
          }
        });
        if (collected) {
          playSound('coin');
          const newScore = score + 50;
          setScore(newScore);
          onScoreChange(newScore);
        }
        return newCoins;
      });

      // Continuous score
      const newScore = score + 1;
      setScore(newScore);
      onScoreChange(newScore);

      // Draw
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw safe zones
      ctx.fillStyle = 'hsl(120, 40%, 20%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, 50);
      ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);

      // Draw road
      ctx.fillStyle = 'hsl(0, 0%, 15%)';
      ctx.fillRect(0, 50, CANVAS_WIDTH, CANVAS_HEIGHT - 100);

      // Draw lane markings
      for (let lane = 0; lane < 6; lane++) {
        const y = 60 + lane * 50 + 20;
        ctx.setLineDash([15, 10]);
        ctx.strokeStyle = 'hsl(60, 100%, 50%)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw cars
      cars.forEach(car => {
        ctx.fillStyle = car.color;
        ctx.fillRect(car.x, car.y, car.width, CAR_HEIGHT);
        // Wheels
        ctx.fillStyle = '#333';
        ctx.fillRect(car.x + 5, car.y - 3, 10, 6);
        ctx.fillRect(car.x + car.width - 15, car.y - 3, 10, 6);
        ctx.fillRect(car.x + 5, car.y + CAR_HEIGHT - 3, 10, 6);
        ctx.fillRect(car.x + car.width - 15, car.y + CAR_HEIGHT - 3, 10, 6);
      });

      // Draw coins
      coins.forEach(coin => {
        if (!coin.collected) {
          ctx.beginPath();
          ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = 'hsl(45, 100%, 50%)';
          ctx.fill();
          ctx.strokeStyle = 'hsl(45, 100%, 70%)';
          ctx.stroke();
        }
      });

      // Draw player
      ctx.fillStyle = 'hsl(0, 80%, 50%)';
      ctx.fillRect(playerX, playerY, PLAYER_SIZE, PLAYER_SIZE);
      ctx.fillStyle = 'hsl(0, 80%, 70%)';
      ctx.fillRect(playerX + 4, playerY + 4, 4, 4);
      ctx.fillRect(playerX + 12, playerY + 4, 4, 4);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, cars, playerX, playerY, coins, score, onGameOver, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">GET READY!</p>
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
      <p className="mt-4 text-[10px] text-muted-foreground">ARROW KEYS TO MOVE • AVOID CARS • COLLECT COINS</p>
    </div>
  );
};

export default RoadRunnerGame;
