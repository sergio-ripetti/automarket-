# Owner Real-Environment Verification Checklist

This checklist must be completed by the system owner/administrator with real Firebase credentials and a real Firestore instance. It is NOT automated and requires manual verification.

**Do not skip this checklist before deploying to production.**

---

## Prerequisites

- [ ] Firebase project created and configured
- [ ] Firebase Admin Service Account Key downloaded (JSON file)
- [ ] Backend has access to service account key
- [ ] Test user accounts created in Firebase Authentication
- [ ] Two test accounts: one for admin, one for regular user

---

## Phase 1: Environment Setup

### 1. Configure Firebase Admin Credentials

```bash
# Export service account as environment variable
export FIREBASE_SERVICE_ACCOUNT=$(base64 -i /path/to/serviceAccountKey.json)

# Verify (should output base64-encoded JSON)
echo $FIREBASE_SERVICE_ACCOUNT | head -c 20
```

- [ ] Service account JSON file located
- [ ] Base64 encoding successful
- [ ] `FIREBASE_SERVICE_ACCOUNT` environment variable set
- [ ] `.env` does NOT contain the actual JSON (only instructions)

### 2. Deploy Firestore Security Rules

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

**Verify rules deployment:**

```bash
# List deployed rules (should show /users/{userId} with "allow read, write: if false")
firebase rules:list
```

- [ ] `firestore.rules` file exists in repository
- [ ] Rules deployed to Firebase Console
- [ ] Firestore Security Rules show users/{userId} deny all access

### 3. Start Backend with Real Firebase

```bash
# Ensure .env has Firebase credentials
cat .env | grep FIREBASE

# Start backend
npm run dev:server
```

Expected output:
```
✅ AI Assistant API running on http://localhost:3001
✓ Firebase Admin SDK initialized successfully
```

- [ ] Backend starts without errors
- [ ] Firebase Admin SDK initializes (not disabled)
- [ ] Backend is ready to accept requests on port 3001

---

## Phase 2: Bootstrap First Admin

### 4. Create First Admin User

```bash
# Get the UID of your test admin account from Firebase Console
# Authentication → Users → Copy UID

# Run bootstrap script
node scripts/bootstrap-admin.js "YOUR-ADMIN-UID-HERE" "admin@example.com"
```

Expected output:
```
✅ Admin user created successfully
   UID: YOUR-ADMIN-UID-HERE
   Email: admin@example.com
   Role: admin
```

**Verify in Firestore:**
```bash
# In Firebase Console → Firestore → Collection "users"
# Should see document with id = YOUR-ADMIN-UID-HERE
# Document contains: { uid: "...", email: "...", role: "admin" }
```

- [ ] Bootstrap script executed successfully
- [ ] Admin user document created in Firestore
- [ ] Document contains `role: "admin"` (lowercase)
- [ ] No bootstrap errors logged

---

## Phase 3: Admin Access Testing

### 5. Log In as Admin and Test AI Endpoint

```bash
# Open browser
# Navigate to: http://localhost:5173/admin/login

# Log in with admin test account
# (Use Firebase Authentication credentials)
```

Expected: Redirected to `/admin/dashboard`

- [ ] Admin login succeeds
- [ ] Redirected to admin dashboard
- [ ] No "Unauthorized" errors

### 6. Test AI Endpoint Access

```bash
# In admin dashboard, navigate to: /admin/ai

# Type a test message in the AI assistant
# Example: "How many cars do we have?"

# Send the message
```

Expected:
- Message appears in chat
- (If Anthropic API is mocked) Response appears
- No 401, 403, or 500 errors in browser console

- [ ] Can navigate to /admin/ai without permission denied
- [ ] Can send AI message (reaches backend)
- [ ] No authentication errors
- [ ] No "Forbidden" errors

---

## Phase 4: Non-Admin Denial Testing

### 7. Create Non-Admin User and Test Denial

```bash
# Get the UID of your test regular-user account from Firebase Console
# Do NOT run bootstrap-admin.js for this user

# Log out of admin account
# Log in with regular-user account
```

Expected behavior:

**Frontend Protection:**
- Redirected from `/admin` routes to login
- Cannot access `/admin/ai`
- ProtectedRoute enforces authentication

**Backend Protection (if somehow user reaches backend):**

```bash
# In a terminal with the regular user's token:
FIREBASE_TOKEN=$(get_id_token_for_regular_user)

curl -X POST http://localhost:3001/api/aiAssistant \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","businessContext":{},"conversationHistory":[]}'
```

Expected response:
```json
{
  "success": false,
  "error": "Forbidden - User is not authorized as admin"
}
HTTP 403
```

- [ ] Regular user cannot access /admin routes
- [ ] Regular user gets 403 Forbidden on /api/aiAssistant
- [ ] Error message does not leak internal details
- [ ] Status code is exactly 403 (not 400, 401, or 500)

---

## Phase 5: Firebase Admin Unavailability Testing

### 8. Verify Fail-Closed Behavior

```bash
# In one terminal, stop backend
# Edit .env to remove/comment out FIREBASE_SERVICE_ACCOUNT
# Restart backend

# Expected startup:
# ❌ Failed to initialize Firebase Admin SDK: ...
# AND
# ❌ Firebase Admin SDK not available
# AND backend should exit or refuse requests
```

**Or if backend starts with warnings:**

```bash
# Try to access /api/aiAssistant as logged-in admin
FIREBASE_TOKEN=$(get_id_token_for_admin_user)

curl -X POST http://localhost:3001/api/aiAssistant \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","businessContext":{},"conversationHistory":[]}'
```

Expected response:
```json
{
  "success": false,
  "error": "Service unavailable - authentication service not ready"
}
HTTP 503
```

NOT:
- 200 OK (request should not succeed)
- 401 Unauthorized (authentication worked, availability is issue)
- 500 Internal Server Error (correct error, but 503 is more accurate)

**Restore Firebase:**
```bash
# Re-add FIREBASE_SERVICE_ACCOUNT to .env
# Restart backend
# Verify it starts correctly again
```

- [ ] Backend fails to initialize with missing Firebase credentials
- [ ] If initialized without Admin SDK: /api/aiAssistant returns 503
- [ ] Status code is 503 (not 500 or 401 or 200)
- [ ] Error message is safe (does not expose internals)
- [ ] Backend can recover when Firebase credentials restored

---

## Phase 6: Role Integrity Testing

### 9. Verify Firestore Role Cannot Be Modified by Frontend

```bash
# Ensure you are LOGGED OUT or use regular-user account
# Open browser DevTools → Console

# Attempt to modify role in Firestore (will fail):
const { getFirestore, collection, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js');
const db = getFirestore();
await setDoc(doc(db, 'users', 'current-user-uid'), { role: 'admin' });
```

Expected error:
```
FirebaseError: Missing or insufficient permissions.
```

NOT:
- Success (would indicate rule bypass)
- No error (would indicate rule bypass)

- [ ] Firestore Security Rules prevent frontend write to users collection
- [ ] Error message: "Missing or insufficient permissions"
- [ ] Regular user cannot create/modify their own role
- [ ] Admin user also cannot modify via frontend (Admin SDK only)

---

## Phase 7: Firestore Rules Emulator Testing (Optional)

If Firebase Emulator Suite is set up:

```bash
# Start emulator
firebase emulators:start

# Run rules tests
firebase emulators:exec "npm run test:firestore-rules"
```

Expected: All rules tests pass

- [ ] Firestore Emulator started successfully
- [ ] Rules tests execute (if configured)
- [ ] All privilege-escalation scenarios denied
- [ ] Backend admin SDK operations allowed

---

## Phase 8: Production Readiness Check

### 10. Verify Deployment Prerequisites

- [ ] Firestore Security Rules deployed to production Firebase
- [ ] Rules file (`firestore.rules`) tracked in git
- [ ] Bootstrap script (`scripts/bootstrap-admin.js`) documented
- [ ] Owner has access to Firebase service account key
- [ ] Owner has Firebase CLI installed
- [ ] First admin created via bootstrap script only
- [ ] No hardcoded role values in frontend code
- [ ] No role values in localStorage or URL parameters
- [ ] Backend has secure access to Firebase Admin credentials
- [ ] Error messages do not leak Firestore internals

---

## Phase 9: Post-Deployment Monitoring

After deploying to production:

### 11. Monitor Authorization Logs

```bash
# Check backend logs for authorization errors
# Watch for suspicious patterns:
# - Repeated 403 errors from same user
# - Repeated 401 errors (expired tokens)
# - Unexpected 503 errors (Firebase unavailability)

# Example log monitoring:
tail -f logs/authorization.log | grep -E "401|403|503"
```

- [ ] Authorization logs configured
- [ ] No unexpected 500 errors
- [ ] No evidence of privilege escalation attempts
- [ ] Admins can access AI endpoint

### 12. Verify Role Changes

```bash
# If you later add more admins:
node scripts/bootstrap-admin.js "NEW-ADMIN-UID" "admin@example.com"

# Verify user can immediately access:
# - Log in at /admin/login
# - Navigate to /admin/ai
# - Send AI message successfully
```

- [ ] Bootstrap script still works
- [ ] New admins can access AI endpoint
- [ ] Role changes take effect immediately

---

## Summary Checklist

Mark these when all phases complete:

- [ ] **Setup:** Firebase configured, rules deployed, backend started
- [ ] **Bootstrap:** First admin created via script
- [ ] **Admin Access:** Admin can log in and use AI endpoint
- [ ] **Non-Admin Denial:** Regular users get 403 Forbidden
- [ ] **Availability:** Firebase unavailability returns 503 (fail-closed)
- [ ] **Integrity:** Firestore rules prevent frontend writes to users
- [ ] **Rules Testing:** Emulator tests pass (if configured)
- [ ] **Production:** All prerequisites verified, deployment ready

---

## Common Issues and Solutions

### Issue: "Firebase Admin SDK disabled"

**Cause:** `FIREBASE_ADMIN_SDK_DISABLED=true` in .env  
**Solution:** Remove or set to `false`, set `FIREBASE_SERVICE_ACCOUNT` environment variable

### Issue: "Missing or insufficient permissions" when deploying rules

**Cause:** Firebase CLI not authenticated  
**Solution:** Run `firebase login` and try again

### Issue: Regular user gets 401 instead of 403

**Cause:** Token verification failed (expired, invalid signature)  
**Solution:** Get a fresh token using `getIdToken(true)` in browser console

### Issue: Admin user gets 403 after bootstrap

**Cause:** Role document not created or created with wrong value  
**Solution:** Check Firestore console - users collection should have document with `role: "admin"`

### Issue: Non-admin gets 200 OK on /api/aiAssistant

**Cause:** Role lookup failed silently, authorization bypassed (CRITICAL)  
**Solution:** Check backend logs, verify Firebase Admin SDK initialized, check Firestore rules

---

## Support

For issues during verification:

1. Check backend logs: `logs/` directory or stdout
2. Check Firestore console: verify users/{uid} documents exist
3. Check Firebase Security Rules: `firebase rules:list`
4. Check network requests: browser DevTools → Network tab
5. Contact system administrator with exact error message

**IMPORTANT:** Do not modify rules or bootstrap logic without re-running this checklist.
