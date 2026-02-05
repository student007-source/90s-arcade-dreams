import { Volume2, VolumeX, Music, Music2 } from 'lucide-react';
import { useSound, useBackgroundMusic } from '@/hooks/useSound';

const SoundControls = () => {
  const { volume, setVolume, isMuted, toggleMute } = useSound();
  const { isPlaying, toggleMusic } = useBackgroundMusic();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-3 arcade-cabinet">
      {/* Music toggle */}
      <button
        onClick={toggleMusic}
        className="flex items-center gap-2 p-2 hover:bg-muted/20 transition-colors group"
        title={isPlaying ? 'Stop Music' : 'Play Music'}
      >
        {isPlaying ? (
          <Music2 className="w-5 h-5 text-neon-green group-hover:animate-pulse" />
        ) : (
          <Music className="w-5 h-5 text-muted-foreground group-hover:text-neon-green" />
        )}
        <span className="text-[8px] text-muted-foreground">MUSIC</span>
      </button>

      {/* Volume control */}
      <button
        onClick={toggleMute}
        className="flex items-center gap-2 p-2 hover:bg-muted/20 transition-colors group"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-destructive" />
        ) : (
          <Volume2 className="w-5 h-5 text-neon-cyan group-hover:animate-pulse" />
        )}
        <span className="text-[8px] text-muted-foreground">SFX</span>
      </button>

      {/* Volume slider styled as arcade knob */}
      <div className="flex items-center gap-2 px-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-16 h-2 appearance-none bg-muted rounded cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-neon-magenta
            [&::-webkit-slider-thumb]:rounded-none
            [&::-webkit-slider-thumb]:shadow-[0_0_10px_hsl(300,100%,50%)]
            [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
};

export default SoundControls;
