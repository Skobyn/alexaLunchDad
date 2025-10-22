/**
 * Test suite for cacheService (London School TDD)
 * Tests focus on behavior and interactions with time-based TTL expiration
 */

const cacheService = require('../../../src/services/cacheService');

describe('CacheService - TDD London School', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheService.clear();
    // Use fake timers for TTL testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get(key)', () => {
    it('should return null for non-existent keys', () => {
      const result = cacheService.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should return value for valid cached keys', () => {
      cacheService.set('test-key', 'test-value', 60);

      const result = cacheService.get('test-key');

      expect(result).toBe('test-value');
    });

    it('should return null for expired entries', () => {
      cacheService.set('expire-key', 'expire-value', 10);

      // Advance time by 11 seconds (past TTL)
      jest.advanceTimersByTime(11000);

      const result = cacheService.get('expire-key');

      expect(result).toBeNull();
    });

    it('should return value for entries within TTL', () => {
      cacheService.set('valid-key', 'valid-value', 60);

      // Advance time by 30 seconds (within 60s TTL)
      jest.advanceTimersByTime(30000);

      const result = cacheService.get('valid-key');

      expect(result).toBe('valid-value');
    });

    it('should handle complex object values', () => {
      const complexValue = {
        nested: { data: 'test' },
        array: [1, 2, 3],
        date: new Date('2025-10-22')
      };

      cacheService.set('complex-key', complexValue, 60);

      const result = cacheService.get('complex-key');

      expect(result).toEqual(complexValue);
      expect(result.nested.data).toBe('test');
    });
  });

  describe('set(key, value, ttl)', () => {
    it('should store value with TTL', () => {
      const result = cacheService.set('new-key', 'new-value', 300);

      expect(result).toBe(true);
      expect(cacheService.get('new-key')).toBe('new-value');
    });

    it('should handle TTL = 0 (no caching)', () => {
      cacheService.set('zero-ttl', 'value', 0);

      const result = cacheService.get('zero-ttl');

      expect(result).toBeNull();
    });

    it('should overwrite existing keys', () => {
      cacheService.set('update-key', 'original', 60);
      cacheService.set('update-key', 'updated', 60);

      const result = cacheService.get('update-key');

      expect(result).toBe('updated');
    });

    it('should update expiration time on overwrite', () => {
      cacheService.set('expire-test', 'value', 10);

      // Advance 5 seconds
      jest.advanceTimersByTime(5000);

      // Overwrite with new 10s TTL
      cacheService.set('expire-test', 'new-value', 10);

      // Advance another 7 seconds (12 total from first set, 7 from second)
      jest.advanceTimersByTime(7000);

      // Should still be valid (7s < 10s from second set)
      const result = cacheService.get('expire-test');

      expect(result).toBe('new-value');
    });

    it('should handle negative TTL as no caching', () => {
      cacheService.set('negative-ttl', 'value', -1);

      const result = cacheService.get('negative-ttl');

      expect(result).toBeNull();
    });
  });

  describe('has(key)', () => {
    it('should return false for non-existent keys', () => {
      const result = cacheService.has('missing-key');

      expect(result).toBe(false);
    });

    it('should return true for valid cached keys', () => {
      cacheService.set('exists-key', 'value', 60);

      const result = cacheService.has('exists-key');

      expect(result).toBe(true);
    });

    it('should return false for expired entries', () => {
      cacheService.set('expire-check', 'value', 5);

      jest.advanceTimersByTime(6000);

      const result = cacheService.has('expire-check');

      expect(result).toBe(false);
    });

    it('should not affect cache statistics', () => {
      cacheService.set('stats-test', 'value', 60);

      const statsBefore = cacheService.getStats();
      cacheService.has('stats-test');
      cacheService.has('non-existent');
      const statsAfter = cacheService.getStats();

      // has() should not increment hits/misses
      expect(statsAfter.hits).toBe(statsBefore.hits);
      expect(statsAfter.misses).toBe(statsBefore.misses);
    });
  });

  describe('clear()', () => {
    it('should remove all cached entries', () => {
      cacheService.set('key1', 'value1', 60);
      cacheService.set('key2', 'value2', 60);
      cacheService.set('key3', 'value3', 60);

      cacheService.clear();

      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();
      expect(cacheService.get('key3')).toBeNull();
    });

    it('should reset cache statistics', () => {
      cacheService.set('key', 'value', 60);
      cacheService.get('key'); // Hit
      cacheService.get('missing'); // Miss

      const statsBefore = cacheService.getStats();
      expect(statsBefore.hits).toBe(1);
      expect(statsBefore.misses).toBe(1);

      cacheService.clear();

      const statsAfter = cacheService.getStats();
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
      expect(statsAfter.size).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should track cache hits', () => {
      cacheService.set('hit-key', 'value', 60);

      cacheService.get('hit-key'); // Hit
      cacheService.get('hit-key'); // Hit
      cacheService.get('hit-key'); // Hit

      const stats = cacheService.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(0);
    });

    it('should track cache misses', () => {
      cacheService.get('miss1'); // Miss
      cacheService.get('miss2'); // Miss
      cacheService.get('miss3'); // Miss

      const stats = cacheService.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(3);
    });

    it('should track mixed hits and misses', () => {
      cacheService.set('exists', 'value', 60);

      cacheService.get('exists'); // Hit
      cacheService.get('missing1'); // Miss
      cacheService.get('exists'); // Hit
      cacheService.get('missing2'); // Miss
      cacheService.get('exists'); // Hit

      const stats = cacheService.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.6, 2); // 3/5 = 0.6
    });

    it('should count expired entries as misses', () => {
      cacheService.set('expire-stat', 'value', 5);

      cacheService.get('expire-stat'); // Hit

      jest.advanceTimersByTime(6000);

      cacheService.get('expire-stat'); // Miss (expired)

      const stats = cacheService.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should return current cache size', () => {
      cacheService.set('key1', 'value1', 60);
      cacheService.set('key2', 'value2', 60);
      cacheService.set('key3', 'value3', 60);

      const stats = cacheService.getStats();

      expect(stats.size).toBe(3);
    });

    it('should handle zero requests gracefully', () => {
      const stats = cacheService.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('Edge Cases & Concurrency', () => {
    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 100; i++) {
        cacheService.set(`key${i}`, `value${i}`, 60);
      }

      for (let i = 0; i < 100; i++) {
        expect(cacheService.get(`key${i}`)).toBe(`value${i}`);
      }

      const stats = cacheService.getStats();
      expect(stats.size).toBe(100);
      expect(stats.hits).toBe(100);
    });

    it('should handle null and undefined values', () => {
      cacheService.set('null-key', null, 60);
      cacheService.set('undefined-key', undefined, 60);

      expect(cacheService.get('null-key')).toBeNull();
      expect(cacheService.get('undefined-key')).toBeUndefined();
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'key:with:colons:and-dashes';
      cacheService.set(specialKey, 'value', 60);

      const result = cacheService.get(specialKey);

      expect(result).toBe('value');
    });

    it('should clean up expired entries on access', () => {
      cacheService.set('expire1', 'value1', 5);
      cacheService.set('expire2', 'value2', 5);
      cacheService.set('valid', 'value', 60);

      jest.advanceTimersByTime(6000);

      // Access expired entries (should clean them up)
      cacheService.get('expire1');
      cacheService.get('expire2');

      const stats = cacheService.getStats();

      // Only 'valid' should remain
      expect(stats.size).toBe(1);
    });
  });

  describe('cleanup() utility method', () => {
    it('should remove all expired entries in batch', () => {
      cacheService.set('expire1', 'value1', 5);
      cacheService.set('expire2', 'value2', 5);
      cacheService.set('expire3', 'value3', 5);
      cacheService.set('valid1', 'value', 60);
      cacheService.set('valid2', 'value', 60);

      jest.advanceTimersByTime(6000);

      const removed = cacheService.cleanup();

      expect(removed).toBe(3); // 3 expired entries removed
      expect(cacheService.getStats().size).toBe(2); // 2 valid entries remain
    });

    it('should return 0 if no entries expired', () => {
      cacheService.set('valid1', 'value1', 60);
      cacheService.set('valid2', 'value2', 60);

      const removed = cacheService.cleanup();

      expect(removed).toBe(0);
      expect(cacheService.getStats().size).toBe(2);
    });

    it('should handle empty cache', () => {
      const removed = cacheService.cleanup();

      expect(removed).toBe(0);
    });
  });
});
