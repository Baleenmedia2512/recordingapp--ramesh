import React from 'react';
import { useCallLogs } from '@/hooks/useCallLogs';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { CallLog } from '@/types';
import CallLogItem from './CallLogItem';
import CallLogFilters from './CallLogFilters';
import AudioPlayer from './AudioPlayer';

const Dashboard: React.FC = () => {
  const { callLogs, isLoading, error, refreshCallLogs } = useCallLogs();
  const { play } = useAudioPlayer();

  const handlePlayRecording = (log: CallLog) => {
    if (log.recording_url) {
      play(log.recording_url, log.id);
    }
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
            </div>
            <button
              onClick={refreshCallLogs}
              disabled={isLoading}
              className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        <CallLogFilters />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {isLoading && callLogs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading call logs...</p>
            </div>
          </div>
        ) : callLogs.length === 0 ? (
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
            {callLogs.map((log) => (
              <CallLogItem
                key={log.id}
                log={log}
                onPlayRecording={handlePlayRecording}
              />
            ))}
          </div>
        )}

        {callLogs.length > 0 && (
          <div className="mt-6 text-center text-gray-600">
            Showing {callLogs.length} call{callLogs.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <AudioPlayer />
    </div>
  );
};

export default Dashboard;
