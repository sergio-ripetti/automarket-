export declare function getUserRole(uid: string): Promise<string | null>;
export declare function isUserAdmin(uid: string): Promise<boolean>;
export declare function upsertUser(
  uid: string,
  userData: Record<string, unknown>
): Promise<void>;
export declare function setUserAsAdmin(uid: string): Promise<void>;
export declare function removeAdminRole(uid: string): Promise<void>;
