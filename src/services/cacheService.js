/**
 * In-Memory Cache Service with TTL Support
 *
 * Provides a simple in-memory caching mechanism with time-to-live (TTL) expiration.
 * Uses native JavaScript Map for optimal performance and memory efficiency.
 *
 * @module services/cacheService
 */

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} value - The cached value
 * @property {number} expiresAt - Timestamp when entry expires (ms since epoch)
 * @property {number} createdAt - Timestamp when entry was created (ms since epoch)
 */

/**
 * Cache statistics
 * @typedef {Object} CacheStats
 * @property {number} hits - Number of successful cache retrievals
 * @property {number} misses - Number of failed cache retrievals
 * @property {number} hitRate - Percentage of hits (0-1)
 * @property {number} size - Current number of cached entries
 */

class CacheService {
  constructor() {
    /** @type {Map<string, CacheEntry>} */
    this.cache = new Map();

    /** @type {number} */
    this.hits = 0;

    /** @type {number} */
    this.misses = 0;
  }

  /**
   * Retrieve a cached value by key
   *
   * @param {string} key - Cache key
   * @returns {*|null} The cached value if exists and not expired, null otherwise
   */
  get(key) {
    const entry = this.cache.get(key);

    // Key doesn't exist
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now >= entry.expiresAt) {
      // Clean up expired entry
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Valid cache hit
    this.hits++;
    return entry.value;
  }

  /**
   * Store a value in cache with TTL
   *
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {boolean} True if value was cached, false otherwise
   */
  set(key, value, ttl) {
    // Don't cache if TTL is 0 or negative
    if (ttl <= 0) {
      return false;
    }

    const now = Date.now();
    const entry = {
      value,
      expiresAt: now + (ttl * 1000),
      createdAt: now
    };

    this.cache.set(key, entry);
    return true;
  }

  /**
   * Check if a key exists in cache and is not expired
   *
   * Note: This method does NOT affect cache statistics (hits/misses)
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check expiration
    const now = Date.now();
    if (now >= entry.expiresAt) {
      // Clean up expired entry
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached entries and reset statistics
   *
   * @returns {void}
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache performance statistics
   *
   * @returns {CacheStats} Cache statistics including hits, misses, hit rate, and size
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size: this.cache.size
    };
  }

  /**
   * Remove expired entries from cache (cleanup utility)
   *
   * This is called automatically during get() and has() operations,
   * but can be called manually for batch cleanup.
   *
   * @returns {number} Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
