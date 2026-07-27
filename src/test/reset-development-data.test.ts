/// <reference types="node" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type FakeDoc = Record<string, unknown> & { __subcollections?: Record<string, Record<string, FakeDoc>> };
type FakeBucket = Record<string, FakeDoc>;
type FakeState = Record<string, FakeBucket>;

interface FakeDocRef {
  id: string;
  listCollections(): Promise<{ id: string }[]>;
  collection(subId: string): FakeCollectionRef;
  delete(): Promise<void>;
}

interface FakeCollectionRef {
  get(): Promise<{ size: number; docs: { id: string; data(): Record<string, unknown>; ref: FakeDocRef }[] }>;
  doc(id: string): FakeDocRef;
}

// Mocked in-memory Firestore-Admin-like fake used across tests. Never touches a real project.
function createFakeDb(seed: FakeState) {
  const state: FakeState = structuredClone(seed);

  // `getBucket` always resolves the live object holding this doc's siblings, so delete()
  // removes the entry from wherever it actually lives (top-level collection or nested
  // subcollection), rather than assuming a fixed top-level state key.
  function makeDocRef(getBucket: () => FakeBucket, id: string): FakeDocRef {
    return {
      id,
      async listCollections() {
        const subs = getBucket()[id]?.__subcollections || {};
        return Object.keys(subs).map((subId) => ({ id: subId }));
      },
      collection(subId: string) {
        return makeCollectionRef(() => {
          const parent = getBucket()[id];
          parent.__subcollections = parent.__subcollections || {};
          parent.__subcollections[subId] = parent.__subcollections[subId] || {};
          return parent.__subcollections[subId];
        });
      },
      async delete() {
        delete getBucket()[id];
      },
    };
  }

  function makeCollectionRef(getBucket: () => FakeBucket): FakeCollectionRef {
    return {
      async get() {
        const bucketData = getBucket();
        const ids = Object.keys(bucketData);
        return {
          size: ids.length,
          docs: ids.map((id) => ({
            id,
            data: () => {
              const rest: Record<string, unknown> = { ...bucketData[id] };
              delete rest.__subcollections;
              return rest;
            },
            ref: makeDocRef(getBucket, id),
          })),
        };
      },
      doc(id: string) {
        return makeDocRef(getBucket, id);
      },
    };
  }

  return {
    __state: state,
    async listCollections() {
      return Object.keys(state).map((id) => ({ id }));
    },
    collection(name: string) {
      state[name] = state[name] || {};
      return makeCollectionRef(() => state[name]);
    },
    batch() {
      const ops: FakeDocRef[] = [];
      return {
        delete(ref: FakeDocRef) {
          ops.push(ref);
        },
        async commit() {
          for (const ref of ops) {
            await ref.delete();
          }
        },
      };
    },
  };
}

describe('reset-development-data script', () => {
  let mod: typeof import('../../scripts/reset-development-data.js');
  let fakeDb: ReturnType<typeof createFakeDb>;
  let fakeApp: { options: { projectId: string | undefined } };
  let originalArgv: string[];

  beforeEach(async () => {
    vi.resetModules();
    originalArgv = process.argv;
    delete process.env.RESET_EXPECTED_PROJECT_ID;
    delete process.env.RESET_CONFIRMATION_PHRASE;

    fakeApp = { options: { projectId: 'automarket-710a5' } };
    fakeDb = createFakeDb({
      cars: { car1: { title: 'Car 1' }, car2: { title: 'Car 2' } },
      sales: { sale1: { carId: 'car1' } },
      financing: { fin1: { carId: 'car1' } },
      messages: { msg1: { message: 'hi' } },
      users: { admin1: { role: 'admin', email: 'admin@example.com' } },
    });

    vi.doMock('../lib/firebaseAdmin.js', () => ({
      initializeFirebaseAdmin: vi.fn(() => fakeApp),
      getAdminFirestore: vi.fn(() => fakeDb),
      getAdminAuth: vi.fn(() => {
        throw new Error('Authentication must never be touched by the reset script');
      }),
    }));

    mod = await import('../../scripts/reset-development-data.js');
  });

  afterEach(() => {
    vi.doUnmock('../lib/firebaseAdmin.js');
    process.argv = originalArgv;
    delete process.env.RESET_EXPECTED_PROJECT_ID;
    delete process.env.RESET_CONFIRMATION_PHRASE;
  });

  describe('allowlist and denylist', () => {
    it('only ever targets the four operational collections', () => {
      expect(mod.DELETION_ALLOWLIST).toEqual(['cars', 'sales', 'financing', 'messages']);
    });

    it('always excludes the users collection', () => {
      expect(mod.PROTECTED_COLLECTIONS).toContain('users');
      expect(mod.DELETION_ALLOWLIST).not.toContain('users');
    });
  });

  describe('argument parsing', () => {
    it('defaults to dry run (execute=false) with no flags', () => {
      expect(mod.parseArgs([])).toEqual({ execute: false });
    });

    it('sets execute=true only when --execute is passed', () => {
      expect(mod.parseArgs(['--execute'])).toEqual({ execute: true });
    });
  });

  describe('dry run mode (default)', () => {
    it('performs zero writes and leaves all collections intact', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await mod.main();

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(Object.keys(fakeDb.__state.cars)).toEqual(['car1', 'car2']);
      expect(Object.keys(fakeDb.__state.sales)).toEqual(['sale1']);
      expect(Object.keys(fakeDb.__state.financing)).toEqual(['fin1']);
      expect(Object.keys(fakeDb.__state.messages)).toEqual(['msg1']);
      expect(Object.keys(fakeDb.__state.users)).toEqual(['admin1']);
    });
  });

  describe('execute mode safety gates', () => {
    it('aborts when --execute is passed without the expected-project-id env var', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.argv = [...process.argv.slice(0, 2), '--execute'];

      await mod.main();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(Object.keys(fakeDb.__state.cars)).toEqual(['car1', 'car2']);
    });

    it('aborts when the expected project ID does not match the resolved project', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.RESET_EXPECTED_PROJECT_ID = 'some-other-project';
      process.env.RESET_CONFIRMATION_PHRASE = mod.CONFIRMATION_PHRASE;
      process.argv = [...process.argv.slice(0, 2), '--execute'];

      await mod.main();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(Object.keys(fakeDb.__state.cars)).toEqual(['car1', 'car2']);
    });

    it('aborts when the confirmation phrase is missing or wrong', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.RESET_EXPECTED_PROJECT_ID = 'automarket-710a5';
      process.env.RESET_CONFIRMATION_PHRASE = 'not-the-right-phrase';
      process.argv = [...process.argv.slice(0, 2), '--execute'];

      await mod.main();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(Object.keys(fakeDb.__state.cars)).toEqual(['car1', 'car2']);
    });

    it('proceeds with deletion only when project ID and confirmation phrase both match', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.RESET_EXPECTED_PROJECT_ID = 'automarket-710a5';
      process.env.RESET_CONFIRMATION_PHRASE = mod.CONFIRMATION_PHRASE;
      process.argv = [...process.argv.slice(0, 2), '--execute'];

      await mod.main();

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(Object.keys(fakeDb.__state.cars)).toEqual([]);
      expect(Object.keys(fakeDb.__state.sales)).toEqual([]);
      expect(Object.keys(fakeDb.__state.financing)).toEqual([]);
      expect(Object.keys(fakeDb.__state.messages)).toEqual([]);
      // users must survive even a fully authorized execute run
      expect(Object.keys(fakeDb.__state.users)).toEqual(['admin1']);
    });
  });

  describe('subcollection handling', () => {
    it('recursively deletes subcollections before deleting the parent document', async () => {
      fakeDb.__state.sales.sale1.__subcollections = {
        paymentsHistory: { p1: { amount: 100 } },
      };

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.RESET_EXPECTED_PROJECT_ID = 'automarket-710a5';
      process.env.RESET_CONFIRMATION_PHRASE = mod.CONFIRMATION_PHRASE;
      process.argv = [...process.argv.slice(0, 2), '--execute'];

      await mod.main();

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(fakeDb.__state.sales.sale1).toBeUndefined();
    });

    it('collectDeletionPlan reports subcollection counts without deleting anything', async () => {
      fakeDb.__state.cars.car1.__subcollections = { history: { h1: {} } };
      const plan = await mod.collectDeletionPlan(fakeDb, 'cars');
      expect(plan.documentCount).toBe(2);
      expect(plan.subcollectionCount).toBe(1);
      expect(Object.keys(fakeDb.__state.cars)).toEqual(['car1', 'car2']);
    });
  });

  describe('batch deletion limits', () => {
    it('splits deletions into chunks no larger than BATCH_SIZE', async () => {
      const refs = Array.from({ length: mod.BATCH_SIZE + 10 }, () => ({
        delete: vi.fn().mockResolvedValue(undefined),
      }));

      let maxBatchSize = 0;
      const batchingDb = {
        batch() {
          const ops: { delete: () => Promise<void> }[] = [];
          return {
            delete(ref: { delete: () => Promise<void> }) {
              ops.push(ref);
            },
            async commit() {
              maxBatchSize = Math.max(maxBatchSize, ops.length);
              for (const ref of ops) await ref.delete();
            },
          };
        },
      };

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const deleted = await mod.deleteDocsInBatches(batchingDb, refs, 'test');

      expect(deleted).toBe(refs.length);
      expect(maxBatchSize).toBeLessThanOrEqual(mod.BATCH_SIZE);
      expect(refs.every((r) => r.delete.mock.calls.length === 1)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('resolveProjectId returns null when no project id is resolvable', () => {
      const originalGcloud = process.env.GCLOUD_PROJECT;
      const originalGoogleCloud = process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      delete process.env.GOOGLE_CLOUD_PROJECT;

      expect(mod.resolveProjectId({ options: {} })).toBeNull();

      if (originalGcloud !== undefined) process.env.GCLOUD_PROJECT = originalGcloud;
      if (originalGoogleCloud !== undefined) process.env.GOOGLE_CLOUD_PROJECT = originalGoogleCloud;
    });

    it('aborts with exit(1) when no Firebase project ID can be resolved', async () => {
      fakeApp.options.projectId = undefined;
      const originalGcloud = process.env.GCLOUD_PROJECT;
      const originalGoogleCloud = process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      delete process.env.GOOGLE_CLOUD_PROJECT;

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await mod.main();

      expect(exitSpy).toHaveBeenCalledWith(1);

      if (originalGcloud !== undefined) process.env.GCLOUD_PROJECT = originalGcloud;
      if (originalGoogleCloud !== undefined) process.env.GOOGLE_CLOUD_PROJECT = originalGoogleCloud;
    });

    it('never calls Firebase Authentication deletion or lookup methods', async () => {
      const { getAdminAuth } = await import('../lib/firebaseAdmin.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await mod.main();

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(getAdminAuth).not.toHaveBeenCalled();
    });
  });
});
