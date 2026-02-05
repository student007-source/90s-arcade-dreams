import { useState, useCallback } from 'react';
import PressStart from '@/components/PressStart';
import CRTOverlay from '@/components/CRTOverlay';
import SoundControls from '@/components/SoundControls';
import Header from '@/components/Header';
import GameCard, { GameInfo } from '@/components/GameCard';
import InstructionCard from '@/components/InstructionCard';
import InsertCoin from '@/components/InsertCoin';
import GameFrame from '@/components/GameFrame';
import HighScoreEntry from '@/components/HighScoreEntry';
import { GAMES } from '@/data/games';
import { useHighScores } from '@/hooks/useHighScores';

// Game components
import SnakeGame from '@/components/games/SnakeGame';
import TetrisGame from '@/components/games/TetrisGame';
import PongGame from '@/components/games/PongGame';

type GameState = 'start' | 'menu' | 'instructions' | 'inserting' | 'playing' | 'gameover';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const { isHighScore, saveScore } = useHighScores(selectedGame?.id || '');

  const handleStart = () => {
    setGameState('menu');
  };

  const handleGameSelect = (game: GameInfo) => {
    setSelectedGame(game);
    setGameState('instructions');
  };

  const handlePlay = () => {
    setGameState('inserting');
  };

  const handleInsertComplete = () => {
    setCurrentScore(0);
    setGameState('playing');
  };

  const handleScoreChange = useCallback((score: number) => {
    setCurrentScore(score);
  }, []);

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    if (isHighScore(score)) {
      setGameState('gameover');
    } else {
      setGameState('menu');
    }
  }, [isHighScore]);

  const handleHighScoreSubmit = (name: string) => {
    saveScore(name, finalScore);
    setGameState('menu');
  };

  const handleCloseGame = () => {
    setGameState('menu');
    setSelectedGame(null);
    setCurrentScore(0);
  };

  const handleRestart = () => {
    setCurrentScore(0);
    // Re-trigger the playing state to reset game
    setGameState('menu');
    setTimeout(() => {
      setGameState('inserting');
    }, 100);
  };

  const handleShowInstructions = () => {
    setGameState('instructions');
  };

  const renderGame = () => {
    if (!selectedGame) return null;

    const gameProps = {
      onScoreChange: handleScoreChange,
      onGameOver: handleGameOver,
      isActive: gameState === 'playing',
    };

    switch (selectedGame.id) {
      case 'snake':
        return <SnakeGame {...gameProps} />;
      case 'tetris':
        return <TetrisGame {...gameProps} />;
      case 'pong':
        return <PongGame {...gameProps} />;
      default:
        return (
          <div className="text-center p-8">
            <p className="text-xl neon-text-yellow mb-4">COMING SOON</p>
            <p className="text-sm text-muted-foreground">
              {selectedGame.title} is under construction.
            </p>
            <button 
              onClick={handleCloseGame}
              className="arcade-btn mt-4 text-xs"
            >
              BACK TO MENU
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background crt-screen">
      <CRTOverlay />
      
      {/* Press Start Screen */}
      {gameState === 'start' && <PressStart onStart={handleStart} />}

      {/* Main Menu */}
      {gameState === 'menu' && (
        <div className="container mx-auto px-4 pb-24">
          <Header />
          
          {/* Game Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8">
            {GAMES.map((game, index) => (
              <GameCard
                key={game.id}
                game={game}
                onSelect={handleGameSelect}
                index={index}
              />
            ))}
          </div>

          {/* Footer */}
          <footer className="mt-12 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              ↑ ↑ ↓ ↓ ← → ← → B A
            </p>
            <p className="text-[10px] text-muted-foreground">
              © 2024 RETRO ARCADE • ALL RIGHTS RESERVED
            </p>
          </footer>
        </div>
      )}

      {/* Instruction Card */}
      {gameState === 'instructions' && selectedGame && (
        <InstructionCard
          game={selectedGame}
          onClose={() => setGameState('menu')}
          onPlay={handlePlay}
        />
      )}

      {/* Insert Coin Animation */}
      {gameState === 'inserting' && selectedGame && (
        <InsertCoin
          gameName={selectedGame.title}
          onComplete={handleInsertComplete}
        />
      )}

      {/* Game Playing */}
      {gameState === 'playing' && selectedGame && (
        <GameFrame
          gameName={selectedGame.title}
          score={currentScore}
          onClose={handleCloseGame}
          onRestart={handleRestart}
          onShowInstructions={handleShowInstructions}
        >
          {renderGame()}
        </GameFrame>
      )}

      {/* High Score Entry */}
      {gameState === 'gameover' && (
        <HighScoreEntry
          score={finalScore}
          onSubmit={handleHighScoreSubmit}
          onSkip={() => setGameState('menu')}
        />
      )}

      {/* Sound Controls */}
      {gameState !== 'start' && <SoundControls />}
    </div>
  );
};

export default Index;
