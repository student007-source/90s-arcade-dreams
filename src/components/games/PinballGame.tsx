import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface PinballGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 500;
const BALL_RADIUS = 8;

interface Bumper {
  x: number;
  y: number;
  radius: number;
  points: number;
  color: string;
}

const PinballGame = ({ onScoreChange, onGameOver, isActive }: PinballGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [balls, setBalls] = useState(3);
  const [ballX, setBallX] = useState(CANVAS_WIDTH - 30);
  const [ballY, setBallY] = useState(CANVAS_HEIGHT - 100);
  const [ballVx, setBallVx] = useState(0);
  const [ballVy, setBallVy] = useState(0);
  const [leftFlipper, setLeftFlipper] = useState(0);
  const [rightFlipper, setRightFlipper] = useState(0);
  const [launched, setLaunched] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  const bumpers: Bumper[] = [
    { x: 100, y: 150, radius: 25, points: 100, color: 'hsl(0, 80%, 50%)' },
    { x: 250, y: 150, radius: 25, points: 100, color: 'hsl(240, 80%, 50%)' },
    { x: 175, y: 220, radius: 30, points: 200, color: 'hsl(60, 80%, 50%)' },
    { x: 80, y: 280, radius: 20, points: 50, color: 'hsl(300, 80%, 50%)' },
    { x: 270, y: 280, radius: 20, points: 50, color: 'hsl(120, 80%, 50%)' },
  ];

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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'z' || e.key === 'Z') {
        setLeftFlipper(-0.5);
        playSound('hit');
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === '/' || e.key === 'm' || e.key === 'M') {
        setRightFlipper(0.5);
        playSound('hit');
      }
      if (e.key === ' ' && !launched) {
        setBallVy(-15);
        setBallVx(-2 + Math.random() * 4);
        setLaunched(true);
        playSound('powerup');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'z' || e.key === 'Z') {
        setLeftFlipper(0);
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === '/' || e.key === 'm' || e.key === 'M') {
        setRightFlipper(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, gameOver, isStarting, launched, playSound]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const gravity = 0.15;

    const gameLoop = () => {
      if (launched) {
        // Apply gravity
        setBallVy(prev => prev + gravity);

        // Update position
        setBallX(prev => {
          let newX = prev + ballVx;
          // Wall bounce
          if (newX < BALL_RADIUS + 20) {
            newX = BALL_RADIUS + 20;
            setBallVx(Math.abs(ballVx) * 0.8);
            playSound('hit');
          }
          if (newX > CANVAS_WIDTH - BALL_RADIUS - 20) {
            newX = CANVAS_WIDTH - BALL_RADIUS - 20;
            setBallVx(-Math.abs(ballVx) * 0.8);
            playSound('hit');
          }
          return newX;
        });

        setBallY(prev => {
          let newY = prev + ballVy;
          // Top bounce
          if (newY < BALL_RADIUS) {
            newY = BALL_RADIUS;
            setBallVy(Math.abs(ballVy) * 0.8);
            playSound('hit');
          }
          return newY;
        });

        // Bumper collision
        bumpers.forEach(bumper => {
          const dist = Math.hypot(ballX - bumper.x, ballY - bumper.y);
          if (dist < bumper.radius + BALL_RADIUS) {
            const angle = Math.atan2(ballY - bumper.y, ballX - bumper.x);
            setBallVx(Math.cos(angle) * 8);
            setBallVy(Math.sin(angle) * 8);
            const newScore = score + bumper.points;
            setScore(newScore);
            onScoreChange(newScore);
            playSound('score');
          }
        });

        // Flipper collision (simplified)
        const flipperY = CANVAS_HEIGHT - 80;
        const leftFlipperX = 80;
        const rightFlipperX = CANVAS_WIDTH - 80;
        const flipperWidth = 60;

        // Left flipper
        if (ballY > flipperY - 10 && ballY < flipperY + 10 &&
            ballX > leftFlipperX - 10 && ballX < leftFlipperX + flipperWidth) {
          if (leftFlipper < 0) {
            setBallVy(-12);
            setBallVx(-3 + (ballX - leftFlipperX) / flipperWidth * 6);
            playSound('hit');
          }
        }

        // Right flipper
        if (ballY > flipperY - 10 && ballY < flipperY + 10 &&
            ballX > rightFlipperX - flipperWidth && ballX < rightFlipperX + 10) {
          if (rightFlipper > 0) {
            setBallVy(-12);
            setBallVx(-3 + (ballX - (rightFlipperX - flipperWidth)) / flipperWidth * 6);
            playSound('hit');
          }
        }

        // Ball lost
        if (ballY > CANVAS_HEIGHT + BALL_RADIUS) {
          const newBalls = balls - 1;
          setBalls(newBalls);
          if (newBalls <= 0) {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
          } else {
            playSound('hit');
            setBallX(CANVAS_WIDTH - 30);
            setBallY(CANVAS_HEIGHT - 100);
            setBallVx(0);
            setBallVy(0);
            setLaunched(false);
          }
        }
      }

      // Draw
      ctx.fillStyle = 'hsl(240, 30%, 10%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw walls
      ctx.fillStyle = 'hsl(30, 50%, 30%)';
      ctx.fillRect(0, 0, 20, CANVAS_HEIGHT);
      ctx.fillRect(CANVAS_WIDTH - 20, 0, 20, CANVAS_HEIGHT);
      ctx.fillRect(0, 0, CANVAS_WIDTH, 20);

      // Draw launch lane
      ctx.fillStyle = 'hsl(0, 0%, 20%)';
      ctx.fillRect(CANVAS_WIDTH - 45, 100, 25, CANVAS_HEIGHT - 100);

      // Draw bumpers
      bumpers.forEach(bumper => {
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
        ctx.fillStyle = bumper.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Points text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bumper.points.toString(), bumper.x, bumper.y + 4);
      });

      // Draw flippers
      const flipperY = CANVAS_HEIGHT - 80;
      
      ctx.save();
      ctx.translate(80, flipperY);
      ctx.rotate(leftFlipper);
      ctx.fillStyle = 'hsl(200, 80%, 50%)';
      ctx.fillRect(0, -8, 60, 16);
      ctx.restore();

      ctx.save();
      ctx.translate(CANVAS_WIDTH - 80, flipperY);
      ctx.rotate(rightFlipper);
      ctx.fillStyle = 'hsl(200, 80%, 50%)';
      ctx.fillRect(-60, -8, 60, 16);
      ctx.restore();

      // Draw ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(0, 0%, 85%)';
      ctx.fill();
      ctx.strokeStyle = 'hsl(0, 0%, 60%)';
      ctx.stroke();

      // Draw score and balls
      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BALLS: ${balls}`, 30, 40);

      // Launch instruction
      if (!launched) {
        ctx.fillStyle = 'hsl(60, 100%, 50%)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS SPACE', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
        ctx.fillText('TO LAUNCH', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 18);
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, ballX, ballY, ballVx, ballVy, launched, leftFlipper, rightFlipper, bumpers, balls, score, onGameOver, onScoreChange, playSound]);

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
      <p className="mt-2 text-[10px] text-muted-foreground">Z/LEFT = LEFT FLIPPER • M/RIGHT = RIGHT FLIPPER • SPACE = LAUNCH</p>
    </div>
  );
};

export default PinballGame;
