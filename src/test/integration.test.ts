import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../lib/validators.js';

// Test that validators are properly exported and can be imported
describe('Module Integration - Validators Export', () => {
  it('should export all validator functions from validators.js', async () => {
    const validators = await import('../lib/validators.js');

    expect(validators).toHaveProperty('sanitizeBusinessContext');
    expect(validators).toHaveProperty('validateAIMessage');
    expect(validators).toHaveProperty('validateConversationHistory');
    expect(validators).toHaveProperty('validateCORSOrigin');
    expect(validators).toHaveProperty('getSafeErrorMessage');
    expect(validators).toHaveProperty('RateLimiter');
  });

  it('should export RateLimiter as a class', async () => {
    const validators = await import('../lib/validators.js');
    expect(typeof validators.RateLimiter).toBe('function');
  });

  it('should be able to instantiate RateLimiter', () => {
    const limiter = new RateLimiter();
    expect(limiter).toBeDefined();
    expect(typeof limiter.isAllowed).toBe('function');
    expect(typeof limiter.reset).toBe('function');
  });
});

// Test route-level integration patterns
describe('Route-Level Integration Tests', () => {
  let rateLimiter: InstanceType<typeof RateLimiter>;

  beforeEach(() => {
    rateLimiter = new RateLimiter(60000, 20);
  });

  describe('API Authentication Flow', () => {
    it('should track rate limits per API key', () => {
      const testKey = 'test-api-key-123';

      // First 20 requests should succeed
      for (let i = 0; i < 20; i++) {
        expect(rateLimiter.isAllowed(testKey)).toBe(true);
      }

      // 21st should fail
      expect(rateLimiter.isAllowed(testKey)).toBe(false);
    });

    it('should track different keys independently', () => {
      // Key 1: fill quota
      for (let i = 0; i < 20; i++) {
        rateLimiter.isAllowed('key-1');
      }

      // Key 2: should still work
      expect(rateLimiter.isAllowed('key-2')).toBe(true);
    });

    it('should reset when window expires', () => {
      let currentTime = 0;
      const limiter = new RateLimiter(60000, 3, () => currentTime);
      const testKey = 'reset-test';

      // Fill quota
      for (let i = 0; i < 3; i++) {
        expect(limiter.isAllowed(testKey)).toBe(true);
      }
      expect(limiter.isAllowed(testKey)).toBe(false);

      // Advance time and verify reset
      currentTime = 61000;
      expect(limiter.isAllowed(testKey)).toBe(true);
    });
  });

  describe('Message Validation Flow', () => {
    it('should reject invalid message types', async () => {
      const { validateAIMessage } = await import('../lib/validators.js');

      expect(validateAIMessage(null)).not.toBeNull();
      expect(validateAIMessage(123)).not.toBeNull();
      expect(validateAIMessage({})).not.toBeNull();
      expect(validateAIMessage(undefined)).not.toBeNull();
    });

    it('should accept valid messages', async () => {
      const { validateAIMessage } = await import('../lib/validators.js');

      const validMessages = [
        'How many cars do we have?',
        'What is our revenue?',
        'a', // single character
        'a'.repeat(5000), // at limit
      ];

      for (const msg of validMessages) {
        expect(validateAIMessage(msg)).toBeNull();
      }
    });
  });

  describe('Business Context Sanitization Flow', () => {
    it('should remove PII from business context', async () => {
      const { sanitizeBusinessContext } = await import('../lib/validators.js');

      const contextWithPII = {
        totalCars: 50,
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        buyerPhone: '123-456-7890',
        sellerAddress: '123 Main St',
      };

      const sanitized = sanitizeBusinessContext(contextWithPII);

      // Should not have PII
      expect(sanitized).not.toHaveProperty('buyerName');
      expect(sanitized).not.toHaveProperty('buyerEmail');
      expect(sanitized).not.toHaveProperty('buyerPhone');
      expect(sanitized).not.toHaveProperty('sellerAddress');

      // Should have business metrics
      expect(sanitized).toHaveProperty('totalCars');
      expect(sanitized.totalCars).toBe(50);
    });
  });

  describe('CORS Validation Flow', () => {
    it('should validate origins for CORS middleware', async () => {
      const { validateCORSOrigin } = await import('../lib/validators.js');

      const allowedOrigins = [
        'http://localhost:5173',
        'https://example.com',
      ];

      // Should allow configured origins
      expect(validateCORSOrigin('http://localhost:5173', allowedOrigins)).toBe(true);
      expect(validateCORSOrigin('https://example.com', allowedOrigins)).toBe(true);

      // Should reject unknown origins
      expect(validateCORSOrigin('https://malicious.com', allowedOrigins)).toBe(false);

      // Should allow undefined origin (same-site)
      expect(validateCORSOrigin(undefined, allowedOrigins)).toBe(true);
    });
  });

  describe('Error Handling Flow', () => {
    it('should safely extract error messages', async () => {
      const { getSafeErrorMessage } = await import('../lib/validators.js');

      const testCases = [
        { input: new Error('Connection failed'), expected: 'Connection failed' },
        { input: 'String error', expected: 'String error' },
        { input: { message: 'Object error' }, expected: 'Object error' },
        { input: null, expected: 'Internal server error' },
        { input: undefined, expected: 'Internal server error' },
      ];

      for (const { input, expected } of testCases) {
        const result = getSafeErrorMessage(input);
        expect(result).toBe(expected);
      }
    });
  });

  describe('Conversation History Validation Flow', () => {
    it('should validate conversation history for AI endpoint', async () => {
      const { validateConversationHistory } = await import('../lib/validators.js');

      // Valid history
      const validHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ];
      expect(validateConversationHistory(validHistory)).toBeNull();

      // Invalid: not an array
      expect(validateConversationHistory({ notArray: true })).not.toBeNull();

      // Invalid: too long
      const longHistory = Array.from({ length: 51 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'test',
      }));
      expect(validateConversationHistory(longHistory)).not.toBeNull();

      // Valid: undefined (optional field)
      expect(validateConversationHistory(undefined)).toBeNull();
    });
  });
});

// Test that all validators return the correct type signatures
describe('Type Safety - Return Values', () => {
  it('validation functions should return null or error string', async () => {
    const {
      validateAIMessage,
      validateConversationHistory,
    } = await import('../lib/validators.js');

    // Functions that return null | string
    const nullOrStringTests = [
      () => validateAIMessage('valid'),
      () => validateAIMessage(null),
      () => validateConversationHistory([]),
      () => validateConversationHistory('invalid'),
    ];

    for (const test of nullOrStringTests) {
      const result = test();
      expect(result === null || typeof result === 'string').toBe(true);
    }
  });

  it('sanitizeBusinessContext should return object', async () => {
    const { sanitizeBusinessContext } = await import('../lib/validators.js');

    const result = sanitizeBusinessContext({ totalCars: 5 });
    expect(typeof result).toBe('object');
    expect(result !== null).toBe(true);
  });

  it('validateCORSOrigin should return boolean', async () => {
    const { validateCORSOrigin } = await import('../lib/validators.js');

    const result = validateCORSOrigin('http://localhost:5173', ['http://localhost:5173']);
    expect(typeof result).toBe('boolean');
  });

  it('getSafeErrorMessage should return string', async () => {
    const { getSafeErrorMessage } = await import('../lib/validators.js');

    const result = getSafeErrorMessage(new Error('test'));
    expect(typeof result).toBe('string');
  });

  it('RateLimiter.isAllowed should return boolean', () => {
    const limiter = new RateLimiter();
    const result = limiter.isAllowed('test-key');
    expect(typeof result).toBe('boolean');
  });
});
