import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store';
import { Capacitor } from '@capacitor/core';

// Audio playback states
type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export const useAudioPlayer = () => {
  const audioPlayer = useStore((state) => state.audioPlayer);
  const setAudioPlayer = useStore((state) => state.setAudioPlayer);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      
      // Set audio attributes for better mobile compatibility
      audioRef.current.preload = 'metadata';
      audioRef.current.crossOrigin = 'anonymous';

      audioRef.current.addEventListener('loadstart', () => {
        setIsLoading(true);
        setPlaybackState('loading');
        setError(null);
      });

      audioRef.current.addEventListener('canplay', () => {
        setIsLoading(false);
      });

      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setAudioPlayer({ duration: audioRef.current.duration });
          setIsLoading(false);
        }
      });

      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setAudioPlayer({ currentTime: audioRef.current.currentTime });
        }
      });

      audioRef.current.addEventListener('play', () => {
        setPlaybackState('playing');
        setAudioPlayer({ isPlaying: true });
      });

      audioRef.current.addEventListener('pause', () => {
        if (audioRef.current && audioRef.current.currentTime > 0) {
          setPlaybackState('paused');
        }
        setAudioPlayer({ isPlaying: false });
      });

      audioRef.current.addEventListener('ended', () => {
        setPlaybackState('stopped');
        setAudioPlayer({ isPlaying: false, currentTime: 0 });
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsLoading(false);
        setPlaybackState('error');
        
        // Provide specific error messages
        const audio = audioRef.current;
        if (audio && audio.error) {
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              setError('Playback was aborted');
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              setError('Network error - could not load audio file');
              break;
            case MediaError.MEDIA_ERR_DECODE:
              setError('Audio file is corrupted or format not supported');
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              setError('Audio file not found or format not supported');
              break;
            default:
              setError('Failed to load or play audio file');
          }
        } else {
          setError('Failed to load or play audio file');
        }
        
        setAudioPlayer({ isPlaying: false });
      });

      audioRef.current.addEventListener('stalled', () => {
        setError('Audio playback stalled - buffering...');
      });

      audioRef.current.addEventListener('waiting', () => {
        setIsLoading(true);
      });

      audioRef.current.addEventListener('playing', () => {
        setIsLoading(false);
        setError(null);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const play = async (audioUrl: string, callLogId: string) => {
    if (!audioRef.current) {
      setError('Audio player not initialized');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      // Check if it's a different audio or new playback
      if (audioPlayer.callLogId !== callLogId || audioRef.current.src !== audioUrl) {
        // Validate URL
        if (!audioUrl || audioUrl.trim() === '') {
          throw new Error('No recording URL provided');
        }
        
        audioRef.current.src = audioUrl;
        setAudioPlayer({ callLogId, currentTime: 0, duration: 0 });
        
        // Load the audio
        audioRef.current.load();
      }

      // Play the audio
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      setPlaybackState('playing');
      setAudioPlayer({ isPlaying: true });
      setIsLoading(false);
      
    } catch (err: any) {
      console.error('Error playing audio:', err);
      setIsLoading(false);
      setPlaybackState('error');
      
      // Provide user-friendly error message
      if (err.name === 'NotAllowedError') {
        setError('Playback blocked - tap play again to start');
      } else if (err.name === 'NotSupportedError') {
        setError('Audio format not supported on this device');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to play audio - file may be missing or corrupted');
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaybackState('paused');
      setAudioPlayer({ isPlaying: false });
    }
  };

  const resume = async () => {
    if (audioRef.current && audioRef.current.src) {
      try {
        await audioRef.current.play();
        setPlaybackState('playing');
        setAudioPlayer({ isPlaying: true });
      } catch (err: any) {
        console.error('Error resuming audio:', err);
        setError('Failed to resume playback');
      }
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaybackState('stopped');
      setAudioPlayer({ isPlaying: false, currentTime: 0, callLogId: null });
      setError(null);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current && !isNaN(time) && isFinite(time)) {
      const clampedTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
      audioRef.current.currentTime = clampedTime;
      setAudioPlayer({ currentTime: clampedTime });
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      audioRef.current.volume = clampedVolume;
      setAudioPlayer({ volume: clampedVolume });
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
    }
  };

  const skipForward = (seconds: number = 10) => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration);
      seek(newTime);
    }
  };

  const skipBackward = (seconds: number = 10) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      seek(newTime);
    }
  };

  return {
    ...audioPlayer,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    toggleMute,
    skipForward,
    skipBackward,
    error,
    playbackState,
    isLoading,
  };
};
