import React from 'react';
import { CallLog, CallType } from '@/types';

interface CallLogItemProps {
  log: CallLog;
  onPlayRecording: (log: CallLog) => void;
  isNew?: boolean;
}

const CallLogItem: React.FC<CallLogItemProps> = ({ log, onPlayRecording, isNew = false }) => {
  const getCallTypeColor = (type: CallType) => {
    switch (type) {
      case 'incoming':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'outgoing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'missed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'rejected':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'voicemail':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCallTypeIcon = (type: CallType) => {
    switch (type) {
      case 'incoming':
        return '📞';
      case 'outgoing':
        return '📱';
      case 'missed':
        return '❌';
      case 'rejected':
        return '🚫';
      case 'voicemail':
        return '🔊';
      default:
        return '📞';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time for recent calls
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    // Show full date for older calls
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (year === now.getFullYear()) {
      return `${month} ${day} at ${hours}:${minutes}`;
    }
    return `${month} ${day}, ${year} at ${hours}:${minutes}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all ${
      isNew ? 'border-blue-400 shadow-lg animate-pulse' : 'border-gray-200'
    }`}>
      {isNew && (
        <div className="mb-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
          🆕 New Call
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{getCallTypeIcon(log.call_type)}</span>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900">
                {log.contact_name || log.phone_number}
              </h3>
              {log.contact_name && (
                <p className="text-sm text-gray-600 font-mono">{log.phone_number}</p>
              )}
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCallTypeColor(log.call_type)}`}>
              {log.call_type.charAt(0).toUpperCase() + log.call_type.slice(1)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs font-medium mb-1">📅 Date</span>
              <span className="text-gray-900 font-medium">{formatDate(log.timestamp)}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs font-medium mb-1">🕐 Time</span>
              <span className="text-gray-900 font-medium">{formatTime(log.timestamp)}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs font-medium mb-1">⏱️ Duration</span>
              <span className="text-gray-900 font-medium">{formatDuration(log.duration)}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs font-medium mb-1">📱 Platform</span>
              <span className="text-gray-900 font-medium">
                {log.device_platform === 'android' ? '🤖 Android' : log.device_platform === 'ios' ? '🍎 iOS' : '🌐 Web'}
              </span>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            {formatTimestamp(log.timestamp)}
          </div>
        </div>

        <div className="ml-4 flex flex-col gap-2">
          {log.has_recording ? (
            <button
              onClick={() => onPlayRecording(log)}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 font-medium shadow-sm"
            >
              <span>▶️</span>
              <span>Play Recording</span>
            </button>
          ) : (
            <div className="text-gray-400 text-sm px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
              No recording
            </div>
          )}
          
          {log.is_synced && (
            <div className="text-xs text-green-600 flex items-center gap-1 justify-center">
              <span>✓</span>
              <span>Synced</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallLogItem;
