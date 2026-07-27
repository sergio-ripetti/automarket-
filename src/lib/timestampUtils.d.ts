export declare function toEpochMillis(value: unknown): number | null;
export declare function compareByCreatedAtDesc(a: { createdAt?: unknown }, b: { createdAt?: unknown }): number;
export declare function sortByCreatedAtDesc<T extends { createdAt?: unknown }>(items: T[]): T[];
