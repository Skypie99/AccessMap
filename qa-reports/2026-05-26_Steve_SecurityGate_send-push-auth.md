---
date: 2026-05-26
auditor: Steve
branch: security/auto-2026-05-26-steve-send-push-auth
status: APPROVED
---

# Security Gate: Send-Push-Notification Auth Fix

**Security Boundaries:** ✅ PASS

## Audit Summary

Critical pre-deployment security hardening for `send-push-notification` Edge Function. Function was open to unauthenticated callers before this fix. Now requires shared-secret authentication (Authorization header with SEND_PUSH_SECRET).

### Controls Verified

**Authentication (Constitution Art. 1.1):**
- ✅ `isAuthorized()` checks Authorization header first (before body parsing)
- ✅ Shared-secret pattern consistent with `notify-flag-status` function
- ✅ Secret loaded from Supabase Edge Function environment (never in source)
- ✅ Defaults to locked/unauthorized if env var not set (safe fail)

**RLS Integrity (Constitution Art. 7.3):**
- ✅ Service-role key used appropriately (server-side bypass for push tokens)
- ✅ No RLS weakening; this function is server-side only
- ✅ Client code will never receive SEND_PUSH_SECRET (documented in README)

**Input Validation:**
- ✅ Type checks on user_id (string, non-empty), title, body
- ✅ Length limits: title ≤150 chars, body ≤300 chars, data ≤1 KB (prevents oversized/social-engineering payloads)
- ✅ JSON parsing wrapped in try-catch (handles malformed input)

**Oracle Fix:**
- ✅ Returns 200 {"status":"queued"} when token not found (instead of 404)
- ✅ Prevents enumeration attack: caller cannot distinguish "user exists" from "user exists but no token"

**Code Quality:**
- ✅ No credentials in source code
- ✅ No debug logging of push tokens (tokens are PIPEDA personal info)
- ✅ Error handling at trust boundary
- ✅ Clear comments on security rationale + setup steps

No new attack surface introduced. Pre-deployment, so no live data at risk.

**Ready to merge.** ✅

