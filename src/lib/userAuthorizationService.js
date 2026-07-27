// Backend service for user authorization
// Checks if a Firebase user has required role/permissions
// Uses Firestore as source of truth for admin designation

import { getAdminFirestore } from './firebaseAdmin.js';

/**
 * Get user role from Firestore
 * Checks users/{uid} document for role field
 * @param {string} uid - Firebase user UID
 * @returns {Promise<string | null>} User role or null if not found
 */
export async function getUserRole(uid) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return userData?.role || null;
  } catch (err) {
    console.error(`Error fetching user role for ${uid}:`, err.message);
    return null;
  }
}

/**
 * Check if user is admin
 * Role must be 'admin' in users/{uid} document
 * @param {string} uid - Firebase user UID
 * @returns {Promise<boolean>}
 */
export async function isUserAdmin(uid) {
  const role = await getUserRole(uid);
  return role === 'admin';
}

/**
 * Create or update user in Firestore
 * Called after Firebase Authentication user creation
 * @param {string} uid - Firebase user UID
 * @param {object} userData - User data { email, role, createdAt, ... }
 * @returns {Promise<void>}
 */
export async function upsertUser(uid, userData) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('users').doc(uid).set(
      {
        ...userData,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`Error upserting user ${uid}:`, err.message);
    throw err;
  }
}

/**
 * Set user as admin
 * Used to promote existing users to admin role
 * @param {string} uid - Firebase user UID
 * @returns {Promise<void>}
 */
export async function setUserAsAdmin(uid) {
  await upsertUser(uid, {
    role: 'admin',
    promotedAt: new Date(),
  });
}

/**
 * Remove admin role from user
 * @param {string} uid - Firebase user UID
 * @returns {Promise<void>}
 */
export async function removeAdminRole(uid) {
  try {
    const db = getAdminFirestore();
    if (!db) {
      throw new Error('Firestore not available');
    }

    await db.collection('users').doc(uid).update({
      role: 'user',
      demotedAt: new Date(),
    });
  } catch (err) {
    console.error(`Error removing admin role for ${uid}:`, err.message);
    throw err;
  }
}
