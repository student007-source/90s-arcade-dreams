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
import SpaceShooterGame from '@/components/games/SpaceShooterGame';
import BrickBreakerGame from '@/components/games/BrickBreakerGame';
import MazeRunnerGame from '@/components/games/MazeRunnerGame';
import MinesweeperGame from '@/components/games/MinesweeperGame';
import AsteroidsGame from '@/components/games/AsteroidsGame';
import PixelRacingGame from '@/components/games/PixelRacingGame';
import PlatformerGame from '@/components/games/PlatformerGame';
import TypingInvadersGame from '@/components/games/TypingInvadersGame';
import FlappyPixelGame from '@/components/games/FlappyPixelGame';
import FrogHopperGame from '@/components/games/FrogHopperGame';
import BubblePopperGame from '@/components/games/BubblePopperGame';
import RoadRunnerGame from '@/components/games/RoadRunnerGame';
import TankDuelGame from '@/components/games/TankDuelGame';
import PinballGame from '@/components/games/PinballGame';
import BreakoutDefenseGame from '@/components/games/BreakoutDefenseGame';
import DonkeyJumpGame from '@/components/games/DonkeyJumpGame';
import PixelBomberGame from '@/components/games/PixelBomberGame';
import MissileCommandGame from '@/components/games/MissileCommandGame';
import RiverRaidGame from '@/components/games/RiverRaidGame';
import SpaceDefenderGame from '@/components/games/SpaceDefenderGame';
import PixelBoxingGame from '@/components/games/PixelBoxingGame';
import MemoryTilesGame from '@/components/games/MemoryTilesGame';
import LaserGridGame from '@/components/games/LaserGridGame';
import RetroSoccerGame from '@/components/games/RetroSoccerGame';
import EndlessRunnerGame from '@/components/games/EndlessRunnerGame';
import SkyClimberGame from '@/components/games/SkyClimberGame';
import ArcadeFishingGame from '@/components/games/ArcadeFishingGame';
import TowerDefenseGame from '@/components/games/TowerDefenseGame';
import PacManGame from '@/components/games/PacManGame';

type GameState = 'start' | 'menu' | 'instructions' | 'inserting' | 'playing' | 'gameover';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const { isHighScore, saveScore } = useHighScores(selectedGame?.id || '');

  const handleStart = () => setGameState('menu');
  const handleGameSelect = (game: GameInfo) => { setSelectedGame(game); setGameState('instructions'); };
  const handlePlay = () => setGameState('inserting');
  const handleInsertComplete = () => { setCurrentScore(0); setGameState('playing'); };
  const handleScoreChange = useCallback((score: number) => setCurrentScore(score), []);
  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setGameState(isHighScore(score) ? 'gameover' : 'menu');
  }, [isHighScore]);
  const handleHighScoreSubmit = (name: string) => { saveScore(name, finalScore); setGameState('menu'); };
  const handleCloseGame = () => { setGameState('menu'); setSelectedGame(null); setCurrentScore(0); };
  const handleRestart = () => { setCurrentScore(0); setGameState('menu'); setTimeout(() => setGameState('inserting'), 100); };
  const handleShowInstructions = () => setGameState('instructions');

  const renderGame = () => {
    if (!selectedGame) return null;
    const props = { onScoreChange: handleScoreChange, onGameOver: handleGameOver, isActive: gameState === 'playing' };

    switch (selectedGame.id) {
      case 'snake': return <SnakeGame {...props} />;
      case 'tetris': return <TetrisGame {...props} />;
      case 'pong': return <PongGame {...props} />;
      case 'pacman': return <PacManGame {...props} />;
      case 'space-shooter': return <SpaceShooterGame {...props} />;
      case 'brick-breaker': return <BrickBreakerGame {...props} />;
      case 'maze-runner': return <MazeRunnerGame {...props} />;
      case 'minesweeper': return <MinesweeperGame {...props} />;
      case 'asteroids': return <AsteroidsGame {...props} />;
      case 'pixel-racing': return <PixelRacingGame {...props} />;
      case 'platformer': return <PlatformerGame {...props} />;
      case 'typing-invaders': return <TypingInvadersGame {...props} />;
      case 'flappy-pixel': return <FlappyPixelGame {...props} />;
      case 'frog-hopper': return <FrogHopperGame {...props} />;
      case 'bubble-popper': return <BubblePopperGame {...props} />;
      case 'road-runner': return <RoadRunnerGame {...props} />;
      case 'tank-duel': return <TankDuelGame {...props} />;
      case 'pinball': return <PinballGame {...props} />;
      case 'breakout-defense': return <BreakoutDefenseGame {...props} />;
      case 'donkey-jump': return <DonkeyJumpGame {...props} />;
      case 'pixel-bomber': return <PixelBomberGame {...props} />;
      case 'missile-command': return <MissileCommandGame {...props} />;
      case 'river-raid': return <RiverRaidGame {...props} />;
      case 'space-defender': return <SpaceDefenderGame {...props} />;
      case 'pixel-boxing': return <PixelBoxingGame {...props} />;
      case 'memory-tiles': return <MemoryTilesGame {...props} />;
      case 'laser-grid': return <LaserGridGame {...props} />;
      case 'retro-soccer': return <RetroSoccerGame {...props} />;
      case 'endless-runner': return <EndlessRunnerGame {...props} />;
      case 'sky-climber': return <SkyClimberGame {...props} />;
      case 'arcade-fishing': return <ArcadeFishingGame {...props} />;
      case 'tower-defense': return <TowerDefenseGame {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background crt-screen">
      <CRTOverlay />
      {gameState === 'start' && <PressStart onStart={handleStart} />}
      {gameState === 'menu' && (
        <div className="container mx-auto px-4 pb-24">
          <Header />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8">
            {GAMES.map((game, index) => <GameCard key={game.id} game={game} onSelect={handleGameSelect} index={index} />)}
          </div>
          <footer className="mt-12 text-center">
            <p className="text-xs text-muted-foreground mb-2">↑ ↑ ↓ ↓ ← → ← → B A</p>
            <p className="text-[10px] text-muted-foreground">© 2024 RETRO ARCADE • ALL RIGHTS RESERVED</p>
          </footer>
        </div>
      )}
      {gameState === 'instructions' && selectedGame && <InstructionCard game={selectedGame} onClose={() => setGameState('menu')} onPlay={handlePlay} />}
      {gameState === 'inserting' && selectedGame && <InsertCoin gameName={selectedGame.title} onComplete={handleInsertComplete} />}
      {gameState === 'playing' && selectedGame && (
        <GameFrame gameName={selectedGame.title} score={currentScore} onClose={handleCloseGame} onRestart={handleRestart} onShowInstructions={handleShowInstructions}>
          {renderGame()}
        </GameFrame>
      )}
      {gameState === 'gameover' && <HighScoreEntry score={finalScore} onSubmit={handleHighScoreSubmit} onSkip={() => setGameState('menu')} />}
      {gameState !== 'start' && <SoundControls />}
    </div>
  );
};

export default Index;
