#!/usr/bin/env node

/**
 * Bootstrap Admin User Creation Script
 *
 * SECURITY: This script must be run only by the system owner/administrator
 * using Firebase Admin credentials. It creates or promotes the first admin user.
 *
 * Usage:
 *   node scripts/bootstrap-admin.js <uid> [email]
 *
 * Example:
 *   node scripts/bootstrap-admin.js "firebase-uid-123" "admin@automarket.co.nz"
 *
 * This script:
 * 1. Requires valid Firebase Admin SDK credentials (from environment)
 * 2. Creates a user document in Firestore with role="admin"
 * 3. Logs the operation for audit purposes
 * 4. Does NOT modify Firebase Authentication
 *
 * NEVER call this from a web endpoint or client-side code.
 * NEVER make this script accessible to ordinary users.
 * ONLY run this locally with Firebase Admin credentials.
 */

import dotenv from 'dotenv';
import { initializeFirebaseAdmin as initAdminApp, getAdminFirestore } from '../src/lib/firebaseAdmin.js';

dotenv.config();

// Reuses the shared Firebase Admin initializer (supports FIREBASE_SERVICE_ACCOUNT
// JSON or GOOGLE_APPLICATION_CREDENTIALS, same precedence as the running server),
// instead of duplicating a separate initializer tied only to FIREBASE_SERVICE_ACCOUNT.
function initializeFirebaseAdmin() {
  const app = initAdminApp();

  if (!app) {
    console.error(
      'ERROR: Firebase Admin could not be initialized. Set FIREBASE_SERVICE_ACCOUNT ' +
      '(JSON) or GOOGLE_APPLICATION_CREDENTIALS (service account file path) in .env, ' +
      'and ensure FIREBASE_ADMIN_SDK_DISABLED is not "true".'
    );
    process.exit(1);
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error('ERROR: Firestore is not available from the initialized Firebase Admin app.');
    process.exit(1);
  }

  return db;
}

// Validate command-line arguments
function validateArguments() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/bootstrap-admin.js <uid> [email]');
    console.error('');
    console.error('Arguments:');
    console.error('  uid   - Firebase Authentication UID');
    console.error('  email - (optional) User email address');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/bootstrap-admin.js "user-xyz" "admin@example.com"');
    process.exit(1);
  }

  const uid = args[0];
  const email = args[1] || null;

  if (!uid || uid.length === 0) {
    console.error('ERROR: UID cannot be empty');
    process.exit(1);
  }

  if (email && !email.includes('@')) {
    console.error('ERROR: Invalid email format');
    process.exit(1);
  }

  return { uid, email };
}

// Create or update admin user in Firestore
async function createAdminUser(db, uid, email) {
  console.log(`\n📝 Creating admin user: ${uid}`);

  const userData = {
    uid,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'bootstrap-script',
  };

  if (email) {
    userData.email = email;
  }

  try {
    await db.collection('users').doc(uid).set(userData, { merge: true });
    console.log(`✅ Admin user created successfully`);
    console.log(`   UID: ${uid}`);
    if (email) {
      console.log(`   Email: ${email}`);
    }
    console.log(`   Role: admin`);
    return true;
  } catch (err) {
    console.error('❌ Failed to create admin user:', err.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔐 AutoMarket Admin Bootstrap Script');
  console.log('=====================================\n');

  // Validate arguments
  const { uid, email } = validateArguments();

  console.log('Initializing Firebase Admin SDK...');
  const db = initializeFirebaseAdmin();

  // Confirm action
  console.log('\n⚠️  WARNING: This will create an admin user in Firestore');
  console.log(`\nDetails:`);
  console.log(`  UID: ${uid}`);
  if (email) {
    console.log(`  Email: ${email}`);
  }
  console.log(`  Role: admin`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);

  console.log(
    '\n⚠️  Only authorized administrators should run this script!'
  );
  console.log('This operation is permanent and should be audited.\n');

  // Create admin user
  const success = await createAdminUser(db, uid, email);

  if (success) {
    console.log(
      '\n✅ Bootstrap completed. The admin user can now access the AI endpoint.'
    );
    console.log('\nNext steps:');
    console.log('1. Verify the user can log in at /admin/login');
    console.log(
      '2. Confirm the user can access /admin/ai (AI assistant endpoint)'
    );
    console.log('3. Test non-admin access is denied');
    console.log(
      '\n📋 Audit: Record this bootstrap operation in your security log.\n'
    );
  } else {
    console.log(
      '\n❌ Bootstrap failed. Check the error above and retry with valid credentials.\n'
    );
    process.exit(1);
  }
}

main();
