import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/firebaseAdmin.js', () => ({
  initializeFirebaseAdmin: vi.fn(),
  getAdminAuth: vi.fn(),
  getAdminFirestore: vi.fn(),
}));

import { initializeFirebaseAdmin, getAdminAuth, getAdminFirestore } from '../lib/firebaseAdmin.js';
import { main } from '../../scripts/reset-admin-password.js';

const REAL_ADMIN_EMAIL = 'admin@automarket.co.nz';
const NEW_PASSWORD = 'super-secret-new-pw';

function mockAuth(overrides: Partial<{ getUserByEmail: unknown; updateUser: unknown }> = {}) {
  const auth = {
    getUserByEmail: vi.fn().mockResolvedValue({ uid: 'admin-uid-123', disabled: false }),
    updateUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  vi.mocked(getAdminAuth).mockReturnValue(auth as never);
  return auth;
}

function mockDb(docData: Record<string, unknown> | null) {
  const getFn = vi.fn().mockResolvedValue({
    exists: docData !== null,
    data: () => docData ?? undefined,
  });
  const db = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ get: getFn })),
    })),
  };
  vi.mocked(getAdminFirestore).mockReturnValue(db as never);
  return { db, getFn };
}

describe('reset-admin-password - main', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(initializeFirebaseAdmin).mockReturnValue({} as never);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    process.env.ADMIN_USER_EMAIL = REAL_ADMIN_EMAIL;
    process.env.ADMIN_NEW_PASSWORD = NEW_PASSWORD;
    process.argv = ['node', 'reset-admin-password.js'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('dry-run (default) performs no mutation', async () => {
    const auth = mockAuth();
    mockDb({ role: 'admin' });

    await main();

    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('DRY RUN'))).toBe(true);
  });

  it('--execute updates only the password, via getAuth().updateUser(uid, { password })', async () => {
    const auth = mockAuth();
    mockDb({ role: 'admin' });
    process.argv = ['node', 'reset-admin-password.js', '--execute'];

    await main();

    expect(auth.updateUser).toHaveBeenCalledTimes(1);
    expect(auth.updateUser).toHaveBeenCalledWith('admin-uid-123', { password: NEW_PASSWORD });
  });

  it('preserves the UID (the same uid resolved from getUserByEmail is passed to updateUser)', async () => {
    const auth = mockAuth({
      getUserByEmail: vi.fn().mockResolvedValue({ uid: 'preserve-this-uid', disabled: false }),
    });
    mockDb({ role: 'admin' });
    process.argv = ['node', 'reset-admin-password.js', '--execute'];

    await main();

    expect(auth.updateUser).toHaveBeenCalledWith('preserve-this-uid', { password: NEW_PASSWORD });
  });

  it('verifies the Firestore users/{uid} role before proceeding', async () => {
    mockAuth();
    const { db, getFn } = mockDb({ role: 'admin' });

    await main();

    expect(db.collection).toHaveBeenCalledWith('users');
    expect(getFn).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-admin role and performs no mutation', async () => {
    const auth = mockAuth();
    mockDb({ role: 'demo' });
    process.argv = ['node', 'reset-admin-password.js', '--execute'];

    await expect(main()).rejects.toThrow('process.exit called');

    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('REFUSING TO CONTINUE'))).toBe(true);
  });

  it('rejects an unset/missing role and performs no mutation', async () => {
    const auth = mockAuth();
    mockDb(null);
    process.argv = ['node', 'reset-admin-password.js', '--execute'];

    await expect(main()).rejects.toThrow('process.exit called');

    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('refuses to operate on the demo account, even if ADMIN_USER_EMAIL is set to it', async () => {
    const auth = mockAuth();
    mockDb({ role: 'admin' });
    process.env.ADMIN_USER_EMAIL = 'demo.admin@automarket.co.nz';
    process.argv = ['node', 'reset-admin-password.js', '--execute'];

    await expect(main()).rejects.toThrow('process.exit called');

    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(auth.getUserByEmail).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('REFUSING TO CONTINUE'))).toBe(true);
  });

  it('rejects when ADMIN_USER_EMAIL is missing', async () => {
    mockAuth();
    mockDb({ role: 'admin' });
    delete process.env.ADMIN_USER_EMAIL;

    await expect(main()).rejects.toThrow('process.exit called');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('ADMIN_USER_EMAIL'))).toBe(true);
  });

  it('rejects when ADMIN_NEW_PASSWORD is missing', async () => {
    mockAuth();
    mockDb({ role: 'admin' });
    delete process.env.ADMIN_NEW_PASSWORD;

    await expect(main()).rejects.toThrow('process.exit called');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('ADMIN_NEW_PASSWORD'))).toBe(true);
  });

  it('never logs the new password, in dry-run or execute mode', async () => {
    mockAuth();
    mockDb({ role: 'admin' });
    process.argv = ['node', 'reset-admin-password.js', '--execute'];

    await main();

    const allLogged = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().map((c) => String(c)).join('\n');
    expect(allLogged).not.toContain(NEW_PASSWORD);
  });

  it('fails safely when no Auth user exists for the email (never creates one)', async () => {
    const auth = mockAuth({
      getUserByEmail: vi.fn().mockRejectedValue({ code: 'auth/user-not-found' }),
    });
    mockDb(null);
    process.argv = ['node', 'reset-admin-password.js', '--execute'];

    await expect(main()).rejects.toThrow('process.exit called');

    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
