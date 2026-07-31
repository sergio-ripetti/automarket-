// Express middleware for Firebase-based authentication and authorization
// Verifies Authorization: Bearer <Firebase ID Token> header
// Resolves authenticated user identity and checks admin authorization via Firestore

import { verifyIdToken, getAdminAuth } from './firebaseAdmin.js';
import { isUserAdmin, resolveAdminOrDemoRole, ROLES } from './userAuthorizationService.js';

/**
 * Middleware: Authenticate request using Firebase ID token from Authorization header
 * Sets req.user with { uid, email } if valid
 * Returns 401 for missing or invalid token
 * @returns {Function} Express middleware
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Missing Authorization header',
    });
  }

  // Extract Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid Authorization header format',
    });
  }

  const idToken = parts[1];

  // Verify token asynchronously
  verifyIdToken(idToken)
    .then((decodedToken) => {
      if (!decodedToken) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - Invalid or expired token',
        });
      }

      // Attach user info to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
      };

      next();
    })
    .catch((err) => {
      console.error('Token verification error:', err.message);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Token verification failed',
      });
    });
}

/**
 * Middleware: Check if authenticated user is authorized as admin
 * Uses req.user (set by authenticate middleware)
 * Verifies admin role via Firestore users/{uid} document
 * Returns 401 if not authenticated
 * Returns 403 if not authorized as admin
 * Returns 500/503 if authorization check fails
 * @returns {Function} Express middleware
 */
export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - User not authenticated',
    });
  }

  // Verify Firebase Admin is available (fail-closed)
  const auth = getAdminAuth();
  if (!auth) {
    console.error('Firebase Admin SDK not available - rejecting request');
    return res.status(503).json({
      success: false,
      error: 'Service unavailable - authentication service not ready',
    });
  }

  try {
    // Check if user is admin via Firestore
    const isAdmin = await isUserAdmin(req.user.uid);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - User is not authorized as admin',
      });
    }

    // User is authenticated and admin - continue
    req.userRole = ROLES.ADMIN;
    next();
  } catch (err) {
    console.error(`Authorization check failed for ${req.user.uid}:`, err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error - authorization check failed',
    });
  }
}

/**
 * Middleware: Allow the real admin OR the restricted 'demo' account through.
 *
 * Portfolio permission model (all business data here is confirmed fictional/sample):
 *   admin: read/create/update/delete + user management
 *   demo:  read/create/update - NEVER delete, NEVER user/role/auth management
 *   user (or any other/missing role): no admin-panel access at all
 *
 * Use this for every read/create/update route on ordinary business data (cars, sales,
 * financing, messages, document downloads, AI assistant). Never use it for a route that
 * deletes data, manages users/roles, or touches authentication accounts - those must keep
 * using requireAdmin (aliased below as requireCanDelete for clarity at call sites) so the
 * demo account can never perform a destructive or sensitive operation.
 * Sets req.userRole to the resolved role ('admin' | 'demo').
 * @returns {Function} Express middleware
 */
export async function requireAdminOrDemo(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - User not authenticated',
    });
  }

  const auth = getAdminAuth();
  if (!auth) {
    console.error('Firebase Admin SDK not available - rejecting request');
    return res.status(503).json({
      success: false,
      error: 'Service unavailable - authentication service not ready',
    });
  }

  try {
    const { authorized, role } = await resolveAdminOrDemoRole(req.user.uid);

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - User is not authorized to access this resource',
      });
    }

    req.userRole = role;
    next();
  } catch (err) {
    console.error(`Authorization check failed for ${req.user.uid}:`, err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error - authorization check failed',
    });
  }
}

// Clear, intent-revealing aliases for route declarations - same enforcement, different name
// depending on what the route actually does. requireCanWrite allows admin+demo (create/update);
// requireCanDelete is admin-only (delete, Cloudinary asset removal, user/role management).
export const requireCanWrite = requireAdminOrDemo;
export const requireCanDelete = requireAdmin;
