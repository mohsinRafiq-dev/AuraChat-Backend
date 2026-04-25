/**
 * Simple in-process sliding-window limiter per key (per Node instance).
 * For multi-node fairness, move counters to Redis (INCR + EXPIRE).
 */
export class SlidingWindowLimiter {
  constructor() {
    /** @type {Map<string, number[]>} */
    this.buckets = new Map();
  }

  /**
   * @returns {boolean} true if under limit (and records this hit)
   */
  hit(key, max, windowMs) {
    const now = Date.now();
    let arr = this.buckets.get(key);
    if (!arr) {
      arr = [];
      this.buckets.set(key, arr);
    }
    const pruned = arr.filter((t) => now - t < windowMs);
    if (pruned.length >= max) {
      this.buckets.set(key, pruned);
      return false;
    }
    pruned.push(now);
    this.buckets.set(key, pruned);
    return true;
  }
}

export const sendMessageLimiter = new SlidingWindowLimiter();
export const typingLimiter = new SlidingWindowLimiter();
