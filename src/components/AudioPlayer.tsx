import React, { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { handleKey } from '../lib/utils';
import { useA11y } from './A11yProvider';

interface AudioPlayerProps {
  url: string;
  onPositionUpdate?: (position: number) => void;
  onComplete?: () => void;
  initialPosition?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, onPositionUpdate, onComplete, initialPosition = 0 }) => {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Howl | null>(null);
  const { announce } = useA11y();

  useEffect(() => {
    soundRef.current = new Howl({
      src: [url],
      html5: true,
      onload: () => {
        setDuration(soundRef.current?.duration() || 0);
        if (initialPosition > 0) {
          soundRef.current?.seek(initialPosition);
        }
      },
      onplay: () => setPlaying(true),
      onpause: () => setPlaying(false),
      onend: () => {
        setPlaying(false);
        onComplete?.();
      },
    });

    const interval = setInterval(() => {
      if (soundRef.current && playing) {
        const currentPos = soundRef.current.seek() as number;
        setPosition(currentPos);
        onPositionUpdate?.(currentPos);
      }
    }, 1000);

    return () => {
      soundRef.current?.unload();
      clearInterval(interval);
    };
  }, [url]);

  const togglePlay = () => {
    if (playing) {
      soundRef.current?.pause();
      announce('Audio paused');
    } else {
      soundRef.current?.play();
      announce('Audio playing');
    }
  };

  const seek = (seconds: number) => {
    if (soundRef.current) {
      const newPos = Math.max(0, Math.min(duration, position + seconds));
      soundRef.current.seek(newPos);
      setPosition(newPos);
      announce(`Seeked to ${Math.floor(newPos)} seconds`);
    }
  };

  return (
    <div className="bg-slate-100 p-6 rounded-xl shadow-lg border-2 border-slate-300 dark:bg-slate-800 dark:border-slate-600">
      <h2 className="sr-only">Audio Player</h2>
      <div className="flex flex-col gap-6">
        <div className="flex justify-center items-center gap-8">
          <button
            onClick={() => seek(-10)}
            onKeyDown={handleKey}
            className="p-4 rounded-full hover:bg-slate-200"
            aria-label="Rewind 10 seconds"
          >
            <SkipBack size={32} />
          </button>

          <button
            onClick={togglePlay}
            onKeyDown={handleKey}
            className="p-6 rounded-full bg-blue-600 text-white hover:bg-blue-700"
            aria-label={playing ? 'Pause audio' : 'Play audio'}
          >
            {playing ? <Pause size={48} /> : <Play size={48} />}
          </button>

          <button
            onClick={() => seek(10)}
            onKeyDown={handleKey}
            className="p-4 rounded-full hover:bg-slate-200"
            aria-label="Forward 10 seconds"
          >
            <SkipForward size={32} />
          </button>
        </div>

        <div className="w-full">
          <label htmlFor="audio-progress" className="sr-only">Audio progress</label>
          <input
            id="audio-progress"
            type="range"
            min="0"
            max={duration || 100}
            value={position}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              soundRef.current?.seek(val);
              setPosition(val);
            }}
            className="w-full h-4 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-2 font-mono text-lg">
            <span>{Math.floor(position / 60)}:{Math.floor(position % 60).toString().padStart(2, '0')}</span>
            <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
