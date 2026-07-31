#!/usr/bin/env node

/**
 * Bootstrap Demo User Creation Script
 *
 * SECURITY: This script must be run only by the system owner/administrator using Firebase
 * Admin credentials. It creates (or aligns the Firestore role document for) exactly one
 * restricted, public-facing 'demo' account for recruiters/reviewers to explore the admin panel.
 *
 * It NEVER touches the real administrator account. It refuses to run at all if the resolved
 * email/uid already carries role 'admin', or if the target email differs from the real admin's
 * email but the account somehow already has an unexpected role.
 *
 * Usage:
 *   node scripts/bootstrap-demo-user.js [--email <email>] [--password <password>] [--execute]
 *
 * Defaults:
 *   --email    DEMO_USER_EMAIL env var, or "demo.admin@automarket.co.nz" if neither is set
 *   --password DEMO_USER_PASSWORD env var (required to actually create a new Auth user;
 *              not required for a dry run or when the Auth user already exists)
 *
 * Modes:
 *   Dry run (default) - resolves and reports what WOULD happen. No mutation.
 *   --execute          - performs the real mutation (creates the Auth user if absent, and/or
 *                         writes users/{uid} with role: "demo").
 *
 * This script:
 * 1. Requires valid Firebase Admin SDK credentials (from environment)
 * 2. Never logs the password, in any mode
 * 3. Preserves the UID if the Auth user already exists
 * 4. Never creates a second account for an email that already exists under a different role
 * 5. Never modifies any account whose current role is "admin"
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { FieldValue } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin as initAdminApp, getAdminAuth, getAdminFirestore } from '../src/lib/firebaseAdmin.js';

dotenv.config();

const DEFAULT_DEMO_EMAIL = 'demo.admin@automarket.co.nz';

function parseArgs(argv) {
  const args = { email: null, password: null, execute: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email') args.email = argv[++i] || null;
    else if (argv[i] === '--password') args.password = argv[++i] || null;
    else if (argv[i] === '--execute') args.execute = true;
  }
  return args;
}

function resolveTarget(argv) {
  const { email: cliEmail, password: cliPassword, execute } = parseArgs(argv);
  const email = cliEmail || process.env.DEMO_USER_EMAIL || DEFAULT_DEMO_EMAIL;
  const password = cliPassword || process.env.DEMO_USER_PASSWORD || null;

  if (!email.includes('@')) {
    console.error('ERROR: Invalid email format');
    process.exit(1);
  }

  return { email, password, execute };
}

function maskUid(uid) {
  if (!uid) return uid;
  return uid.length <= 8 ? uid : `${uid.slice(0, 4)}…${uid.slice(-4)}`;
}

/**
 * Build the Firestore payload for the demo user document, merge-safe and idempotent.
 * Never includes an explicit `undefined` value (Firestore rejects it outright).
 * Preserves an existing `createdAt` if the document already has one; otherwise sets it once.
 * @param {{ uid: string, email: string, existingData: Record<string, unknown> | null }} params
 * @returns {Record<string, unknown>}
 */
export function buildDemoUserPayload({ uid, email, existingData }) {
  const payload = {
    uid,
    email,
    role: 'demo',
    updatedAt: FieldValue.serverTimestamp(),
    source: 'bootstrap-demo-script',
  };

  if (!existingData || existingData.createdAt === undefined) {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  return payload;
}

function initFirebase() {
  const app = initAdminApp();
  if (!app) {
    console.error(
      'ERROR: Firebase Admin could not be initialized. Set FIREBASE_SERVICE_ACCOUNT ' +
      '(JSON) or GOOGLE_APPLICATION_CREDENTIALS (service account file path) in .env, ' +
      'and ensure FIREBASE_ADMIN_SDK_DISABLED is not "true".'
    );
    process.exit(1);
  }
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  if (!auth || !db) {
    console.error('ERROR: Firebase Admin Auth/Firestore is not available from the initialized app.');
    process.exit(1);
  }
  return { auth, db };
}

export async function main() {
  console.log('🔐 AutoMarket Demo User Bootstrap Script');
  console.log('==========================================\n');

  const { email, password, execute } = resolveTarget(process.argv.slice(2));
  const { auth, db } = initFirebase();

  console.log(`Mode: ${execute ? 'EXECUTE (will mutate Firebase)' : 'DRY RUN (no mutation)'}`);
  console.log(`Target email: ${email}`);
  console.log(`Password provided: ${password ? 'yes (not shown)' : 'no'}\n`);

  // Look up any existing Auth user for this email.
  let existingUser = null;
  try {
    existingUser = await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.error(`ERROR: Failed to look up ${email}:`, err.message);
      process.exit(1);
    }
  }

  // Look up the current Firestore document for the resolved uid (if the Auth user exists).
  let existingDocData = null;
  if (existingUser) {
    const doc = await db.collection('users').doc(existingUser.uid).get();
    existingDocData = doc.exists ? doc.data() : null;
  }
  const existingRole = existingDocData ? existingDocData.role || null : null;

  // Hard safety gate: never touch an account that is already the real admin.
  if (existingRole === 'admin') {
    console.error(
      `\n❌ REFUSING TO CONTINUE: ${email} (uid ${maskUid(existingUser.uid)}) already has role ` +
      `"admin". This script will never modify an admin account. Choose a different demo email.`
    );
    process.exit(1);
  }

  // Safety gate: an existing account with a role that is neither "demo" nor unset is unexpected -
  // refuse rather than silently overwrite an unknown account's role.
  if (existingUser && existingRole && existingRole !== 'demo') {
    console.error(
      `\n❌ REFUSING TO CONTINUE: ${email} (uid ${maskUid(existingUser.uid)}) already has an ` +
      `unexpected role "${existingRole}" (expected "demo" or none). Resolve this manually.`
    );
    process.exit(1);
  }

  if (existingUser) {
    console.log(`✅ Auth user already exists - uid ${maskUid(existingUser.uid)} will be preserved.`);
    console.log(`   disabled: ${existingUser.disabled}`);
    console.log(`   current Firestore role: ${existingRole || '(none - will be set to "demo")'}`);
  } else {
    console.log('ℹ️  No existing Auth user for this email - a new one would be created.');
    if (!password && execute) {
      console.error('\n❌ ERROR: --execute requires a password (DEMO_USER_PASSWORD or --password) to create a new Auth user.');
      process.exit(1);
    }
  }

  if (!execute) {
    console.log('\n🧪 Dry run complete. No changes were made.');
    console.log('Re-run with --execute to apply this plan after owner review.\n');
    return;
  }

  console.log('\n⚠️  Applying changes...');

  let uid;
  if (existingUser) {
    uid = existingUser.uid;
  } else {
    const created = await auth.createUser({ email, password, disabled: false });
    uid = created.uid;
    console.log(`✅ Created Auth user - uid ${maskUid(uid)}`);
  }

  const payload = buildDemoUserPayload({ uid, email, existingData: existingDocData });
  await db.collection('users').doc(uid).set(payload, { merge: true });

  console.log(`✅ users/${maskUid(uid)} set to role "demo"`);
  console.log('\n✅ Bootstrap completed.');
  console.log('\nNext steps:');
  console.log('1. Verify the demo account can log in at /admin/login');
  console.log('2. Confirm it sees the "Demo Mode" indicator and sanitized data');
  console.log('3. Confirm it cannot perform destructive actions (expect 403)');
  console.log('\n📋 Audit: Record this bootstrap operation in your security log.\n');
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch((err) => {
    console.error('\n❌ Unexpected error:', err.message);
    process.exit(1);
  });
}
