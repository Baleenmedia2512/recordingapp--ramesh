// Supabase Edge Function to sync leads from leads_metadata to external LMS
// Called by: AddLeadModal.tsx (manual sync) and auto_sync_lead_to_lms() trigger (automatic)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from "../_shared/cors.ts";

interface LeadSyncRequest {
  phone: string;
  leadName: string;
  company?: string;
  email?: string;
  designation?: string;
  notes?: string;
  leadDate?: string;
  leadTime?: string;
  clientPlatform?: string;
  adEnquiry?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  remarks?: string;
  handledBy?: string;
}

const LMS_BASE_URL = Deno.env.get('LMS_BASE_URL') || 'https://e2wleadmanager.vercel.app';
const LMS_API_KEY = Deno.env.get('CALL_MONITOR_API_KEY') || 'CallMonitor-LMS-SecretKey-2026-Feb-Random-789xyz';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Sync lead to LMS request received');
    
    // Parse request body
    const leadData: LeadSyncRequest = await req.json();
    console.log('📋 Lead data:', { 
      phone: leadData.phone, 
      name: leadData.leadName,
      platform: leadData.clientPlatform 
    });

    // Validate required fields
    if (!leadData.phone || !leadData.leadName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone and leadName are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Normalize phone number - remove country code (91) if present
    let normalizedPhone = leadData.phone;
    if (normalizedPhone.startsWith('91') && normalizedPhone.length > 10) {
      normalizedPhone = normalizedPhone.substring(2); // Remove '91' prefix
      console.log(`📞 Normalized phone: ${leadData.phone} → ${normalizedPhone}`);
    }
    
    // Normalize alternate phone if present
    let normalizedAlternatePhone = leadData.alternatePhone;
    if (normalizedAlternatePhone && normalizedAlternatePhone.startsWith('91') && normalizedAlternatePhone.length > 10) {
      normalizedAlternatePhone = normalizedAlternatePhone.substring(2);
      console.log(`📞 Normalized alternate phone: ${leadData.alternatePhone} → ${normalizedAlternatePhone}`);
    }

    // Sync to external LMS lead table
    console.log(`📤 Syncing to LMS: ${LMS_BASE_URL}/api/leads`);
    
    // Build customer requirement from notes and remarks
    const customerRequirement = [
      leadData.notes,
      leadData.remarks,
      leadData.adEnquiry ? `Ad Enquiry: ${leadData.adEnquiry}` : null
    ].filter(Boolean).join(' | ') || 'Lead from Call Monitor App';
    
    // Use ad_enquiry as campaign if available, otherwise default
    const campaignName = leadData.adEnquiry || 'Call Monitor Campaign';
    
    const requestBody = {
      // Map fields to LMS schema (camelCase, matching actual LMS structure)
      name: leadData.leadName,
      phone: normalizedPhone,
      email: leadData.email || null,
      alternatePhone: normalizedAlternatePhone || null,
      address: leadData.address || null,
      city: leadData.city || null,
      state: leadData.state || null,
      pincode: leadData.pincode || null,
      source: leadData.clientPlatform || 'Call Monitor',
      campaign: campaignName,
      customerRequirement: customerRequirement,
      status: 'new',
      priority: 'medium',
      notes: `Lead captured on ${leadData.leadDate || new Date().toISOString().split('T')[0]} at ${leadData.leadTime || new Date().toTimeString().slice(0, 5)}${leadData.handledBy ? ` by ${leadData.handledBy}` : ''}${leadData.company ? ` | Company: ${leadData.company}` : ''}${leadData.designation ? ` | Designation: ${leadData.designation}` : ''}`,
      // Assign all Call Monitor leads to Gomathi (email-based assignment)
      assignedTo: 'gomathi@baleenmedia.com',
      assignedToId: 'cmiilnjo8000417yycazxvwkv',
      createdById: 'cmiilnjo8000417yycazxvwkv',
    };
    
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    const lmsResponse = await fetch(`${LMS_BASE_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LMS_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    // Log response details
    console.log('📥 LMS Response Status:', lmsResponse.status, lmsResponse.statusText);
    console.log('📥 LMS Response Headers:', Object.fromEntries(lmsResponse.headers.entries()));
    
    // Get response as text first to see what we actually received
    const responseText = await lmsResponse.text();
    console.log('📥 LMS Response Body (raw):', responseText);
    
    // Try to parse as JSON
    let lmsData;
    try {
      lmsData = JSON.parse(responseText);
      console.log('✅ Parsed JSON response:', lmsData);
    } catch (parseError) {
      console.error('❌ Failed to parse LMS response as JSON:', parseError.message);
      console.error('❌ Raw response was:', responseText.substring(0, 500)); // First 500 chars
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LMS returned invalid JSON',
          details: {
            status: lmsResponse.status,
            statusText: lmsResponse.statusText,
            body: responseText.substring(0, 500)
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!lmsResponse.ok) {
      console.error('❌ LMS sync failed with status', lmsResponse.status, ':', lmsData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LMS API error',
          details: lmsData 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Lead synced to LMS successfully:', lmsData);

    // Update leads_metadata to mark as synced
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseClient
        .from('leads_metadata')
        .update({ 
          is_synced_to_lms: true,
          lms_lead_id: lmsData.leadId || lmsData.id || null 
        })
        .eq('phone_number', leadData.phone);

      if (updateError) {
        console.warn('⚠️ Failed to update is_synced_to_lms flag:', updateError);
        // Don't fail the request - lead is synced, just flag not updated
      } else {
        console.log('✅ Updated is_synced_to_lms flag for phone:', leadData.phone);
      }
    } catch (updateErr) {
      console.warn('⚠️ Error updating sync status:', updateErr);
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: true,
        lmsLeadId: lmsData.leadId || lmsData.id,
        message: 'Lead synced to LMS successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error syncing lead:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error',
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
