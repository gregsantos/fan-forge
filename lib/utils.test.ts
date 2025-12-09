
import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('should format a valid date correctly', () => {
    const date = new Date('2024-01-01T12:00:00.000Z');
    expect(formatDate(date)).toBe('Jan 1, 2024');
  });

  it('should return "No deadline" for an undefined date', () => {
    expect(formatDate(undefined)).toBe('No deadline');
  });
});
