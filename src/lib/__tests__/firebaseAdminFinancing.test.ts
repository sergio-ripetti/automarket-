import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Regression coverage for the firebase-admin@14 API compatibility break:
// admin.firestore(app) / admin.auth(app) / admin.credential.cert() do not exist on
// the default export in firebase-admin v14 - only the modular subpath imports do.
// These tests mock the real shared Firestore abstraction (getAdminFirestore /
// saveFinancingApplication) rather than asserting on implementation strings.

// This is a Node-side (server) test; tsconfig.app.json only types the browser env
// (vite/client), so `process` needs a narrow local declaration rather than @types/node.
declare const process: { env: Record<string, string | undefined> }

const ORIGINAL_ENV = { ...process.env }

function resetEnv() {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.FIREBASE_ADMIN_SDK_DISABLED
  delete process.env.FIREBASE_SERVICE_ACCOUNT
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS
}

describe('firebaseAdmin - Financing persistence (modular API)', () => {
  beforeEach(() => {
    vi.resetModules()
    resetEnv()
  })

  afterEach(() => {
    vi.doUnmock('firebase-admin')
    vi.doUnmock('firebase-admin/app')
    vi.doUnmock('firebase-admin/auth')
    vi.doUnmock('firebase-admin/firestore')
  })

  it('getAdminFirestore() resolves through the modular getFirestore(app) API', async () => {
    const fakeApp = { name: '[DEFAULT]' }
    const fakeDb = { collection: vi.fn() }
    const getFirestoreMock = vi.fn(() => fakeDb)

    vi.doMock('firebase-admin', () => ({ default: { initializeApp: vi.fn(() => fakeApp) } }))
    vi.doMock('firebase-admin/app', () => ({ cert: vi.fn((c) => c) }))
    vi.doMock('firebase-admin/auth', () => ({ getAuth: vi.fn(() => ({})) }))
    vi.doMock('firebase-admin/firestore', () => ({ getFirestore: getFirestoreMock }))

    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/service-account.json'

    const mod = await import('../firebaseAdmin.js')
    const db = mod.getAdminFirestore()

    expect(getFirestoreMock).toHaveBeenCalledWith(fakeApp)
    expect(db).toBe(fakeDb)
  })

  it('saveFinancingApplication persists via db.collection("financing").add() and returns the real document id', async () => {
    const fakeApp = { name: '[DEFAULT]' }
    const addMock = vi.fn().mockResolvedValue({ id: 'doc-abc123' })
    const collectionMock = vi.fn(() => ({ add: addMock }))
    const fakeDb = { collection: collectionMock }

    vi.doMock('firebase-admin', () => ({ default: { initializeApp: vi.fn(() => fakeApp) } }))
    vi.doMock('firebase-admin/app', () => ({ cert: vi.fn((c) => c) }))
    vi.doMock('firebase-admin/auth', () => ({ getAuth: vi.fn(() => ({})) }))
    vi.doMock('firebase-admin/firestore', () => ({ getFirestore: vi.fn(() => fakeDb) }))

    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/service-account.json'

    const mod = await import('../firebaseAdmin.js')
    const financingData = {
      firstName: 'Jane',
      status: 'pending',
      createdAt: new Date(),
    }

    const docId = await mod.saveFinancingApplication(financingData)

    expect(collectionMock).toHaveBeenCalledWith('financing')
    expect(addMock).toHaveBeenCalledWith(financingData)
    expect(docId).toBe('doc-abc123')
  })

  it('the persisted financingData carries status "pending" and a createdAt value (as constructed by the caller)', async () => {
    const fakeApp = { name: '[DEFAULT]' }
    const addMock = vi.fn().mockResolvedValue({ id: 'doc-xyz' })
    const fakeDb = { collection: vi.fn(() => ({ add: addMock })) }

    vi.doMock('firebase-admin', () => ({ default: { initializeApp: vi.fn(() => fakeApp) } }))
    vi.doMock('firebase-admin/app', () => ({ cert: vi.fn((c) => c) }))
    vi.doMock('firebase-admin/auth', () => ({ getAuth: vi.fn(() => ({})) }))
    vi.doMock('firebase-admin/firestore', () => ({ getFirestore: vi.fn(() => fakeDb) }))

    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/service-account.json'

    const mod = await import('../firebaseAdmin.js')
    const now = new Date()
    await mod.saveFinancingApplication({ status: 'pending', createdAt: now })

    const persisted = addMock.mock.calls[0][0]
    expect(persisted.status).toBe('pending')
    expect(persisted.createdAt).toBe(now)
  })

  it('saveFinancingApplication rejects when Firestore is unavailable (disabled mode) - the exact failure the server 500-handler relies on', async () => {
    vi.doMock('firebase-admin', () => ({ default: { initializeApp: vi.fn() } }))
    vi.doMock('firebase-admin/app', () => ({ cert: vi.fn() }))
    vi.doMock('firebase-admin/auth', () => ({ getAuth: vi.fn() }))
    vi.doMock('firebase-admin/firestore', () => ({ getFirestore: vi.fn() }))

    process.env.FIREBASE_ADMIN_SDK_DISABLED = 'true'

    const mod = await import('../firebaseAdmin.js')
    await expect(mod.saveFinancingApplication({ firstName: 'Jane' })).rejects.toThrow('Firestore not available')
  })

  it('saveFinancingApplication rejects (never resolves a fake id) when the underlying Firestore write itself throws', async () => {
    const fakeApp = { name: '[DEFAULT]' }
    const addMock = vi.fn().mockRejectedValue(new Error('PERMISSION_DENIED'))
    const fakeDb = { collection: vi.fn(() => ({ add: addMock })) }

    vi.doMock('firebase-admin', () => ({ default: { initializeApp: vi.fn(() => fakeApp) } }))
    vi.doMock('firebase-admin/app', () => ({ cert: vi.fn((c) => c) }))
    vi.doMock('firebase-admin/auth', () => ({ getAuth: vi.fn(() => ({})) }))
    vi.doMock('firebase-admin/firestore', () => ({ getFirestore: vi.fn(() => fakeDb) }))

    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/service-account.json'

    const mod = await import('../firebaseAdmin.js')
    await expect(mod.saveFinancingApplication({ firstName: 'Jane' })).rejects.toThrow('PERMISSION_DENIED')
  })

  it('getAdminAuth() resolves through the modular getAuth(app) API, not admin.auth(app)', async () => {
    const fakeApp = { name: '[DEFAULT]' }
    const fakeAuth = { verifyIdToken: vi.fn() }
    const getAuthMock = vi.fn(() => fakeAuth)

    vi.doMock('firebase-admin', () => ({ default: { initializeApp: vi.fn(() => fakeApp) } }))
    vi.doMock('firebase-admin/app', () => ({ cert: vi.fn((c) => c) }))
    vi.doMock('firebase-admin/auth', () => ({ getAuth: getAuthMock }))
    vi.doMock('firebase-admin/firestore', () => ({ getFirestore: vi.fn() }))

    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/service-account.json'

    const mod = await import('../firebaseAdmin.js')
    const auth = mod.getAdminAuth()

    expect(getAuthMock).toHaveBeenCalledWith(fakeApp)
    expect(auth).toBe(fakeAuth)
  })
})
