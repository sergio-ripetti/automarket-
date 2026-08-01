# User Roles and Authorization Security

## Overview

AutoMarket uses backend-verified roles stored in Firestore to control access to every protected
admin-panel endpoint (cars/sales/financing/messages CRUD, document downloads, the AI assistant).
The role source is:

```
Firestore: users/{uid}.role
```

All role reads/writes use the Firebase Admin SDK (server-side only). Ordinary users cannot modify
roles via Firestore Security Rules, and the frontend UI's role-based rendering is never trusted on
its own - every backend route independently re-checks the resolved role.

---

## Roles

AutoMarket recognizes exactly three role values (`ROLES` in `src/lib/userAuthorizationService.js`):

| Role | Read | Create / Update | Delete | User & role management | Auth account management |
| --- | --- | --- | --- | --- | --- |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ (via owner-run scripts) |
| `demo`  | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user` / missing | ❌ (no admin-panel access) | ❌ | ❌ | ❌ | ❌ |

### `admin`
- Full read/create/update/delete access to cars, sales, financing, and messages.
- Can manage users and roles (`scripts/bootstrap-admin.js`, `setUserAsAdmin()` /
  `removeAdminRole()`).
- Can access protected document downloads (Sales/Financing attachment proxy routes).
- Is the only role that can rotate its own Firebase Authentication password via
  `scripts/reset-admin-password.js` (see [`README-ADMIN.md`](../README-ADMIN.md#rotating-the-real-admin-password)).

### `demo`
The restricted, public-facing recruiter/reviewer account (`scripts/bootstrap-demo-user.js`). It
can:
- read the full (fictional/sample) portfolio data set - cars, sales, financing, messages;
- create and update ordinary portfolio records (add/edit a car, record/edit a sale, submit a
  financing status change);
- change financing/payment/workflow statuses (financing application status, individual scheduled
  payment paid/pending);
- mark messages read/unread;
- use the AI Assistant (its own isolated rate-limit bucket, shared with `admin`);
- view/download sample invoices and other uploaded documents.

It explicitly **cannot**:
- delete any record (car, sale, financing application, message);
- delete a Cloudinary asset (`POST /api/cloudinary/delete` is `requireAdmin`-only);
- manage users or assign/remove roles;
- modify any Firebase Authentication account (including its own password - only
  `scripts/reset-admin-password.js` exists, and it refuses to run against the demo email).

### `user` (or missing/unset role)
No admin-panel access of any kind today - `resolveAdminOrDemoRole()` returns
`{ authorized: false }` for this role, so every `requireAdminOrDemo`-gated route responds `403`,
and `requireAdmin`-gated routes respond `403` as well. There is currently no distinct "ordinary
signed-in customer" feature set beyond the public, unauthenticated marketplace pages (browsing,
favorites, financing calculator, contact/inquiry forms) - those pages don't require any role at
all, admin or otherwise.

**Important:** Role comparison is case-sensitive and exact: `"Admin"` ≠ `"admin"`, and a role like
`"superadmin"` is treated as an unrecognized/unauthorized role, not as `admin`.

---

## User Document Schema

### Collection: `users`

Each user document is stored at `users/{uid}` where `uid` is the Firebase Authentication UID.

```typescript
interface UserDocument {
  uid: string;                      // Firebase Auth UID (document ID)
  email?: string;                   // User email (optional)
  role: "admin" | "demo" | "user";  // Role designation
  createdAt?: Date;                 // Document creation timestamp
  updatedAt?: Date;                 // Last update timestamp
  source?: string;                  // How the document was created (e.g. "bootstrap-script")
  promotedAt?: Date;                // When a user was promoted to admin (setUserAsAdmin)
  demotedAt?: Date;                 // When an admin role was removed (removeAdminRole)
}
```

---

## Role Write Paths

All role modifications **require the Firebase Admin SDK** and must run on the backend or via an
owner-run local script - never via a client request:

| Operation | File | Function | Actor |
| --- | --- | --- | --- |
| Create/update user with an arbitrary role field | `src/lib/userAuthorizationService.js` | `upsertUser()` | Backend/scripts only |
| Promote to admin | `src/lib/userAuthorizationService.js` | `setUserAsAdmin()` | Backend script only |
| Demote from admin | `src/lib/userAuthorizationService.js` | `removeAdminRole()` | Backend script only |
| Bootstrap the admin role document | `scripts/bootstrap-admin.js` | - | Owner, local CLI only |
| Bootstrap/align the demo role document | `scripts/bootstrap-demo-user.js` | - | Owner, local CLI only |
| Rotate the admin account's Auth password | `scripts/reset-admin-password.js` | - | Owner, local CLI only |
| Read role (authorization) | `src/lib/userAuthorizationService.js` | `getUserRole()`, `isUserAdmin()`, `isUserDemo()`, `resolveAdminOrDemoRole()` | Backend only |

**Frontend cannot:**
- Read the `users` collection directly (Firestore rule denies it - see below)
- Write to the `users` collection
- Modify its own or another account's `role` field
- Delete user documents
- Escalate privileges

---

## Authorization Middleware

`src/lib/authMiddleware.js` exports exactly these route-guard functions:

| Middleware | Allows | Sets `req.userRole` to |
| --- | --- | --- |
| `authenticate` | Verifies the Firebase ID token and populates `req.user`; does not check any role | - |
| `requireAdmin` | `admin` only | `"admin"` |
| `requireAdminOrDemo` | `admin` or `demo` | the resolved role (`"admin"` or `"demo"`) |
| `requireCanWrite` | Alias for `requireAdminOrDemo` - used at call sites for create/update routes | same as above |
| `requireCanDelete` | Alias for `requireAdmin` - used at call sites for delete routes | `"admin"` |

`server.js` applies these consistently:
- every **delete** route (`DELETE /api/cars/:id`, `/api/sales/:id`, `/api/financing/:id`,
  `/api/messages/:id`, and `POST /api/cloudinary/delete`) uses `requireAdmin`;
- every **read/create/update** route (`GET`/`POST`/`PATCH` for cars, sales, financing, messages,
  document downloads, and `POST /api/aiAssistant`) uses `requireAdminOrDemo`;
- `GET /api/me` uses only `authenticate` (any authenticated role, including `user`, can look up its
  own resolved role - this is how the frontend knows whether to show the Demo Mode indicator).

The permission matrix itself is centralized as pure functions of a role string in
`src/lib/userAuthorizationService.js`:

```js
export function canModifyData(role) {  // true for "admin" or "demo"
  return role === ROLES.ADMIN || role === ROLES.DEMO;
}

export function canDeleteData(role) {  // true only for "admin"
  return role === ROLES.ADMIN;
}
```

These are also used by frontend components (e.g. `useUserRole()` → `isDemo`) purely to disable/hide
UI affordances - they are a UX convenience, never the actual security boundary, which lives
entirely in the middleware above.

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

### Business Data Collections

```firestore
match /cars/{document=**} {
  allow read: if true;   // Public vehicle catalog - no PII
  allow write: if false; // Backend (Admin SDK) only
}

match /sales/{document=**} {
  allow read, write: if false; // Can contain buyer PII - backend only
}

match /financing/{document=**} {
  allow read, write: if false; // Can contain applicant PII - backend only
}

match /messages/{document=**} {
  allow read, write: if false; // Can contain sender PII - backend only
}
```

**Effect:** only `cars` allows a direct public client read (needed for the unauthenticated
Home/Cars catalog pages); every other collection - including `users` - denies all direct client
access. The admin panel reads `sales`/`financing`/`messages` exclusively through the authenticated
Express endpoints (`GET /api/sales`, `/api/financing/applications`, `/api/messages`), which use the
Firebase Admin SDK and therefore bypass these rules by design. Public availability data (which
vehicles are sold) is derived server-side and exposed only as a minimal `{carId, status}` id list
via `GET /api/public/sold-vehicle-ids` - never the full `sales` records.

---

## Admin Bootstrap Process

### Creating the Real Admin

**Requirement:** the system owner must run an owner-only local script using Firebase Admin
credentials - never a web-based flow.

```bash
# Get the UID from Firebase Console: Authentication → Users
node scripts/bootstrap-admin.js "<firebase-uid>" "<email>"
```

This sets `users/{uid}.role = "admin"` in Firestore. It does **not** create the Firebase
Authentication user or set its password - create that user first via Firebase Console
(Authentication → Users → Add user).

### Creating the Recruiter-Facing Demo Account

```bash
# Dry run (default) - reports what would happen, no mutation
node scripts/bootstrap-demo-user.js --email demo@example.com --password '<choose one>'

# Apply it
node scripts/bootstrap-demo-user.js --email demo@example.com --password '<choose one>' --execute
```

Idempotent and safe to re-run: refuses to touch any account whose role is already `admin`,
preserves an existing account's UID/`createdAt`/password, and only ever sets
`role: "demo"` plus non-destructive metadata.

### Rotating the Real Admin's Password

See [`README-ADMIN.md`](../README-ADMIN.md#rotating-the-real-admin-password) for
`scripts/reset-admin-password.js` usage. In short: `ADMIN_USER_EMAIL` + `ADMIN_NEW_PASSWORD` env
vars, dry-run by default, `--execute` to apply, refuses to run against the demo account or against
any account whose Firestore role isn't exactly `admin`, and only ever calls
`getAuth().updateUser(uid, { password })` - UID, email, disabled state, and the Firestore document
are all left untouched. The new password is never printed or logged.

### Never Use For

- ❌ Web-based user registration
- ❌ User self-service role assignment
- ❌ Automatic first-user-is-admin logic
- ❌ A public API endpoint
- ❌ A scheduled task without owner review

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
Backend middleware: requireAdmin() OR requireAdminOrDemo()
  ✓ Checks Firebase Admin SDK available (fail-closed → 503 if not)
  ✓ Calls isUserAdmin(uid) / resolveAdminOrDemoRole(uid)
    ↓
    Backend: getUserRole(uid)
      ✓ Reads users/{uid} document from Firestore
      ✓ Extracts role field
  ✓ Compares role === "admin" (requireAdmin)
    or role === "admin" || role === "demo" (requireAdminOrDemo)
↓
Result:
  authorized  → next() → route handler (req.userRole set to the resolved role)
  role ≠ authorized value → 403 Forbidden
  role missing            → 403 Forbidden
  Firestore error         → 500 Internal Server Error
  Admin SDK down          → 503 Service Unavailable
```

---

## Privilege Escalation Prevention

### Frontend Cannot Bypass Authorization

| Attempt | Result | Why |
| --- | --- | --- |
| Modify request body `"role": "admin"` | 403 Forbidden (or ignored) | Backend only checks Firestore, never the request body |
| Add header `X-Admin: true` | 403 Forbidden | Headers ignored, Firestore consulted |
| localStorage/UI role value | 403 Forbidden | Never sent to or trusted by the backend |
| Fake Firebase token | 401 Unauthorized | Token signature verified via Firebase Admin SDK |
| Missing Authorization header | 401 Unauthorized | Required by `authenticate` |
| Demo-role token on a delete route | 403 Forbidden | Delete routes use `requireAdmin`, not `requireAdminOrDemo` |

### Backend Protection

| Condition | Action |
| --- | --- |
| Firestore Security Rules deny client writes to `users` | ✅ Nobody can create/modify their own role via Firestore |
| Firebase Admin SDK reads roles | ✅ Backend always consults authoritative data |
| Exact string comparison (`=== "admin"` / `=== "demo"`) | ✅ Case-sensitive, no truthy fallback |
| Error handling fails closed | ✅ If lookup fails, the request is rejected, never silently promoted |
| Bootstrap/rotation scripts are owner-only, local CLI tools | ✅ No public API for role assignment or password rotation |

---

## Testing Role Integrity

### Unit Tests

```bash
npm test
```

Tests verify (see `src/test/demoRole.test.ts`, `src/test/security.test.ts`,
`src/test/bootstrapDemoUser.test.ts`, `src/test/resetAdminPassword.test.ts`, and others):
- ✅ `admin` passes both `requireAdmin` and `requireAdminOrDemo`
- ✅ `demo` passes `requireAdminOrDemo` but is rejected (403) by `requireAdmin`
- ✅ an ordinary/unset role is rejected (403) by both
- ✅ missing/invalid Authorization header is rejected (401) before any role check
- ✅ Firebase Admin unavailable fails safely (503)
- ✅ the demo-bootstrap and admin-password-rotation scripts each refuse to touch the wrong account

### Firestore Rules Tests

```bash
npm run test:firestore-rules
```

Runs against the local Firebase Emulator Suite and verifies:
- ✅ unauthenticated and authenticated clients alike cannot read/write `users`, `sales`,
  `financing`, or `messages`
- ✅ `cars` allows a public read but denies all client writes
- ✅ nobody can escalate their own role via a direct Firestore write

### Manual Verification (Owner Only)

1. **Admin login test** - log in at `/admin/login` with the real admin account; verify full
   access including delete buttons and `/admin/ai`.
2. **Demo login test** - log in with the demo account; verify the Demo Mode badge appears, reads
   and ordinary edits work, and every delete action is disabled in the UI and rejected (403) if
   attempted directly against the API.
3. **Non-authorized role test:**
   ```bash
   curl -H "Authorization: Bearer <token-for-a-user-with-no-admin/demo-role>" \
     http://localhost:3001/api/sales
   # Verify: returns 403 Forbidden
   ```
4. **Firebase Admin unavailable test** - temporarily unset `FIREBASE_SERVICE_ACCOUNT`, restart the
   backend, call any protected route, and verify it returns `503 Service Unavailable` (not `200`
   or `401`).

---

## Deployment Checklist

Before deploying to production:

- [ ] Firestore Security Rules deployed: `firebase deploy --only firestore:rules`
- [ ] Rules reviewed by the owner (`firestore.rules`)
- [ ] Real admin account created via Firebase Console + `scripts/bootstrap-admin.js`
- [ ] Demo account created (optional) via `scripts/bootstrap-demo-user.js --execute`
- [ ] Non-admin/non-demo accounts receive 403 Forbidden on every protected route
- [ ] Backend has Firebase Admin credentials configured (`FIREBASE_SERVICE_ACCOUNT` or
      `GOOGLE_APPLICATION_CREDENTIALS`)
- [ ] Firebase Admin SDK initialization verified (`initializeFirebaseAdmin()`)
- [ ] No fallback role-escalation logic anywhere in the backend
- [ ] Automated tests passing: `npm test` and `npm run test:firestore-rules`

---

## Security Contacts

Role and authorization issues should be reported with:

1. **Environment:** development / staging / production
2. **User email:** (if known)
3. **Observed behavior:** what access was granted or denied
4. **Expected behavior:** what should have happened

Do not post real credentials, tokens, or Firebase service account contents in reports.

---

## References

- **Firebase Security Rules:** https://firebase.google.com/docs/firestore/security/get-started
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup
- **Emulator Suite:** https://firebase.google.com/docs/emulator-suite
