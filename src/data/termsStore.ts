import { Persona, TermsPolicyVersion, UserTermsAgreement } from '../types';

const POLICY_VERSIONS_KEY = 'oophub_terms_policy_versions';
const ACCEPTANCE_RECORDS_KEY = 'oophub_user_terms_agreement';

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

export const DEFAULT_TERMS_VERSION = '2026.06.26';

export const DEFAULT_TERMS_CONTENT = `1. Acceptance of Terms

By creating an account and using this system, you agree to comply with these Terms and Agreement. If you do not agree, please do not use the system.

2. Purpose of the System

The OOP Pedagogical Hub is an educational platform developed to support the learning, assessment, programming practice, and monitoring of Object-Oriented Programming.

The platform is intended solely for educational purposes.

3. User Responsibilities

Users agree to:

- Provide accurate registration information.
- Keep their login credentials confidential.
- Use the system responsibly.
- Complete assessments honestly.
- Avoid cheating or academic dishonesty.
- Respect teachers and other students.
- Follow school policies.

4. Prohibited Activities

Users must not:

- Share accounts.
- Attempt unauthorized access.
- Upload malicious software.
- Copy or distribute learning materials without permission.
- Exploit bugs or vulnerabilities.
- Interfere with other users.
- Use the system for illegal activities.

5. Student Progress

The system records:

- Learning progress
- Video completion
- Quiz scores
- Assessment scores
- Coding activities
- IDE usage
- Login history

These records are used for educational monitoring and performance evaluation.

6. Privacy

Personal information is collected only for academic purposes. User information will not be shared with unauthorized third parties.

7. Intellectual Property

All learning materials, videos, quizzes, assessments, source code examples, and educational resources are the property of the system developers or their respective owners.

Users may not reproduce or redistribute them without permission.

8. Account Suspension

Administrators may suspend or deactivate accounts that violate these Terms and Agreement, including but not limited to:

- Cheating
- Unauthorized access
- Abuse of the platform
- Academic misconduct

9. System Availability

The developers strive to maintain continuous availability but do not guarantee uninterrupted service due to maintenance, updates, or technical issues.

10. Changes to the Terms

The administrators may update these Terms and Agreement at any time. Continued use of the system constitutes acceptance of the revised terms. When a new version is published, users may be required to review and accept it upon their next login.

11. Contact Information

For questions regarding these Terms and Agreement, users should contact the system administrator or their instructor.`;

export const DEFAULT_PRIVACY_CONTENT = `Privacy Policy

The OOP Pedagogical Hub collects and stores information only for academic, instructional, assessment, and monitoring purposes.

Information collected may include:

- Name
- Email
- Student Number
- Course
- Year Level
- Learning Progress
- Video completion records
- Quiz scores
- Assessment results
- Coding activity
- IDE usage
- Login history

The system uses these records to support self-paced learning, instructor monitoring, academic evaluation, platform security, and system improvement.

User information will not be shared with unauthorized third parties. Administrators and instructors may access only the information needed for educational monitoring, support, and policy enforcement.

Users are expected to keep account credentials confidential and immediately report suspected unauthorized access to the system administrator or instructor.`;

export const DEFAULT_POLICY: TermsPolicyVersion = {
  id: 'terms_2026_06_26',
  version: DEFAULT_TERMS_VERSION,
  title: 'OOP Pedagogical Hub Terms and Agreement',
  termsContent: DEFAULT_TERMS_CONTENT,
  privacyContent: DEFAULT_PRIVACY_CONTENT,
  status: 'Published',
  forceReacceptance: true,
  createdAt: '2026-06-26T00:00:00.000Z',
  updatedAt: '2026-06-26T00:00:00.000Z',
  publishedAt: '2026-06-26T00:00:00.000Z',
  publishedBy: 'System'
};

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const readPolicyVersions = (): TermsPolicyVersion[] => {
  const versions = readJson<TermsPolicyVersion[]>(POLICY_VERSIONS_KEY, []);
  const hasDefault = versions.some(version => version.id === DEFAULT_POLICY.id);
  const normalized = hasDefault ? versions : [DEFAULT_POLICY, ...versions];

  return normalized.sort((a, b) => {
    const aDate = a.publishedAt ?? a.updatedAt ?? a.createdAt;
    const bDate = b.publishedAt ?? b.updatedAt ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
};

export const savePolicyVersions = (versions: TermsPolicyVersion[]) => {
  const uniqueVersions = versions.reduce<TermsPolicyVersion[]>((acc, policy) => {
    const existingIndex = acc.findIndex(item => item.id === policy.id);
    if (existingIndex >= 0) {
      acc[existingIndex] = policy;
      return acc;
    }
    return [...acc, policy];
  }, []);

  writeJson(POLICY_VERSIONS_KEY, uniqueVersions);
};

export const getPublishedPolicy = (): TermsPolicyVersion => {
  return (
    readPolicyVersions()
      .filter(policy => policy.status === 'Published')
      .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime())[0] ??
    DEFAULT_POLICY
  );
};

export const readAcceptanceRecords = (): UserTermsAgreement[] => {
  return readJson<UserTermsAgreement[]>(ACCEPTANCE_RECORDS_KEY, []);
};

export const saveAcceptanceRecords = (records: UserTermsAgreement[]) => {
  writeJson(ACCEPTANCE_RECORDS_KEY, records);
};

export const recordTermsAcceptance = ({
  userId,
  role,
  version,
  ipAddress
}: {
  userId: string;
  role: Persona;
  version: string;
  ipAddress?: string;
}): UserTermsAgreement => {
  const record: UserTermsAgreement = {
    agreement_id: createId('agr'),
    user_id: userId,
    accepted: true,
    accepted_at: nowIso(),
    ip_address: ipAddress,
    version,
    user_role: role
  };

  const records = readAcceptanceRecords();
  saveAcceptanceRecords([record, ...records]);
  return record;
};

export const getLatestAcceptanceForUser = (userId: string): UserTermsAgreement | null => {
  return (
    readAcceptanceRecords()
      .filter(record => record.user_id === userId && record.accepted)
      .sort((a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime())[0] ?? null
  );
};

export const hasAcceptedPolicyVersion = (userId: string, version: string) => {
  return Boolean(
    readAcceptanceRecords().find(record => record.user_id === userId && record.version === version && record.accepted)
  );
};

export const requiresTermsAcceptance = (userId: string, policy = getPublishedPolicy()) => {
  return !hasAcceptedPolicyVersion(userId, policy.version);
};

export const createPolicyDraftFromPublished = (createdBy = 'Admin'): TermsPolicyVersion => {
  const published = getPublishedPolicy();
  const timestamp = Date.now();
  const date = new Date();
  const version = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}-${String(timestamp).slice(-4)}`;

  return {
    ...published,
    id: createId('terms'),
    version,
    status: 'Draft',
    forceReacceptance: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    publishedAt: undefined,
    publishedBy: createdBy
  };
};

export const publishPolicyVersion = (policy: TermsPolicyVersion, publishedBy = 'Admin') => {
  const publishedPolicy: TermsPolicyVersion = {
    ...policy,
    status: 'Published',
    forceReacceptance: true,
    updatedAt: nowIso(),
    publishedAt: nowIso(),
    publishedBy
  };

  const versions = readPolicyVersions().filter(item => item.id !== policy.id);
  savePolicyVersions([publishedPolicy, ...versions]);

  return publishedPolicy;
};

export const forcePolicyReacceptance = (publishedBy = 'Admin') => {
  const published = getPublishedPolicy();
  const forcedVersion: TermsPolicyVersion = {
    ...published,
    id: createId('terms'),
    version: `${published.version}-force-${String(Date.now()).slice(-5)}`,
    forceReacceptance: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    publishedAt: nowIso(),
    publishedBy
  };

  savePolicyVersions([forcedVersion, ...readPolicyVersions()]);
  return forcedVersion;
};
