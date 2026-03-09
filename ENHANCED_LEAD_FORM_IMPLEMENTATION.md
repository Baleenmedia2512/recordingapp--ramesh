# Enhanced Lead Form Implementation

## Overview
Expanded the AddLeadModal component to match the external LMS form format with comprehensive lead capture fields. The form now includes 15+ fields organized into logical sections.

## Changes Made

### 1. Updated AddLeadModal.tsx (src/components/AddLeadModal.tsx)
**Total Lines:** ~580 (previously 420)

**New FormData Interface:**
```typescript
interface FormData {
  // Basic Info
  leadDate: string;        // Date picker (default: current date)
  leadTime: string;        // Time picker (default: current time)
  clientPlatform: string;  // Dropdown (required) - Google, Facebook, Instagram, etc.
  name: string;            // Client name (required, max 100 chars)
  
  // Contact Details
  email: string;           // Email (optional)
  alternatePhone: string;  // 10-digit phone (optional, validated)
  
  // Business Info
  company: string;         // Company name (optional)
  designation: string;     // Job title (optional)
  adEnquiry: string;       // What they're enquiring about (optional)
  
  // Address
  address: string;         // Street address (optional)
  city: string;            // City (optional)
  state: string;           // State (optional)
  pincode: string;         // 6-digit pincode (optional, validated)
  
  // Additional
  remarks: string;         // Remarks (max 500 chars)
  handledBy: string;       // User email (pre-filled from localStorage)
  notes: string;           // Legacy field (kept for backward compatibility)
}
```

**Features Added:**
- ✅ Date/Time pickers with current date/time as default
- ✅ Client Platform dropdown (8 options: Google, Facebook, Instagram, LinkedIn, Website, Referral, Cold Call, Other)
- ✅ Character counters for name (100) and remarks (500)
- ✅ Client Contact field (read-only, shows incoming phone number)
- ✅ Full address section (street, city, state, pincode)
- ✅ Validation:
  - Required: leadDate, leadTime, clientPlatform, name
  - Name max 100 characters
  - Alternate phone must be exactly 10 digits (if provided)
  - Pincode must be exactly 6 digits (if provided)
  - Remarks max 500 characters
- ✅ Auto-filled "Handled By" field from user's logged-in email
- ✅ Offline queue support maintained for all new fields
- ✅ LMS sync support for all new fields

### 2. Updated leadsMetadataService.ts (src/services/leadsMetadataService.ts)
**Changes:**
- Extended `createLead` function parameter interface to accept 11 new fields
- Updated database insert statement to include all new columns
- Maintained backward compatibility with existing code

**New Parameters:**
```typescript
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
```

### 3. Updated LeadMetadata Type (src/types/index.ts)
**Changes:**
- Added 11 new optional fields to LeadMetadata interface
- All new fields are marked as optional (?) for backward compatibility
- Maintains existing field structure

### 4. Created Database Migration (supabase/migrations/add_comprehensive_lead_fields.sql)
**New Columns Added:**
```sql
lead_date DATE
lead_time TIME
client_platform TEXT
ad_enquiry TEXT
alternate_phone TEXT
address TEXT
city TEXT
state TEXT
pincode TEXT
remarks TEXT
handled_by TEXT
```

**Indexes Created:**
```sql
idx_leads_metadata_platform   -- For filtering by platform
idx_leads_metadata_date        -- For date-based queries
idx_leads_metadata_city        -- For location queries
idx_leads_metadata_handled_by  -- For filtering by user
```

**Constraints Added:**
```sql
check_pincode_format          -- Ensures pincode is 6 digits (if provided)
check_alternate_phone_format  -- Ensures alternate phone is 10 digits (if provided)
```

## Form Layout

### Section 1: Date/Time
- Date picker (left) + Time picker (right)
- Both required, default to current date/time

### Section 2: Client Platform & Name
- Client Platform dropdown (required) - 8 options
- Client Name text input (required, max 100 chars with counter)

### Section 3: Ad Enquiry
- Textarea for what they're enquiring about (2 rows)

### Section 4: Contact Information
- Client Contact (read-only, shows phone number from call)
- Email (left) + Alternate Phone (right, 10 digits)

### Section 5: Business Information
- Company (left) + Designation (right)

### Section 6: Address
- Street Address (full width)
- City + State + Pincode (3-column grid, 6 digits)

### Section 7: Additional Information
- Remarks (textarea, max 500 chars with counter)
- Handled By (pre-filled with user email)
- Additional Notes (textarea, 2 rows - legacy field)

### Section 8: Actions
- Cancel button (left)
- Save Lead button (right, blue)

## Platform Options
1. Google
2. Facebook
3. Instagram
4. LinkedIn
5. Website
6. Referral
7. Cold Call
8. Other

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Client Name | Required, max 100 chars | "Client Name is required" / "Client Name must be 100 characters or less" |
| Client Platform | Required | "Client Platform is required" |
| Alternate Phone | Optional, must be 10 digits if provided | "Alternate Phone must be exactly 10 digits" |
| Pincode | Optional, must be 6 digits if provided | "Pincode must be exactly 6 digits" |
| Remarks | Max 500 chars | "Remarks must be 500 characters or less" |

## Database Migration Instructions

### Step 1: Apply Migration to Supabase
```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL in Supabase Dashboard:
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of supabase/migrations/add_comprehensive_lead_fields.sql
# 3. Run the query
```

### Step 2: Verify Migration Success
Check the Supabase dashboard to confirm:
1. All 11 new columns added to `leads_metadata` table
2. 4 new indexes created
3. 2 check constraints added

### Step 3: Test Form
1. Make a test call on your Android device
2. Click the notification "Create Lead"
3. Fill out the comprehensive form
4. Click "Save Lead"
5. Verify data appears in Supabase `leads_metadata` table with all fields populated

## Offline Queue Support
✅ All new fields are automatically included in offline queue
- When device is offline, form data is saved to localStorage
- When device comes online, queue processor syncs all fields to Supabase
- No code changes needed - existing queue infrastructure handles new fields

## LMS Sync Support
✅ All new fields are sent to LMS Edge Function
- Updated `syncToLMS()` function includes all 11 new fields
- External LMS will receive comprehensive lead data
- LMS Edge Function may need updating to handle new fields

## Backward Compatibility
✅ All new fields are optional in database and TypeScript interfaces
- Existing code not using new fields will continue to work
- Old leads in database won't have new fields (NULL values)
- New leads can be created with or without the new fields

## Next Steps

1. **Run Database Migration** (see instructions above)
2. **Test on Android Device:**
   - Make test call
   - Click notification
   - Fill comprehensive form
   - Verify data in Supabase

3. **Update LMS Edge Function** (if needed):
   - File: `supabase/functions/sync-lms-lead/index.ts`
   - Add handling for new fields if external LMS API requires them

4. **Update Notification Display** (optional):
   - File: `android/app/src/main/java/com/recordingapp/PhoneLookupWorker.kt`
   - Modify `showLeadNotification()` to show platform/company if available

## Testing Checklist

- [ ] Apply database migration successfully
- [ ] Run `npm run build` to verify no TypeScript errors
- [ ] Test form with all fields filled
- [ ] Test form with only required fields
- [ ] Test validation (invalid phone/pincode formats)
- [ ] Test character counters (name 100, remarks 500)
- [ ] Test offline mode (disconnect internet, save lead)
- [ ] Test online sync (reconnect internet, verify queue syncs)
- [ ] Verify data in Supabase dashboard
- [ ] Test LMS sync (if enabled)

## File Changes Summary
```
Modified:
✓ src/components/AddLeadModal.tsx (+200 lines)
✓ src/services/leadsMetadataService.ts (+11 parameters)
✓ src/types/index.ts (+11 fields)

Created:
✓ supabase/migrations/add_comprehensive_lead_fields.sql (new migration)
```

## UI Screenshots Reference
The form now matches your external LMS "Add New Lead" form with:
- Same field structure
- Same required/optional field markers
- Same validation rules
- Same character limits
- Better organized with clear sections

---

**Status:** ✅ Implementation Complete  
**Next Action Required:** Run database migration (see Step 1 above)
