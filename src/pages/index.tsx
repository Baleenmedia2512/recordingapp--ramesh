import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import Dashboard from '@/components/Dashboard';
import PermissionsManager from '@/components/PermissionsManager';
import { Capacitor } from '@capacitor/core';

export default function Home() {
  const { allRequiredGranted, platform } = usePermissions();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-primary-600">📞 Call Monitor</h1>
              {Capacitor.isNativePlatform() && (
                <span className="text-sm px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                  {platform === 'android' ? '🤖 Android' : '🍎 iOS'}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Show permissions manager on native platforms */}
        {Capacitor.isNativePlatform() && (
          <PermissionsManager />
        )}
        
        {/* Show dashboard when permissions are granted or on web */}
        {(!Capacitor.isNativePlatform() || allRequiredGranted) && (
          <Dashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Call Monitor. All rights reserved.</p>
          <p className="mt-2">
            Your privacy is important. All data is encrypted and stored securely.
          </p>
        </div>
      </footer>
    </div>
  );
}
