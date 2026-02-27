/**
 * LMS Integration Configuration
 * This file contains all settings for communicating with the Lead Manager System
 */

export const LMS_CONFIG = {
  // Your LMS domain - UPDATE THIS!
  baseUrl: process.env.NEXT_PUBLIC_LMS_URL || 'http://localhost:3000',
  
  // API key for authentication (must match LMS .env)
  apiKey: process.env.NEXT_PUBLIC_LMS_API_KEY || 'CallMonitor-LMS-SecretKey-2026-Feb-Random-789xyz',
  
  // API endpoints
  endpoints: {
    matchCall: '/api/call-monitor/match-call',
    updateRecording: '/api/call-monitor/update-recording',
    health: '/api/health',
  },
  
  // Matching settings
  timeWindowMinutes: 3, // Match calls within ±3 minutes
  
  // Enable/disable LMS integration
  // DISABLED: Set to false to skip LMS checks and avoid timeouts
  enabled: false, // Change to true when LMS server is configured
  
  // Use Edge Function for server-side LMS API calls (recommended for mobile)
  // When true, the mobile app skips direct LMS API calls and relies on Supabase Edge Function
  // This bypasses mobile network restrictions by using server-to-server communication
  useEdgeFunction: process.env.NEXT_PUBLIC_LMS_USE_EDGE_FUNCTION !== 'false', // Enabled by default
};

export default LMS_CONFIG;
