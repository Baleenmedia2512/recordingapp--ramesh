# 📱 Lead Notification Quick Reference

## Notification Messages by Scenario

| Found In             | Notification Title | Notification Message | User Action | Form Opens With |
|---------------------|-------------------|---------------------|-------------|-----------------|
| **❌ Nowhere**<br>(not in contacts, leads, or LMS) | ➕ Add as Lead? | [phone] not found. Add as lead and contact book? | Tap to add | ✅ Add to Contacts<br>✅ Add to Leads<br>✅ Sync to LMS |
| **📋 Leads Only**<br>(in leads, not in contacts) | 📱 Add to Contact Book? | [Name] is in your leads table. Add to phone contacts? | Tap to add | ✅ Add to Contacts<br>⬜ Add to Leads<br>✅ Sync to LMS |
| **📞 Contacts Only**<br>(in contacts, not in LMS) | 🏢 Add to LMS? | [Name] is in your contacts. Add to LMS as a lead? | Tap to add | ⬜ Add to Contacts<br>✅ Add to Leads<br>✅ Sync to LMS |
| **📞📋 Contacts + Leads**<br>(in both, not in LMS) | 🏢 Sync to LMS? | [Name] is in your contacts and leads. Sync to LMS? | Tap to sync | ⬜ Add to Contacts<br>⬜ Add to Leads<br>✅ Sync to LMS |
| **📞🏢 Contacts + LMS**<br>(in both already) | ✅ Already Available | [Name] is already available in phone contacts and LMS | No action | (Toast only, no form) |

---

## Decision Tree

```
┌─────────────────────────────────┐
│    Call Ends - Check Phone      │
└────────────┬────────────────────┘
             │
             ▼
   ┌─────────────────────┐
   │ Found in Contacts?  │
   └─────────┬───────────┘
             │
      ┌──────┴──────┐
      │             │
     YES           NO
      │             │
      ▼             ▼
┌────────────┐  ┌────────────┐
│Found in    │  │Found in    │
│LMS?        │  │Leads?      │
└──────┬─────┘  └──────┬─────┘
       │               │
   ┌───┴───┐       ┌───┴───┐
  YES     NO      YES     NO
   │       │       │       │
   ▼       ▼       ▼       ▼
[✅]    [Add to  [Add to  [Add as
        LMS]     Contact] Lead+
                          Contact]

KEY:
[✅] = Already Available (toast only)
[Add to LMS] = Show "Add to LMS?" notification
[Add to Contact] = Show "Add to Contact Book?" notification  
[Add as Lead+Contact] = Show "Add as Lead?" notification
```

---

## Code Examples

### Example 1: Completely New Number
```typescript
// Incoming data:
{
  phoneNumber: "9360515518",
  foundInContacts: false,
  foundInLeads: false,
  foundInLMS: false
}

// Notification shown:
Title: "➕ Add as Lead?"
Message: "9360515518 not found. Add as lead and contact book?"
Action: "add-all"

// Form opens with:
{
  phoneNumber: "9360515518",
  contactName: "",
  addToContacts: true,    // ✅
  addToLeads: true,       // ✅
  syncToLMS: true         // ✅
}
```

### Example 2: In Leads, Not in Contacts
```typescript
// Incoming data:
{
  phoneNumber: "9360515518",
  foundInContacts: false,
  foundInLeads: true,
  foundInLMS: false,
  leadData: { contact_name: "John Doe", company: "ACME Corp" }
}

// Notification shown:
Title: "📱 Add to Contact Book?"
Message: "John Doe is in your leads table. Add to phone contacts?"
Action: "add-to-contacts"

// Form opens with:
{
  phoneNumber: "9360515518",
  contactName: "John Doe",
  company: "ACME Corp",
  addToContacts: true,    // ✅
  addToLeads: false,      // ⬜ (already exists)
  syncToLMS: true         // ✅
}
```

### Example 3: In Contacts, Not in LMS
```typescript
// Incoming data:
{
  phoneNumber: "9360515518",
  foundInContacts: true,
  foundInLeads: false,
  foundInLMS: false,
  contactName: "Jane Smith"
}

// Notification shown:
Title: "🏢 Add to LMS?"
Message: "Jane Smith is in your contacts. Add to LMS as a lead?"
Action: "add-to-lms"

// Form opens with:
{
  phoneNumber: "9360515518",
  contactName: "Jane Smith",
  addToContacts: false,   // ⬜ (already exists)
  addToLeads: true,       // ✅
  syncToLMS: true         // ✅
}
```

### Example 4: Already Everywhere
```typescript
// Incoming data:
{
  phoneNumber: "9360515518",
  foundInContacts: true,
  foundInLeads: true,
  foundInLMS: true,
  contactName: "Bob Wilson"
}

// Notification shown:
Title: "✅ Already Available"
Message: "Bob Wilson is already available in phone contacts and LMS"
Action: "already-exists"

// Result: Toast only, no form opens
```

---

## Testing Commands

### Rebuild and Deploy
```bash
# Rebuild the app with updated notification logic
npm run build
npx cap sync android
npx cap open android

# Build APK
cd android
./gradlew assembleDebug
```

### Check Notification Logs
```bash
# Filter for lead check logs
adb logcat | grep "Lead Check"

# Filter for notification logs
adb logcat | grep "Showing notification"

# Full call monitoring logs
adb logcat | grep -E "(CallMonitor|Lead Check|Notification)"
```

---

## User Journey Example

### Scenario: Sales Call from Unknown Number

**Timeline:**
1. **18:01:03** - Call starts (outgoing to 9360515518)
   ```
   📞 [OUTGOING CALL DETECTED]
   Phone: undefined (will capture on call end)
   ```

2. **18:01:24** - Call ends (duration: 20s)
   ```
   📞 Call ended (duration: 20s)
   ✅ Phone number captured: 9360515518
   ```

3. **18:01:26** - Wait 2 seconds (CALL_END_REFRESH_DELAY_MS)
   ```
   ⏰ Waiting 2000 ms for call log to be written...
   ```

4. **18:01:28** - Check phone number
   ```
   🔍 [Lead Check] Checking phone number after native upload...
   🔍 [Phone Lookup] Starting comprehensive lookup for: 9360515518
   ```

5. **18:01:31** - Lookup complete
   ```
   📋 [Lead Check] Lookup result:
   - foundInContacts: false
   - foundInLeads: false
   - foundInLMS: false
   ```

6. **18:01:32** - Wait 800ms (PERMISSION_CONFLICT_DELAY_MS)
   ```
   ⏳ [Lead Check] Waiting 800ms before notification...
   ```

7. **18:01:35** - Show notification
   ```
   📢 [Lead Check] Showing notification for phone: 9360515518
   Title: "➕ Add as Lead?"
   Message: "9360515518 not found. Add as lead and contact book?"
   ```

8. **User Action** - Taps notification
   ```
   🔔 [Lead Check] User clicked notification action: add-all
   ```

9. **Form Opens** - User fills in:
   - Name: "John Prospect"
   - Company: "TechCorp"
   - Email: "john@techcorp.com"
   - Checkboxes: All enabled

10. **18:01:45** - User saves
    ```
    💾 [Save Lead] Starting save process
    ✅ Added to Android contacts
    ✅ Saved to local leads database
    ✅ Synced to external LMS
    ```

11. **18:01:46** - Success
    ```
    ✅ Saved to contacts, leads, LMS
    (Form closes, notification dismissed)
    ```

### Future Calls from Same Number
- **Next time:** Notification shows "✅ Already Available"
- **No action needed** - just informational

---

## Customization

### Change Notification Timing
```typescript
// src/hooks/useCallLogs.ts
const CALL_END_REFRESH_DELAY_MS = 2000;  // Wait for call log (increase if call logs are slow)
const PERMISSION_CONFLICT_DELAY_MS = 800; // Wait before notification (increase if permission conflicts occur)
```

### Change Notification Text
```typescript
// src/services/phoneNumberLookup.ts
export function getNotificationMessage(lookup: PhoneNumberLookupResult) {
  // Customize titles and messages here
  return {
    title: 'Your Custom Title',
    message: 'Your custom message',
    action: 'add-all',
  };
}
```

### Disable Lead Management
```typescript
// src/hooks/useCallLogs.ts
const LEAD_MANAGEMENT_ENABLED = false; // Set to false to disable
```

---

## Support

For issues or questions:
1. Check [LEAD_NOTIFICATION_FLOW.md](./LEAD_NOTIFICATION_FLOW.md) for detailed implementation
2. Check logs with: `adb logcat | grep "Lead Check"`
3. Verify notification permissions in Android Settings → Apps → Call Monitor → Permissions
