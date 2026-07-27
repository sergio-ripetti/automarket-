import { describe, it, expect } from 'vitest';
import { formatNZD, formatDate, formatKilometers, formatPercent } from './formatting';

describe('Formatting Utilities', () => {
  describe('formatNZD', () => {
    it('should format zero as NZD currency', () => {
      expect(formatNZD(0)).toBe('$0.00');
    });

    it('should format positive integers', () => {
      const result = formatNZD(1234);
      expect(result).toContain('1,234');
      expect(result).toContain('$');
    });

    it('should format decimals', () => {
      const result = formatNZD(1234.56);
      expect(result).toContain('1,234');
      expect(result).toContain('56');
    });

    it('should format large values', () => {
      const result = formatNZD(1000000);
      expect(result).toContain('1,000,000');
      expect(result).toContain('$');
    });

    it('should handle negative values', () => {
      const result = formatNZD(-500);
      expect(result).toContain('-');
      expect(result).toContain('$');
    });
  });

  describe('formatDate', () => {
    it('should return N/A for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should handle ISO string dates', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should handle JavaScript Date objects', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date.toISOString());
      expect(result).toBeTruthy();
    });

    it('should handle Firestore timestamp-like objects', () => {
      const timestamp = {
        toDate: () => new Date('2024-01-15')
      };
      const result = formatDate(timestamp);
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should return N/A for invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('N/A');
    });
  });

  describe('formatKilometers', () => {
    it('should format zero', () => {
      expect(formatKilometers(0)).toBe('0');
    });

    it('should add comma separators', () => {
      expect(formatKilometers(123456)).toContain('123,456');
    });

    it('should format small numbers', () => {
      const result = formatKilometers(500);
      expect(result).toBe('500');
    });
  });

  describe('formatPercent', () => {
    it('should convert decimal to percentage', () => {
      const result = formatPercent(0.15);
      expect(result).toContain('15');
      expect(result).toContain('%');
    });

    it('should format with specified decimal places', () => {
      const result = formatPercent(0.333, 2);
      expect(result).toContain('33');
      expect(result).toContain('%');
    });

    it('should handle zero', () => {
      const result = formatPercent(0);
      expect(result).toContain('0');
      expect(result).toContain('%');
    });
  });
});
