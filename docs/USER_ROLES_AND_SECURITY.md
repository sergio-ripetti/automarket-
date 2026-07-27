# User Roles and Authorization Security

## Overview

AutoMarket uses backend-verified admin roles stored in Firestore to control access to the AI assistant endpoint (`POST /api/aiAssistant`). The role source is:

```
Firestore: users/{uid}.role
```

All role reads/writes use Firebase Admin SDK (server-side only). Ordinary users cannot modify roles via Firestore Security Rules.

---

## User Document Schema

### Collection: `users`

Each user document is stored at `users/{uid}` where `uid` is the Firebase Authentication UID.

```typescript
interface UserDocument {
  uid: string;                    // Firebase Auth UID (document ID)
  email?: string;                 // User email (optional)
  role: "admin" | "user";         // Role designation
  createdAt?: Date;               // Document creation timestamp
  updatedAt?: Date;               // Last update timestamp
  source?: string;                // How user was created (e.g., "bootstrap-script")
  promotedAt?: Date;              // When user was promoted to admin
  demotedAt?: Date;               // When admin role was removed
}
```

### Canonical Role Values

- `"admin"` - Full access to AI assistant and admin dashboard
- `"user"` - No access to AI endpoint (returns 403 Forbidden)
- Missing/null - Treated as "user" (no admin access)

**Important:** Role comparison is case-sensitive: `"Admin"` ≠ `"admin"`

---

## Role Write Paths

All role modifications **require Firebase Admin SDK** and must run on backend:

| Operation | File | Function | Actor | Security |
|-----------|------|----------|-------|----------|
| Create/update user with role | `src/lib/userAuthorizationService.js` | `upsertUser()` | Backend only | Admin SDK |
| Promote to admin | `src/lib/userAuthorizationService.js` | `setUserAsAdmin()` | Backend script only | Admin SDK |
| Demote from admin | `src/lib/userAuthorizationService.js` | `removeAdminRole()` | Backend script only | Admin SDK |
| Read role (authorization) | `src/lib/userAuthorizationService.js` | `getUserRole()` | Backend only | Admin SDK |
| Read role (authorization) | `src/lib/authMiddleware.js` | `requireAdmin()` | Backend middleware | Admin SDK |

**Frontend cannot:**
- Read users collection directly
- Write to users collection
- Modify role field
- Delete user documents
- Escalate privileges

---

## Firestore Security Rules

File: `firestore.rules`

### Users Collection

```firestore
match /users/{userId} {
  // Deny all public access - backend uses Admin SDK only
  allow read, write: if false;
}
```

**Effect:**
- Unauthenticated users: DENIED
- Authenticated users: DENIED
- Backend via Admin SDK: ALLOWED (bypasses rules)

### Other Collections

Business data (cars, sales, financing, messages):
- Public read: `allow read: if true`
- Public write: `allow write: if false`

---

## Admin Bootstrap Process

### Creating the First Admin

**Requirement:** A system owner/administrator must run a backend-only script using Firebase Admin credentials.

#### Step 1: Prepare Environment

```bash
# Ensure Firebase Admin credentials are available
export FIREBASE_SERVICE_ACCOUNT=$(base64 -i serviceAccountKey.json)
```

#### Step 2: Run Bootstrap Script

```bash
node scripts/bootstrap-admin.js "firebase-uid-here" "admin@example.com"
```

**Arguments:**
- `firebase-uid-here` - The Firebase Authentication UID of the user to promote
- `admin@example.com` - (Optional) User's email address

**Example:**

```bash
# Get the UID from Firebase Console: Authentication → Users
node scripts/bootstrap-admin.js "abc123def456" "sergio.ripetti.c@gmail.com"
```

#### Step 3: Verify Success

```
✅ Admin user created successfully
   UID: abc123def456
   Email: sergio.ripetti.c@gmail.com
   Role: admin
```

#### Step 4: Test Access

1. Log in at `/admin/login` with the admin user's credentials
2. Navigate to `/admin/ai` (AI assistant page)
3. Attempt to send a message → should succeed
4. Log in as a non-admin user
5. Attempt to call `/api/aiAssistant` → should receive 403 Forbidden

### Never Use For

- ❌ Web-based user registration
- ❌ User self-service role assignment
- ❌ Automatic first-user-is-admin logic
- ❌ Public API endpoint
- ❌ Scheduled task without owner review

---

## Authorization Flow

```
Firebase-authenticated user
↓
User sends: Authorization: Bearer <Firebase ID token>
↓
Backend middleware: authenticate()
  ✓ Verifies token signature
  ✓ Extracts uid from decoded token
↓
Backend middleware: requireAdmin()
  ✓ Checks Firebase Admin SDK available (fail-closed)
  ✓ Calls isUserAdmin(uid)
    ↓
    Backend: getUserRole(uid)
      ✓ Reads users/{uid} document from Firestore
      ✓ Extracts role field
  ✓ Compares role === "admin"
↓
Result:
  role === "admin" → next() → route handler → Anthropic call
  role ≠ "admin"  → 403 Forbidden
  role missing    → 403 Forbidden
  Firestore error → 500 Internal Server Error
  Admin SDK down  → 503 Service Unavailable
```

---

## Privilege Escalation Prevention

### Frontend Cannot Bypass Authorization

| Attempt | Result | Why |
|---------|--------|-----|
| Modify request body `"role": "admin"` | 403 Forbidden | Backend only checks Firestore |
| Add header `X-Admin: true` | 403 Forbidden | Headers ignored, Firestore consulted |
| localStorage role value | 403 Forbidden | Never sent to backend |
| Fake Firebase token | 401 Unauthorized | Token signature verified |
| Missing Authorization header | 401 Unauthorized | Required by middleware |

### Backend Protection

| Condition | Action |
|-----------|--------|
| Firestore Security Rules deny client writes | ✅ Users cannot create/modify users collection |
| Firebase Admin SDK reads roles | ✅ Backend always has accurate data |
| Exact string comparison `role === "admin"` | ✅ Case-sensitive, no truthy fallback |
| Error handling fails-closed | ✅ If lookup fails, user rejected (not promoted) |
| Bootstrap script owner-only | ✅ No public API for role assignment |

---

## Testing Role Integrity

### Unit Tests

```bash
npm test
```

Tests verify:
- ✅ Non-admin users get 403 Forbidden
- ✅ Admin users pass authorization
- ✅ Missing role denies access
- ✅ Invalid role denies access
- ✅ Firebase Admin unavailable fails safely

### Firestore Rules Tests

Use Firebase Emulator Suite:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulator (in project directory)
firebase emulators:start

# In another terminal, run rules tests
firebase emulators:exec "npm run test:firestore-rules"
```

Rules tests verify:
- ✅ Unauthenticated users cannot write to users collection
- ✅ Authenticated ordinary users cannot modify their role
- ✅ Users cannot escalate themselves to admin
- ✅ Users cannot modify other users
- ✅ Backend (Admin SDK) can create/update roles

### Manual Verification (Owner Only)

After bootstrap:

1. **Admin Login Test**
   ```bash
   # Log in at /admin/login with admin account
   # Verify: can access /admin/ai
   # Verify: can send AI message successfully
   ```

2. **Non-Admin Denial Test**
   ```bash
   # Log in at /admin/login with non-admin account
   # Verify: redirected from /admin (ProtectedRoute)
   # OR if somehow authorized to backend:
   curl -H "Authorization: Bearer <user-token>" http://localhost:3001/api/aiAssistant
   # Verify: returns 403 Forbidden
   ```

3. **Role Removal Test**
   ```bash
   # Run: node scripts/bootstrap-admin.js uid "remove"
   # (Feature not yet implemented)
   # Log in as previously-admin user
   # Verify: 403 Forbidden on AI endpoint
   ```

4. **Firebase Admin Unavailable Test**
   ```bash
   # Temporarily unset FIREBASE_SERVICE_ACCOUNT
   # Restart backend
   # Call /api/aiAssistant
   # Verify: returns 503 Service Unavailable (not 200 or 401)
   ```

---

## Deployment Checklist

Before deploying to production:

- [ ] Firestore Security Rules deployed: `firebase deploy --only firestore:rules`
- [ ] Rules reviewed by owner (in `firestore.rules`)
- [ ] Bootstrap script available: `scripts/bootstrap-admin.js`
- [ ] First admin created using bootstrap script only
- [ ] Test non-admin user receives 403 Forbidden
- [ ] Backend has Firebase Admin credentials configured
- [ ] Firebase Admin SDK initialization verified (`initializeFirebaseAdmin()`)
- [ ] No fallback role-escalation logic in backend
- [ ] Authorization tests passing: `npm test`

---

## Security Contacts

Role and authorization issues should be reported with:

1. **Environment:** development / staging / production
2. **User email:** (if known)
3. **Observed behavior:** what access was granted or denied
4. **Expected behavior:** what should have happened

Do not post real credentials or Firebase service accounts in reports.

---

## References

- **Firebase Security Rules:** https://firebase.google.com/docs/firestore/security/get-started
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup
- **Emulator Suite:** https://firebase.google.com/docs/emulator-suite
