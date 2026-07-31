export declare const ROLES: { readonly ADMIN: 'admin'; readonly DEMO: 'demo'; readonly USER: 'user' };
export declare function getUserRole(uid: string): Promise<string | null>;
export declare function isUserAdmin(uid: string): Promise<boolean>;
export declare function isUserDemo(uid: string): Promise<boolean>;
export declare function resolveAdminOrDemoRole(
  uid: string
): Promise<{ authorized: boolean; role: string | null }>;
export declare function canModifyData(role: string | null | undefined): boolean;
export declare function canDeleteData(role: string | null | undefined): boolean;
export declare function upsertUser(
  uid: string,
  userData: Record<string, unknown>
): Promise<void>;
export declare function setUserAsAdmin(uid: string): Promise<void>;
export declare function removeAdminRole(uid: string): Promise<void>;
