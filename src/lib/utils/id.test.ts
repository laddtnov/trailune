import { describe, it, expect } from 'vitest';
import { generateId } from './id';

describe('generateId', () => {
  it('returns a unique non-empty string on each call', () => {
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
  });
});
