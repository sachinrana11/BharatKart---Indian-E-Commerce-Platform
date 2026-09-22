import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max number of connections during windowMs
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests from this IP or account, please try again later.',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || '127.0.0.1';
      return ip.trim();
    },
  } = options;

  const hits = new Map<string, ClientRecord>();

  // Cleanup old entries every 5 minutes to avoid memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now > record.resetTime) {
      hits.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
}

// Pre-configured rate limiters
export const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: 'Traffic rate limit exceeded. Please wait a moment before sending more requests.',
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 login/register attempts per 15 mins
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

export const orderLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 order placements per minute
  message: 'Too many order requests in a short window. Please wait a moment.',
});
