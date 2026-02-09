/**
 * Environment Configuration
 * This file directly exports environment variables for runtime use
 */

// Supabase Configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wkwrrdcjknvupwsfdjtd.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrd3JyZGNqa252dXB3c2ZkanRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDI2OTIsImV4cCI6MjA4MzQxODY5Mn0.nMYFs8RtopRXN5MzDHfsMIiFoTbwTloACdgpIWk3UgA';

// LMS Configuration
export const LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;
export const LMS_API_KEY = process.env.NEXT_PUBLIC_LMS_API_KEY;
export const LMS_ENABLED = process.env.NEXT_PUBLIC_LMS_ENABLED === 'true';

// Debug logging
console.log('🔍 [env.ts] Environment config loaded');
console.log('🔍 [env.ts] Supabase URL:', SUPABASE_URL);
console.log('🔍 [env.ts] Supabase Key:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING');
