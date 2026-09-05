import { AdaptiveRecommendation, AuthenticatedUser } from '../types';

export type StudentIdentity = Pick<AuthenticatedUser, 'id' | 'userId' | 'email' | 'name'>;

export const getCanonicalStudentId = (student: StudentIdentity): string =>
  student.id || student.userId || student.email;

export const getStudentIdentityKeys = (student: StudentIdentity): string[] =>
  [student.id, student.userId, student.email, student.name]
    .filter((value): value is string => Boolean(value))
    .map(value => value.toLowerCase());

export const recommendationBelongsToStudent = (
  recommendation: AdaptiveRecommendation,
  student: StudentIdentity
): boolean => {
  const keys = getStudentIdentityKeys(student);
  return keys.includes(recommendation.studentId.toLowerCase()) ||
    Boolean(recommendation.studentName && keys.includes(recommendation.studentName.toLowerCase()));
};
