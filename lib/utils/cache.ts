/**
 * Client-side caching system with TTL and automatic cleanup
 */

import { CACHE_CONFIG } from '../constants';

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  ttl?: number;
  maxEntries?: number;
  cleanupInterval?: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * In-memory cache with TTL and LRU eviction
 */
export class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = { hits: 0, misses: 0 };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl ?? CACHE_CONFIG.DEFAULT_TTL_MS,
      maxEntries: options.maxEntries ?? CACHE_CONFIG.MAX_ENTRIES,
      cleanupInterval: options.cleanupInterval ?? CACHE_CONFIG.CLEANUP_INTERVAL_MS,
    };

    this.startCleanupTimer();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl ?? this.options.ttl;

    // If cache is full, remove least recently used entry
    if (this.cache.size >= this.options.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTtl,
      accessCount: 1,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<U extends T>(
    key: string,
    fetcher: () => Promise<U>,
    ttl?: number
  ): Promise<U> {
    const cached = this.get(key) as U | null;
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop cleanup timer and clear cache
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

/**
 * Global cache instance
 */
export const globalCache = new MemoryCache();

/**
 * Cache key generators
 */
export const CacheKeys = {
  clusterSummary: () => 'cluster-summary',
  nodeMetrics: (node: string, range: number) => `node-metrics-${node}-${range}`,
  userPreferences: (userId?: string) => `user-preferences-${userId || 'default'}`,
  apiResponse: (endpoint: string, params?: Record<string, any>) => {
    const paramStr = params ? `-${JSON.stringify(params)}` : '';
    return `api-${endpoint}${paramStr}`;
  },
} as const;

/**
 * Cached fetch wrapper
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; cache?: MemoryCache<T> } = {}
): Promise<T> {
  const cache = options.cache ?? globalCache;
  return cache.getOrSet(key, fetcher, options.ttl);
}

/**
 * Cache decorator for functions
 */
export function withCache<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyGenerator: (...args: TArgs) => string,
  options: { ttl?: number; cache?: MemoryCache<TReturn> } = {}
) {
  const cache = options.cache ?? globalCache;
  
  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyGenerator(...args);
    return cache.getOrSet(key, () => fn(...args), options.ttl);
  };
}

/**
 * Invalidate cache entries by pattern
 */
export function invalidateCache(pattern: string | RegExp, cache: MemoryCache = globalCache): number {
  const keysToDelete: string[] = [];
  
  for (const key of (cache as any).cache.keys()) {
    if (typeof pattern === 'string') {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    } else {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }
  }

  keysToDelete.forEach(key => cache.delete(key));
  return keysToDelete.length;
}

/**
 * Preload cache with data
 */
export async function preloadCache<T>(
  entries: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number }>,
  cache: MemoryCache<T> = globalCache as MemoryCache<T>
): Promise<void> {
  const promises = entries.map(async ({ key, fetcher, ttl }) => {
    try {
      const data = await fetcher();
      cache.set(key, data, ttl);
    } catch (error) {
      console.warn(`Failed to preload cache entry ${key}:`, error);
    }
  });

  await Promise.allSettled(promises);
}