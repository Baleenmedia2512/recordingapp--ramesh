import React, { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Capacitor } from '@capacitor/core';

const PermissionsManager: React.FC = () => {
  const {
    permissions,
    isChecking,
    allRequiredGranted,
    requestPermissions,
    platform,
  } = usePermissions();
  const [showDetails, setShowDetails] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleRequestPermissions = async () => {
    setRequestError(null);
    try {
      const granted = await requestPermissions();
      if (!granted) {
        setRequestError(
          'Some permissions were denied. Please enable them in your device settings to use all features.'
        );
      }
    } catch (error) {
      setRequestError('Failed to request permissions. Please try again.');
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-3"></div>
        <div className="text-gray-600">Checking permissions...</div>
      </div>
    );
  }

  if (allRequiredGranted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-2xl">✅</span>
            <span className="font-medium">All required permissions granted</span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-green-600 hover:text-green-700 underline"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        {showDetails && (
          <div className="mt-4 space-y-2">
            {permissions.map((permission) => (
              <div key={permission.name} className="flex items-center gap-2 text-sm">
                <span>{permission.granted ? '✓' : '✗'}</span>
                <span className="text-gray-700">{permission.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">🔒</span>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            Permissions Required
          </h2>
          <p className="text-sm text-gray-700">
            To view your call history, we need access to the following permissions
          </p>
        </div>
      </div>

      {platform === 'android' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Android Device Detected</p>
              <p className="text-sm text-blue-800">
                Your Android device can access call logs, record calls, and sync data to the cloud.
                All features are available on Android.
              </p>
            </div>
          </div>
        </div>
      )}

      {platform === 'ios' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">🍎</span>
            <div>
              <p className="font-semibold text-purple-900 mb-1">iOS Device Detected</p>
              <p className="text-sm text-purple-800 mb-2">
                <strong>Important iOS Limitations:</strong>
              </p>
              <ul className="text-sm text-purple-800 list-disc list-inside space-y-1">
                <li>iOS does not allow apps to access system call logs</li>
                <li>iOS does not allow recording of regular phone calls</li>
                <li>You can view synced call logs from your Android devices</li>
                <li>Recording is only possible for VoIP calls (WhatsApp, Skype, etc.)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {!Capacitor.isNativePlatform() && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">🌐</span>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Web Browser Detected</p>
              <p className="text-sm text-gray-700">
                Native permissions are not available on web. Install the app on your Android or iOS device
                for full functionality. You can still view synced data in the browser.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {permissions.map((permission) => (
          <div
            key={permission.name}
            className={`flex items-start gap-3 p-4 bg-white rounded-lg border-2 transition-all ${
              permission.granted
                ? 'border-green-200'
                : permission.required
                ? 'border-red-200'
                : 'border-gray-200'
            }`}
          >
            <div className="flex-shrink-0 mt-1">
              {permission.granted ? (
                <span className="text-green-600 text-2xl">✅</span>
              ) : permission.required ? (
                <span className="text-red-600 text-2xl">❌</span>
              ) : (
                <span className="text-gray-400 text-2xl">⚪</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{permission.name}</h3>
                {permission.required && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                    Required
                  </span>
                )}
                {!permission.required && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    Optional
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{permission.description}</p>
              {!permission.granted && permission.required && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ This permission is required for the app to function properly
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {requestError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium mb-1">Permission Error</p>
              <p className="text-sm text-red-600">{requestError}</p>
              <p className="text-xs text-red-600 mt-2">
                To enable permissions manually:
                <br />• Open your device Settings
                <br />• Find Call Monitor app
                <br />• Enable the required permissions
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleRequestPermissions}
          disabled={!Capacitor.isNativePlatform()}
          className="flex-1 bg-primary-500 text-white px-6 py-4 rounded-lg hover:bg-primary-600 transition-colors font-semibold text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Capacitor.isNativePlatform() ? '🔓 Grant Permissions' : 'Not Available on Web'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Privacy & Security</p>
            <p className="text-xs text-gray-700 leading-relaxed">
              Your call logs and recordings are stored securely on your device with end-to-end encryption.
              All data syncing is protected by industry-standard encryption. You maintain full control
              over your data and can revoke permissions at any time through your device settings.
              We never share your data with third parties.
            </p>
          </div>
        </div>
      </div>

      {Capacitor.isNativePlatform() && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Tapping "Grant Permissions" will show system permission dialogs
          </p>
        </div>
      )}
    </div>
  );
};

export default PermissionsManager;
