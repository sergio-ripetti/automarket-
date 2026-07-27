export declare const DELETION_ALLOWLIST: readonly string[];
export declare const PROTECTED_COLLECTIONS: readonly string[];
export declare const EXPECTED_PROJECT_ID_ENV: string;
export declare const CONFIRMATION_PHRASE: string;
export declare const CONFIRMATION_ENV: string;
export declare const BATCH_SIZE: number;

export declare function parseArgs(argv: string[]): { execute: boolean };
export declare function resolveProjectId(app: unknown, db?: unknown): string | null;

export interface DeletionPlanDocEntry {
  id: string;
  ref: unknown;
  subcollections: string[];
}

export interface DeletionPlan {
  collectionName: string;
  documentCount: number;
  docs: DeletionPlanDocEntry[];
  subcollectionCount: number;
}

export declare function collectDeletionPlan(db: unknown, collectionName: string): Promise<DeletionPlan>;
export declare function deleteDocsInBatches(db: unknown, refs: unknown[], logPrefix: string): Promise<number>;
export declare function deleteSubcollectionRecursive(
  db: unknown,
  docRef: unknown,
  subcollectionId: string,
  logPrefix: string
): Promise<number>;
export declare function main(): Promise<void>;
