import { useState, useCallback, useEffect } from 'react';

export interface HighScore {
  name: string;
  score: number;
  date: string;
}

export interface GameScores {
  [gameId: string]: HighScore[];
}

const STORAGE_KEY = 'arcade_high_scores';
const MAX_SCORES_PER_GAME = 10;

export const useHighScores = (gameId: string) => {
  const [scores, setScores] = useState<HighScore[]>([]);

  // Load scores from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const allScores: GameScores = JSON.parse(stored);
      setScores(allScores[gameId] || []);
    }
  }, [gameId]);

  // Save a new score
  const saveScore = useCallback((name: string, score: number) => {
    const newScore: HighScore = {
      name: name.toUpperCase().slice(0, 3).padEnd(3, '_'),
      score,
      date: new Date().toISOString(),
    };

    const stored = localStorage.getItem(STORAGE_KEY);
    const allScores: GameScores = stored ? JSON.parse(stored) : {};
    
    const gameScores = allScores[gameId] || [];
    gameScores.push(newScore);
    gameScores.sort((a, b) => b.score - a.score);
    
    const topScores = gameScores.slice(0, MAX_SCORES_PER_GAME);
    allScores[gameId] = topScores;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allScores));
    setScores(topScores);

    return topScores.findIndex(s => s.date === newScore.date) + 1;
  }, [gameId]);

  // Check if score qualifies for leaderboard
  const isHighScore = useCallback((score: number) => {
    if (scores.length < MAX_SCORES_PER_GAME) return true;
    return score > (scores[scores.length - 1]?.score || 0);
  }, [scores]);

  // Clear scores for this game
  const clearScores = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allScores: GameScores = stored ? JSON.parse(stored) : {};
    delete allScores[gameId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allScores));
    setScores([]);
  }, [gameId]);

  return { scores, saveScore, isHighScore, clearScores };
};
