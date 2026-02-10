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
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      
      // Set audio attributes for better mobile compatibility
      audioRef.current.preload = 'metadata';
      audioRef.current.crossOrigin = 'anonymous';
      
      // Enable better mobile support
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Native platform detected, optimizing audio player...');
      }

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
        console.error('❌ Audio playback error:', e);
        setIsLoading(false);
        setPlaybackState('error');
        
        // Provide specific error messages
        const audio = audioRef.current;
        let errorMsg = 'Failed to load or play audio file';
        
        if (audio && audio.error) {
          console.error('🚨 MediaError code:', audio.error.code, 'message:', audio.error.message);
          
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMsg = 'Playback was aborted';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMsg = 'Network error - could not load audio file';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMsg = 'Audio file is corrupted or format not supported';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMsg = 'Audio file not found or format not supported';
              break;
            default:
              errorMsg = 'Failed to load or play audio file';
          }
        } else {
          // Generic error - might be due to file access issues
          console.error('⚠️ Generic audio error - possibly file access issue');
          errorMsg = 'Cannot access audio file. Check file permissions.';
        }
        
        setError(errorMsg);
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
      // Cleanup function with proper resource management
      console.log('🧹 Cleaning up audio player resources...');
      
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      
      if (audioRef.current) {
        try {
          // Pause and clear source
          audioRef.current.pause();
          
          // Remove all event listeners by cloning and replacing
          const oldAudio = audioRef.current;
          audioRef.current.src = '';
          audioRef.current.load(); // This triggers cleanup of resources
          
          // Set to null after cleanup
          audioRef.current = null;
          
          console.log('✅ Audio resources cleaned up successfully');
        } catch (cleanupError) {
          console.warn('⚠️ Error during audio cleanup:', cleanupError);
        }
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
        
        console.log('🎵 Loading new audio:', audioUrl);
        
        // Convert file:// URLs to Capacitor-compatible URLs
        let playableUrl = audioUrl;
        if (Capacitor.isNativePlatform()) {
          if (audioUrl.startsWith('file://')) {
            // Use Capacitor's convertFileSrc to make file accessible to WebView
            playableUrl = Capacitor.convertFileSrc(audioUrl);
            console.log('🔄 Converted URL for native platform:', playableUrl);
          } else if (audioUrl.startsWith('https://localhost/_capacitor_file_')) {
            // Already converted, use as-is
            console.log('✅ URL already in Capacitor format');
          } else {
            console.log('🌐 Using web URL as-is:', audioUrl.substring(0, 50) + '...');
          }
        }
        
        // Clean up previous audio before loading new one
        audioRef.current.pause();
        audioRef.current.src = '';
        
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set new source
        audioRef.current.src = playableUrl;
        setAudioPlayer({ callLogId, currentTime: 0, duration: 0 });
        
        // Load the audio
        console.log('📥 Loading audio file...');
        audioRef.current.load();
      }

      // Play the audio
      console.log('▶️ Starting playback...');
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('✅ Playback started successfully');
      }
      
      setPlaybackState('playing');
      setAudioPlayer({ isPlaying: true });
      setIsLoading(false);
      
    } catch (err: any) {
      console.error('❌ Error playing audio:', err);
      setIsLoading(false);
      setPlaybackState('error');
      
      // Provide user-friendly error message
      let errorMessage = 'Failed to play audio';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Playback blocked - tap play again to start';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Audio format not supported on this device';
      } else if (err.name === 'AbortError') {
        errorMessage = 'Playback was interrupted';
      } else if (err.message?.includes('decode') || err.message?.includes('format')) {
        errorMessage = 'Audio file format is not supported or corrupted';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error - cannot load audio file';
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Failed to play audio - file may be missing or corrupted';
      }
      
      setError(errorMessage);
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
      console.log('⏹️ Stopping audio playback');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Clear source to free up resources
      const currentSrc = audioRef.current.src;
      audioRef.current.src = '';
      
      // Small delay before clearing to ensure proper cleanup
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      cleanupTimeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load(); // Trigger resource cleanup
        }
        cleanupTimeoutRef.current = null;
      }, 100);
      
      setPlaybackState('stopped');
      setAudioPlayer({ isPlaying: false, currentTime: 0, callLogId: null });
      setError(null);
      console.log('✅ Audio stopped and resources freed');
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
