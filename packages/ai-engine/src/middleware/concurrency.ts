/**
 * Concurrency control for streaming routes.
 *
 * Since Hono SSE middleware returns Response before the stream finishes,
 * a standard middleware can't track stream lifetime. Instead, this module
 * exposes acquire/release functions that routes call manually.
 *
 * Usage:
 *   const limiter = createConcurrencyLimiter(3)
 *   // In route:
 *   if (!limiter.tryAcquire()) return c.json({error: '...'}, 429)
 *   try { await doStreaming() } finally { limiter.release() }
 */

export interface ConcurrencyLimiter {
  /** Try to acquire a slot. Returns true if acquired, false if at limit. */
  tryAcquire(): boolean
  /** Release a previously acquired slot. */
  release(): void
  /** Current state for health reporting. */
  getState(): { active: number; max: number }
}

export function createConcurrencyLimiter(maxConcurrent: number = 3): ConcurrencyLimiter {
  let active = 0
  const max = maxConcurrent

  return {
    tryAcquire() {
      if (active >= max) return false
      active++
      return true
    },
    release() {
      if (active > 0) active--
    },
    getState() {
      return { active, max }
    },
  }
}
