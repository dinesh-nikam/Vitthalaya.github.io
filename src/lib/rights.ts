/**
 * Digital Pandharpur — Content Rights (Audio Platform)
 *
 * Every recording/upload carries a RightsRecord. Nothing is ever published
 * without an explicit publication decision:
 *
 *   - PUBLISHABLE statuses: the user owns the recording and may grant
 *     publication permission for it.
 *   - NON-PUBLISHABLE statuses: third-party or unknown content stays private
 *     unless a moderator resolves rights separately.
 *
 * This module is pure (no DB, no network) so the rules are unit-testable and
 * shared by the upload API, the /record page, and any future admin tooling.
 */

export const RIGHTS_STATUSES = [
  'USER_OWNED',
  'PUBLIC_DOMAIN_COMPOSITION',
  'USER_PERFORMANCE',
  'THIRD_PARTY',
  'UNKNOWN',
] as const;

export type RightsStatus = (typeof RIGHTS_STATUSES)[number];

/** Statuses where the uploader owns the recording and may authorize publishing. */
export const PUBLISHABLE_RIGHTS_STATUSES: readonly RightsStatus[] = [
  'USER_OWNED',
  'PUBLIC_DOMAIN_COMPOSITION',
  'USER_PERFORMANCE',
];

export const RIGHTS_STATUS_LABELS: Record<RightsStatus, string> = {
  USER_OWNED: 'माझी स्वतःची रेकॉर्डिंग / रचना (My own recording/composition)',
  PUBLIC_DOMAIN_COMPOSITION: 'सार्वजनिक डोमेन रचना — माझे गायन (Public-domain composition, my performance)',
  USER_PERFORMANCE: 'माझे स्वतःचे सादरीकरण (My own performance of a composition)',
  THIRD_PARTY: 'इतरांची रेकॉर्डिंग (Third-party recording)',
  UNKNOWN: 'माहीत नाही (Unknown)',
};

export interface RightsInput {
  /** Raw value from the client form; normalized against RIGHTS_STATUSES. */
  declaredStatus?: string | null;
  consentGranted?: boolean;
  publicationPermission?: boolean;
  attribution?: string | null;
  source?: string | null;
  license?: string | null;
  notes?: string | null;
}

export interface RightsDecision {
  rightsStatus: RightsStatus;
  consentGranted: boolean;
  publicationPermission: boolean;
  /** True when the recording may be submitted for publication review. */
  canPublish: boolean;
  /** Human-readable reasons — one per failed gate (empty when canPublish). */
  reasons: string[];
}

/** Map the DB/record shape onto the decision inputs. */
export function rightsFromRecord(record: {
  rightsStatus: string;
  consentGranted: boolean;
  publicationPermission: boolean;
}): RightsDecision {
  return decideRights({
    declaredStatus: record.rightsStatus,
    consentGranted: record.consentGranted,
    publicationPermission: record.publicationPermission,
  });
}

/**
 * Decide the effective rights status and whether the recording may be
 * submitted for publication. Never auto-publishes: publicationPermission
 * must be explicit, consent must be granted, and the status must be one the
 * uploader actually owns.
 */
export function decideRights(input: RightsInput): RightsDecision {
  const declared = normalizeRightsStatus(input.declaredStatus);
  const consentGranted = input.consentGranted === true;
  const publicationPermission = input.publicationPermission === true;

  const reasons: string[] = [];
  const canPublish = PUBLISHABLE_RIGHTS_STATUSES.includes(declared);

  if (!PUBLISHABLE_RIGHTS_STATUSES.includes(declared)) {
    reasons.push(
      `राइट्स स्थिती "${declared}" मुळे प्रकाशन शक्य नाही — फक्त तुमच्या मालकीच्या रेकॉर्डिंग्जच प्रकाशनासाठी पाठवता येतात.`
    );
  }
  if (!consentGranted) {
    reasons.push('प्रक्रिया करण्यासाठी स्पष्ट संमती आवश्यक आहे.');
  }
  if (!publicationPermission) {
    reasons.push('प्रकाशन परवानगी दिलेली नाही — रेकॉर्डिंग खाजगी राहील.');
  }

  return {
    rightsStatus: declared,
    consentGranted,
    publicationPermission,
    canPublish: canPublish && consentGranted && publicationPermission,
    reasons,
  };
}

/**
 * Normalize a client-supplied status string to a valid RightsStatus.
 * Unknown/empty values fall back to UNKNOWN (safe default).
 */
export function normalizeRightsStatus(value: string | null | undefined): RightsStatus {
  if (value && (RIGHTS_STATUSES as readonly string[]).includes(value)) {
    return value as RightsStatus;
  }
  return 'UNKNOWN';
}

/** True when the status alone permits publication (before consent/permission checks). */
export function isPublishableStatus(status: RightsStatus): boolean {
  return PUBLISHABLE_RIGHTS_STATUSES.includes(status);
}
