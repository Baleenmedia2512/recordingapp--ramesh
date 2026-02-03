import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store';
import { Capacitor } from '@capacitor/core';

export const useAudioPlayer = () => {
  const audioPlayer = useStore((state) => state.audioPlayer);
  const setAudioPlayer = useStore((state) => state.setAudioPlayer);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setAudioPlayer({ duration: audioRef.current.duration });
        }
      });

      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setAudioPlayer({ currentTime: audioRef.current.currentTime });
        }
      });

      audioRef.current.addEventListener('ended', () => {
        setAudioPlayer({ isPlaying: false, currentTime: 0 });
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to load or play audio file');
        setAudioPlayer({ isPlaying: false });
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const play = async (audioUrl: string, callLogId: string) => {
    if (!audioRef.current) return;

    try {
      setError(null);
      
      if (audioPlayer.callLogId !== callLogId) {
        audioRef.current.src = audioUrl;
        setAudioPlayer({ callLogId, currentTime: 0 });
      }

      await audioRef.current.play();
      setAudioPlayer({ isPlaying: true });
    } catch (err: any) {
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlayer({ isPlaying: false });
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlayer({ isPlaying: false, currentTime: 0, callLogId: null });
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioPlayer({ currentTime: time });
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setAudioPlayer({ volume });
    }
  };

  return {
    ...audioPlayer,
    play,
    pause,
    stop,
    seek,
    setVolume,
    error,
  };
};
