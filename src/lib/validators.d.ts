export declare function sanitizeBusinessContext(context: unknown): Record<string, unknown>;
export declare function validateAIMessage(message: unknown): string | null;
export declare function validateConversationHistory(history: unknown): string | null;
export declare function validateCORSOrigin(origin: string | undefined, allowedOrigins: string[]): boolean;
export declare function getSafeErrorMessage(error: unknown): string;
export declare function validateFinancingSubmission(payload: unknown): string | null;
export declare function validatePublicMessageSubmission(payload: unknown): string | null;
export declare function validateCarPayload(payload: unknown, isPartial?: boolean): string | null;
export declare function validateSalePayload(payload: unknown, isPartial?: boolean): string | null;
export declare function validateFinancingStatusUpdate(payload: unknown): string | null;
export declare function validateMessageReadUpdate(payload: unknown): string | null;

export declare class RateLimiter {
  constructor(windowMs?: number, maxRequests?: number, nowFn?: () => number);
  isAllowed(key: string): boolean;
  reset(): void;
}
