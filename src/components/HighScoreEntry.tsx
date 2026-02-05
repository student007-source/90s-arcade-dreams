import { useState } from 'react';
import { useSound } from '@/hooks/useSound';

interface HighScoreEntryProps {
  score: number;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('');

const HighScoreEntry = ({ score, onSubmit, onSkip }: HighScoreEntryProps) => {
  const [name, setName] = useState(['A', 'A', 'A']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { playSound } = useSound();

  const handleLetterChange = (direction: 'up' | 'down') => {
    playSound('select');
    setName(prev => {
      const newName = [...prev];
      const currentLetterIndex = ALPHABET.indexOf(newName[currentIndex]);
      
      if (direction === 'up') {
        newName[currentIndex] = ALPHABET[(currentLetterIndex + 1) % ALPHABET.length];
      } else {
        newName[currentIndex] = ALPHABET[(currentLetterIndex - 1 + ALPHABET.length) % ALPHABET.length];
      }
      
      return newName;
    });
  };

  const handleNext = () => {
    if (currentIndex < 2) {
      playSound('move');
      setCurrentIndex(prev => prev + 1);
    } else {
      playSound('powerup');
      onSubmit(name.join(''));
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      playSound('move');
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 crt-screen">
      <div className="text-center pixel-border bg-card p-8 animate-crt-zoom">
        <h2 className="text-xl neon-text-yellow mb-2">NEW HIGH SCORE!</h2>
        <p className="text-3xl neon-text-cyan mb-8">{score.toLocaleString()}</p>

        <p className="text-xs text-muted-foreground mb-6">ENTER YOUR NAME</p>

        {/* Letter selection */}
        <div className="flex justify-center gap-4 mb-8">
          {name.map((letter, index) => (
            <div key={index} className="flex flex-col items-center">
              {/* Up arrow */}
              {index === currentIndex && (
                <button
                  onClick={() => handleLetterChange('up')}
                  className="text-neon-green hover:text-neon-yellow mb-2 transition-colors"
                >
                  ▲
                </button>
              )}

              {/* Letter */}
              <div
                className={`w-12 h-12 flex items-center justify-center text-2xl border-2 ${
                  index === currentIndex
                    ? 'border-neon-magenta neon-text-magenta animate-pulse'
                    : 'border-muted text-muted-foreground'
                }`}
              >
                {letter}
              </div>

              {/* Down arrow */}
              {index === currentIndex && (
                <button
                  onClick={() => handleLetterChange('down')}
                  className="text-neon-green hover:text-neon-yellow mt-2 transition-colors"
                >
                  ▼
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="arcade-btn arcade-btn-magenta text-[10px] disabled:opacity-30"
          >
            ◀ BACK
          </button>
          <button
            onClick={handleNext}
            className="arcade-btn arcade-btn-green text-[10px]"
          >
            {currentIndex === 2 ? 'SUBMIT' : 'NEXT ▶'}
          </button>
        </div>

        <button
          onClick={onSkip}
          className="mt-4 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          SKIP
        </button>
      </div>
    </div>
  );
};

export default HighScoreEntry;
