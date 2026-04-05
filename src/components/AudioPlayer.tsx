import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, AlertCircle, Info, Youtube } from 'lucide-react';
import { getDirectAudioUrl, handleKey, isYouTubeUrl, getYouTubeEmbedUrl } from '../lib/utils';
import { useA11y } from './A11yProvider';
import toast from 'react-hot-toast';

interface AudioPlayerProps {
  url: string;
  onPositionUpdate?: (position: number) => void;
  onComplete?: () => void;
  initialPosition?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, onPositionUpdate, onComplete, initialPosition = 0 }) => {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { announce } = useA11y();

  const isYouTube = isYouTubeUrl(url);
  const youtubeUrl = isYouTube ? getYouTubeEmbedUrl(url) : "";

  useEffect(() => {
    if (isYouTube) {
      setLoading(false);
      setError(null);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    setLoading(true);
    setError(null);
    setPlaying(false);
    
    const directUrl = getDirectAudioUrl(url);
    audio.src = directUrl;
    audio.load();

    const handleCanPlay = () => {
      setLoading(false);
      setDuration(audio.duration);
      audio.volume = 1.0; // Ensure volume is up
      if (initialPosition > 0) {
        audio.currentTime = initialPosition;
      }
    };

    const lastReportedTime = useRef(0);
    const handleTimeUpdate = () => {
      setPosition(audio.currentTime);
      // Only report position update every 1 second to avoid excessive re-renders/writes
      if (Math.abs(audio.currentTime - lastReportedTime.current) >= 1) {
        onPositionUpdate?.(audio.currentTime);
        lastReportedTime.current = audio.currentTime;
      }
    };

    const handleEnded = () => {
      setPlaying(false);
      setBuffering(false);
      onComplete?.();
    };

    const handleWaiting = () => {
      setBuffering(true);
    };

    const handleStalled = () => {
      setBuffering(true);
    };

    const handlePlaying = () => {
      setPlaying(true);
      setBuffering(false);
    };

    const handlePause = () => {
      setPlaying(false);
    };

    const handleError = (e: any) => {
      console.error('Audio error:', e);
      setLoading(false);
      setBuffering(false);
      setError('Failed to load audio. This usually happens if the link is incorrect or the file is not shared publicly.');
      announce('Error loading audio');
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || loading) return;
    
    if (playing) {
      audio.pause();
      setPlaying(false);
      announce('Audio paused');
    } else {
      audio.play().catch(err => {
        console.error('Play error:', err);
        setError('Could not play audio. Please try again.');
      });
      setPlaying(true);
      announce('Audio playing');
    }
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (audio && !loading) {
      const newPos = Math.max(0, Math.min(duration, audio.currentTime + seconds));
      audio.currentTime = newPos;
      setPosition(newPos);
      announce(`Seeked to ${Math.floor(newPos)} seconds`);
    }
  };

  return (
    <div className="bg-slate-100 p-6 rounded-xl shadow-lg border-2 border-slate-300 dark:bg-slate-800 dark:border-slate-600">
      {isYouTube ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-red-600 font-bold mb-2">
            <Youtube /> YouTube Lesson
          </div>
          <div className="w-full h-48 sm:h-64 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-black shadow-inner">
            <iframe
              src={youtubeUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube Lesson Video"
              loading="lazy"
            />
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30">
            <p className="text-blue-800 dark:text-blue-300 text-sm flex items-center gap-2 mb-2">
              <Info size={16} /> YouTube videos are used for audio lessons. You can listen to the video while reading the notes.
            </p>
            <p className="text-blue-700 dark:text-blue-400 text-xs italic">
              Note: If the video doesn't play, ensure it is set to "Public" or "Unlisted" on YouTube and "Allow Embedding" is enabled.
            </p>
          </div>
          <div className="flex justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-bold"
            >
              <AlertCircle size={14} /> Video not loading? Click here to refresh
            </button>
          </div>
        </div>
      ) : (
        <>
          <audio 
            ref={audioRef} 
            className="hidden" 
            referrerPolicy="no-referrer"
            preload="auto"
          />
          <h2 className="sr-only">Audio Player</h2>
          
          {error ? (
            <div className="flex flex-col gap-4">
              <div className="text-center p-6 text-red-600 font-bold bg-red-50 rounded-lg border-2 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p className="text-lg mb-4">{error}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors font-bold"
                  >
                    Retry
                  </button>
                  <button 
                    onClick={() => {
                      const debugInfo = `URL: ${url}\nDirect URL: ${getDirectAudioUrl(url)}\nUser Agent: ${navigator.userAgent}`;
                      navigator.clipboard.writeText(debugInfo);
                      toast.success('Debug info copied!');
                    }}
                    className="bg-slate-200 text-slate-700 py-2 px-6 rounded-lg hover:bg-slate-300 transition-colors font-bold dark:bg-slate-700 dark:text-slate-200"
                  >
                    Copy Debug Info
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30">
                <p className="text-blue-800 dark:text-blue-300 font-bold flex items-center gap-2 mb-2">
                  <Info size={20} /> Important Note for External Links:
                </p>
                <ul className="text-blue-700 dark:text-blue-400 list-disc ml-5 space-y-1">
                  <li>For YouTube: Ensure the link is correct.</li>
                  <li>For Dropbox: Ensure the link is public.</li>
                  <li>Wait a few minutes after uploading for the service to process the file.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex justify-center items-center gap-8">
                <button
                  onClick={() => seek(-10)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  className="p-4 rounded-full hover:bg-slate-200 disabled:opacity-50 transition-colors"
                  aria-label="Rewind 10 seconds"
                >
                  <SkipBack size={32} />
                </button>

                <button
                  onClick={togglePlay}
                  onKeyDown={handleKey}
                  disabled={loading}
                  className={`p-6 rounded-full text-white shadow-lg transition-all transform active:scale-95 ${loading || buffering ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                  aria-label={loading || buffering ? 'Loading audio' : (playing ? 'Pause audio' : 'Play audio')}
                >
                  {loading || buffering ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
                  ) : (
                    playing ? <Pause size={48} /> : <Play size={48} />
                  )}
                </button>

                <button
                  onClick={() => seek(10)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  className="p-4 rounded-full hover:bg-slate-200 disabled:opacity-50 transition-colors"
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
                  disabled={loading}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (audioRef.current) audioRef.current.currentTime = val;
                    setPosition(val);
                  }}
                  className="w-full h-4 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                />
                <div className="flex justify-between mt-2 font-mono text-xl font-bold text-slate-600 dark:text-slate-400">
                  <span>{Math.floor(position / 60)}:{Math.floor(position % 60).toString().padStart(2, '0')}</span>
                  <span>
                    {loading ? '--:--' : `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`}
                  </span>
                </div>
                
                <div className="mt-4 flex justify-center">
                  <a 
                    href={isYouTube ? url : getDirectAudioUrl(url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Info size={14} /> {isYouTube ? 'Open on YouTube' : 'Having trouble? Open Audio File Directly'}
                  </a>
                </div>

                {(loading || buffering) && (
                  <div className="mt-4 flex items-center justify-center gap-3 text-blue-600 font-bold animate-pulse">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span>{loading ? 'Loading Audio...' : 'Buffering...'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
