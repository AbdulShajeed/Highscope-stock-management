interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
}

export function createCache<T>(options: CacheOptions = {}) {
  const { ttl = 60_000 } = options
  const store = new Map<string, CacheEntry<T>>()

  return {
    get(key: string): T | null {
      const entry = store.get(key)
      if (!entry) return null
      if (Date.now() - entry.timestamp > ttl) {
        store.delete(key)
        return null
      }
      return entry.data
    },

    set(key: string, data: T): void {
      store.set(key, { data, timestamp: Date.now() })
    },

    clear(): void {
      store.clear()
    },

    invalidate(predicate: (key: string) => boolean): void {
      for (const key of store.keys()) {
        if (predicate(key)) store.delete(key)
      }
    },
  }
}

// Simple singleton cache for single-resource endpoints
export function createSingletonCache<T>(options: CacheOptions = {}) {
  const { ttl = 60_000 } = options
  let entry: CacheEntry<T> | null = null

  return {
    get(): T | null {
      if (!entry) return null
      if (Date.now() - entry.timestamp > ttl) {
        entry = null
        return null
      }
      return entry.data
    },

    set(data: T): void {
      entry = { data, timestamp: Date.now() }
    },

    clear(): void {
      entry = null
    },
  }
}
