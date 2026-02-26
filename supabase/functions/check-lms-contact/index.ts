// Supabase Edge Function to check if a phone number exists in LMS
// Called by Android UploadWorker to determine notification actions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface CheckContactRequest {
  phone: string;
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

async function checkPhoneInLMS(phone: string): Promise<{ exists: boolean; leadName?: string; leadId?: string }> {
  const phoneVariants = getPhoneVariants(phone);
  
  console.log(`🔍 Checking if phone exists in LMS: ${phone}`);
  console.log(`📱 Phone variants to check: ${phoneVariants.join(', ')}`);

  // Try each phone variant
  for (const phoneVariant of phoneVariants) {
    try {
      // Call LMS API to check if contact exists
      const checkUrl = `${LMS_BASE_URL}/api/call-monitor/check-contact`;
      
      const requestBody = {
        phone: phoneVariant,
        apiKey: LMS_API_KEY,
      };

      console.log(`📤 Checking LMS for: ${phoneVariant}`);

      const response = await fetch(checkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.warn(`⚠️ LMS check failed for ${phoneVariant}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`📥 LMS response for ${phoneVariant}:`, data);

      // If contact exists in LMS
      if (data.exists || data.found) {
        console.log(`✅ Phone found in LMS: ${phoneVariant}`);
        return {
          exists: true,
          leadName: data.leadName || data.name || data.contactName,
          leadId: data.leadId || data.id,
        };
      }
    } catch (error) {
      console.error(`❌ Error checking LMS for ${phoneVariant}:`, error);
      // Continue to next variant
    }
  }

  console.log(`❌ Phone not found in LMS: ${phone}`);
  return { exists: false };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: CheckContactRequest = await req.json();
    console.log('📱 Check LMS contact request:', payload);

    if (!payload.phone) {
      return new Response(
        JSON.stringify({ 
          exists: false,
          error: 'Missing phone number' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if phone exists in LMS
    const result = await checkPhoneInLMS(payload.phone);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        exists: false,
        error: error.message || 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
