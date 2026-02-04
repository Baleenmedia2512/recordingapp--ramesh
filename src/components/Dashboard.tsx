import React, { useMemo } from 'react';
import { useCallLogs } from '@/hooks/useCallLogs';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { CallLog } from '@/types';
import CallLogItem from './CallLogItem';
import CallLogFilters from './CallLogFilters';
import AudioPlayer from './AudioPlayer';

const Dashboard: React.FC = () => {
  const { callLogs, isLoading, error, refreshCallLogs, lastUpdated, newCallsCount } = useCallLogs();
  const { play } = useAudioPlayer();

  const handlePlayRecording = (log: CallLog) => {
    if (log.recording_url) {
      play(log.recording_url, log.id);
    }
  };

  // Sort call logs in reverse chronological order (newest first)
  const sortedCallLogs = useMemo(() => {
    return [...callLogs].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [callLogs]);

  // Get the timestamp of the most recent call for comparison
  const mostRecentTimestamp = useMemo(() => {
    if (sortedCallLogs.length === 0) return null;
    return new Date(sortedCallLogs[0].timestamp).getTime();
  }, [sortedCallLogs]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleString();
  };

  // Check if a call is "new" (within last 30 seconds and first 3 calls)
  const isNewCall = (log: CallLog, index: number) => {
    if (index >= 3) return false;
    const callTime = new Date(log.timestamp).getTime();
    const now = new Date().getTime();
    return (now - callTime) < 30000; // 30 seconds
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Call Monitor</h1>
              <p className="text-gray-600 mt-1">
                View and manage your call history
              </p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {newCallsCount > 0 && (
                <div className="bg-blue-500 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg animate-bounce">
                  +{newCallsCount} New Call{newCallsCount > 1 ? 's' : ''}
                </div>
              )}
              <button
                onClick={refreshCallLogs}
                disabled={isLoading}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        <CallLogFilters />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {isLoading && callLogs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading call logs...</p>
            </div>
          </div>
        ) : sortedCallLogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📞</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No Call Logs Found
            </h2>
            <p className="text-gray-600">
              Your call history will appear here once you start making calls.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-2 flex items-center justify-between">
              <span>Sorted by: Most recent first</span>
              <span className="font-medium">{sortedCallLogs.length} total call{sortedCallLogs.length !== 1 ? 's' : ''}</span>
            </div>
            {sortedCallLogs.map((log, index) => (
              <CallLogItem
                key={log.id}
                log={log}
                onPlayRecording={handlePlayRecording}
                isNew={isNewCall(log, index)}
              />
            ))}
          </div>
        )}

        {sortedCallLogs.length > 0 && (
          <div className="mt-6 text-center text-gray-600 p-4 bg-white rounded-lg shadow-sm">
            <p className="font-medium">
              Showing {sortedCallLogs.length} call{sortedCallLogs.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Auto-refreshes every 30 seconds and on new calls
            </p>
          </div>
        )}
      </div>

      <AudioPlayer />
    </div>
  );
};

export default Dashboard;
