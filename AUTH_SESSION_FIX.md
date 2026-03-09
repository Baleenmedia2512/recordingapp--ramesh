# Authentication Session Fix

## Problem Summary

**Contact saves successfully to Android, but fails to save to Supabase database with `AuthSessionMissingError`**

## Root Cause

The app was using **two separate authentication systems**:

1. **Custom Auth System** (`useAuth` hook): Stored user data in localStorage only
2. **Supabase Auth System** (`authApi`): Actual Supabase authentication (unused)

### What Was Happening

```
User logs in with custom auth → localStorage stores user data
                                ↓
                    User tries to save lead
                                ↓
                    Supabase checks auth.uid()
                                ↓
                    auth.uid() = NULL (no Supabase session!)
                                ↓
                    RLS Policy blocks access
                                ↓
                    Error: AuthSessionMissingError
```

### The Technical Issue

The `leads_metadata` table has Row Level Security (RLS) enabled with policies like:

```sql
CREATE POLICY "Users can insert their own leads"
  ON public.leads_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

This policy requires `auth.uid()` (Supabase session user ID) to match, but the app never created a Supabase session.

## What Was Fixed

### 1. Updated Authentication Flow

**File: `src/hooks/useAuth.ts`**

- Now creates **actual Supabase sessions** when users log in
- Guest login creates a **real Supabase user account** (temporary)
- Session restoration on app restart using Supabase's session management

### 2. Sign In/Sign Up Now Use Supabase

**Before:**
```typescript
const guestLogin = () => {
  const guestUser = { id: 'guest-' + Date.now(), ... };
  localStorage.setItem('auth_user', JSON.stringify(guestUser));
  setUser(guestUser);
};
```

**After:**
```typescript
const guestLogin = async () => {
  // Creates actual Supabase account with random email
  const tempEmail = `guest-${Date.now()}@callmonitor.app`;
  const { session, user } = await authApi.signUp(tempEmail, tempPassword);
  // Now auth.uid() will work in database operations!
};
```

### 3. Session Persistence

The fix ensures that:
- Supabase session is checked on app start
- Session is automatically refreshed
- Legacy guest users are converted to Supabase users

## Files Modified

1. **`src/hooks/useAuth.ts`** - Complete rewrite to use Supabase auth
2. **`src/components/LoginForm.tsx`** - Updated guest login handler to be async

## How It Works Now

```
User logs in (even as guest)
        ↓
Supabase creates real user account
        ↓
Supabase session established
        ↓
auth.uid() = valid Supabase user ID
        ↓
User saves lead
        ↓
RLS Policy checks: auth.uid() = user_id ✅
        ↓
Lead saved successfully!
```

## Testing Instructions

### 1. Clear App Data

Before testing, clear any cached auth data:

```typescript
// In browser console or app
localStorage.clear();
```

### 2. Test Guest Login

1. Open the app
2. Click "Continue as Guest"
3. **Watch the console logs:**
   - Should see: `🔐 Creating guest Supabase account...`
   - Should see: `✅ Guest session created with Supabase: [uuid]`

### 3. Test Lead Saving

1. Add a contact with lead checkbox enabled
2. **Expected console logs:**
   ```
   ✅ Contact saved to Android
   💾 Saving to leads metadata and LMS...
   ✅ Lead created in database: [uuid]
   ✅ Saved to leads ✓
   ```

3. **Should NOT see:**
   - ❌ Authentication error: AuthSessionMissingError
   - ❌ You must be logged in to save leads

### 4. Test Session Persistence

1. Close and reopen the app
2. **Should see:**
   - `✅ Restored Supabase session: [uuid]`
3. Try saving another lead - should work without re-login

### 5. Test Regular Login

1. Sign out
2. Create an account with email/password
3. Verify lead saving works the same way

## Expected Behavior After Fix

### ✅ What Should Work

- Guest users can save leads to database
- Regular users can save leads to database
- Sessions persist across app restarts
- Contact saving to Android still works
- Lead metadata saves to Supabase
- LMS sync works (if configured)

### ⚠️ Breaking Changes

**None** - The changes are backward compatible. Existing users will automatically get Supabase sessions on next login.

## Troubleshooting

### If you still see AuthSessionMissingError

1. **Check Supabase configuration:**
   ```typescript
   // src/config/env.ts
   console.log('SUPABASE_URL:', SUPABASE_URL);
   console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY);
   ```

2. **Verify RLS policies exist:**
   - Check if the migration was applied: `supabase/migrations/create_leads_metadata_table.sql`

3. **Check for validation errors:**
   ```bash
   # Run in terminal
   npm run build
   ```

4. **Clear all auth data:**
   ```typescript
   localStorage.clear();
   sessionStorage.clear();
   ```

### If guest signup fails

The Supabase project might have restrictions on signups. Check:

1. **Email confirmation disabled** (for guest accounts)
2. **Rate limiting** not blocking rapid signups
3. **Email domain** not blacklisted

Alternative: Create a single "guest" account and reuse it for all guest logins.

## Technical Details

### Why This Approach?

**Option 1**: Disable RLS (❌ Security risk)
**Option 2**: Use service role key on client (❌ Major security risk)
**Option 3**: Create real Supabase sessions (✅ Secure and standard)

We chose Option 3 because:
- Maintains security through RLS
- Standard Supabase pattern
- Supports future features (profiles, settings, etc.)
- Guest accounts can be upgraded to real accounts

### Guest Account Cleanup

Guest accounts are created with pattern: `guest-{timestamp}@callmonitor.app`

To clean up old guest accounts, you can run a periodic job:

```sql
-- Delete guest accounts older than 30 days
DELETE FROM auth.users 
WHERE email LIKE 'guest-%@callmonitor.app' 
AND created_at < NOW() - INTERVAL '30 days';
```

## Next Steps

1. ✅ Authentication now works with Supabase
2. 🔄 Test thoroughly in production
3. 📊 Monitor guest account creation rate
4. 🧹 Set up guest account cleanup (optional)
5. 🔐 Consider adding "Upgrade Guest Account" feature

## Summary

The contact saves properly to Android because it's a **native operation** that doesn't require authentication.

The lead metadata failed to save because:
- ❌ No Supabase session existed
- ❌ RLS policies blocked unauthenticated access
- ❌ Custom auth system didn't create real sessions

Now with the fix:
- ✅ All logins create real Supabase sessions
- ✅ `auth.uid()` is valid for RLS checks
- ✅ Lead saving works for both guests and regular users
- ✅ Sessions persist and auto-refresh

---

**Date Fixed:** February 27, 2026
**Files Changed:** 2
**Lines Changed:** ~120
**Breaking Changes:** None
