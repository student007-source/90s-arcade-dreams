import { useHighScores, HighScore } from '@/hooks/useHighScores';

interface LeaderboardProps {
  gameId: string;
  gameName: string;
}

const Leaderboard = ({ gameId, gameName }: LeaderboardProps) => {
  const { scores } = useHighScores(gameId);

  return (
    <div className="arcade-cabinet p-4 max-w-xs">
      <h3 className="text-sm neon-text-yellow text-center mb-4">
        {gameName} - HIGH SCORES
      </h3>

      {scores.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center">
          NO SCORES YET
        </p>
      ) : (
        <div className="space-y-2">
          {scores.map((score, index) => (
            <div
              key={score.date}
              className={`flex justify-between items-center px-2 py-1 ${
                index === 0 ? 'neon-text-cyan' : 
                index === 1 ? 'neon-text-magenta' : 
                index === 2 ? 'neon-text-green' : 
                'text-muted-foreground'
              }`}
            >
              <span className="text-xs">
                {String(index + 1).padStart(2, '0')}. {score.name}
              </span>
              <span className="text-xs font-bold">
                {score.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
