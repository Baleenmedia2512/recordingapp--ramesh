import React, { useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

const AudioPlayer: React.FC = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    callLogId,
    pause,
    stop,
    seek,
    setVolume,
    error,
  } = useAudioPlayer();

  const progressRef = useRef<HTMLDivElement>(null);

  if (!callLogId) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    seek(newTime);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {error && (
          <div className="mb-2 text-red-600 text-sm">{error}</div>
        )}
        
        <div className="flex items-center gap-4">
          {/* Play/Pause/Stop Controls */}
          <div className="flex gap-2">
            <button
              onClick={isPlaying ? pause : () => {}}
              disabled={!isPlaying}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isPlaying
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button
              onClick={stop}
              className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center"
            >
              ⏹
            </button>
          </div>

          {/* Time Display */}
          <div className="text-sm text-gray-600 min-w-[100px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Progress Bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative"
          >
            <div
              className="absolute top-0 left-0 h-full bg-primary-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <span className="text-gray-600">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24"
            />
          </div>

          {/* Status */}
          <div className="text-sm text-gray-600">
            {isPlaying ? '🎵 Playing' : '⏸ Paused'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
