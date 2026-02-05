import { useState, useCallback } from 'react';
import { useSound } from '@/hooks/useSound';

interface MinesweeperGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isActive: boolean;
}

const ROWS = 12;
const COLS = 12;
const MINES = 20;
const CELL = 28;

type Cell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

function createBoard(): Cell[][] {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (board[r + dr]?.[c + dc]?.mine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

const NUM_COLORS = ['', '#00ccff', '#00ff88', '#ff4444', '#0044ff', '#880000', '#008888', '#333', '#aaa'];

const MinesweeperGame = ({ onScoreChange, onGameOver, isActive }: MinesweeperGameProps) => {
  const [board, setBoard] = useState<Cell[][]>(createBoard);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const { playSound } = useSound();

  const reveal = useCallback((b: Cell[][], r: number, c: number, newScore: { val: number }) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = b[r][c];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    newScore.val += 5;
    if (cell.adjacent === 0 && !cell.mine) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          reveal(b, r + dr, c + dc, newScore);
    }
  }, []);

  const handleClick = (r: number, c: number) => {
    if (!isActive || gameOver) return;
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;

    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    
    if (newBoard[r][c].mine) {
      // Reveal all mines
      newBoard.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; }));
      setBoard(newBoard);
      setGameOver(true);
      playSound('gameover');
      onGameOver(score);
      return;
    }

    const newScore = { val: score };
    reveal(newBoard, r, c, newScore);
    setScore(newScore.val);
    onScoreChange(newScore.val);
    setBoard(newBoard);
    playSound('eat');

    // Check win
    const unrevealed = newBoard.flat().filter(c => !c.revealed && !c.mine).length;
    if (unrevealed === 0) {
      setWon(true);
      setGameOver(true);
      const finalScore = newScore.val + 200;
      setScore(finalScore);
      onScoreChange(finalScore);
      playSound('powerup');
      onGameOver(finalScore);
    }
  };

  const handleRightClick = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (!isActive || gameOver || board[r][c].revealed) return;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    newBoard[r][c].flagged = !newBoard[r][c].flagged;
    setBoard(newBoard);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="border-2 border-neon-cyan inline-grid gap-0"
        style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL}px)` }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => handleClick(r, c)}
              onContextMenu={(e) => handleRightClick(e, r, c)}
              className="flex items-center justify-center cursor-pointer select-none transition-colors"
              style={{
                width: CELL, height: CELL,
                background: cell.revealed
                  ? (cell.mine ? '#ff0033' : '#111128')
                  : '#1a1a44',
                border: '1px solid #333366',
                fontSize: 12,
                fontFamily: '"Press Start 2P"',
                color: cell.revealed && !cell.mine ? NUM_COLORS[cell.adjacent] : '#fff',
              }}
            >
              {cell.revealed && cell.mine && '💣'}
              {cell.revealed && !cell.mine && cell.adjacent > 0 && cell.adjacent}
              {!cell.revealed && cell.flagged && '🚩'}
            </div>
          ))
        )}
      </div>
      {gameOver && (
        <p className={`mt-4 text-sm ${won ? 'neon-text-green' : 'neon-text-magenta'}`}>
          {won ? 'YOU WIN!' : 'BOOM! GAME OVER'}
        </p>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">CLICK REVEAL • RIGHT-CLICK FLAG</p>
    </div>
  );
};

export default MinesweeperGame;
