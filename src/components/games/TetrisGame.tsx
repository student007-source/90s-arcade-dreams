import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface TetrisGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 20;

const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: 'hsl(180 100% 50%)' },
  O: { shape: [[1, 1], [1, 1]], color: 'hsl(60 100% 50%)' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'hsl(300 100% 50%)' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'hsl(120 100% 50%)' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'hsl(0 100% 50%)' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'hsl(240 100% 60%)' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'hsl(30 100% 50%)' },
};

type TetrominoType = keyof typeof TETROMINOES;
type Board = (string | null)[][];

const TetrisGame = ({ onScoreChange, onGameOver, isActive }: TetrisGameProps) => {
  const [board, setBoard] = useState<Board>(() => 
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<{
    type: TetrominoType;
    shape: number[][];
    x: number;
    y: number;
  } | null>(null);
  const [nextPiece, setNextPiece] = useState<TetrominoType>('T');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const { playSound } = useSound();
  const gameLoopRef = useRef<number | null>(null);

  const getRandomPiece = (): TetrominoType => {
    const pieces = Object.keys(TETROMINOES) as TetrominoType[];
    return pieces[Math.floor(Math.random() * pieces.length)];
  };

  const spawnPiece = useCallback(() => {
    const type = nextPiece;
    const shape = TETROMINOES[type].shape;
    setCurrentPiece({
      type,
      shape,
      x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
      y: 0,
    });
    setNextPiece(getRandomPiece());
  }, [nextPiece]);

  const checkCollision = useCallback((shape: number[][], x: number, y: number, board: Board): boolean => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
          if (newY >= 0 && board[newY][newX]) return true;
        }
      }
    }
    return false;
  }, []);

  const rotatePiece = useCallback((shape: number[][]): number[][] => {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated: number[][] = [];
    for (let col = 0; col < cols; col++) {
      const newRow: number[] = [];
      for (let row = rows - 1; row >= 0; row--) {
        newRow.push(shape[row][col]);
      }
      rotated.push(newRow);
    }
    return rotated;
  }, []);

  const mergePieceToBoard = useCallback(() => {
    if (!currentPiece) return;

    const newBoard = board.map(row => [...row]);
    const color = TETROMINOES[currentPiece.type].color;

    for (let row = 0; row < currentPiece.shape.length; row++) {
      for (let col = 0; col < currentPiece.shape[row].length; col++) {
        if (currentPiece.shape[row][col]) {
          const y = currentPiece.y + row;
          const x = currentPiece.x + col;
          if (y >= 0) {
            newBoard[y][x] = color;
          }
        }
      }
    }

    // Check for completed lines
    let linesCleared = 0;
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (newBoard[row].every(cell => cell !== null)) {
        newBoard.splice(row, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(null));
        linesCleared++;
        row++;
      }
    }

    if (linesCleared > 0) {
      playSound('score');
      const points = [0, 100, 300, 500, 800][linesCleared] * level;
      const newScore = score + points;
      const newLines = lines + linesCleared;
      setScore(newScore);
      setLines(newLines);
      setLevel(Math.floor(newLines / 10) + 1);
      onScoreChange(newScore);
    }

    setBoard(newBoard);
    setCurrentPiece(null);
  }, [currentPiece, board, level, score, lines, onScoreChange, playSound]);

  const moveDown = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;

    if (checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1, board)) {
      if (currentPiece.y <= 0) {
        setGameOver(true);
        playSound('gameover');
        onGameOver(score);
        return;
      }
      mergePieceToBoard();
    } else {
      setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
    }
  }, [currentPiece, board, gameOver, isPaused, checkCollision, mergePieceToBoard, score, onGameOver, playSound]);

  // Spawn initial piece
  useEffect(() => {
    if (!currentPiece && !gameOver && isActive) {
      spawnPiece();
    }
  }, [currentPiece, gameOver, isActive, spawnPiece]);

  // Game loop
  useEffect(() => {
    if (!isActive || gameOver || isPaused) return;

    const speed = Math.max(100, 800 - (level - 1) * 50);
    gameLoopRef.current = window.setInterval(moveDown, speed);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isActive, gameOver, isPaused, level, moveDown]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || gameOver || !currentPiece) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (!checkCollision(currentPiece.shape, currentPiece.x - 1, currentPiece.y, board)) {
            playSound('move');
            setCurrentPiece(prev => prev ? { ...prev, x: prev.x - 1 } : null);
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (!checkCollision(currentPiece.shape, currentPiece.x + 1, currentPiece.y, board)) {
            playSound('move');
            setCurrentPiece(prev => prev ? { ...prev, x: prev.x + 1 } : null);
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          moveDown();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          const rotated = rotatePiece(currentPiece.shape);
          if (!checkCollision(rotated, currentPiece.x, currentPiece.y, board)) {
            playSound('select');
            setCurrentPiece(prev => prev ? { ...prev, shape: rotated } : null);
          }
          break;
        case ' ':
          // Hard drop
          let dropY = currentPiece.y;
          while (!checkCollision(currentPiece.shape, currentPiece.x, dropY + 1, board)) {
            dropY++;
          }
          setCurrentPiece(prev => prev ? { ...prev, y: dropY } : null);
          break;
        case 'p':
        case 'P':
          setIsPaused(p => !p);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, gameOver, currentPiece, board, checkCollision, rotatePiece, moveDown, playSound]);

  const resetGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)));
    setCurrentPiece(null);
    setNextPiece(getRandomPiece());
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setIsPaused(false);
    onScoreChange(0);
  };

  return (
    <div className="flex gap-4">
      {/* Main game board */}
      <div
        className="relative border-2 border-neon-cyan"
        style={{
          width: BOARD_WIDTH * CELL_SIZE,
          height: BOARD_HEIGHT * CELL_SIZE,
          background: 'hsl(270 50% 5%)',
        }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(180 100% 50%) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(180 100% 50%) 1px, transparent 1px)
            `,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        />

        {/* Board cells */}
        {board.map((row, y) =>
          row.map((cell, x) =>
            cell && (
              <div
                key={`${x}-${y}`}
                className="absolute"
                style={{
                  left: x * CELL_SIZE + 1,
                  top: y * CELL_SIZE + 1,
                  width: CELL_SIZE - 2,
                  height: CELL_SIZE - 2,
                  background: cell,
                  boxShadow: `0 0 5px ${cell}`,
                }}
              />
            )
          )
        )}

        {/* Current piece */}
        {currentPiece &&
          currentPiece.shape.map((row, dy) =>
            row.map((cell, dx) =>
              cell ? (
                <div
                  key={`piece-${dx}-${dy}`}
                  className="absolute"
                  style={{
                    left: (currentPiece.x + dx) * CELL_SIZE + 1,
                    top: (currentPiece.y + dy) * CELL_SIZE + 1,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    background: TETROMINOES[currentPiece.type].color,
                    boxShadow: `0 0 10px ${TETROMINOES[currentPiece.type].color}`,
                  }}
                />
              ) : null
            )
          )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            <p className="text-lg neon-text-magenta mb-2">GAME OVER</p>
            <button onClick={resetGame} className="arcade-btn arcade-btn-green text-[10px]">
              PLAY AGAIN
            </button>
          </div>
        )}

        {isPaused && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-lg neon-text-yellow animate-blink">PAUSED</p>
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-4">
        {/* Next piece */}
        <div className="arcade-cabinet p-3">
          <p className="text-[8px] neon-text-cyan mb-2">NEXT</p>
          <div className="w-16 h-16 bg-background flex items-center justify-center">
            {TETROMINOES[nextPiece].shape.map((row, y) => (
              <div key={y} className="flex">
                {row.map((cell, x) => (
                  <div
                    key={x}
                    className="w-3 h-3"
                    style={{
                      background: cell ? TETROMINOES[nextPiece].color : 'transparent',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="arcade-cabinet p-3 text-[10px]">
          <p className="text-muted-foreground">LEVEL</p>
          <p className="neon-text-green">{level}</p>
          <p className="text-muted-foreground mt-2">LINES</p>
          <p className="neon-text-magenta">{lines}</p>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;
