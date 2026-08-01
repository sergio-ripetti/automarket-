#!/usr/bin/env node

/**
 * Admin Password Rotation Script
 *
 * SECURITY: This script must be run only by the system owner/administrator using Firebase
 * Admin credentials. It rotates the Firebase Authentication password for exactly one existing
 * user: the real admin account. The account's email (admin@automarket.co.nz) is fictional and
 * cannot receive a Firebase password-reset email, so this script exists as the only way to
 * rotate that password out-of-band.
 *
 * It NEVER creates or deletes the user, never changes its UID or email, never touches its
 * Firestore role document, and never operates on the restricted demo account.
 *
 * Usage:
 *   node scripts/reset-admin-password.js [--execute]
 *
 * Required environment variables:
 *   ADMIN_USER_EMAIL   - the target admin account's email
 *   ADMIN_NEW_PASSWORD - the new password to set (never logged)
 *
 * Modes:
 *   Dry run (default) - resolves and reports what WOULD happen. No mutation.
 *   --execute          - performs the real mutation (Firebase Auth password update only).
 *
 * This script:
 * 1. Requires valid Firebase Admin SDK credentials (from environment)
 * 2. Never logs or prints the new (or any) password, in any mode
 * 3. Preserves the UID, email, disabled state, and all other Auth metadata
 * 4. Never touches the Firestore users/{uid} document
 * 5. Refuses to run if the resolved Firestore role is not exactly "admin"
 * 6. Refuses to run against the restricted demo account's email
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { initializeFirebaseAdmin as initAdminApp, getAdminAuth, getAdminFirestore } from '../src/lib/firebaseAdmin.js';

dotenv.config();

const DEMO_ACCOUNT_EMAIL = 'demo.admin@automarket.co.nz';

function parseArgs(argv) {
  const args = { execute: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--execute') args.execute = true;
  }
  return args;
}

function maskUid(uid) {
  if (!uid) return uid;
  return uid.length <= 8 ? uid : `${uid.slice(0, 4)}…${uid.slice(-4)}`;
}

function resolveTarget(argv) {
  const { execute } = parseArgs(argv);
  const email = process.env.ADMIN_USER_EMAIL || null;
  const newPassword = process.env.ADMIN_NEW_PASSWORD || null;

  if (!email) {
    console.error('ERROR: ADMIN_USER_EMAIL environment variable is required.');
    process.exit(1);
  }
  if (!email.includes('@')) {
    console.error('ERROR: Invalid email format in ADMIN_USER_EMAIL.');
    process.exit(1);
  }
  if (!newPassword) {
    console.error('ERROR: ADMIN_NEW_PASSWORD environment variable is required.');
    process.exit(1);
  }

  return { email, newPassword, execute };
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
  console.log('🔐 AutoMarket Admin Password Rotation Script');
  console.log('==============================================\n');

  const { email, newPassword, execute } = resolveTarget(process.argv.slice(2));
  const { auth, db } = initFirebase();

  console.log(`Mode: ${execute ? 'EXECUTE (will mutate Firebase)' : 'DRY RUN (no mutation)'}`);
  console.log(`Target email: ${email}`);
  console.log('New password: provided (not shown)\n');

  // Hard safety gate: never operate on the restricted demo account, regardless of what
  // ADMIN_USER_EMAIL was set to.
  if (email === DEMO_ACCOUNT_EMAIL) {
    console.error(
      `\n❌ REFUSING TO CONTINUE: ${email} is the restricted demo account. This script only ` +
      `rotates the real admin account's password and will never modify the demo account.`
    );
    process.exit(1);
  }

  // Look up the existing Auth user for this email. This script only rotates a password for an
  // account that already exists - it never creates or deletes one.
  let existingUser = null;
  try {
    existingUser = await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`\n❌ REFUSING TO CONTINUE: No Firebase Auth user exists for ${email}.`);
      process.exit(1);
    }
    console.error(`ERROR: Failed to look up ${email}:`, err.message);
    process.exit(1);
  }

  const uid = existingUser.uid;

  // Verify the matching Firestore role document exists and carries exactly role "admin".
  const doc = await db.collection('users').doc(uid).get();
  const role = doc.exists ? doc.data().role || null : null;

  if (role !== 'admin') {
    console.error(
      `\n❌ REFUSING TO CONTINUE: users/${maskUid(uid)} has role "${role || '(none)'}" ` +
      `(expected exactly "admin"). This script will never rotate the password of a non-admin ` +
      `account.`
    );
    process.exit(1);
  }

  console.log(`✅ Auth user found - uid ${maskUid(uid)}`);
  console.log(`   disabled: ${existingUser.disabled}`);
  console.log(`   Firestore role: ${role}`);

  if (!execute) {
    console.log('\n🧪 Dry run complete. No changes were made.');
    console.log('Re-run with --execute to apply this plan after owner review.\n');
    return;
  }

  console.log('\n⚠️  Applying changes...');

  // Only the password is set here - every other Auth field (email, disabled state, metadata,
  // custom claims) is left untouched by omitting it from the update payload. The Firestore
  // users/{uid} document is never written by this script.
  await auth.updateUser(uid, { password: newPassword });

  console.log(`✅ Password updated for uid ${maskUid(uid)}. UID, email, disabled state, and the`);
  console.log('   Firestore role document were all left unchanged.');
  console.log('\n✅ Rotation completed.');
  console.log('\nNext steps:');
  console.log('1. Verify the admin can log in at /admin/login with the new password');
  console.log('2. Confirm the account still has role "admin" and full access');
  console.log('3. Store the new password securely (e.g. a password manager) - it was never printed');
  console.log('\n📋 Audit: Record this rotation in your security log.\n');
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch((err) => {
    console.error('\n❌ Unexpected error:', err.message);
    process.exit(1);
  });
}
