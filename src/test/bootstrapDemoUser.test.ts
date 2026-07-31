import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/firebaseAdmin.js', () => ({
  initializeFirebaseAdmin: vi.fn(),
  getAdminAuth: vi.fn(),
  getAdminFirestore: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => '__SERVER_TIMESTAMP__'),
  },
}));

import { initializeFirebaseAdmin, getAdminAuth, getAdminFirestore } from '../lib/firebaseAdmin.js';
import { buildDemoUserPayload, main } from '../../scripts/bootstrap-demo-user.js';

const SERVER_TS = '__SERVER_TIMESTAMP__';

describe('buildDemoUserPayload - Firestore payload construction', () => {
  it('never includes an explicit undefined value', () => {
    const payload = buildDemoUserPayload({ uid: 'u1', email: 'demo@x.com', existingData: null });
    for (const key of Object.keys(payload)) {
      expect((payload as Record<string, unknown>)[key]).not.toBeUndefined();
    }
  });

  it('sets createdAt via serverTimestamp when no existing document', () => {
    const payload = buildDemoUserPayload({ uid: 'u1', email: 'demo@x.com', existingData: null });
    expect(payload.createdAt).toBe(SERVER_TS);
  });

  it('sets createdAt via serverTimestamp when existing document lacks createdAt', () => {
    const payload = buildDemoUserPayload({ uid: 'u1', email: 'demo@x.com', existingData: { role: 'demo' } });
    expect(payload.createdAt).toBe(SERVER_TS);
  });

  it('omits createdAt from the payload when the existing document already has one, preserving it', () => {
    const existingCreatedAt = { seconds: 123, nanoseconds: 0 };
    const payload = buildDemoUserPayload({
      uid: 'u1',
      email: 'demo@x.com',
      existingData: { role: 'demo', createdAt: existingCreatedAt },
    });
    expect(payload.createdAt).toBeUndefined();
    expect('createdAt' in payload).toBe(false);
  });

  it('always sets role to demo, email, uid and a fresh updatedAt', () => {
    const payload = buildDemoUserPayload({ uid: 'abc', email: 'demo@x.com', existingData: { role: 'demo' } });
    expect(payload).toMatchObject({
      uid: 'abc',
      email: 'demo@x.com',
      role: 'demo',
      updatedAt: SERVER_TS,
      source: 'bootstrap-demo-script',
    });
  });
});

function mockAuth(overrides: Partial<{ getUserByEmail: unknown; createUser: unknown }> = {}) {
  const auth = {
    getUserByEmail: vi.fn().mockRejectedValue({ code: 'auth/user-not-found' }),
    createUser: vi.fn().mockResolvedValue({ uid: 'new-uid' }),
    ...overrides,
  };
  vi.mocked(getAdminAuth).mockReturnValue(auth as never);
  return auth;
}

function mockDb(docData: Record<string, unknown> | null) {
  const setFn = vi.fn().mockResolvedValue(undefined);
  const getFn = vi.fn().mockResolvedValue({
    exists: docData !== null,
    data: () => docData ?? undefined,
  });
  const db = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ get: getFn, set: setFn })),
    })),
  };
  vi.mocked(getAdminFirestore).mockReturnValue(db as never);
  return { db, setFn, getFn };
}

describe('main - end-to-end bootstrap behavior', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(initializeFirebaseAdmin).mockReturnValue({} as never);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    process.argv = ['node', 'bootstrap-demo-user.js', '--execute', '--email', 'demo@x.com', '--password', 'secret-pw'];
  });

  it('first run (no existing user) creates the Auth user and the Firestore document with createdAt', async () => {
    const auth = mockAuth();
    const { setFn } = mockDb(null);

    await main();

    expect(auth.createUser).toHaveBeenCalledWith({ email: 'demo@x.com', password: 'secret-pw', disabled: false });
    expect(setFn).toHaveBeenCalledTimes(1);
    const [payload, opts] = setFn.mock.calls[0];
    expect(payload.uid).toBe('new-uid');
    expect(payload.createdAt).toBe(SERVER_TS);
    expect(opts).toEqual({ merge: true });
  });

  it('second run against an existing demo user succeeds and preserves the UID', async () => {
    const auth = mockAuth({
      getUserByEmail: vi.fn().mockResolvedValue({ uid: 'existing-uid', disabled: false }),
    });
    const { setFn } = mockDb({ role: 'demo', createdAt: { seconds: 1, nanoseconds: 0 }, email: 'demo@x.com' });

    await main();

    expect(auth.createUser).not.toHaveBeenCalled();
    const [payload] = setFn.mock.calls[0];
    expect(payload.uid).toBe('existing-uid');
  });

  it('second run preserves existing createdAt (omits it from the write payload)', async () => {
    mockAuth({ getUserByEmail: vi.fn().mockResolvedValue({ uid: 'existing-uid', disabled: false }) });
    const { setFn } = mockDb({ role: 'demo', createdAt: { seconds: 1, nanoseconds: 0 } });

    await main();

    const [payload] = setFn.mock.calls[0];
    expect('createdAt' in payload).toBe(false);
  });

  it('missing createdAt on an existing document does not produce undefined in the payload', async () => {
    mockAuth({ getUserByEmail: vi.fn().mockResolvedValue({ uid: 'existing-uid', disabled: false }) });
    const { setFn } = mockDb({ role: 'demo' });

    await main();

    const [payload] = setFn.mock.calls[0];
    for (const key of Object.keys(payload)) {
      expect(payload[key]).not.toBeUndefined();
    }
    expect(payload.createdAt).toBe(SERVER_TS);
  });

  it('unrelated existing Firestore fields are not part of the write payload (merge:true preserves them)', async () => {
    mockAuth({ getUserByEmail: vi.fn().mockResolvedValue({ uid: 'existing-uid', disabled: false }) });
    const { setFn } = mockDb({ role: 'demo', createdAt: { seconds: 1, nanoseconds: 0 }, notes: 'do not touch' });

    await main();

    const [payload, opts] = setFn.mock.calls[0];
    expect(payload.notes).toBeUndefined();
    expect(opts).toEqual({ merge: true });
  });

  it('does not reset the Auth password for an existing user (createUser never called)', async () => {
    const auth = mockAuth({ getUserByEmail: vi.fn().mockResolvedValue({ uid: 'existing-uid', disabled: false }) });
    mockDb({ role: 'demo', createdAt: { seconds: 1, nanoseconds: 0 } });

    await main();

    expect(auth.createUser).not.toHaveBeenCalled();
  });

  it('refuses to modify an account with role "admin"', async () => {
    mockAuth({ getUserByEmail: vi.fn().mockResolvedValue({ uid: 'admin-uid', disabled: false }) });
    const { setFn } = mockDb({ role: 'admin' });

    await expect(main()).rejects.toThrow('process.exit called');

    expect(setFn).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('REFUSING TO CONTINUE'))).toBe(true);
  });

  it('fails safely on an unexpected role (neither demo nor admin nor unset)', async () => {
    mockAuth({ getUserByEmail: vi.fn().mockResolvedValue({ uid: 'weird-uid', disabled: false }) });
    const { setFn } = mockDb({ role: 'user' });

    await expect(main()).rejects.toThrow('process.exit called');

    expect(setFn).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('never logs the password', async () => {
    mockAuth();
    mockDb(null);

    await main();

    const allLogged = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().map((c) => String(c)).join('\n');
    expect(allLogged).not.toContain('secret-pw');
  });
});
