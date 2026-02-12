// Supabase Edge Function to notify LMS API about call recordings
// This runs on the server side, bypassing mobile network restrictions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface CallLogPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: {
    id: string;
    phoneDialed: string;
    callStatus: string;
    createdAt: string;
    duration: number;
    recordingUrl: string | null;
  };
  old_record: any;
}

interface LMSMatchCallResponse {
  success: boolean;
  matched: boolean;
  callInfo?: {
    leadId: string;
    courseId: string;
    courseName: string;
    studentName: string;
    studentPhone: string;
  };
}

interface LMSUpdateRecordingResponse {
  success: boolean;
  updated: boolean;
  message?: string;
}

const LMS_BASE_URL = Deno.env.get('LMS_BASE_URL') || 'https://e2wleadmanager.vercel.app';
const LMS_API_KEY = Deno.env.get('LMS_API_KEY') || 'CallMonitor-LMS-SecretKey-2026-Feb-Random-789xyz';

async function matchCallWithLMS(phoneNumber: string, timestamp: string): Promise<LMSMatchCallResponse | null> {
  try {
    console.log(`🔍 Matching call with LMS: ${phoneNumber} at ${timestamp}`);
    
    const response = await fetch(`${LMS_BASE_URL}/api/call-monitor/match-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneNumber.replace(/^\+/, ''), // Remove leading + if present
        timestamp: timestamp,
        apiKey: LMS_API_KEY,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      console.error(`❌ LMS match-call failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as LMSMatchCallResponse;
    console.log(`✅ LMS match-call response:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Error matching call with LMS:`, error);
    return null;
  }
}

async function updateLMSRecording(
  phoneNumber: string, 
  timestamp: string, 
  recordingUrl: string,
  duration: number,
  callInfo?: any
): Promise<boolean> {
  try {
    console.log(`📤 Sending recording to LMS: ${phoneNumber}`);
    console.log(`📎 Recording URL: ${recordingUrl}`);
    
    const response = await fetch(`${LMS_BASE_URL}/api/call-monitor/update-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneNumber.replace(/^\+/, ''),
        timestamp: timestamp,
        recordingUrl: recordingUrl,
        duration: duration,
        callInfo: callInfo || null,
        apiKey: LMS_API_KEY,
      }),
      signal: AbortSignal.timeout(20000), // 20s timeout
    });

    if (!response.ok) {
      console.error(`❌ LMS update-recording failed: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json() as LMSUpdateRecordingResponse;
    console.log(`✅ LMS update-recording response:`, data);
    return data.success;
  } catch (error) {
    console.error(`❌ Error updating LMS recording:`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`📨 Received request: ${req.method} ${req.url}`);
    
    const payload: CallLogPayload = await req.json();
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

    const { record } = payload;
    const { phoneDialed, createdAt, recordingUrl, duration } = record;

    // Only process if this is an outgoing call with a recording URL
    if (record.callStatus !== 'outgoing') {
      console.log(`⏭️ Skipping non-outgoing call: ${record.callStatus}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Not an outgoing call, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recordingUrl) {
      console.log(`⏭️ No recording URL yet, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: 'No recording URL yet, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Processing outgoing call: ${phoneDialed} with recording`);

    // Step 1: Match call with LMS
    const matchResult = await matchCallWithLMS(phoneDialed, createdAt);
    
    // Step 2: Update recording in LMS
    const updateSuccess = await updateLMSRecording(
      phoneDialed,
      createdAt,
      recordingUrl,
      duration || 0,
      matchResult?.callInfo
    );

    if (updateSuccess) {
      console.log(`✅ Successfully notified LMS about recording`);
      return new Response(
        JSON.stringify({
          success: true,
          matched: matchResult?.matched || false,
          updated: updateSuccess,
          callInfo: matchResult?.callInfo || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`⚠️ Failed to update LMS, but will retry later`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update LMS',
          matched: matchResult?.matched || false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error(`❌ Edge Function error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
