import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { callLogApi } from '@/lib/api';
import { DashboardFilters, CallLog } from '@/types';
import { isMockMode } from '@/lib/supabase';

// Mock data for testing
const mockCallLogs: CallLog[] = [
  {
    id: '1',
    user_id: 'mock-user-id',
    phone_number: '+1 (555) 123-4567',
    contact_name: 'John Doe',
    call_type: 'incoming',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    duration: 245,
    device_id: 'mock-device',
    device_platform: 'android',
    has_recording: true,
    recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    is_synced: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'mock-user-id',
    phone_number: '+1 (555) 987-6543',
    contact_name: 'Jane Smith',
    call_type: 'outgoing',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    duration: 180,
    device_id: 'mock-device',
    device_platform: 'android',
    has_recording: false,
    is_synced: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'mock-user-id',
    phone_number: '+1 (555) 555-0123',
    contact_name: 'Sarah Wilson',
    call_type: 'missed',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    duration: 0,
    device_id: 'mock-device',
    device_platform: 'android',
    has_recording: false,
    is_synced: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    user_id: 'mock-user-id',
    phone_number: '+1 (555) 234-5678',
    contact_name: 'Mike Johnson',
    call_type: 'incoming',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    duration: 420,
    device_id: 'mock-device',
    device_platform: 'android',
    has_recording: true,
    recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    is_synced: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const useCallLogs = () => {
  const { callLogs, setCallLogs, filters, isLoading, setIsLoading } = useStore();
  const [error, setError] = useState<string | null>(null);

  const fetchCallLogs = async (customFilters?: DashboardFilters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        // Use mock data if not authenticated
        await new Promise(resolve => setTimeout(resolve, 500));
        setCallLogs(mockCallLogs);
        return;
      }

      const response = await fetch('/api/call-logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API route doesn't exist (static build), use mock data
        if (response.status === 404) {
          setCallLogs(mockCallLogs);
          return;
        }
        throw new Error('Failed to fetch call logs');
      }

      const logs = await response.json();
      setCallLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch call logs');
      console.error('Error fetching call logs:', err);
      // Fallback to mock data on error
      setCallLogs(mockCallLogs);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCallLogs = () => {
    fetchCallLogs(filters);
  };

  useEffect(() => {
    fetchCallLogs(filters);
  }, [filters]);

  return {
    callLogs,
    isLoading,
    error,
    refreshCallLogs,
    fetchCallLogs,
  };
};
