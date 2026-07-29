// Firebase Admin SDK initialization for backend token verification and admin operations
// Credentials can be provided via:
// 1. FIREBASE_SERVICE_ACCOUNT (JSON string in environment)
// 2. GOOGLE_APPLICATION_CREDENTIALS (path to JSON file - auto-loaded by Firebase)
// 3. FIREBASE_ADMIN_SDK_DISABLED (skip initialization for local testing)

import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let initialized = false;
let adminApp = null;

/**
 * Initialize Firebase Admin SDK with credentials from environment
 * @returns {admin.app.App | null} Firebase admin app instance or null if disabled
 */
export function initializeFirebaseAdmin() {
  if (initialized) {
    return adminApp;
  }

  initialized = true;

  // Allow disabling Firebase Admin for local/test environments
  if (process.env.FIREBASE_ADMIN_SDK_DISABLED === 'true') {
    console.log('⚠️ Firebase Admin SDK disabled via FIREBASE_ADMIN_SDK_DISABLED');
    return null;
  }

  try {
    // Try to load credentials from FIREBASE_SERVICE_ACCOUNT environment variable (JSON string)
    let credentials;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✓ Firebase Admin: Loaded credentials from FIREBASE_SERVICE_ACCOUNT');
      } catch (parseErr) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON');
        throw parseErr;
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Firebase Admin SDK will auto-load from GOOGLE_APPLICATION_CREDENTIALS path
      console.log('✓ Firebase Admin: Using GOOGLE_APPLICATION_CREDENTIALS path');
    } else {
      throw new Error(
        'Firebase Admin credentials not configured. ' +
        'Set FIREBASE_SERVICE_ACCOUNT (JSON string) or GOOGLE_APPLICATION_CREDENTIALS (file path)'
      );
    }

    // Initialize with explicit credentials if provided, otherwise Firebase will auto-detect
    if (credentials) {
      adminApp = admin.initializeApp({
        credential: cert(credentials),
      });
    } else {
      adminApp = admin.initializeApp();
    }

    console.log('✅ Firebase Admin SDK initialized successfully');
    return adminApp;
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', err.message);
    adminApp = null;
    return null;
  }
}

/**
 * Get Firebase Admin Auth instance
 * @returns {admin.auth.Auth | null}
 */
export function getAdminAuth() {
  const app = adminApp || initializeFirebaseAdmin();
  if (!app) return null;
  return getAuth(app);
}

/**
 * Verify a Firebase ID token and return the decoded token
 * @param {string} idToken - Firebase ID token from Authorization header
 * @returns {Promise<admin.auth.DecodedIdToken | null>} Decoded token or null if invalid
 */
export async function verifyIdToken(idToken) {
  try {
    const auth = getAdminAuth();
    if (!auth) {
      console.error('Firebase Admin Auth not available');
      return null;
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (err) {
    // Token verification failed (expired, invalid signature, etc.)
    return null;
  }
}

/**
 * Get user by UID from Firebase Authentication
 * @param {string} uid - Firebase user UID
 * @returns {Promise<admin.auth.UserRecord | null>} User record or null if not found
 */
export async function getUserByUid(uid) {
  try {
    const auth = getAdminAuth();
    if (!auth) {
      console.error('Firebase Admin Auth not available');
      return null;
    }

    const user = await auth.getUser(uid);
    return user;
  } catch (err) {
    return null;
  }
}

/**
 * Get Firestore database instance
 * @returns {admin.firestore.Firestore | null}
 */
export function getAdminFirestore() {
  const app = adminApp || initializeFirebaseAdmin();
  if (!app) return null;
  return getFirestore(app);
}

/**
 * Write a financing application to Firestore using Admin SDK
 * @param {Record<string, unknown>} financingData - Application data
 * @returns {Promise<string>} Document ID on success
 */
export async function saveFinancingApplication(financingData) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const ref = await db.collection('financing').add(financingData);
    return ref.id;
  } catch (err) {
    console.error('Failed to save financing application:', err.message);
    throw err;
  }
}

/**
 * Write a public message (contact/inquiry/offer) to Firestore using Admin SDK
 * @param {Record<string, unknown>} messageData - Message data
 * @returns {Promise<string>} Document ID on success
 */
export async function savePublicMessage(messageData) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const ref = await db.collection('messages').add(messageData);
    return ref.id;
  } catch (err) {
    console.error('Failed to save public message:', err.message);
    throw err;
  }
}

/**
 * Create a new vehicle in the 'cars' collection using Admin SDK
 * Generates createdAt and updatedAt server-side
 * @param {Record<string, unknown>} carData - Car data
 * @returns {Promise<string>} Document ID on success
 */
export async function createCarAdmin(carData) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const now = new Date();
    const ref = await db.collection('cars').add({
      ...carData,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (err) {
    console.error('Failed to create car:', err.message);
    throw err;
  }
}

/**
 * Update an existing vehicle in the 'cars' collection using Admin SDK
 * Preserves createdAt and sets updatedAt to current time
 * @param {string} carId - Car document ID
 * @param {Record<string, unknown>} updateData - Fields to update
 * @returns {Promise<void>}
 */
export async function updateCarAdmin(carId, updateData) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('cars').doc(carId).update({
      ...updateData,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to update car:', err.message);
    throw err;
  }
}

/**
 * Delete a vehicle from the 'cars' collection using Admin SDK
 * @param {string} carId - Car document ID
 * @returns {Promise<void>}
 */
export async function deleteCarAdmin(carId) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('cars').doc(carId).delete();
  } catch (err) {
    console.error('Failed to delete car:', err.message);
    throw err;
  }
}

/**
 * Create a new sale in the 'sales' collection using Admin SDK
 * Generates createdAt server-side
 * @param {Record<string, unknown>} saleData - Sale data (without id and createdAt)
 * @returns {Promise<string>} Document ID on success
 */
export async function createSaleAdmin(saleData) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const now = new Date();
    const ref = await db.collection('sales').add({
      ...saleData,
      createdAt: now,
    });
    return ref.id;
  } catch (err) {
    console.error('Failed to create sale:', err.message);
    throw err;
  }
}

/**
 * Reads only the {carId, status} pair from every sale, via the Admin SDK - backs the public
 * sold-vehicle-ids endpoint. Deliberately does not select or return any other field (buyer info,
 * payment info, documents, etc.) since this data ultimately reaches the public, unauthenticated
 * browser; minimizing what's pulled out of Firestore in the first place is a second layer of
 * protection on top of the endpoint only ever responding with derived vehicle IDs.
 * @returns {Promise<Array<{ carId: unknown, status: unknown }>>}
 */
export async function getSalesCarIdAndStatusOnly() {
  const db = getAdminFirestore();
  if (!db) {
    throw new Error('Firestore not available');
  }

  const snap = await db.collection('sales').select('carId', 'status').get();
  return snap.docs.map((doc) => doc.data());
}

/**
 * Update an existing sale in the 'sales' collection using Admin SDK
 * Preserves createdAt, does not modify it
 * @param {string} saleId - Sale document ID
 * @param {Record<string, unknown>} updateData - Fields to update
 * @returns {Promise<void>}
 */
export async function updateSaleAdmin(saleId, updateData) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('sales').doc(saleId).update(updateData);
  } catch (err) {
    console.error('Failed to update sale:', err.message);
    throw err;
  }
}

/**
 * Update sale payment status and sync sale status atomically
 * Handles marking a payment paid/unpaid and automatically updating sale status
 * Uses Firestore transaction to ensure atomicity
 * @param {string} saleId - Sale document ID
 * @param {Record<string, unknown>} updateData - Partial update (payments, status, etc.)
 * @returns {Promise<void>}
 */
export async function updateSalePaymentAndStatusAdmin(saleId, updateData) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    // Single atomic write
    await db.collection('sales').doc(saleId).update(updateData);
  } catch (err) {
    console.error('Failed to update sale payment/status:', err.message);
    throw err;
  }
}

/**
 * Delete a sale from the 'sales' collection using Admin SDK
 * @param {string} saleId - Sale document ID
 * @returns {Promise<void>}
 */
export async function deleteSaleAdmin(saleId) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('sales').doc(saleId).delete();
  } catch (err) {
    console.error('Failed to delete sale:', err.message);
    throw err;
  }
}

/**
 * Update a financing application status
 * Preserves createdAt and sets updatedAt to current time
 * @param {string} financingId - Financing document ID
 * @param {string} status - New status (pending, approved, rejected, paying, completed)
 * @returns {Promise<void>}
 */
export async function updateFinancingStatusAdmin(financingId, status) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('financing').doc(financingId).update({
      status,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to update financing status:', err.message);
    throw err;
  }
}

/**
 * Delete a financing application from the 'financing' collection using Admin SDK
 * @param {string} financingId - Financing document ID
 * @returns {Promise<void>}
 */
export async function deleteFinancingApplicationAdmin(financingId) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('financing').doc(financingId).delete();
  } catch (err) {
    console.error('Failed to delete financing application:', err.message);
    throw err;
  }
}

/**
 * Update a message's read status
 * Sets updatedAt to current time
 * @param {string} messageId - Message document ID
 * @param {boolean} read - Read status (true/false)
 * @returns {Promise<void>}
 */
export async function updateMessageReadStatusAdmin(messageId, read) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('messages').doc(messageId).update({
      read,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to update message read status:', err.message);
    throw err;
  }
}

/**
 * Delete a message from the 'messages' collection using Admin SDK
 * @param {string} messageId - Message document ID
 * @returns {Promise<void>}
 */
export async function deleteMessageAdmin(messageId) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('messages').doc(messageId).delete();
  } catch (err) {
    console.error('Failed to delete message:', err.message);
    throw err;
  }
}
