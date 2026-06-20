/**
 * Authentication Rate Limiter
 * Tracks failed login attempts and enforces lockout after threshold
 */

import { redis } from './redis';
import { db } from '../db/client';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 900; // 15 minutes
const FAILED_ATTEMPT_WINDOW_SECONDS = 3600; // 1 hour

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutUntil?: number;
  isLocked: boolean;
}

/**
 * Check if authentication attempts should be rate limited
 */
export async function checkAuthRateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `auth:attempts:${identifier}`;

  try {
    const stored = await redis.get(key);
    let attempts = 0;
    let lockoutUntil: number | undefined;

    if (stored) {
      const data = typeof stored === 'string' ? JSON.parse(stored) : stored;
      attempts = data.attempts || 0;
      lockoutUntil = data.lockoutUntil;

      // Check if still locked out
      if (lockoutUntil && Date.now() < lockoutUntil) {
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutUntil,
          isLocked: true,
        };
      }

      // If lockout expired, reset
      if (lockoutUntil && Date.now() >= lockoutUntil) {
        await redis.del(key);
        attempts = 0;
        lockoutUntil = undefined;
      }
    }

    return {
      allowed: attempts < MAX_FAILED_ATTEMPTS,
      remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attempts),
      lockoutUntil,
      isLocked: !!lockoutUntil && Date.now() < (lockoutUntil || 0),
    };
  } catch (err) {
    // On Redis failure, allow but log
    console.warn('Redis rate limit check failed:', err);
    return {
      allowed: true,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      isLocked: false,
    };
  }
}

/**
 * Record a failed authentication attempt
 */
export async function recordFailedAuthAttempt(identifier: string): Promise<void> {
  const key = `auth:attempts:${identifier}`;
  const result = await checkAuthRateLimit(identifier);

  const newAttempts = result.isLocked ? 0 : (result.remainingAttempts === MAX_FAILED_ATTEMPTS ? 1 : MAX_FAILED_ATTEMPTS - result.remainingAttempts + 1);

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    // Lock the account
    const lockoutUntil = Date.now() + (LOCKOUT_DURATION_SECONDS * 1000);
    await redis.set(
      key,
      JSON.stringify({ attempts: newAttempts, lockoutUntil }),
      { ex: LOCKOUT_DURATION_SECONDS }
    );
  } else {
    await redis.set(
      key,
      JSON.stringify({ attempts: newAttempts }),
      { ex: FAILED_ATTEMPT_WINDOW_SECONDS }
    );
  }
}

/**
 * Clear rate limit after successful auth
 */
export async function clearAuthRateLimit(identifier: string): Promise<void> {
  const key = `auth:attempts:${identifier}`;
  try {
    await redis.del(key);
  } catch (err) {
    console.warn('Failed to clear auth rate limit:', err);
  }
}

/**
 * Validate password complexity
 */
export function validatePasswordComplexity(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('पासवर्ड कमीत कमीत ८ वर्णांचे असावे.');
  }

  if (!/[A-Z]/.test(password) && !/[a-z]/.test(password)) {
    errors.push('पासवर्डमध्ये कमीत कमीत एक विशिष्ट वर्ण असावा.');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('पासवर्डमध्ये कमीत कमीत एक विशेष चिन्ह असावे.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}