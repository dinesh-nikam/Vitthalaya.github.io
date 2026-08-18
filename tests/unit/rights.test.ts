import { describe, expect, test } from 'bun:test';
import {
  decideRights,
  normalizeRightsStatus,
  rightsFromRecord,
  isPublishableStatus,
  RIGHTS_STATUSES,
  PUBLISHABLE_RIGHTS_STATUSES,
  type RightsStatus,
} from '@/src/lib/rights';

describe('rights — decideRights', () => {
  test('TC-RIGHTS-001: defaults to UNKNOWN with no declaration', () => {
    const decision = decideRights({});
    expect(decision.rightsStatus).toBe('UNKNOWN');
    expect(decision.canPublish).toBe(false);
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  test('TC-RIGHTS-002: owned status + consent + permission → canPublish', () => {
    const decision = decideRights({
      declaredStatus: 'USER_OWNED',
      consentGranted: true,
      publicationPermission: true,
    });
    expect(decision.canPublish).toBe(true);
    expect(decision.reasons).toEqual([]);
  });

  test('TC-RIGHTS-003: public-domain composition with explicit permission → canPublish', () => {
    const decision = decideRights({
      declaredStatus: 'PUBLIC_DOMAIN_COMPOSITION',
      consentGranted: true,
      publicationPermission: true,
    });
    expect(decision.canPublish).toBe(true);
  });

  test('TC-RIGHTS-004: missing consent blocks publishing with a reason', () => {
    const decision = decideRights({
      declaredStatus: 'USER_OWNED',
      consentGranted: false,
      publicationPermission: true,
    });
    expect(decision.canPublish).toBe(false);
    expect(decision.reasons.join(' ')).toContain('संमती');
  });

  test('TC-RIGHTS-005: missing publication permission keeps recording private', () => {
    const decision = decideRights({
      declaredStatus: 'USER_OWNED',
      consentGranted: true,
      publicationPermission: false,
    });
    expect(decision.canPublish).toBe(false);
    expect(decision.reasons.join(' ')).toContain('खाजगी');
  });

  test('TC-RIGHTS-006: THIRD_PARTY is never publishable even with permission', () => {
    const decision = decideRights({
      declaredStatus: 'THIRD_PARTY',
      consentGranted: true,
      publicationPermission: true,
    });
    expect(decision.canPublish).toBe(false);
  });

  test('TC-RIGHTS-007: UNKNOWN is never publishable', () => {
    const decision = decideRights({
      declaredStatus: 'UNKNOWN',
      consentGranted: true,
      publicationPermission: true,
    });
    expect(decision.canPublish).toBe(false);
  });

  test('TC-RIGHTS-008: unknown declared status falls back to UNKNOWN', () => {
    const decision = decideRights({ declaredStatus: 'SOMEONE_ELSES_SONG' });
    expect(decision.rightsStatus).toBe('UNKNOWN');
  });
});

describe('rights — normalizeRightsStatus', () => {
  test('TC-RIGHTS-009: accepts valid statuses, falls back on junk/empty', () => {
    expect(normalizeRightsStatus('USER_PERFORMANCE')).toBe('USER_PERFORMANCE');
    expect(normalizeRightsStatus('garbage')).toBe('UNKNOWN');
    expect(normalizeRightsStatus(undefined)).toBe('UNKNOWN');
    expect(normalizeRightsStatus(null)).toBe('UNKNOWN');
    expect(normalizeRightsStatus('')).toBe('UNKNOWN');
  });
});

describe('rights — rightsFromRecord', () => {
  test('TC-RIGHTS-010: maps a stored record onto the same decision', () => {
    const decision = rightsFromRecord({
      rightsStatus: 'PUBLIC_DOMAIN_COMPOSITION',
      consentGranted: true,
      publicationPermission: true,
    });
    expect(decision.rightsStatus).toBe('PUBLIC_DOMAIN_COMPOSITION');
    expect(decision.canPublish).toBe(true);
  });
});

describe('rights — constants', () => {
  test('TC-RIGHTS-011: every publishable status is a valid status', () => {
    for (const status of PUBLISHABLE_RIGHTS_STATUSES) {
      expect(RIGHTS_STATUSES).toContain(status);
      expect(isPublishableStatus(status)).toBe(true);
    }
    expect(isPublishableStatus('THIRD_PARTY' as RightsStatus)).toBe(false);
  });
});
