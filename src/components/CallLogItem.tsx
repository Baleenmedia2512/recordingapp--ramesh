import React from 'react';
import { CallLog, CallType } from '@/types';
import { format } from 'date-fns';

interface CallLogItemProps {
  log: CallLog;
  onPlayRecording: (log: CallLog) => void;
}

const CallLogItem: React.FC<CallLogItemProps> = ({ log, onPlayRecording }) => {
  const getCallTypeColor = (type: CallType) => {
    switch (type) {
      case 'incoming':
        return 'text-green-600';
      case 'outgoing':
        return 'text-blue-600';
      case 'missed':
        return 'text-red-600';
      case 'rejected':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
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
      default:
        return '📞';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{getCallTypeIcon(log.call_type)}</span>
            <div>
              <h3 className="font-semibold text-gray-900">
                {log.contact_name || log.phone_number}
              </h3>
              {log.contact_name && (
                <p className="text-sm text-gray-500">{log.phone_number}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
            <span className={`font-medium ${getCallTypeColor(log.call_type)}`}>
              {log.call_type.charAt(0).toUpperCase() + log.call_type.slice(1)}
            </span>
            <span>{formatTimestamp(log.timestamp)}</span>
            <span>Duration: {formatDuration(log.duration)}</span>
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100">
              {log.device_platform === 'android' ? '🤖 Android' : '🍎 iOS'}
            </span>
          </div>
        </div>

        <div className="ml-4">
          {log.has_recording ? (
            <button
              onClick={() => onPlayRecording(log)}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              <span>▶️</span>
              <span>Play</span>
            </button>
          ) : (
            <div className="text-gray-400 text-sm px-4 py-2 border border-gray-200 rounded-lg">
              No recording
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallLogItem;
