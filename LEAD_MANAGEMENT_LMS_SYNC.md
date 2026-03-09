# Lead Management - LMS Sync Implementation Guide

## Overview

This guide explains how to implement the LMS sync functionality for the Lead Management feature. Currently, the `syncLeadToLMS()` function in `src/services/leadActionService.ts` is a **placeholder** that simulates the API call.

## Current Status

✅ **Implemented:**
- Phone number lookup (Contacts, Leads, LMS)
- Notification system with all 4 cases
- AddLeadForm component
- Save to Android Contacts
- Save to `leads_metadata` table
- Error handling and logging
- Feature flag (`LEAD_MANAGEMENT_ENABLED`)

🟡 **Needs Implementation:**
- Actual LMS API integration in `syncLeadToLMS()`

---

## Implementation Steps

### 1. Locate the Function

**File:** `src/services/leadActionService.ts`  
**Function:** `syncLeadToLMS()`  
**Lines:** ~16-53

### 2. Current Placeholder Code

```typescript
async function syncLeadToLMS(leadData: {
  name: string;
  phone: string;
  company?: string;
  email?: string;
  designation?: string;
  notes?: string;
}): Promise<{ success: boolean; leadId?: string }> {
  try {
    console.log('🌐 Syncing lead to external LMS:', leadData);
    
    // TODO: Implement actual LMS API call
    // Simulated response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      leadId: `LMS_${Date.now()}`,
    };
  } catch (error) {
    console.error('❌ Error syncing lead to LMS:', error);
    return { success: false };
  }
}
```

### 3. Implementation Template

Replace the TODO section with your actual LMS API call:

```typescript
async function syncLeadToLMS(leadData: {
  name: string;
  phone: string;
  company?: string;
  email?: string;
  designation?: string;
  notes?: string;
}): Promise<{ success: boolean; leadId?: string }> {
  try {
    console.log('🌐 Syncing lead to external LMS:', leadData);
    
    // Get LMS configuration
    const LMS_BASE_URL = process.env.NEXT_PUBLIC_LMS_URL || 'https://your-lms-domain.com';
    const LMS_API_KEY = process.env.NEXT_PUBLIC_LMS_API_KEY || 'your-api-key';
    
    // Make API call to your LMS
    const response = await fetch(`${LMS_BASE_URL}/api/leads/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LMS_API_KEY}`,
        // Add any other headers your LMS requires
      },
      body: JSON.stringify({
        name: leadData.name,
        phone: leadData.phone,
        company: leadData.company,
        email: leadData.email,
        designation: leadData.designation,
        notes: leadData.notes,
        // Add any other fields your LMS requires
        source: 'call-monitor-app',
        createdAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ LMS API error:', response.status, errorText);
      throw new Error(`LMS API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      leadId: data.leadId || data.id || `LMS_${Date.now()}`,
    };
  } catch (error) {
    console.error('❌ Error syncing lead to LMS:', error);
    return { success: false };
  }
}
```

---

## LMS API Requirements

Your LMS API endpoint should:

1. **Accept POST requests** to create a new lead
2. **Return a lead ID** that can be stored in `leads_metadata.lms_lead_id`
3. **Handle authentication** (bearer token, API key, etc.)
4. **Accept lead data** with at minimum:
   - `name` (required)
   - `phone` (required)
   - Additional fields: company, email, designation, notes

### Example Request

```json
POST https://your-lms-domain.com/api/leads/create
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "name": "John Doe",
  "phone": "9876543210",
  "company": "Acme Corp",
  "email": "john@acme.com",
  "designation": "CEO",
  "notes": "Called from mobile app",
  "source": "call-monitor-app"
}
```

### Example Response

```json
{
  "success": true,
  "leadId": "LMS_12345",
  "message": "Lead created successfully"
}
```

---

## Environment Variables

Add to your `.env.local` file:

```bash
# LMS API Configuration
NEXT_PUBLIC_LMS_URL=https://your-lms-domain.com
NEXT_PUBLIC_LMS_API_KEY=your-api-key-here
NEXT_PUBLIC_LMS_ENABLED=true

# Lead Management Feature Flag (enabled by default)
NEXT_PUBLIC_LEAD_MANAGEMENT_ENABLED=true
```

---

## Testing the Integration

### 1. Enable the Feature

Ensure in `.env.local`:
```bash
NEXT_PUBLIC_LEAD_MANAGEMENT_ENABLED=true
```

### 2. Test the Flow

1. Make a call to a number NOT in your contacts/LMS
2. After call ends, notification should appear: **"Add as Lead?"**
3. Click notification → AddLeadForm opens
4. Fill in details and check **"Sync to LMS"**
5. Submit form
6. Check logs for: `✅ Synced to external LMS`
7. Verify in your LMS that the lead was created
8. Check `leads_metadata` table - `lms_lead_id` should be populated

### 3. Test All Scenarios

| Scenario | Expected Notification |
|----------|---------------------|
| Not found anywhere | "Add as Lead?" |
| Found in LMS only | "Add to Contacts?" |
| Found in Contacts only | "Add to LMS?" |
| Found in both | "Already Available" (no action) |

---

## Error Handling

The current implementation handles errors gracefully:

1. **LMS sync fails** → Other operations (contacts, leads DB) continue
2. **Errors are logged** → Check browser console / logcat
3. **User gets feedback** → Toast notifications show what succeeded/failed
4. **Results tracked** → `saveLeadToAllSources()` returns detailed result object

---

## Troubleshooting

### LMS Sync Always Fails

1. Check environment variables are set correctly
2. Verify LMS API endpoint URL
3. Check API authentication (API key/token)
4. Check CORS settings on LMS server
5. Review network tab for actual error response

### Notification Not Showing

1. Check: `LEAD_MANAGEMENT_ENABLED=true` in env
2. Check browser console for errors
3. Verify notification permissions granted
4. Check logs: Should see "📢 [Lead Check] Showing notification"

### Form Not Opening

1. Check Dashboard component imports `useLeadManagement`
2. Verify AddLeadForm modal is rendered
3. Check for JavaScript errors in console

---

## Architecture Notes

### Why This Approach?

✅ **Modular** - LMS sync is isolated in one function  
✅ **Safe** - Errors don't break other operations  
✅ **Flexible** - Easy to swap LMS providers  
✅ **Trackable** - Detailed logging and result tracking  
✅ **Testable** - Can test with placeholder before real API  

### Database Flow

```
User Submits Form
     ↓
saveLeadToAllSources()
     ↓
┌─────────────────┬──────────────────┬───────────────┐
│ addToContacts() │ createLead()     │ syncLeadToLMS()│
│ (Android)       │ (Supabase)       │ (External API)│
└─────────────────┴──────────────────┴───────────────┘
     ↓                  ↓                    ↓
Result aggregated and returned to user
```

### Feature Flag Control

Set `NEXT_PUBLIC_LEAD_MANAGEMENT_ENABLED=false` to disable:
- ❌ No phone lookup after calls
- ❌ No notifications
- ❌ No AddLeadForm triggers
- ✅ Existing call recording continues to work

---

## Next Steps

1. ✅ Implement `syncLeadToLMS()` with your LMS API
2. ✅ Add LMS credentials to `.env.local`
3. ✅ Test all 4 notification scenarios
4. ✅ Deploy and verify in production

---

## Support

If you need help implementing the LMS API integration:

1. Check your LMS API documentation
2. Test API with Postman/curl first
3. Review network tab for actual requests
4. Check this guide's example implementation

**The feature is 95% complete - just needs the actual LMS API endpoint!**
