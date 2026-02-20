// Supabase Edge Function for direct LMS sync from native Android code
// This bypasses the database trigger and provides immediate LMS synchronization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface DirectNotifyRequest {
  phone: string;
  timestamp: number;
  recordingUrl: string;
  duration: number;
}

interface NormalizedMatchResult {
  matched: boolean;
  callLogId: string | null;
  callInfo: any;
  matchedPhone: string | null;
  authFailed: boolean;
  raw: any;
}

const LMS_BASE_URL = Deno.env.get('LMS_BASE_URL') || 'https://e2wleadmanager.vercel.app';
const LMS_API_KEY = Deno.env.get('CALL_MONITOR_API_KEY') || Deno.env.get('LMS_API_KEY') || 'CallMonitor-LMS-SecretKey-2026-Feb-Random-789xyz';

function getPhoneVariants(phone: string): string[] {
  const cleaned = String(phone || '').trim();
  const noPlus = cleaned.replace(/^\+/, '');
  const digitsOnly = cleaned.replace(/\D/g, '');
  const variants = [cleaned, noPlus, digitsOnly].filter(Boolean);

  if (digitsOnly.length > 10) {
    variants.push(digitsOnly.slice(-10));
  }

  if (noPlus.startsWith('91') && noPlus.length >= 12) {
    variants.push(noPlus.slice(-10));
  }

  return [...new Set(variants)];
}

function parseMatchResponse(matchData: any): { matched: boolean; callLogId: string | null; callInfo: any } {
  const matched = Boolean(matchData?.isLMSCall || matchData?.matched);
  const callLogId = matchData?.callLogId || matchData?.callInfo?.callLogId || null;
  const callInfo = matchData?.callInfo || null;
  return { matched, callLogId, callInfo };
}

async function matchCallWithLMS(phone: string, isoTimestamp: string): Promise<NormalizedMatchResult> {
  const phoneVariants = getPhoneVariants(phone);
  let authFailed = false;

  // Log API key info for debugging (without exposing the full key)
  const keyPrefix = LMS_API_KEY ? LMS_API_KEY.substring(0, 20) + '...' : 'NOT_SET';
  console.log(`🔑 Using API key: ${keyPrefix}`);
  console.log(`🌐 LMS Base URL: ${LMS_BASE_URL}`);

  for (const phoneVariant of phoneVariants) {
    try {
      console.log(`🔍 Trying LMS match for phone variant: ${phoneVariant}`);

      const requestBody = {
        phone: phoneVariant,
        timestamp: isoTimestamp,
        apiKey: LMS_API_KEY,
      };
      console.log(`📤 Request body (key masked): phone=${phoneVariant}, timestamp=${isoTimestamp}, apiKey=${keyPrefix}`);

      const matchResponse = await fetch(`${LMS_BASE_URL}/api/call-monitor/match-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000),
      });

      if (!matchResponse.ok) {
        const errorText = await matchResponse.text();
        console.error(`❌ LMS match failed for ${phoneVariant}: ${matchResponse.status} ${matchResponse.statusText}`);
        console.error(`📥 Full error response: ${errorText}`);
        console.error(`🔗 Request URL: ${LMS_BASE_URL}/api/call-monitor/match-call`);
        if (matchResponse.status === 401 || matchResponse.status === 403) {
          authFailed = true;
          console.error(`🚨 AUTHENTICATION FAILED - LMS rejected API key`);
        }
        continue;
      }

      const matchData = await matchResponse.json();
      console.log('✅ LMS match response:', matchData);

      const parsed = parseMatchResponse(matchData);
      if (parsed.matched) {
        console.log(`✅ LMS match found using phone variant: ${phoneVariant}`);
        return {
          matched: true,
          callLogId: parsed.callLogId,
          callInfo: parsed.callInfo,
          matchedPhone: phoneVariant,
          authFailed: false,
          raw: matchData,
        };
      }
    } catch (error) {
      console.error(`❌ LMS match error for ${phoneVariant}:`, error);
    }
  }

  return {
    matched: false,
    callLogId: null,
    callInfo: null,
    matchedPhone: null,
    authFailed,
    raw: null,
  };
}

async function updateLMSRecordingWithBody(requestBody: Record<string, unknown>) {
  const updateResponse = await fetch(`${LMS_BASE_URL}/api/call-monitor/update-recording`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(20000),
  });

  const responseText = await updateResponse.text();
  let responseJson: any = null;

  try {
    responseJson = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseJson = null;
  }

  return {
    ok: updateResponse.ok,
    status: updateResponse.status,
    text: responseText,
    json: responseJson,
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: DirectNotifyRequest = await req.json();
    console.log('📱 Native auto-upload LMS sync request:', payload);

    if (!payload.phone || !payload.recordingUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate and convert timestamp
    let callTimestamp: Date;
    if (payload.timestamp && !isNaN(Number(payload.timestamp))) {
      callTimestamp = new Date(Number(payload.timestamp));
    } else {
      console.warn('⚠️ Invalid timestamp, using current time');
      callTimestamp = new Date();
    }
    
    console.log(`📅 Using timestamp: ${callTimestamp.toISOString()}`);

    // Use webhook endpoint (no auth required, works reliably)
    console.log(`📤 Sending to LMS webhook: ${payload.phone}`);
    
    const webhookBody = {
      phoneNumber: payload.phone,
      recordingUrl: payload.recordingUrl,
      duration: payload.duration,
    };
    
    console.log(`📦 Webhook payload:`, webhookBody);

    const webhookResponse = await fetch(`${LMS_BASE_URL}/api/webhooks/supabase-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookBody),
      signal: AbortSignal.timeout(20000),
    });

    const responseText = await webhookResponse.text();
    let responseJson: any = null;

    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = null;
    }

    if (webhookResponse.ok) {
      console.log('✅ LMS webhook succeeded:', responseJson || responseText);

      return new Response(
        JSON.stringify({
          success: true,
          matched: responseJson?.success || false,
          updated: true,
          callLogId: responseJson?.callLogId || null,
          leadName: responseJson?.leadName || null,
          message: responseJson?.message || 'Recording synced to LMS via webhook'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('❌ LMS webhook failed:', webhookResponse.status, responseText);

      return new Response(
        JSON.stringify({
          success: false,
          matched: false,
          updated: false,
          error: `LMS webhook failed: ${webhookResponse.status}`,
          details: responseText
        }),
        {
          status: webhookResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
