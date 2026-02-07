import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface BubblePopperGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 450;
const BUBBLE_RADIUS = 15;
const COLORS = ['hsl(0, 80%, 50%)', 'hsl(60, 80%, 50%)', 'hsl(120, 80%, 50%)', 'hsl(240, 80%, 50%)', 'hsl(300, 80%, 50%)'];
const COLS = 13;
const ROWS = 10;

interface Bubble {
  x: number;
  y: number;
  color: string;
  popping?: boolean;
}

const BubblePopperGame = ({ onScoreChange, onGameOver, isActive }: BubblePopperGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
  const [currentBubble, setCurrentBubble] = useState<{ x: number; y: number; color: string; vx: number; vy: number } | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  const [bubbles, setBubbles] = useState<(Bubble | null)[][]>(() => {
    const grid: (Bubble | null)[][] = [];
    for (let row = 0; row < ROWS; row++) {
      const rowBubbles: (Bubble | null)[] = [];
      const offset = row % 2 === 0 ? 0 : BUBBLE_RADIUS;
      for (let col = 0; col < COLS; col++) {
        if (row < 5) {
          rowBubbles.push({
            x: col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + offset,
            y: row * BUBBLE_RADIUS * 1.7 + BUBBLE_RADIUS,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
          });
        } else {
          rowBubbles.push(null);
        }
      }
      grid.push(rowBubbles);
    }
    return grid;
  });

  const [shooterColor, setShooterColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);

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

  // Mouse/touch aiming
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const shooterX = CANVAS_WIDTH / 2;
      const shooterY = CANVAS_HEIGHT - 20;
      const angle = Math.atan2(y - shooterY, x - shooterX);
      setAimAngle(Math.max(-Math.PI + 0.1, Math.min(-0.1, angle)));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [isActive, gameOver, isStarting]);

  // Shooting
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = () => {
      if (currentBubble) return;
      playSound('shoot');
      const speed = 10;
      setCurrentBubble({
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 40,
        color: shooterColor,
        vx: Math.cos(aimAngle) * speed,
        vy: Math.sin(aimAngle) * speed,
      });
      setShooterColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [isActive, gameOver, isStarting, currentBubble, aimAngle, shooterColor, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Update shooting bubble
      if (currentBubble) {
        let newX = currentBubble.x + currentBubble.vx;
        let newY = currentBubble.y + currentBubble.vy;
        let newVx = currentBubble.vx;

        // Wall bounce
        if (newX < BUBBLE_RADIUS || newX > CANVAS_WIDTH - BUBBLE_RADIUS) {
          newVx = -newVx;
          newX = Math.max(BUBBLE_RADIUS, Math.min(CANVAS_WIDTH - BUBBLE_RADIUS, newX));
        }

        // Check collision with bubbles
        let collided = false;
        for (let row = 0; row < bubbles.length; row++) {
          for (let col = 0; col < bubbles[row].length; col++) {
            const bubble = bubbles[row][col];
            if (bubble) {
              const dist = Math.hypot(newX - bubble.x, newY - bubble.y);
              if (dist < BUBBLE_RADIUS * 2) {
                collided = true;
                // Snap to grid
                const offset = row % 2 === 0 ? 0 : BUBBLE_RADIUS;
                const snapCol = Math.round((newX - BUBBLE_RADIUS - offset) / (BUBBLE_RADIUS * 2));
                const snapRow = Math.round((newY - BUBBLE_RADIUS) / (BUBBLE_RADIUS * 1.7));
                const clampedRow = Math.max(0, Math.min(ROWS - 1, snapRow));
                const clampedCol = Math.max(0, Math.min(COLS - 1, snapCol));

                if (!bubbles[clampedRow][clampedCol]) {
                  const newBubbles = [...bubbles];
                  const newRowOffset = clampedRow % 2 === 0 ? 0 : BUBBLE_RADIUS;
                  newBubbles[clampedRow] = [...newBubbles[clampedRow]];
                  newBubbles[clampedRow][clampedCol] = {
                    x: clampedCol * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + newRowOffset,
                    y: clampedRow * BUBBLE_RADIUS * 1.7 + BUBBLE_RADIUS,
                    color: currentBubble.color,
                  };
                  setBubbles(newBubbles);
                  playSound('pop');

                  // Check for matches (simplified - just check adjacent)
                  const toRemove: [number, number][] = [];
                  const checkColor = currentBubble.color;
                  const checked = new Set<string>();

                  const floodFill = (r: number, c: number) => {
                    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
                    const key = `${r},${c}`;
                    if (checked.has(key)) return;
                    checked.add(key);
                    const b = newBubbles[r][c];
                    if (!b || b.color !== checkColor) return;
                    toRemove.push([r, c]);
                    floodFill(r - 1, c);
                    floodFill(r + 1, c);
                    floodFill(r, c - 1);
                    floodFill(r, c + 1);
                    if (r % 2 === 0) {
                      floodFill(r - 1, c - 1);
                      floodFill(r + 1, c - 1);
                    } else {
                      floodFill(r - 1, c + 1);
                      floodFill(r + 1, c + 1);
                    }
                  };

                  floodFill(clampedRow, clampedCol);

                  if (toRemove.length >= 3) {
                    const updatedBubbles = [...newBubbles];
                    toRemove.forEach(([r, c]) => {
                      updatedBubbles[r] = [...updatedBubbles[r]];
                      updatedBubbles[r][c] = null;
                    });
                    setBubbles(updatedBubbles);
                    const points = toRemove.length * 10;
                    const newScore = score + points;
                    setScore(newScore);
                    onScoreChange(newScore);
                    playSound('score');
                  }
                }
                setCurrentBubble(null);
                break;
              }
            }
          }
          if (collided) break;
        }

        // Top wall
        if (!collided && newY < BUBBLE_RADIUS) {
          const offset = 0;
          const snapCol = Math.round((newX - BUBBLE_RADIUS - offset) / (BUBBLE_RADIUS * 2));
          const clampedCol = Math.max(0, Math.min(COLS - 1, snapCol));
          if (!bubbles[0][clampedCol]) {
            const newBubbles = [...bubbles];
            newBubbles[0] = [...newBubbles[0]];
            newBubbles[0][clampedCol] = {
              x: clampedCol * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS,
              y: BUBBLE_RADIUS,
              color: currentBubble.color,
            };
            setBubbles(newBubbles);
            playSound('pop');
          }
          setCurrentBubble(null);
          collided = true;
        }

        if (!collided) {
          setCurrentBubble({ ...currentBubble, x: newX, y: newY, vx: newVx });
        }
      }

      // Check game over (bubbles too low)
      for (const row of bubbles) {
        for (const bubble of row) {
          if (bubble && bubble.y > CANVAS_HEIGHT - 80) {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
            return;
          }
        }
      }

      // Draw
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw bubbles
      bubbles.forEach(row => {
        row.forEach(bubble => {
          if (bubble) {
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
            ctx.fillStyle = bubble.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.stroke();
          }
        });
      });

      // Draw current bubble
      if (currentBubble) {
        ctx.beginPath();
        ctx.arc(currentBubble.x, currentBubble.y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
        ctx.fillStyle = currentBubble.color;
        ctx.fill();
      }

      // Draw shooter
      const shooterX = CANVAS_WIDTH / 2;
      const shooterY = CANVAS_HEIGHT - 20;
      
      // Aim line
      ctx.beginPath();
      ctx.moveTo(shooterX, shooterY);
      ctx.lineTo(shooterX + Math.cos(aimAngle) * 60, shooterY + Math.sin(aimAngle) * 60);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Shooter bubble
      ctx.beginPath();
      ctx.arc(shooterX, shooterY, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = shooterColor;
      ctx.fill();

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, bubbles, currentBubble, aimAngle, shooterColor, score, onGameOver, playSound, onScoreChange]);

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
      <p className="mt-4 text-[10px] text-muted-foreground">MOUSE TO AIM • CLICK TO SHOOT</p>
    </div>
  );
};

export default BubblePopperGame;
