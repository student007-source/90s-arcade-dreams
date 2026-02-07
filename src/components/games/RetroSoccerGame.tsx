import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface RetroSoccerGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;
const PLAYER_SIZE = 20;
const BALL_SIZE = 10;
const GOAL_WIDTH = 8;
const GOAL_HEIGHT = 60;

const RetroSoccerGame = ({ onScoreChange, onGameOver, isActive }: RetroSoccerGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [enemyScore, setEnemyScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerX, setPlayerX] = useState(100);
  const [playerY, setPlayerY] = useState(CANVAS_HEIGHT / 2);
  const [ballX, setBallX] = useState(CANVAS_WIDTH / 2);
  const [ballY, setBallY] = useState(CANVAS_HEIGHT / 2);
  const [ballVx, setBallVx] = useState(0);
  const [ballVy, setBallVy] = useState(0);
  const [enemyX, setEnemyX] = useState(300);
  const [enemyY, setEnemyY] = useState(CANVAS_HEIGHT / 2);
  const [time, setTime] = useState(90);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
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

  // Game timer
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const timer = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          setGameOver(true);
          playSound('whistle');
          const finalScore = playerScore * 100 - enemyScore * 50;
          onGameOver(Math.max(0, finalScore));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, gameOver, isStarting, playerScore, enemyScore, onGameOver, playSound]);

  // Keyboard controls
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
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
  }, [isActive, gameOver, isStarting]);

  // Reset ball
  const resetBall = () => {
    setBallX(CANVAS_WIDTH / 2);
    setBallY(CANVAS_HEIGHT / 2);
    setBallVx((Math.random() - 0.5) * 4);
    setBallVy((Math.random() - 0.5) * 2);
  };

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isStarting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Player movement
      const speed = 4;
      if (keysRef.current['arrowup'] || keysRef.current['w']) {
        setPlayerY(prev => Math.max(PLAYER_SIZE, prev - speed));
      }
      if (keysRef.current['arrowdown'] || keysRef.current['s']) {
        setPlayerY(prev => Math.min(CANVAS_HEIGHT - PLAYER_SIZE, prev + speed));
      }
      if (keysRef.current['arrowleft'] || keysRef.current['a']) {
        setPlayerX(prev => Math.max(PLAYER_SIZE, prev - speed));
      }
      if (keysRef.current['arrowright'] || keysRef.current['d']) {
        setPlayerX(prev => Math.min(CANVAS_WIDTH / 2 - PLAYER_SIZE, prev + speed));
      }

      // Ball physics
      setBallX(prev => prev + ballVx);
      setBallY(prev => prev + ballVy);
      setBallVx(prev => prev * 0.99);
      setBallVy(prev => prev * 0.99);

      // Ball wall bounce
      if (ballY < BALL_SIZE || ballY > CANVAS_HEIGHT - BALL_SIZE) {
        setBallVy(prev => -prev);
        playSound('hit');
      }

      // Player-ball collision
      const playerDist = Math.hypot(ballX - playerX, ballY - playerY);
      if (playerDist < PLAYER_SIZE + BALL_SIZE) {
        const angle = Math.atan2(ballY - playerY, ballX - playerX);
        setBallVx(Math.cos(angle) * 6);
        setBallVy(Math.sin(angle) * 6);
        playSound('hit');
      }

      // Enemy AI
      const enemySpeed = 2;
      if (ballY < enemyY - 10) {
        setEnemyY(prev => prev - enemySpeed);
      } else if (ballY > enemyY + 10) {
        setEnemyY(prev => prev + enemySpeed);
      }
      
      // Enemy moves toward ball when ball is on their side
      if (ballX > CANVAS_WIDTH / 2) {
        if (ballX < enemyX - 20) {
          setEnemyX(prev => Math.max(CANVAS_WIDTH / 2 + PLAYER_SIZE, prev - enemySpeed));
        } else if (ballX > enemyX + 20) {
          setEnemyX(prev => Math.min(CANVAS_WIDTH - PLAYER_SIZE - 20, prev + enemySpeed));
        }
      } else {
        // Return to defensive position
        setEnemyX(prev => prev + (300 - prev) * 0.05);
      }

      // Enemy-ball collision
      const enemyDist = Math.hypot(ballX - enemyX, ballY - enemyY);
      if (enemyDist < PLAYER_SIZE + BALL_SIZE) {
        const angle = Math.atan2(ballY - enemyY, ballX - enemyX);
        setBallVx(Math.cos(angle) * 5);
        setBallVy(Math.sin(angle) * 5);
        playSound('hit');
      }

      // Goal check
      const goalTop = CANVAS_HEIGHT / 2 - GOAL_HEIGHT / 2;
      const goalBottom = CANVAS_HEIGHT / 2 + GOAL_HEIGHT / 2;

      // Player scores (ball in right goal)
      if (ballX > CANVAS_WIDTH - GOAL_WIDTH && ballY > goalTop && ballY < goalBottom) {
        playSound('score');
        setPlayerScore(prev => prev + 1);
        const newScore = score + 100;
        setScore(newScore);
        onScoreChange(newScore);
        resetBall();
      }

      // Enemy scores (ball in left goal)
      if (ballX < GOAL_WIDTH && ballY > goalTop && ballY < goalBottom) {
        playSound('hit');
        setEnemyScore(prev => prev + 1);
        resetBall();
      }

      // Ball out of bounds (not goal)
      if (ballX < 0 || ballX > CANVAS_WIDTH) {
        resetBall();
      }

      // Draw
      // Field
      ctx.fillStyle = 'hsl(120, 50%, 25%)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Field lines
      ctx.strokeStyle = 'hsla(0, 0%, 100%, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40, 0, Math.PI * 2);
      ctx.stroke();

      // Goals
      ctx.fillStyle = 'hsl(0, 0%, 90%)';
      ctx.fillRect(0, goalTop, GOAL_WIDTH, GOAL_HEIGHT);
      ctx.fillRect(CANVAS_WIDTH - GOAL_WIDTH, goalTop, GOAL_WIDTH, GOAL_HEIGHT);

      // Player
      ctx.fillStyle = 'hsl(200, 80%, 50%)';
      ctx.beginPath();
      ctx.arc(playerX, playerY, PLAYER_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('P', playerX, playerY + 4);

      // Enemy
      ctx.fillStyle = 'hsl(0, 80%, 50%)';
      ctx.beginPath();
      ctx.arc(enemyX, enemyY, PLAYER_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.fillText('E', enemyX, enemyY + 4);
      ctx.textAlign = 'left';

      // Ball
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(ballX, ballY, BALL_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Score board
      ctx.fillStyle = 'hsla(0, 0%, 0%, 0.7)';
      ctx.fillRect(CANVAS_WIDTH / 2 - 60, 5, 120, 25);
      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${playerScore} - ${enemyScore}`, CANVAS_WIDTH / 2, 22);

      // Timer
      ctx.fillText(`${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
      ctx.textAlign = 'left';

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gameOver, isStarting, playerX, playerY, ballX, ballY, ballVx, ballVy, enemyX, enemyY, playerScore, enemyScore, time, score, onScoreChange, playSound]);

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
          <p className="text-xs neon-text-cyan mb-4">KICK OFF!</p>
          <p className="text-4xl neon-text-green animate-pulse">
            {countdown > 0 ? countdown : 'GO!'}
          </p>
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xl neon-text-magenta mb-4">
            {playerScore > enemyScore ? 'YOU WIN!' : playerScore < enemyScore ? 'YOU LOSE!' : 'DRAW!'}
          </p>
          <p className="text-sm neon-text-cyan">FINAL: {playerScore} - {enemyScore}</p>
        </div>
      )}
      <p className="mt-4 text-[10px] text-muted-foreground">ARROW KEYS TO MOVE • BUMP THE BALL TO SCORE</p>
    </div>
  );
};

export default RetroSoccerGame;
