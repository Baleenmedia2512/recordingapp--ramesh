import { Capacitor } from '@capacitor/core';

export interface LMSCallContext {
  phoneNumber: string;
  lmsCallId: string;
  customerName?: string;
  customerId?: string;
  leadId?: string;
  dealId?: string;
  campaign?: string;
  timestamp: number;
  expiresAt: number; // Context expires after 2 minutes
}

class LMSHttpServerService {
  private port: number = 8080;
  private isRunning: boolean = false;
  private callContext: Map<string, LMSCallContext> = new Map();

  constructor() {
    // Clean up expired contexts every minute
    setInterval(() => this.cleanupExpiredContexts(), 60000);
  }

  /**
   * Start the HTTP server (Web only)
   * On native platforms, we use localStorage for context sharing
   */
  async startServer(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      console.log('🏢 [LMS Server] Native platform - using localStorage for context');
      this.isRunning = true;
      return true;
    }

    try {
      // For web, we would need to implement a simple HTTP server
      // For now, we'll use a message channel approach
      this.setupMessageChannel();
      this.isRunning = true;
      console.log(`🏢 [LMS Server] Message channel ready for LMS context`);
      return true;
    } catch (error) {
      console.error('🏢 [LMS Server] Failed to start:', error);
      return false;
    }
  }

  /**
   * Stop the HTTP server
   */
  async stopServer(): Promise<void> {
    this.isRunning = false;
    this.callContext.clear();
    console.log('🏢 [LMS Server] Stopped');
  }

  /**
   * Set call context from LMS (before call is made)
   */
  setCallContext(context: Omit<LMSCallContext, 'timestamp' | 'expiresAt'>): void {
    const now = Date.now();
    const fullContext: LMSCallContext = {
      ...context,
      timestamp: now,
      expiresAt: now + (2 * 60 * 1000) // 2 minutes from now
    };

    // Store in memory
    this.callContext.set(context.phoneNumber, fullContext);

    // Also store in localStorage for persistence across restarts
    localStorage.setItem('lmsCallContext', JSON.stringify(fullContext));
    
    console.log('🏢 [LMS Server] Call context set:', {
      phoneNumber: context.phoneNumber,
      lmsCallId: context.lmsCallId,
      customerName: context.customerName,
      expiresAt: new Date(fullContext.expiresAt).toISOString()
    });
  }

  /**
   * Get call context for a phone number
   */
  getCallContext(phoneNumber: string): LMSCallContext | null {
    // First check memory
    let context = this.callContext.get(phoneNumber);
    
    // If not found in memory, check localStorage
    if (!context) {
      try {
        const stored = localStorage.getItem('lmsCallContext');
        if (stored) {
          const parsedContext = JSON.parse(stored) as LMSCallContext;
          if (parsedContext.phoneNumber === phoneNumber && parsedContext.expiresAt > Date.now()) {
            context = parsedContext;
            // Restore to memory
            this.callContext.set(phoneNumber, context);
          }
        }
      } catch (error) {
        console.error('🏢 [LMS Server] Error reading context from localStorage:', error);
      }
    }

    // Check if context has expired
    if (context && context.expiresAt <= Date.now()) {
      console.log('🏢 [LMS Server] Context expired for:', phoneNumber);
      this.callContext.delete(phoneNumber);
      localStorage.removeItem('lmsCallContext');
      return null;
    }

    return context || null;
  }

  /**
   * Clear call context after use
   */
  clearCallContext(phoneNumber: string): void {
    this.callContext.delete(phoneNumber);
    
    // Also clear from localStorage if it matches
    try {
      const stored = localStorage.getItem('lmsCallContext');
      if (stored) {
        const parsedContext = JSON.parse(stored) as LMSCallContext;
        if (parsedContext.phoneNumber === phoneNumber) {
          localStorage.removeItem('lmsCallContext');
        }
      }
    } catch (error) {
      console.error('🏢 [LMS Server] Error clearing context from localStorage:', error);
    }
    
    console.log('🏢 [LMS Server] Context cleared for:', phoneNumber);
  }

  /**
   * Setup message channel for web-based LMS communication
   */
  private setupMessageChannel(): void {
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'LMS_SET_CALL_CONTEXT') {
        this.setCallContext(event.data.context);
        
        // Send confirmation back to LMS
        (event.source as any)?.postMessage({
          type: 'LMS_CONTEXT_SET',
          success: true,
          phoneNumber: event.data.context.phoneNumber
        }, event.origin);
      }
    });
  }

  /**
   * Cleanup expired contexts
   */
  private cleanupExpiredContexts(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.callContext.forEach((context, phoneNumber) => {
      if (context.expiresAt <= now) {
        expired.push(phoneNumber);
      }
    });

    expired.forEach(phoneNumber => {
      this.callContext.delete(phoneNumber);
      console.log('🏢 [LMS Server] Cleaned up expired context for:', phoneNumber);
    });

    // Also check localStorage
    try {
      const stored = localStorage.getItem('lmsCallContext');
      if (stored) {
        const parsedContext = JSON.parse(stored) as LMSCallContext;
        if (parsedContext.expiresAt <= now) {
          localStorage.removeItem('lmsCallContext');
          console.log('🏢 [LMS Server] Cleaned up expired localStorage context');
        }
      }
    } catch (error) {
      // Ignore localStorage errors
    }

    if (expired.length > 0) {
      console.log(`🏢 [LMS Server] Cleaned up ${expired.length} expired contexts`);
    }
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      activeContexts: this.callContext.size,
      contexts: Array.from(this.callContext.entries()).map(([phone, context]) => ({
        phoneNumber: phone,
        lmsCallId: context.lmsCallId,
        customerName: context.customerName,
        expiresAt: new Date(context.expiresAt).toISOString()
      }))
    };
  }
}

// Singleton instance
export const lmsHttpServer = new LMSHttpServerService();

/**
 * Initialize LMS HTTP server
 */
export async function initializeLMSServer(): Promise<boolean> {
  return await lmsHttpServer.startServer();
}

/**
 * Handle LMS call context from external source
 */
export function handleLMSCallContext(context: Omit<LMSCallContext, 'timestamp' | 'expiresAt'>): void {
  lmsHttpServer.setCallContext(context);
}

/**
 * Check if a call is from LMS based on context
 */
export function checkLMSContext(phoneNumber: string): LMSCallContext | null {
  return lmsHttpServer.getCallContext(phoneNumber);
}

/**
 * Clear LMS context after successful processing
 */
export function clearLMSContext(phoneNumber: string): void {
  lmsHttpServer.clearCallContext(phoneNumber);
}