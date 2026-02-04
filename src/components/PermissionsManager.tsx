import React, { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Capacitor } from '@capacitor/core';

const PermissionsManager: React.FC = () => {
  const {
    permissions,
    isChecking,
    allRequiredGranted,
    permissionStatus,
    wasRevoked,
    denialMessage,
    platformCapabilities,
    requestPermissions,
    openAppSettings,
    clearDenialMessage,
    checkPermissions,
    platform,
  } = usePermissions();
  const [showDetails, setShowDetails] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    try {
      const result = await requestPermissions();
      if (!result.granted && result.deniedPermissions.length > 0) {
        // Denial message is set by the hook
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRetryPermissions = async () => {
    clearDenialMessage();
    await checkPermissions();
    if (!allRequiredGranted) {
      handleRequestPermissions();
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary-500 mr-3"></div>
        <div className="text-gray-600 text-sm sm:text-base">Checking permissions...</div>
      </div>
    );
  }

  if (allRequiredGranted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-xl sm:text-2xl">✅</span>
            <div>
              <span className="font-medium text-sm sm:text-base">All required permissions granted</span>
              <p className="text-xs sm:text-sm text-green-600">
                {platform === 'android' ? 'Full call log access enabled' : 'Limited features on iOS'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => checkPermissions()}
              className="text-xs sm:text-sm text-green-600 hover:text-green-700 px-2 sm:px-3 py-1 border border-green-300 rounded hover:bg-green-100"
              title="Re-check permissions"
            >
              🔄
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs sm:text-sm text-green-600 hover:text-green-700 underline"
            >
              {showDetails ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-3 sm:mt-4 space-y-2">
            <div className="text-xs text-green-700 mb-2 p-2 bg-green-100 rounded">
              💡 To revoke permissions, go to Settings → Apps → Call Monitor → Permissions
            </div>
            {permissions.map((permission) => (
              <div key={permission.name} className="flex items-center gap-2 text-xs sm:text-sm p-2 bg-white rounded border border-green-100">
                <span className={permission.granted ? 'text-green-600' : 'text-gray-400'}>
                  {permission.granted ? '✓' : '✗'}
                </span>
                <span className="text-gray-700 font-medium flex-1">{permission.name}</span>
                {permission.required && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Required
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Platform Capabilities Summary */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-green-200">
          <h4 className="text-xs sm:text-sm font-semibold text-green-800 mb-2">🔧 Available Features</h4>
          <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
            <div className={platformCapabilities.canAccessCallLogs ? 'text-green-700' : 'text-gray-400'}>
              {platformCapabilities.canAccessCallLogs ? '✓' : '✗'} Call Logs
            </div>
            <div className={platformCapabilities.canRecordCalls ? 'text-green-700' : 'text-gray-400'}>
              {platformCapabilities.canRecordCalls ? '✓' : '✗'} Recording
            </div>
            <div className={platformCapabilities.canAccessRecordings ? 'text-green-700' : 'text-gray-400'}>
              {platformCapabilities.canAccessRecordings ? '✓' : '✗'} Playback
            </div>
            <div className={platformCapabilities.canSyncData ? 'text-green-700' : 'text-gray-400'}>
              {platformCapabilities.canSyncData ? '✓' : '✗'} Sync
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      {/* Permission Revoked Alert */}
      {wasRevoked && (
        <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg animate-pulse">
          <div className="flex items-start gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-orange-900">Permissions Revoked</p>
              <p className="text-sm text-orange-800">
                Some required permissions were disabled. The app cannot function without them.
              </p>
              <button
                onClick={handleRetryPermissions}
                className="mt-2 text-sm bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              >
                🔓 Re-enable Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">🔒</span>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {permissionStatus === 'denied' ? 'Permissions Required' : 
             permissionStatus === 'partial' ? 'Some Permissions Missing' :
             'Grant Permissions to Continue'}
          </h2>
          <p className="text-sm text-gray-700">
            {permissionStatus === 'denied' 
              ? 'To view your call history, we need access to the following permissions'
              : 'Some required permissions are missing. Please grant them to use all features.'}
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
                <strong>Important: Apple Privacy Restrictions</strong>
              </p>
              <div className="bg-white p-3 rounded border border-purple-200 mb-2">
                <p className="text-xs text-purple-900 font-semibold mb-2">❌ Not Available on iOS:</p>
                <ul className="text-xs text-purple-700 list-disc list-inside space-y-1">
                  {platformCapabilities.limitations.map((limitation, index) => (
                    <li key={index}>{limitation}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-xs text-green-900 font-semibold mb-1">✓ Available on iOS:</p>
                <ul className="text-xs text-green-700 list-disc list-inside space-y-1">
                  <li>View call logs synced from your Android devices</li>
                  <li>Play call recordings synced from Android</li>
                  <li>Sync data across devices</li>
                </ul>
              </div>
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

      {denialMessage && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-xl">🚫</span>
            <div className="flex-1">
              <p className="text-sm text-red-700 font-bold mb-1">Permission Denied</p>
              <p className="text-sm text-red-600 mb-3">{denialMessage}</p>
              
              <div className="bg-white p-3 rounded border border-red-200 mb-3">
                <p className="text-xs text-red-900 font-semibold mb-2">📱 How to enable permissions manually:</p>
                <ol className="text-xs text-red-700 list-decimal list-inside space-y-1">
                  <li>Open your device <strong>Settings</strong></li>
                  <li>Go to <strong>Apps</strong> or <strong>Application Manager</strong></li>
                  <li>Find and tap <strong>Call Monitor</strong></li>
                  <li>Tap <strong>Permissions</strong></li>
                  <li>Enable all required permissions</li>
                  <li>Return to this app</li>
                </ol>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleRetryPermissions}
                  className="text-sm bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={clearDenialMessage}
                  className="text-sm border border-red-300 text-red-600 px-4 py-2 rounded hover:bg-red-100"
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={handleRequestPermissions}
          disabled={!Capacitor.isNativePlatform() || isRequesting}
          className="flex-1 bg-primary-500 text-white px-6 py-4 rounded-lg hover:bg-primary-600 transition-colors font-semibold text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRequesting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Requesting...</span>
            </>
          ) : Capacitor.isNativePlatform() ? (
            <>
              <span>🔓</span>
              <span>Grant Permissions</span>
            </>
          ) : (
            'Not Available on Web'
          )}
        </button>
        
        {/* If user granted permissions manually, this button will re-check and proceed */}
        <button
          onClick={async () => {
            setIsRequesting(true);
            await checkPermissions();
            setIsRequesting(false);
          }}
          disabled={isRequesting}
          className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>I Already Granted Permissions - Refresh</span>
        </button>
      </div>

      {/* Consent & Privacy Notice */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <span className="text-xl">🛡️</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Your Privacy & Consent</p>
            <div className="text-xs text-gray-700 leading-relaxed space-y-2">
              <p>
                <strong>Data Storage:</strong> Your call logs and recordings are stored securely on your device 
                with encryption. We never access or store your data on external servers without your explicit consent.
              </p>
              <p>
                <strong>Permission Control:</strong> You maintain full control over permissions at all times. 
                You can revoke any permission through your device Settings → Apps → Call Monitor → Permissions.
              </p>
              <p>
                <strong>No Third-Party Sharing:</strong> We never share, sell, or transfer your call data 
                to third parties. All data processing happens locally on your device.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Consent Notice */}
      <div className="mt-4 p-4 bg-yellow-100 rounded-lg border border-yellow-300">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div>
            <p className="text-sm font-semibold text-yellow-900">Explicit Consent Required</p>
            <p className="text-xs text-yellow-800">
              By tapping "Grant Permissions", you consent to allowing this app to access your call logs 
              and related features. The app will only function after you provide consent.
            </p>
          </div>
        </div>
      </div>

      {Capacitor.isNativePlatform() && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Tapping "Grant Permissions" will show system permission dialogs. You must approve each permission for the app to work.
          </p>
        </div>
      )}
    </div>
  );
};

export default PermissionsManager;
