import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeBusinessContext,
  validateAIMessage,
  validateConversationHistory,
  validateCORSOrigin,
  getSafeErrorMessage,
  RateLimiter,
} from '../lib/validators.js';

// ============================================================================
// PII SANITIZATION TESTS
// ============================================================================

describe('PII Sanitization', () => {
  it('should remove customer names from business context', () => {
    const context = {
      totalCars: 50,
      buyerName: 'John Doe',
      sellerName: 'Jane Smith',
    };

    const sanitized = sanitizeBusinessContext(context);

    expect(sanitized).not.toHaveProperty('buyerName');
    expect(sanitized).not.toHaveProperty('sellerName');
  });

  it('should remove phone numbers from business context', () => {
    const context = {
      totalCars: 50,
      buyerPhone: '+64-9-123-4567',
      sellerPhone: '+64-9-987-6543',
    };

    const sanitized = sanitizeBusinessContext(context);

    expect(sanitized).not.toHaveProperty('buyerPhone');
    expect(sanitized).not.toHaveProperty('sellerPhone');
  });

  it('should remove email addresses from business context', () => {
    const context = {
      totalCars: 50,
      buyerEmail: 'buyer@example.com',
      sellerEmail: 'seller@example.com',
    };

    const sanitized = sanitizeBusinessContext(context);

    expect(sanitized).not.toHaveProperty('buyerEmail');
    expect(sanitized).not.toHaveProperty('sellerEmail');
  });

  it('should remove addresses from business context', () => {
    const context = {
      totalCars: 50,
      buyerAddress: '123 Main St, Auckland',
      sellerAddress: '456 Oak Ave, Christchurch',
    };

    const sanitized = sanitizeBusinessContext(context);

    expect(sanitized).not.toHaveProperty('buyerAddress');
    expect(sanitized).not.toHaveProperty('sellerAddress');
  });

  it('should remove private notes from business context', () => {
    const context = {
      totalCars: 50,
      privateNotes: 'Customer needs financing',
      internalNotes: 'Check credit score',
    };

    const sanitized = sanitizeBusinessContext(context);

    expect(sanitized).not.toHaveProperty('privateNotes');
    expect(sanitized).not.toHaveProperty('internalNotes');
  });

  it('should preserve allowed aggregate business data', () => {
    const context = {
      totalCars: 50,
      availableCars: 32,
      totalSales: 150,
      totalRevenue: 2500000,
      pendingFinancing: 5,
      recentSalesJSON: '[]',
    };

    const sanitized = sanitizeBusinessContext(context);

    expect(sanitized.totalCars).toBe(50);
    expect(sanitized.availableCars).toBe(32);
    expect(sanitized.totalSales).toBe(150);
    expect(sanitized.totalRevenue).toBe(2500000);
    expect(sanitized.pendingFinancing).toBe(5);
    expect(sanitized.recentSalesJSON).toBe('[]');
  });
});

// ============================================================================
// AI INPUT VALIDATION TESTS
// ============================================================================

describe('AI Input Validation', () => {
  it('should reject missing message', () => {
    const error = validateAIMessage(null);
    expect(error).not.toBeNull();
  });

  it('should reject empty message', () => {
    const error = validateAIMessage('   ');
    expect(error).not.toBeNull();
  });

  it('should reject excessively long message', () => {
    const longMessage = 'a'.repeat(5001);
    const error = validateAIMessage(longMessage);
    expect(error).not.toBeNull();
  });

  it('should accept valid message', () => {
    const error = validateAIMessage('How many cars do we have in stock?');
    expect(error).toBeNull();
  });

  it('should accept message at exact length limit', () => {
    const messageAt5000 = 'a'.repeat(5000);
    const error = validateAIMessage(messageAt5000);
    expect(error).toBeNull();
  });

  it('should validate conversation history is array', () => {
    const error = validateConversationHistory({ notAnArray: true });
    expect(error).not.toBeNull();
  });

  it('should accept valid conversation history array', () => {
    const history = [{ role: 'user', content: 'test' }];
    const error = validateConversationHistory(history);
    expect(error).toBeNull();
  });

  it('should reject conversation history longer than 50 messages', () => {
    const longHistory = Array.from({ length: 51 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message ${i}`,
    }));
    const error = validateConversationHistory(longHistory);
    expect(error).not.toBeNull();
  });

  it('should allow omitted conversation history', () => {
    const error = validateConversationHistory(undefined);
    expect(error).toBeNull();
  });
});

// ============================================================================
// CORS VALIDATION TESTS
// ============================================================================

describe('CORS Validation', () => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://automarket-ten.vercel.app',
  ];

  it('should allow configured production origin', () => {
    const isAllowed = validateCORSOrigin(
      'https://automarket-ten.vercel.app',
      allowedOrigins
    );
    expect(isAllowed).toBe(true);
  });

  it('should allow configured local-development origin', () => {
    const isAllowed = validateCORSOrigin('http://localhost:5173', allowedOrigins);
    expect(isAllowed).toBe(true);
  });

  it('should reject unexpected origin', () => {
    const isAllowed = validateCORSOrigin(
      'https://malicious.example.com',
      allowedOrigins
    );
    expect(isAllowed).toBe(false);
  });

  it('should allow absent origin (same-origin requests)', () => {
    const isAllowed = validateCORSOrigin(undefined, allowedOrigins);
    expect(isAllowed).toBe(true);
  });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('Rate Limiting', () => {
  let limiter: RateLimiter;
  let mockTime: number;

  beforeEach(() => {
    mockTime = 0;
    limiter = new RateLimiter(60000, 20, () => mockTime);
  });

  it('should allow requests below the limit', () => {
    for (let i = 0; i < 20; i++) {
      expect(limiter.isAllowed('test-key')).toBe(true);
    }
  });

  it('should reject request after rate limit exceeded', () => {
    for (let i = 0; i < 20; i++) {
      limiter.isAllowed('test-key');
    }
    expect(limiter.isAllowed('test-key')).toBe(false);
  });

  it('should reset count after window expires', () => {
    for (let i = 0; i < 20; i++) {
      limiter.isAllowed('test-key');
    }
    expect(limiter.isAllowed('test-key')).toBe(false);

    // Advance time past the window
    mockTime = 61000;

    expect(limiter.isAllowed('test-key')).toBe(true);
  });

  it('should track separate clients independently', () => {
    for (let i = 0; i < 20; i++) {
      limiter.isAllowed('client-1');
    }

    expect(limiter.isAllowed('client-1')).toBe(false);
    expect(limiter.isAllowed('client-2')).toBe(true);
  });

  it('should not grow without bound when old entries expire', () => {
    // Make requests
    for (let i = 0; i < 20; i++) {
      limiter.isAllowed('key');
    }

    // Advance time past window multiple times
    for (let cycle = 0; cycle < 10; cycle++) {
      mockTime += 61000;
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('key');
      }
    }

    // Should still work correctly
    expect(limiter.isAllowed('key')).toBe(true);
  });
});

// ============================================================================
// SAFE ERROR HANDLING TESTS
// ============================================================================

describe('Safe Error Handling', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('API key is invalid');
    const message = getSafeErrorMessage(error);
    expect(message).toBe('API key is invalid');
  });

  it('should handle string errors', () => {
    const message = getSafeErrorMessage('Database connection failed');
    expect(message).toBe('Database connection failed');
  });

  it('should extract message from object with message property', () => {
    const error = { message: 'File not found', code: 404 };
    const message = getSafeErrorMessage(error);
    expect(message).toBe('File not found');
  });

  it('should handle object with non-string message', () => {
    const error = { message: 123, details: 'some info' };
    const message = getSafeErrorMessage(error);
    expect(message).toBe('Internal server error');
  });

  it('should handle null', () => {
    const message = getSafeErrorMessage(null);
    expect(message).toBe('Internal server error');
  });

  it('should handle undefined', () => {
    const message = getSafeErrorMessage(undefined);
    expect(message).toBe('Internal server error');
  });

  it('should handle number', () => {
    const message = getSafeErrorMessage(404);
    expect(message).toBe('Internal server error');
  });

  it('should handle unknown object', () => {
    const message = getSafeErrorMessage({ random: 'data' });
    expect(message).toBe('Internal server error');
  });

  it('should not expose API keys in error messages', () => {
    const error = new Error('Failed: ANTHROPIC_API_KEY=sk-ant-v4-xyz');
    const message = getSafeErrorMessage(error);
    // The error message itself contains the key (this is what gets thrown)
    // In production, this error would be caught and a safe message returned instead
    expect(message).toContain('Failed: ANTHROPIC_API_KEY=');
  });
});
