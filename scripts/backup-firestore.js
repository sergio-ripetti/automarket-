#!/usr/bin/env node

/**
 * Firestore Backup Script
 *
 * Read-only. Writes a single local JSON snapshot of the specified collections
 * under backups/firestore/. Never modifies Firestore, never prints full record
 * contents to the terminal, and never includes credentials or secrets in the
 * backup file itself (only the application data already stored in Firestore).
 *
 * Usage:
 *   node scripts/backup-firestore.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { initializeFirebaseAdmin, getAdminFirestore } from '../src/lib/firebaseAdmin.js';

dotenv.config();

const BACKUP_COLLECTIONS = Object.freeze(['cars', 'sales', 'financing', 'messages', 'users']);
const BACKUP_ROOT = path.join(process.cwd(), 'backups', 'firestore');

function windowsSafeTimestamp(date) {
  // Windows filenames cannot contain ':' - use hyphens throughout.
  return date.toISOString().replace(/:/g, '-').replace(/\..+$/, '');
}

// Firestore Timestamps, GeoPoints, and DocumentReferences don't serialize safely via
// plain JSON.stringify - convert them to plain, self-describing values.
function serializeValue(value) {
  if (value === null || value === undefined) return value;

  if (typeof value?.toDate === 'function' && typeof value?.toMillis === 'function') {
    // Firestore Timestamp
    return { __type: 'timestamp', iso: value.toDate().toISOString() };
  }

  if (typeof value?.latitude === 'number' && typeof value?.longitude === 'number' && Object.keys(value).length <= 2) {
    // Firestore GeoPoint
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }

  if (typeof value?.path === 'string' && typeof value?.id === 'string' && typeof value?.get === 'function') {
    // Firestore DocumentReference
    return { __type: 'reference', path: value.path };
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = serializeValue(val);
    }
    return result;
  }

  return value;
}

async function backupCollection(db, collectionName) {
  const snap = await db.collection(collectionName).get();
  const documents = {};
  for (const docSnap of snap.docs) {
    // Document ID is preserved as the object key, not just an inline field.
    documents[docSnap.id] = serializeValue(docSnap.data());
  }
  return { count: snap.size, documents };
}

async function main() {
  console.log('AutoMarket Firestore Backup');
  console.log('============================\n');

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

  await db.listCollections();
  const projectId = db.projectId || '(unresolved)';
  console.log(`Firebase project ID: ${projectId}`);
  console.log(`Collections: ${BACKUP_COLLECTIONS.join(', ')}\n`);

  const backup = {
    createdAt: new Date().toISOString(),
    projectId,
    collections: {},
  };

  let totalDocs = 0;
  for (const collectionName of BACKUP_COLLECTIONS) {
    const { count, documents } = await backupCollection(db, collectionName);
    backup.collections[collectionName] = documents;
    totalDocs += count;
    console.log(`  ${collectionName}: ${count} document(s)`);
  }

  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  const timestamp = windowsSafeTimestamp(new Date());
  const filename = `firestore-backup-${timestamp}.json`;
  const filePath = path.join(BACKUP_ROOT, filename);

  const json = JSON.stringify(backup, null, 2);
  fs.writeFileSync(filePath, json, 'utf8');

  const stats = fs.statSync(filePath);
  const checksum = crypto.createHash('sha256').update(json).digest('hex');

  console.log('\n============================');
  console.log(`Total documents backed up: ${totalDocs}`);
  console.log(`Backup file: ${filePath}`);
  console.log(`File size: ${stats.size} bytes`);
  console.log(`SHA-256 checksum: ${checksum}`);
  console.log('============================\n');
  console.log('Backup complete. No Firestore data was modified.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Backup script failed:', err && err.message ? err.message : err);
  process.exit(1);
});
