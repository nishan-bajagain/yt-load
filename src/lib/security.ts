/**
 * Security and sanitization utilities.
 */

// Simple in-memory sliding window rate limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

/**
 * Checks if a client IP has exceeded the rate limit.
 * Returns true if allowed, false if rate limited.
 */
export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean old entries periodically
  if (rateLimitMap.size > 5000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetInSec: Math.ceil(WINDOW_MS / 1000),
    };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetInSec: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Sanitizes a title string into a safe file name, preventing path traversal
 * and removing non-printable or forbidden filesystem characters across Windows/Linux/macOS.
 */
export function sanitizeFilename(input: string, fallback = 'download'): string {
  if (!input || typeof input !== 'string') return fallback;

  // Remove control characters and path traversal
  let clean = input
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Windows forbidden chars
    .replace(/\.\.+/g, '') // Prevent directory traversal
    .replace(/^\s+|\s+$/g, '') // Trim
    .replace(/\s+/g, ' '); // Normalize spaces

  // Strip leading/trailing dots
  clean = clean.replace(/^\.+|\.+$/g, '');

  if (!clean || clean.length === 0) {
    clean = fallback;
  }

  // Limit max filename length to 120 chars for safety
  if (clean.length > 120) {
    clean = clean.substring(0, 120).trim();
  }

  return clean;
}
