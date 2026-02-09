import { useEffect, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { testLMSConnection } from '@/services/lmsApi';
import { 
  handleOutgoingCall, 
  sendRecordingToLMS, 
  completeRecordingUpload,
  getLMSCallInfo 
} from '@/services/googleDriveService';

export interface LMSStatus {
  isConnected: boolean;
  lastChecked: Date | null;
  currentLMSCall: any | null;
}

/**
 * Hook for LMS integration with call monitoring
 * Handles checking calls against LMS and sending recordings back
 */
export const useLMSIntegration = () => {
  const [lmsStatus, setLmsStatus] = useState<LMSStatus>({
    isConnected: false,
    lastChecked: null,
    currentLMSCall: null,
  });

  /**
   * Test LMS connection
   */
  const checkLMSConnection = useCallback(async () => {
    try {
      const connected = await testLMSConnection();
      setLmsStatus(prev => ({
        ...prev,
        isConnected: connected,
        lastChecked: new Date(),
      }));
      return connected;
    } catch (error) {
      console.error('[LMS Hook] Error checking connection:', error);
      setLmsStatus(prev => ({
        ...prev,
        isConnected: false,
        lastChecked: new Date(),
      }));
      return false;
    }
  }, []);

  /**
   * Handle an outgoing call - check if it's from LMS
   */
  const processOutgoingCall = useCallback(async (
    phoneNumber: string,
    callStartTime?: Date
  ) => {
    try {
      const timestamp = callStartTime || new Date();
      await handleOutgoingCall(phoneNumber, timestamp);
      
      // Update current LMS call info if available
      const lmsCallInfo = getLMSCallInfo();
      if (lmsCallInfo) {
        setLmsStatus(prev => ({
          ...prev,
          currentLMSCall: lmsCallInfo,
        }));
      }
    } catch (error) {
      console.error('[LMS Hook] Error processing outgoing call:', error);
    }
  }, []);

  /**
   * Send recording to LMS after upload
   */
  const sendRecordingToLMSServer = useCallback(async (
    recordingUrl: string,
    duration: number,
    recordingId?: string
  ): Promise<boolean> => {
    try {
      const success = await sendRecordingToLMS(recordingUrl, duration, recordingId);
      
      // Clear current LMS call if successfully sent
      if (success) {
        setLmsStatus(prev => ({
          ...prev,
          currentLMSCall: null,
        }));
      }
      
      return success;
    } catch (error) {
      console.error('[LMS Hook] Error sending recording:', error);
      return false;
    }
  }, []);

  /**
   * Complete upload flow: Upload to Drive and send to LMS
   */
  const completeRecordingFlow = useCallback(async (
    uploadResult: { fileId: string; webViewLink: string },
    duration: number,
    localFilePath?: string
  ) => {
    try {
      const result = await completeRecordingUpload(uploadResult, duration, localFilePath);
      
      // Clear current LMS call if successfully sent
      if (result.sentToLMS) {
        setLmsStatus(prev => ({
          ...prev,
          currentLMSCall: null,
        }));
      }
      
      return result;
    } catch (error) {
      console.error('[LMS Hook] Error completing recording flow:', error);
      return {
        success: false,
        sentToLMS: false,
      };
    }
  }, []);

  /**
   * Get current LMS call information
   */
  const getCurrentLMSCall = useCallback(() => {
    return getLMSCallInfo();
  }, []);

  /**
   * Listen for phone state changes (outgoing calls)
   * This is used on native platforms to detect when calls are made
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listener: any = null;

    const setupListener = async () => {
      try {
        // Listen for phone state changes
        listener = await CallMonitor.addListener('phoneStateChanged', async (data: any) => {
          console.log('[LMS Hook] Phone state changed:', data);
          
          // Check if this is an outgoing call
          if (data.state === 'OFFHOOK' && data.phoneNumber && data.isOutgoing) {
            console.log('[LMS Hook] Outgoing call detected:', data.phoneNumber);
            await processOutgoingCall(data.phoneNumber, new Date(data.timestamp || Date.now()));
          }
        });
      } catch (error) {
        console.error('[LMS Hook] Error setting up listener:', error);
      }
    };

    setupListener();

    // Cleanup
    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [processOutgoingCall]);

  /**
   * Check LMS connection on mount
   */
  useEffect(() => {
    checkLMSConnection();
  }, [checkLMSConnection]);

  return {
    lmsStatus,
    checkLMSConnection,
    processOutgoingCall,
    sendRecordingToLMSServer,
    completeRecordingFlow,
    getCurrentLMSCall,
  };
};
