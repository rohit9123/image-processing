import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { URL } from 'url';
import rateLimit from 'express-rate-limit';

// 1. Fixed Redis connection configuration for Upstash
const createRedisClient = () => {
  try {
    const redisUrl = new URL(process.env.REDIS_URL);
    
    return new Redis({
      host: redisUrl.hostname,
      port: redisUrl.port,
      username: redisUrl.username || 'default',
      password: redisUrl.password,
      tls: {
        servername: redisUrl.hostname,
        rejectUnauthorized: false
      },
      maxRetriesPerRequest: null,
      connectTimeout: 5000
    });
  } catch (error) {
    console.error('Redis connection error:', error);
    process.exit(1);
  }
};

const redis = createRedisClient();
const RATE_LIMIT = 5;
const WINDOW_SIZE = 60;

// 2. Fixed transaction result handling
export const rateLimiter = async (req, res, next) => {
  const clientIp = (req.ip || req.connection.remoteAddress).replace(/:/g, '_');
  const key = `rate_limit:${clientIp}`;
  
  try {
    const now = Date.now();
    const windowStart = now - WINDOW_SIZE * 1000;

    // 3. Proper transaction handling with error checking
    const results = await redis
      .multi()
      .zadd(key, now, `${now}-${randomUUID()}`)
      .zremrangebyscore(key, 0, windowStart)
      .zcard(key)
      .expire(key, WINDOW_SIZE + 10) // Extra buffer for expiration
      .exec();

    // Handle transaction errors
    const hasTransactionError = results.some(([err]) => err);
    if (hasTransactionError) {
      throw new Error('Redis transaction failed');
    }

    // 4. Correct result extraction (zcard is 3rd command [index 2])
    const requestCount = results[2][1]; // [error, result] format

    // 5. Accurate remaining count calculation
    const remaining = Math.max(0, RATE_LIMIT - requestCount);
    const resetTime = Math.floor((now + WINDOW_SIZE * 1000) / 1000);

    res.set({
      'X-RateLimit-Limit': RATE_LIMIT,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': resetTime
    });
     console.log(requestCount,rateLimit)

    if (requestCount > RATE_LIMIT) {
      console.log(`Rate limit exceeded for ${clientIp}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: WINDOW_SIZE,
        limit: RATE_LIMIT,
        window: WINDOW_SIZE
      });
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    
    // 6. Improved fallback strategy
    const shouldBlock = process.env.NODE_ENV === 'production' 
      ? Math.random() < 0.8 // Block 80% of traffic during outages
      : true;

    if (shouldBlock) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Rate limiter unavailable'
      });
    } else {
      console.log('Allowing request through degraded limiter');
      next();
    }
  }
};