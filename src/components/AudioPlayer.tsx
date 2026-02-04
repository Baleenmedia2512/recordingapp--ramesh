import React, { useRef } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

const AudioPlayer: React.FC = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    callLogId,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    skipForward,
    skipBackward,
    error,
    playbackState,
    isLoading,
  } = useAudioPlayer();

  const progressRef = useRef<HTMLDivElement>(null);

  if (!callLogId) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    seek(newTime);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Get playback state display
  const getStateDisplay = () => {
    switch (playbackState) {
      case 'loading':
        return { icon: '⏳', text: 'Loading...', color: 'text-yellow-600' };
      case 'playing':
        return { icon: '🎵', text: 'Playing', color: 'text-green-600' };
      case 'paused':
        return { icon: '⏸️', text: 'Paused', color: 'text-blue-600' };
      case 'stopped':
        return { icon: '⏹️', text: 'Stopped', color: 'text-gray-600' };
      case 'error':
        return { icon: '❌', text: 'Error', color: 'text-red-600' };
      default:
        return { icon: '🔇', text: 'Ready', color: 'text-gray-600' };
    }
  };

  const stateDisplay = getStateDisplay();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-primary-500 shadow-2xl z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <p className="text-red-700 font-medium">Playback Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button 
              onClick={stop}
              className="ml-auto text-red-500 hover:text-red-700 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="mb-2 flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm">Loading audio...</span>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          {/* Main Controls: Play/Pause, Stop */}
          <div className="flex gap-2 items-center">
            {/* Skip Backward */}
            <button
              onClick={() => skipBackward(10)}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center text-sm disabled:opacity-50"
              title="Skip back 10 seconds"
            >
              ⏪
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-md transition-all ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-wait'
                  : isPlaying
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : isPlaying ? (
                '⏸️'
              ) : (
                '▶️'
              )}
            </button>

            {/* Stop Button */}
            <button
              onClick={stop}
              className="w-10 h-10 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-all"
              title="Stop"
            >
              ⏹️
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skipForward(10)}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center text-sm disabled:opacity-50"
              title="Skip forward 10 seconds"
            >
              ⏩
            </button>
          </div>

          {/* Time Display */}
          <div className="text-sm font-mono text-gray-700 min-w-[110px] bg-gray-100 px-3 py-1 rounded">
            <span className="text-primary-600">{formatTime(currentTime)}</span>
            <span className="text-gray-400"> / </span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 flex flex-col gap-1">
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="h-3 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden group"
            >
              {/* Buffered/Background */}
              <div className="absolute inset-0 bg-gray-300 rounded-full" />
              
              {/* Progress */}
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-100"
                style={{ width: `${progressPercentage}%` }}
              />
              
              {/* Seek Handle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPercentage}% - 8px)` }}
              />
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
              className="text-gray-600 hover:text-gray-800"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-2 accent-primary-500"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          {/* Status Indicator */}
          <div className={`text-sm font-medium flex items-center gap-1 min-w-[90px] ${stateDisplay.color}`}>
            <span>{stateDisplay.icon}</span>
            <span>{stateDisplay.text}</span>
          </div>

          {/* Close Button */}
          <button
            onClick={stop}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 flex items-center justify-center"
            title="Close player"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
