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

// The three roles the app recognizes. 'user' (or any other/missing value) has no admin-panel
// access at all - it exists only so getUserRole()'s result can be validated/reported, not
// because ordinary users have a distinct permission set today.
export const ROLES = Object.freeze({ ADMIN: 'admin', DEMO: 'demo', USER: 'user' });

/**
 * Check if user is admin
 * Role must be 'admin' in users/{uid} document
 * @param {string} uid - Firebase user UID
 * @returns {Promise<boolean>}
 */
export async function isUserAdmin(uid) {
  const role = await getUserRole(uid);
  return role === ROLES.ADMIN;
}

/**
 * Check if user is the restricted demo/portfolio-review account.
 * Role must be exactly 'demo' - never treated as admin.
 * @param {string} uid - Firebase user UID
 * @returns {Promise<boolean>}
 */
export async function isUserDemo(uid) {
  const role = await getUserRole(uid);
  return role === ROLES.DEMO;
}

/**
 * Check if user is authorized for admin-panel read/create/update access - either the real admin
 * or the restricted demo account. Callers that grant this must never treat 'demo' as 'admin' for
 * delete/user-management purposes; use the resolved role to decide what data/actions to allow.
 * @param {string} uid - Firebase user UID
 * @returns {Promise<{ authorized: boolean, role: string | null }>}
 */
export async function resolveAdminOrDemoRole(uid) {
  const role = await getUserRole(uid);
  return { authorized: role === ROLES.ADMIN || role === ROLES.DEMO, role };
}

/**
 * Portfolio permission model, expressed as pure functions of a resolved role string (not a
 * uid - callers already have the role from requireAdmin/requireAdminOrDemo's req.userRole, or
 * from resolveAdminOrDemoRole/getUserRole). Centralizes the read/create/update/delete matrix so
 * it isn't re-derived as scattered `role === 'demo'` checks across routes or components.
 *   admin: canModifyData = true,  canDeleteData = true
 *   demo:  canModifyData = true,  canDeleteData = false
 *   other: canModifyData = false, canDeleteData = false
 * @param {string | null | undefined} role
 * @returns {boolean}
 */
export function canModifyData(role) {
  return role === ROLES.ADMIN || role === ROLES.DEMO;
}

/**
 * @param {string | null | undefined} role
 * @returns {boolean}
 */
export function canDeleteData(role) {
  return role === ROLES.ADMIN;
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
