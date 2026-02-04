import { create } from 'zustand';
import { CallLog, DashboardFilters, AudioPlayerState, SyncStatus, User } from '@/types';

interface AppStore {
  // Auth state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Call logs state
  callLogs: CallLog[];
  setCallLogs: (logs: CallLog[]) => void;
  addCallLog: (log: CallLog) => void;
  updateCallLog: (id: string, updates: Partial<CallLog>) => void;
  deleteCallLog: (id: string) => void;
  
  // Filters
  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  
  // Audio player
  audioPlayer: AudioPlayerState;
  setAudioPlayer: (state: Partial<AudioPlayerState>) => void;
  
  // Sync status
  syncStatus: SyncStatus;
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppStore>((set) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),
  
  // Call logs
  callLogs: [],
  setCallLogs: (callLogs) => set({ callLogs }),
  addCallLog: (log) => set((state) => ({ 
    callLogs: [log, ...state.callLogs] 
  })),
  updateCallLog: (id, updates) => set((state) => ({
    callLogs: state.callLogs.map(log => 
      log.id === id ? { ...log, ...updates } : log
    )
  })),
  deleteCallLog: (id) => set((state) => ({
    callLogs: state.callLogs.filter(log => log.id !== id)
  })),
  
  // Filters
  filters: {
    callType: 'all',
  },
  setFilters: (filters) => set({ filters }),
  
  // Audio player
  audioPlayer: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    callLogId: null,
  },
  setAudioPlayer: (state) => set((prev) => ({
    audioPlayer: { ...prev.audioPlayer, ...state }
  })),
  
  // Sync status
  syncStatus: {
    isSyncing: false,
    lastSync: null,
    pendingCount: 0,
  },
  setSyncStatus: (status) => set((prev) => ({
    syncStatus: { ...prev.syncStatus, ...status }
  })),
  
  // Loading
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));
