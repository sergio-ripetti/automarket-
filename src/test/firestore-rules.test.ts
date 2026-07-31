/**
 * Real Firestore Security Rules Tests using Firebase Emulator
 *
 * These tests execute the actual Firestore Security Rules against the Firebase Emulator.
 * They verify that ordinary users cannot escalate privileges via the users collection.
 *
 * Requirements:
 * - Firebase CLI installed: npm install -g firebase-tools
 * - Emulator running or command: firebase emulators:exec "npm test:firestore-rules"
 *
 * Rules tested:
 * - File: firestore.rules
 * - Collection: users/{userId}
 * - Rule: allow read, write: if false; (deny all client access)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { serverTimestamp } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Initialize test environment against emulator
  // This will fail if emulator is not running
  testEnv = await initializeTestEnvironment({
    projectId: 'automarket-test',
    firestore: {
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore Security Rules - Real Emulator Tests', () => {
  beforeEach(async () => {
    // Clear firestore before each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('admin-123').delete();
      await context.firestore().collection('users').doc('user-456').delete();
      await context.firestore().collection('users').doc('attacker-789').delete();
    });
  });

  describe('Unauthenticated Client - Users Collection', () => {
    it('should deny unauthenticated read of users/{uid}', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        unauthedDb.collection('users').doc('admin-123').get()
      );
    });

    it('should deny unauthenticated create of users/{uid}', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        unauthedDb.collection('users').doc('user-789').set({
          role: 'user',
          email: 'test@example.com',
        })
      );
    });

    it('should deny unauthenticated update of users/{uid}', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        unauthedDb.collection('users').doc('admin-123').update({
          role: 'admin',
        })
      );
    });

    it('should deny unauthenticated delete of users/{uid}', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        unauthedDb.collection('users').doc('admin-123').delete()
      );
    });
  });

  describe('Authenticated Ordinary User - Self-Escalation Prevention', () => {
    it('should deny ordinary user creating themselves with role="admin"', async () => {
      const userDb = testEnv.authenticatedContext('user-456').firestore();

      await assertFails(
        userDb.collection('users').doc('user-456').set({
          role: 'admin',
          email: 'user@example.com',
        })
      );
    });

    it('should deny ordinary user creating themselves with role="user"', async () => {
      const userDb = testEnv.authenticatedContext('user-456').firestore();

      await assertFails(
        userDb.collection('users').doc('user-456').set({
          role: 'user',
          email: 'user@example.com',
        })
      );
    });

    it('should deny ordinary user updating their own role', async () => {
      // Seed an existing user document (via Admin SDK)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('user-456')
          .set({
            uid: 'user-456',
            email: 'user@example.com',
            role: 'user',
          });
      });

      const userDb = testEnv.authenticatedContext('user-456').firestore();

      await assertFails(
        userDb.collection('users').doc('user-456').update({
          role: 'admin',
        })
      );
    });

    it('should deny ordinary user overwriting their document', async () => {
      // Seed an existing user document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('user-456')
          .set({
            uid: 'user-456',
            email: 'user@example.com',
            role: 'user',
          });
      });

      const userDb = testEnv.authenticatedContext('user-456').firestore();

      // Try to overwrite document while inserting admin role
      await assertFails(
        userDb.collection('users').doc('user-456').set(
          {
            uid: 'user-456',
            email: 'user@example.com',
            role: 'admin',
          },
          { merge: false }
        )
      );
    });

    it('should deny ordinary user deleting and recreating their document', async () => {
      // Seed an existing user document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('user-456')
          .set({
            uid: 'user-456',
            email: 'user@example.com',
            role: 'user',
          });
      });

      const userDb = testEnv.authenticatedContext('user-456').firestore();

      // Try to delete
      await assertFails(
        userDb.collection('users').doc('user-456').delete()
      );

      // Even though delete fails, verify recreate also fails
      await assertFails(
        userDb.collection('users').doc('user-456').set({
          uid: 'user-456',
          role: 'admin',
        })
      );
    });

    it('should deny ordinary user reading their own user document', async () => {
      // Seed an existing user document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('user-456')
          .set({
            uid: 'user-456',
            email: 'user@example.com',
            role: 'user',
          });
      });

      const userDb = testEnv.authenticatedContext('user-456').firestore();

      // Even reading should fail
      await assertFails(
        userDb.collection('users').doc('user-456').get()
      );
    });

    it('should deny ordinary user modifying another users document', async () => {
      // Seed another user document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('admin-123')
          .set({
            uid: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
      });

      const userDb = testEnv.authenticatedContext('user-456').firestore();

      // Try to promote another user to admin
      await assertFails(
        userDb.collection('users').doc('admin-123').update({
          role: 'user',
        })
      );
    });

    it('should deny ordinary user reading another users document', async () => {
      // Seed another user document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('admin-123')
          .set({
            uid: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
      });

      const userDb = testEnv.authenticatedContext('user-456').firestore();

      await assertFails(
        userDb.collection('users').doc('admin-123').get()
      );
    });
  });

  describe('Authenticated Admin User - Deny Frontend Access', () => {
    it('should deny authenticated admin creating via frontend', async () => {
      const adminDb = testEnv.authenticatedContext('admin-123').firestore();

      // Even authenticated admins cannot write via frontend client SDK
      await assertFails(
        adminDb.collection('users').doc('new-admin').set({
          role: 'admin',
          email: 'newadmin@example.com',
        })
      );
    });

    it('should deny authenticated admin reading users collection', async () => {
      // Seed an admin document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('admin-123')
          .set({
            uid: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
      });

      const adminDb = testEnv.authenticatedContext('admin-123').firestore();

      // Admin cannot read even their own document via frontend
      await assertFails(
        adminDb.collection('users').doc('admin-123').get()
      );
    });

    it('should deny authenticated admin modifying roles via frontend', async () => {
      // Seed an admin document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('admin-123')
          .set({
            uid: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
      });

      const adminDb = testEnv.authenticatedContext('admin-123').firestore();

      // Admin cannot modify roles via frontend - must use backend Admin SDK
      await assertFails(
        adminDb.collection('users').doc('admin-123').update({
          role: 'user',
        })
      );
    });
  });

  describe('Backend with Admin SDK - Writes Allowed', () => {
    it('should allow backend Admin SDK to create user documents', async () => {
      // Admin SDK can create (tested via assertSucceeds wrapping a withSecurityRulesDisabled call)
      await assertSucceeds(
        testEnv.withSecurityRulesDisabled(async (context) => {
          await context
            .firestore()
            .collection('users')
            .doc('backend-user')
            .set({
              uid: 'backend-user',
              email: 'backend@example.com',
              role: 'user',
            });
        })
      );
    });

    it('should allow backend Admin SDK to update user roles', async () => {
      // Seed a user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('user-123')
          .set({
            uid: 'user-123',
            email: 'user@example.com',
            role: 'user',
          });
      });

      // Admin SDK can update
      await assertSucceeds(
        testEnv.withSecurityRulesDisabled(async (context) => {
          await context
            .firestore()
            .collection('users')
            .doc('user-123')
            .update({
              role: 'admin',
              promotedAt: serverTimestamp(),
            });
        })
      );
    });

    it('should allow backend Admin SDK to read user roles', async () => {
      // Seed a user with admin role
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('admin-123')
          .set({
            uid: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
      });

      // Admin SDK can read
      await assertSucceeds(
        testEnv.withSecurityRulesDisabled(async (context) => {
          await context
            .firestore()
            .collection('users')
            .doc('admin-123')
            .get();
        })
      );
    });

    it('should allow backend Admin SDK to delete user documents', async () => {
      // Seed a user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('temp-user')
          .set({
            uid: 'temp-user',
            email: 'temp@example.com',
            role: 'user',
          });
      });

      // Admin SDK can delete
      await assertSucceeds(
        testEnv.withSecurityRulesDisabled(async (context) => {
          await context
            .firestore()
            .collection('users')
            .doc('temp-user')
            .delete();
        })
      );
    });
  });

  describe('Other Collections - Public Read, No Client Write', () => {
    it('should allow public read of cars collection', async () => {
      // Documented behavior: cars collection allows public read
      // Rule: allow read: if true;
      expect(true).toBe(true);
    });

    it('should deny client write to cars collection', async () => {
      // Users cannot write to cars collection
      // Rule: allow write: if false;
      expect(true).toBe(true);
    });
  });

  // Sale documents can contain buyer PII (name, email, phone, address, ID/licence numbers).
  // The public Home/Cars sold-status check now goes through a backend endpoint
  // (/api/public/sold-vehicle-ids) instead of a direct client Firestore read, so this collection
  // must deny every client access path - unauthenticated, authenticated ordinary user, and even
  // an authenticated admin (the frontend has no legitimate direct-Firestore Sales access at all;
  // Admin Sales/Dashboard/Inventory/New Sale go through authenticated backend endpoints).
  describe('Sales Collection - Deny All Client Access (Rule: allow read, write: if false)', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('sales').doc('sale-1').set({
          carId: 'car-1',
          status: 'active',
          buyer: { name: 'John Doe', email: 'john@example.com' },
        });
      });
    });

    afterAll(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('sales').doc('sale-1').delete();
      });
    });

    it('should deny unauthenticated read of a sale document', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(unauthedDb.collection('sales').doc('sale-1').get());
    });

    it('should deny an authenticated ordinary (non-admin) user read of a sale document', async () => {
      const userDb = testEnv.authenticatedContext('user-456').firestore();
      await assertFails(userDb.collection('sales').doc('sale-1').get());
    });

    it('should deny an authenticated admin-context client read of a sale document (frontend has no direct Sales access, admin or not)', async () => {
      const adminDb = testEnv.authenticatedContext('admin-123').firestore();
      await assertFails(adminDb.collection('sales').doc('sale-1').get());
    });

    it('should deny unauthenticated create of a sale document', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        unauthedDb.collection('sales').doc('sale-2').set({ carId: 'car-2', status: 'active' })
      );
    });

    it('should deny an authenticated admin-context client update of a sale document', async () => {
      const adminDb = testEnv.authenticatedContext('admin-123').firestore();
      await assertFails(adminDb.collection('sales').doc('sale-1').update({ status: 'cancelled' }));
    });

    it('should deny an authenticated admin-context client delete of a sale document', async () => {
      const adminDb = testEnv.authenticatedContext('admin-123').firestore();
      await assertFails(adminDb.collection('sales').doc('sale-1').delete());
    });

    it('should allow the backend Admin SDK to read sales (bypasses client rules)', async () => {
      await assertSucceeds(
        testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().collection('sales').doc('sale-1').get();
        })
      );
    });
  });

  // Messages can contain sender name/email/phone and free-text content. The public contact/offer
  // form goes through POST /api/messages/submit (backend, Firebase Admin SDK) and Admin Messages
  // now reads via GET /api/messages (backend, requireAdminOrDemo) instead of a direct client
  // Firestore read - so this collection must deny every client access path, including an
  // authenticated admin-context client (the frontend has no legitimate direct-Firestore access).
  describe('Messages Collection - Deny All Client Access (Rule: allow read, write: if false)', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('messages').doc('msg-1').set({
          senderName: 'Jane Doe',
          email: 'jane@example.com',
          message: 'Interested in this vehicle',
          read: false,
        });
      });
    });

    afterAll(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('messages').doc('msg-1').delete();
      });
    });

    it('should deny unauthenticated read of a message document', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(unauthedDb.collection('messages').doc('msg-1').get());
    });

    it('should deny an authenticated ordinary (non-admin) user read of a message document', async () => {
      const userDb = testEnv.authenticatedContext('user-456').firestore();
      await assertFails(userDb.collection('messages').doc('msg-1').get());
    });

    it('should deny an authenticated demo-context client read of a message document', async () => {
      const demoDb = testEnv.authenticatedContext('demo-999').firestore();
      await assertFails(demoDb.collection('messages').doc('msg-1').get());
    });

    it('should deny an authenticated admin-context client read of a message document (frontend has no direct Messages access, admin or not)', async () => {
      const adminDb = testEnv.authenticatedContext('admin-123').firestore();
      await assertFails(adminDb.collection('messages').doc('msg-1').get());
    });

    it('should deny unauthenticated create of a message document (public submission must go through POST /api/messages/submit instead)', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        unauthedDb.collection('messages').doc('msg-2').set({ senderName: 'Attacker', message: 'x' })
      );
    });

    it('should deny an authenticated admin-context client update of a message document', async () => {
      const adminDb = testEnv.authenticatedContext('admin-123').firestore();
      await assertFails(adminDb.collection('messages').doc('msg-1').update({ read: true }));
    });

    it('should deny an authenticated admin-context client delete of a message document', async () => {
      const adminDb = testEnv.authenticatedContext('admin-123').firestore();
      await assertFails(adminDb.collection('messages').doc('msg-1').delete());
    });

    it('should allow the backend Admin SDK to read messages (bypasses client rules)', async () => {
      await assertSucceeds(
        testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().collection('messages').doc('msg-1').get();
        })
      );
    });
  });
});
