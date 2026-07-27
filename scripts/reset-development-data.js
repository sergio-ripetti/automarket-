#!/usr/bin/env node

/**
 * Development Data Reset Script
 *
 * SAFETY-CRITICAL. Deletes only the explicit operational-data collections below,
 * against the exact Firebase project resolved from the current credentials.
 * Defaults to a read-only dry run; real deletion requires --execute plus the
 * expected project ID plus an exact confirmation phrase.
 *
 * Usage:
 *   node scripts/reset-development-data.js                 (dry run, no writes)
 *   node scripts/reset-development-data.js --execute        (performs deletion, with confirmations)
 *
 * NEVER deletes:
 *   - Firebase Authentication users
 *   - the `users` collection (admin roles)
 *   - Firestore rules / indexes / project configuration
 *   - Cloudinary assets
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initializeFirebaseAdmin, getAdminFirestore } from '../src/lib/firebaseAdmin.js';

dotenv.config();

// Only these collections may ever be targeted by this script. This is a fixed
// allowlist, not a dynamic "every top-level collection" sweep - new collections
// added to the project in the future are NOT deleted unless explicitly added here
// after owner review.
export const DELETION_ALLOWLIST = Object.freeze(['cars', 'sales', 'financing', 'messages']);

// Collections that must never be touched by this script, regardless of flags.
export const PROTECTED_COLLECTIONS = Object.freeze(['users']);

export const EXPECTED_PROJECT_ID_ENV = 'RESET_EXPECTED_PROJECT_ID';
export const CONFIRMATION_PHRASE = 'RESET_AUTOMARKET_DEVELOPMENT_DATA';
export const CONFIRMATION_ENV = 'RESET_CONFIRMATION_PHRASE';
export const BATCH_SIZE = 400; // Firestore hard limit is 500 writes per batch; stay comfortably under it.

export function parseArgs(argv) {
  return {
    execute: argv.includes('--execute'),
  };
}

// The Admin SDK resolves the project ID lazily when credentials come from
// GOOGLE_APPLICATION_CREDENTIALS / Application Default Credentials - `db.projectId` throws
// until at least one Firestore request has been issued. Callers must perform a request
// (e.g. `await db.listCollections()`) before this can read a value from `db`.
export function resolveProjectId(app, db) {
  let fromFirestore = null;
  try {
    fromFirestore = db?.projectId || null;
  } catch {
    fromFirestore = null;
  }

  return (
    fromFirestore ||
    app?.options?.projectId ||
    app?.options?.credential?.projectId ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    null
  );
}

// Recursively deletes every document in a collection plus any subcollections found
// on each document. Firestore does NOT delete subcollections when a parent document
// is deleted, so this must be walked explicitly rather than assumed.
export async function collectDeletionPlan(db, collectionName) {
  const snap = await db.collection(collectionName).get();
  const docs = [];
  let subcollectionCount = 0;

  for (const docSnap of snap.docs) {
    const subcollections = await docSnap.ref.listCollections();
    subcollectionCount += subcollections.length;
    docs.push({
      id: docSnap.id,
      ref: docSnap.ref,
      subcollections: subcollections.map((c) => c.id),
    });
  }

  return { collectionName, documentCount: snap.size, docs, subcollectionCount };
}

export async function deleteDocsInBatches(db, refs, logPrefix) {
  let deleted = 0;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
    deleted += chunk.length;
    console.log(`  ${logPrefix}: deleted ${deleted}/${refs.length}`);
  }
  return deleted;
}

// Deletes all documents in a subcollection, batched. Called before deleting the
// parent document so no orphaned subcollection documents are left behind.
export async function deleteSubcollectionRecursive(db, docRef, subcollectionId, logPrefix) {
  const subSnap = await docRef.collection(subcollectionId).get();
  if (subSnap.empty) return 0;
  const refs = subSnap.docs.map((d) => d.ref);
  return deleteDocsInBatches(db, refs, `${logPrefix}/${subcollectionId}`);
}

export async function main() {
  const { execute } = parseArgs(process.argv.slice(2));

  console.log('AutoMarket Development Data Reset');
  console.log('==================================\n');

  const app = initializeFirebaseAdmin();
  if (!app) {
    console.error(
      'ERROR: Firebase Admin could not be initialized. Set FIREBASE_SERVICE_ACCOUNT ' +
      '(JSON) or GOOGLE_APPLICATION_CREDENTIALS (service account file path), and ensure ' +
      'FIREBASE_ADMIN_SDK_DISABLED is not "true".'
    );
    process.exit(1);
    return;
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error('ERROR: Firestore is not available from the initialized Firebase Admin app.');
    process.exit(1);
    return;
  }

  // Issue one lightweight, read-only Firestore call so the client finishes resolving its
  // project ID (see resolveProjectId) before anything else in this script runs.
  await db.listCollections();
  const projectId = resolveProjectId(app, db);
  console.log(`Firebase project ID: ${projectId || '(unresolved)'}\n`);

  if (!projectId) {
    console.error(
      'ERROR: Could not resolve a Firebase project ID from the current credentials. ' +
      'Refusing to run against an unverified project.'
    );
    process.exit(1);
    return;
  }

  // In execute mode, the operator must state which project they believe they are
  // targeting. If it does not match what the credentials actually resolve to, abort.
  if (execute) {
    const expectedProjectId = process.env[EXPECTED_PROJECT_ID_ENV];
    if (!expectedProjectId) {
      console.error(
        `ERROR: --execute requires ${EXPECTED_PROJECT_ID_ENV} to be set to the expected ` +
        'Firebase project ID, as an explicit acknowledgement of the target project.'
      );
      process.exit(1);
      return;
    }
    if (expectedProjectId !== projectId) {
      console.error(
        `ERROR: ${EXPECTED_PROJECT_ID_ENV} ("${expectedProjectId}") does not match the ` +
        `resolved project ID ("${projectId}"). Refusing to run against an unexpected project.`
      );
      process.exit(1);
      return;
    }

    const confirmation = process.env[CONFIRMATION_ENV];
    if (confirmation !== CONFIRMATION_PHRASE) {
      console.error(
        `ERROR: --execute requires ${CONFIRMATION_ENV} to exactly equal ` +
        `"${CONFIRMATION_PHRASE}". No deletions were performed.`
      );
      process.exit(1);
      return;
    }
  }

  // Verify the admin user document is present and intact before doing anything else.
  // This is a sanity check only - this script never writes to `users` and never
  // touches Firebase Authentication.
  console.log('Protected collections (never touched):', PROTECTED_COLLECTIONS.join(', '));
  const usersSnap = await db.collection('users').get();
  const adminDocs = usersSnap.docs.filter((d) => d.data().role === 'admin');
  console.log(
    `Admin role check: ${usersSnap.size} user document(s) found, ` +
    `${adminDocs.length} with role="admin".\n`
  );

  console.log('Deletion allowlist:', DELETION_ALLOWLIST.join(', '));
  console.log(`Mode: ${execute ? 'EXECUTE (irreversible deletion)' : 'DRY RUN (no writes)'}\n`);

  const plans = [];
  let totalDocs = 0;
  let totalSubcollections = 0;

  for (const collectionName of DELETION_ALLOWLIST) {
    if (PROTECTED_COLLECTIONS.includes(collectionName)) {
      // Defensive - should be unreachable since the allowlist is a fixed constant above,
      // but this guarantees a protected collection can never be deleted even if the
      // allowlist is edited carelessly in the future.
      throw new Error(`Refusing to include protected collection "${collectionName}" in deletion plan.`);
    }
    const plan = await collectDeletionPlan(db, collectionName);
    plans.push(plan);
    totalDocs += plan.documentCount;
    totalSubcollections += plan.subcollectionCount;

    console.log(`--- ${collectionName} ---`);
    console.log(`  Documents: ${plan.documentCount}`);
    console.log(`  Subcollections found: ${plan.subcollectionCount}`);
    const preview = plan.docs.slice(0, 5).map((d) => d.id);
    if (preview.length > 0) {
      console.log(`  Preview (first ${preview.length} of ${plan.documentCount}): ${preview.join(', ')}`);
    }
    console.log('');
  }

  console.log('==================================');
  console.log(`Total documents targeted for deletion: ${totalDocs}`);
  console.log(`Total subcollections targeted for deletion: ${totalSubcollections}`);
  console.log('==================================\n');

  if (!execute) {
    console.log('Dry run complete. No documents were deleted.');
    console.log('To execute, re-run with --execute plus the required environment variables:');
    console.log(`  ${EXPECTED_PROJECT_ID_ENV}=${projectId}`);
    console.log(`  ${CONFIRMATION_ENV}=${CONFIRMATION_PHRASE}`);
    process.exit(0);
    return;
  }

  console.log('⚠️  WARNING: This operation is IRREVERSIBLE. Proceeding with deletion...\n');

  let grandTotalDeleted = 0;
  for (const plan of plans) {
    console.log(`Deleting collection "${plan.collectionName}"...`);
    for (const docEntry of plan.docs) {
      for (const subId of docEntry.subcollections) {
        const subDeleted = await deleteSubcollectionRecursive(
          db, docEntry.ref, subId, `${plan.collectionName}/${docEntry.id}`
        );
        grandTotalDeleted += subDeleted;
      }
    }
    const refs = plan.docs.map((d) => d.ref);
    const deleted = await deleteDocsInBatches(db, refs, plan.collectionName);
    grandTotalDeleted += deleted;
  }

  console.log(`\n✅ Reset complete. ${grandTotalDeleted} total document(s) deleted.`);
  console.log('Preserved: users collection, Firebase Authentication, Firestore rules/indexes, Cloudinary assets.');
  process.exit(0);
}

// Only auto-run when executed directly (`node scripts/reset-development-data.js`),
// never when imported by tests.
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch((err) => {
    console.error('\n❌ Reset script failed:', err && err.message ? err.message : err);
    process.exit(1);
  });
}
