import React, { useMemo, useState } from 'react';
import { useCallLogs } from '@/hooks/useCallLogs';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { CallLog, CallType } from '@/types';
import CallLogItem from './CallLogItem';
import CallLogFilters from './CallLogFilters';
import AudioPlayer from './AudioPlayer';

// View mode type
type ViewMode = 'list' | 'table';

const Dashboard: React.FC = () => {
  const { 
    callLogs, 
    isLoading, 
    error, 
    refreshCallLogs, 
    lastUpdated, 
    newCallsCount,
    loadTime,
    isSlowLoad 
  } = useCallLogs();
  const { play } = useAudioPlayer();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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

  // Format functions for table view
  const getCallTypeIndicator = (type: CallType) => {
    const indicators: Record<CallType, { icon: string; label: string; color: string }> = {
      incoming: { icon: '📞', label: 'Incoming', color: 'text-green-600 bg-green-100' },
      outgoing: { icon: '📱', label: 'Outgoing', color: 'text-blue-600 bg-blue-100' },
      missed: { icon: '❌', label: 'Missed', color: 'text-red-600 bg-red-100' },
      rejected: { icon: '🚫', label: 'Rejected', color: 'text-orange-600 bg-orange-100' },
      voicemail: { icon: '🔊', label: 'Voicemail', color: 'text-purple-600 bg-purple-100' },
    };
    return indicators[type] || { icon: '📞', label: 'Unknown', color: 'text-gray-600 bg-gray-100' };
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatHumanReadableTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (timestamp: string): { date: string; time: string } => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Call Monitor</h1>
              <p className="text-gray-600 mt-1">
                View and manage your call history
              </p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {formatLastUpdated(lastUpdated)}
                  {loadTime !== null && (
                    <span className={`ml-2 ${loadTime > 3000 ? 'text-orange-500' : 'text-green-600'}`}>
                      ({(loadTime / 1000).toFixed(1)}s)
                    </span>
                  )}
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
                onClick={() => refreshCallLogs(true)}
                disabled={isLoading}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Slow Load Warning */}
        {isSlowLoad && isLoading && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-600 border-t-transparent"></div>
            <div>
              <p className="text-yellow-800 font-medium">Loading is taking longer than expected...</p>
              <p className="text-yellow-700 text-sm">This may be due to a large call history or slow connection.</p>
            </div>
          </div>
        )}

        <CallLogFilters />

        {/* View Mode Toggle */}
        <div className="mb-4 flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📊 Table
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{sortedCallLogs.length}</span> total call{sortedCallLogs.length !== 1 ? 's' : ''}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-yellow-800 font-medium">Notice</p>
                <p className="text-yellow-700 text-sm">{error}</p>
                {error.includes('sample data') && (
                  <p className="text-yellow-600 text-xs mt-1">
                    The data shown below is sample data for demonstration purposes.
                  </p>
                )}
              </div>
              <button
                onClick={() => refreshCallLogs(true)}
                className="text-yellow-700 hover:text-yellow-900 text-sm underline"
              >
                Try Again
              </button>
            </div>
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
        ) : viewMode === 'list' ? (
          /* List View - Scrollable */
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="text-sm text-gray-600 mb-2 flex items-center justify-between sticky top-0 bg-gray-50 py-2 z-10">
              <span>📅 Sorted by: Most recent first</span>
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
        ) : (
          /* Table View - Scrollable */
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Call Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Contact / Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Recording
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedCallLogs.map((log, index) => {
                    const typeIndicator = getCallTypeIndicator(log.call_type);
                    const dateTime = formatDateTime(log.timestamp);
                    return (
                      <tr 
                        key={log.id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          isNewCall(log, index) ? 'bg-blue-50 animate-pulse' : ''
                        }`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${typeIndicator.color}`}>
                            <span>{typeIndicator.icon}</span>
                            <span>{typeIndicator.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">
                            {log.contact_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {log.phone_number}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{dateTime.date}</div>
                          <div className="text-xs text-gray-500">{formatHumanReadableTime(log.timestamp)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {dateTime.time}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${log.duration === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                            {formatDuration(log.duration)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {log.has_recording ? (
                            <button
                              onClick={() => handlePlayRecording(log)}
                              className="bg-primary-500 text-white px-3 py-1 rounded-lg hover:bg-primary-600 transition-colors text-sm flex items-center gap-1"
                            >
                              <span>▶️</span>
                              <span>Play</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
