import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  enableOfflineQueue: false
});

const RATE_LIMIT = 5; // Max requests allowed
const WINDOW_SIZE = 60; // Time window in seconds (60 = 1 minute)

export const rateLimiter = async (req, res, next) => {
  try {
    // Sanitize IPv6 addresses and create unique key
    const ip = (req.ip || req.connection.remoteAddress).replace(/:/g, '_');
    const key = `rate_limit:${ip}`;
    const now = Date.now();
    
    // Generate unique member for each request
    const member = `${now}-${randomUUID()}`;

    // Atomic transaction
    const multi = redis.multi()
      .zadd(key, now, member)            // Add current request
      .zremrangebyscore(key, 0, now - WINDOW_SIZE * 1000) // Remove old requests
      .zcard(key)                        // Get current count
      .expire(key, WINDOW_SIZE);         // Set expiration

    const [, , requestCount] = await multi.exec();
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': RATE_LIMIT,
      'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT - requestCount),
      'X-RateLimit-Reset': Math.ceil((now + WINDOW_SIZE * 1000) / 1000)
    });

    if (requestCount > RATE_LIMIT) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ 
        error: 'Too Many Requests', 
        retryAfter: WINDOW_SIZE 
      });
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    
    // Fail open in production, closed in development
    if (process.env.NODE_ENV === 'production') {
      console.log('Bypassing rate limiter due to Redis failure');
      next();
    } else {
      res.status(500).json({ 
        error: 'Rate Limiter Service Unavailable',
        message: process.env.NODE_ENV === 'development' ? error.message : null
      });
    }
  }
};