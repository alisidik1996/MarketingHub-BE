/**
 * Simple in-memory rate limiter.
 * Untuk production skala besar, ganti dengan redis-based solution.
 */

const store = new Map();

/**
 * @param {number} maxRequests - max requests per window
 * @param {number} windowMs    - window duration in ms
 */
export function rateLimit(maxRequests = 30, windowMs = 60_000) {
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    if (!store.has(key)) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const entry = store.get(key);

    if (now > entry.resetAt) {
      entry.count   = 1;
      entry.resetAt = now + windowMs;
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests, slow down.' });
    }

    entry.count++;
    next();
  };
}
