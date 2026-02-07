import { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '@/hooks/useSound';

interface MemoryTilesGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

const MemoryTilesGame = ({ onScoreChange, onGameOver, isActive }: MemoryTilesGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(3);
  const [pattern, setPattern] = useState<number[]>([]);
  const [playerPattern, setPlayerPattern] = useState<number[]>([]);
  const [showingPattern, setShowingPattern] = useState(true);
  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [isStarting, setIsStarting] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const { playSound } = useSound();

  // Generate new pattern
  const generatePattern = useCallback((size: number, len: number) => {
    const newPattern: number[] = [];
    for (let i = 0; i < len; i++) {
      newPattern.push(Math.floor(Math.random() * (size * size)));
    }
    return newPattern;
  }, []);

  // Start new level
  const startLevel = useCallback((lvl: number) => {
    const size = 3 + Math.floor((lvl - 1) / 3);
    const patternLen = 3 + lvl;
    setGridSize(size);
    setPattern(generatePattern(size, patternLen));
    setPlayerPattern([]);
    setShowingPattern(true);
    setCurrentShowIndex(0);
  }, [generatePattern]);

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
      startLevel(1);
    }
  }, [isActive, isStarting, countdown, playSound, startLevel]);

  // Show pattern sequence
  useEffect(() => {
    if (!isActive || gameOver || isStarting || !showingPattern) return;

    if (currentShowIndex < pattern.length) {
      const timer = setTimeout(() => {
        playSound('blip');
        setCurrentShowIndex(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShowingPattern(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, gameOver, isStarting, showingPattern, currentShowIndex, pattern.length, playSound]);

  // Handle tile click
  useEffect(() => {
    if (!isActive || gameOver || isStarting || showingPattern) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const tileSize = 300 / gridSize;
      const startX = (CANVAS_WIDTH - 300) / 2;
      const startY = (CANVAS_HEIGHT - 300) / 2;

      const col = Math.floor((x - startX) / tileSize);
      const row = Math.floor((y - startY) / tileSize);

      if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
        const tileIndex = row * gridSize + col;
        const expectedIndex = pattern[playerPattern.length];

        if (tileIndex === expectedIndex) {
          playSound('score');
          const newPlayerPattern = [...playerPattern, tileIndex];
          setPlayerPattern(newPlayerPattern);

          // Check if pattern complete
          if (newPlayerPattern.length === pattern.length) {
            const points = level * 100;
            const newScore = score + points;
            setScore(newScore);
            onScoreChange(newScore);
            playSound('powerup');

            setTimeout(() => {
              const newLevel = level + 1;
              setLevel(newLevel);
              startLevel(newLevel);
            }, 1000);
          }
        } else {
          playSound('hit');
          const newLives = lives - 1;
          setLives(newLives);

          if (newLives <= 0) {
            setGameOver(true);
            playSound('gameover');
            onGameOver(score);
          } else {
            // Replay same level
            setTimeout(() => {
              setPlayerPattern([]);
              setShowingPattern(true);
              setCurrentShowIndex(0);
            }, 1000);
          }
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [isActive, gameOver, isStarting, showingPattern, gridSize, pattern, playerPattern, level, lives, score, onScoreChange, onGameOver, playSound, startLevel]);

  // Render
  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const tileSize = 300 / gridSize;
      const startX = (CANVAS_WIDTH - 300) / 2;
      const startY = (CANVAS_HEIGHT - 300) / 2;
      const gap = 4;

      // Draw tiles
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const tileIndex = row * gridSize + col;
          const x = startX + col * tileSize + gap / 2;
          const y = startY + row * tileSize + gap / 2;
          const size = tileSize - gap;

          // Check if this tile should be highlighted
          let isHighlighted = false;
          if (showingPattern && currentShowIndex > 0) {
            const showIndex = currentShowIndex - 1;
            if (pattern[showIndex] === tileIndex) {
              isHighlighted = true;
            }
          }

          // Check if player already selected this
          const wasSelected = playerPattern.includes(tileIndex);

          if (isHighlighted) {
            ctx.fillStyle = 'hsl(180, 100%, 50%)';
            ctx.shadowColor = 'hsl(180, 100%, 50%)';
            ctx.shadowBlur = 20;
          } else if (wasSelected) {
            ctx.fillStyle = 'hsl(120, 60%, 40%)';
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = 'hsl(240, 30%, 25%)';
            ctx.shadowBlur = 0;
          }

          ctx.fillRect(x, y, size, size);
          ctx.shadowBlur = 0;

          // Border
          ctx.strokeStyle = 'hsl(240, 30%, 40%)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, size, size);
        }
      }

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.fillText(`LEVEL: ${level}`, 10, 25);
      ctx.fillText(`LIVES: ${lives}`, CANVAS_WIDTH - 80, 25);

      // Draw progress
      if (!showingPattern && !gameOver) {
        ctx.fillStyle = 'hsl(180, 100%, 50%)';
        ctx.fillText(`${playerPattern.length}/${pattern.length}`, CANVAS_WIDTH / 2 - 20, CANVAS_HEIGHT - 20);
      }

      // Show pattern indicator
      if (showingPattern) {
        ctx.fillStyle = 'hsl(60, 100%, 50%)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MEMORIZE THE PATTERN', CANVAS_WIDTH / 2, 50);
        ctx.textAlign = 'left';
      } else if (!gameOver) {
        ctx.fillStyle = 'hsl(120, 100%, 50%)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOUR TURN - REPEAT THE PATTERN', CANVAS_WIDTH / 2, 50);
        ctx.textAlign = 'left';
      }
    };

    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, gridSize, pattern, playerPattern, showingPattern, currentShowIndex, level, lives, gameOver]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-neon-cyan cursor-pointer"
      />
      {isStarting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <p className="text-xs neon-text-cyan mb-4">MEMORY CHALLENGE!</p>
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
      <p className="mt-4 text-[10px] text-muted-foreground">WATCH THE PATTERN • CLICK TO REPEAT</p>
    </div>
  );
};

export default MemoryTilesGame;
