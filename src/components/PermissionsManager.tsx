import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

const PermissionsManager: React.FC = () => {
  const {
    permissions,
    isChecking,
    allRequiredGranted,
    requestPermissions,
    platform,
  } = usePermissions();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Checking permissions...</div>
      </div>
    );
  }

  if (allRequiredGranted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-green-700">
          <span className="text-2xl">✅</span>
          <span className="font-medium">All required permissions granted</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Permissions Required
      </h2>

      {platform === 'android' && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Android Device Detected:</strong> This device can record and sync call logs.
          </p>
        </div>
      )}

      {platform === 'ios' && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>iOS Device Detected:</strong> This device can view synced call logs from Android devices.
          </p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {permissions.map((permission) => (
          <div
            key={permission.name}
            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex-shrink-0 mt-1">
              {permission.granted ? (
                <span className="text-green-600 text-xl">✅</span>
              ) : permission.required ? (
                <span className="text-red-600 text-xl">❌</span>
              ) : (
                <span className="text-gray-400 text-xl">⚪</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{permission.name}</h3>
                {permission.required && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    Required
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={requestPermissions}
          className="flex-1 bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors font-medium"
        >
          Grant Permissions
        </button>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Privacy Note:</strong> Your call logs and recordings are stored securely on your device
          and encrypted before syncing. You have full control over your data and can revoke permissions
          at any time in your device settings.
        </p>
      </div>
    </div>
  );
};

export default PermissionsManager;
