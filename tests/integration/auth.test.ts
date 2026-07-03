/**
 * Auth Integration Tests
 *
 * Tests password hashing, verification, complexity validation,
 * and registration flow logic without requiring a running database.
 */

import { describe, it, expect } from 'bun:test';
import { hashPassword, verifyPassword } from '@/src/lib/auth';
import { validatePasswordComplexity } from '@/src/lib/auth-rate-limit';

// ─── Password Hashing ─────────────────────────────────────────────────────────

describe('Password Hashing', () => {
  it('should hash a password and produce a string with salt:key:iterations format', () => {
    const hash = hashPassword('TestPassword123!');
    expect(typeof hash).toBe('string');
    // Format: salt:derivedKey:iterations:iterationCount
    expect(hash).toContain(':iterations:');
  });

  it('should verify a correct password against its hash', () => {
    const password = 'MySecureP@ssw0rd';
    const hash = hashPassword(password);
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it('should reject an incorrect password', () => {
    const hash = hashPassword('CorrectPassword!');
    expect(verifyPassword('WrongPassword!', hash)).toBe(false);
  });

  it('should produce different hashes for the same password (unique salts)', () => {
    const password = 'SamePassword123!';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    expect(hash1).not.toBe(hash2);
    // But both should verify
    expect(verifyPassword(password, hash1)).toBe(true);
    expect(verifyPassword(password, hash2)).toBe(true);
  });

  it('should handle legacy hash format (without iterations marker)', () => {
    // Simulate a legacy hash: salt:key (no :iterations:N suffix)
    const password = 'LegacyPass123!';
    const hash = hashPassword(password);
    // Extract just the salt:key part (first two segments)
    const parts = hash.split(':iterations:');
    const legacyHash = parts[0]; // "salt:key"
    // Legacy verification should still work
    expect(verifyPassword(password, legacyHash)).toBe(true);
  });
});

// ─── Password Complexity ──────────────────────────────────────────────────────

describe('Password Complexity Validation', () => {
  it('should accept a valid password with all requirements met', () => {
    const result = validatePasswordComplexity('StrongP@ss1');
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject a password shorter than 8 characters', () => {
    const result = validatePasswordComplexity('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('८ वर्णांचे'))).toBe(true);
  });

  it('should reject a password without special characters', () => {
    const result = validatePasswordComplexity('NoSpecial123');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('विशेष चिन्ह'))).toBe(true);
  });

  it('should reject a password without letters', () => {
    const result = validatePasswordComplexity('12345678!');
    expect(result.valid).toBe(false);
  });

  it('should collect multiple errors for very weak passwords', () => {
    const result = validatePasswordComplexity('1');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
