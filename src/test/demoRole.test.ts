import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/firebaseAdmin.js', () => ({
  getAdminFirestore: vi.fn(),
  getAdminAuth: vi.fn(),
  verifyIdToken: vi.fn(),
}));

import { getAdminFirestore, getAdminAuth, verifyIdToken } from '../lib/firebaseAdmin.js';
import { isUserAdmin, isUserDemo, resolveAdminOrDemoRole, canModifyData, canDeleteData, ROLES } from '../lib/userAuthorizationService.js';
import { authenticate, requireAdmin, requireAdminOrDemo, requireCanWrite, requireCanDelete } from '../lib/authMiddleware.js';

function mockFirestoreRole(role: string | null) {
  vi.mocked(getAdminFirestore).mockReturnValue({
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: role !== null,
          data: () => (role !== null ? { role } : undefined),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

interface MockReq {
  user?: { uid: string; email?: string | null };
  headers?: Record<string, string>;
  userRole?: string;
}

function mockRes() {
  const res = {
    statusCode: null as number | null,
    body: null as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return res;
}

describe('userAuthorizationService - role helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ROLES exposes exactly admin/demo/user', () => {
    expect(ROLES).toEqual({ ADMIN: 'admin', DEMO: 'demo', USER: 'user' });
  });

  it('isUserAdmin is true only for role "admin"', async () => {
    mockFirestoreRole('admin');
    expect(await isUserAdmin('u1')).toBe(true);
    mockFirestoreRole('demo');
    expect(await isUserAdmin('u1')).toBe(false);
  });

  it('isUserDemo is true only for role "demo", never for "admin"', async () => {
    mockFirestoreRole('demo');
    expect(await isUserDemo('u1')).toBe(true);
    mockFirestoreRole('admin');
    expect(await isUserDemo('u1')).toBe(false);
  });

  it('resolveAdminOrDemoRole authorizes admin and demo, rejects everything else', async () => {
    mockFirestoreRole('admin');
    expect(await resolveAdminOrDemoRole('u1')).toEqual({ authorized: true, role: 'admin' });
    mockFirestoreRole('demo');
    expect(await resolveAdminOrDemoRole('u1')).toEqual({ authorized: true, role: 'demo' });
    mockFirestoreRole('user');
    expect(await resolveAdminOrDemoRole('u1')).toEqual({ authorized: false, role: 'user' });
    mockFirestoreRole(null);
    expect(await resolveAdminOrDemoRole('u1')).toEqual({ authorized: false, role: null });
  });
});

describe('authMiddleware - requireAdmin vs requireAdminOrDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminAuth).mockReturnValue({});
  });

  it('requireAdmin allows role "admin" and sets req.userRole', async () => {
    mockFirestoreRole('admin');
    const req: MockReq = { user: { uid: 'u1' } };
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userRole).toBe('admin');
  });

  it('requireAdmin rejects role "demo" with 403 (demo is never treated as admin)', async () => {
    mockFirestoreRole('demo');
    const req: MockReq = { user: { uid: 'u2' } };
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Forbidden - User is not authorized as admin' });
  });

  it('requireAdmin rejects an ordinary "user" role with 403', async () => {
    mockFirestoreRole('user');
    const req: MockReq = { user: { uid: 'u3' } };
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('requireAdmin rejects an unauthenticated request with 401 before any role check', async () => {
    const req: MockReq = {};
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('requireAdminOrDemo allows role "admin" and sets req.userRole = "admin"', async () => {
    mockFirestoreRole('admin');
    const req: MockReq = { user: { uid: 'u1' } };
    const res = mockRes();
    const next = vi.fn();
    await requireAdminOrDemo(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userRole).toBe('admin');
  });

  it('requireAdminOrDemo allows role "demo" and sets req.userRole = "demo"', async () => {
    mockFirestoreRole('demo');
    const req: MockReq = { user: { uid: 'u2' } };
    const res = mockRes();
    const next = vi.fn();
    await requireAdminOrDemo(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userRole).toBe('demo');
  });

  it('requireAdminOrDemo rejects an ordinary "user" role with 403 JSON', async () => {
    mockFirestoreRole('user');
    const req: MockReq = { user: { uid: 'u3' } };
    const res = mockRes();
    const next = vi.fn();
    await requireAdminOrDemo(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: 'Forbidden - User is not authorized to access this resource',
    });
  });

  it('requireAdminOrDemo rejects an unauthenticated request with 401', async () => {
    const req: MockReq = {};
    const res = mockRes();
    const next = vi.fn();
    await requireAdminOrDemo(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('requireAdminOrDemo fails closed (503) when Firebase Admin is unavailable', async () => {
    vi.mocked(getAdminAuth).mockReturnValue(null);
    const req: MockReq = { user: { uid: 'u1' } };
    const res = mockRes();
    const next = vi.fn();
    await requireAdminOrDemo(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });
});

describe('authenticate - unaffected by the demo role addition', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a request with no Authorization header', () => {
    const req: MockReq = { headers: {} };
    const res = mockRes();
    const next = vi.fn();
    authenticate(req as never, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next for a valid token', async () => {
    vi.mocked(verifyIdToken).mockResolvedValue({ uid: 'u1', email: 'demo.admin@automarket.co.nz' });
    const req: MockReq = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = vi.fn();
    authenticate(req as never, res as never, next);
    await new Promise((r) => setTimeout(r, 0));
    expect(req.user).toEqual({ uid: 'u1', email: 'demo.admin@automarket.co.nz' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('canModifyData / canDeleteData - portfolio permission matrix', () => {
  it('admin can modify and delete', () => {
    expect(canModifyData('admin')).toBe(true);
    expect(canDeleteData('admin')).toBe(true);
  });

  it('demo can modify but never delete', () => {
    expect(canModifyData('demo')).toBe(true);
    expect(canDeleteData('demo')).toBe(false);
  });

  it('an ordinary user or missing role can neither modify nor delete', () => {
    expect(canModifyData('user')).toBe(false);
    expect(canDeleteData('user')).toBe(false);
    expect(canModifyData(null)).toBe(false);
    expect(canDeleteData(undefined)).toBe(false);
  });
});

describe('requireCanWrite / requireCanDelete - clear aliases for the same enforcement', () => {
  it('requireCanWrite is the same function as requireAdminOrDemo', () => {
    expect(requireCanWrite).toBe(requireAdminOrDemo);
  });

  it('requireCanDelete is the same function as requireAdmin', () => {
    expect(requireCanDelete).toBe(requireAdmin);
  });
});
