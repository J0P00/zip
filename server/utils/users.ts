import { query } from '../db/pool';

export function buildUserId(email: string, role: string) {
  const seed = email
    .trim()
    .toLowerCase()
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${role.slice(0, 3).toUpperCase()}-${String(seed).padStart(4, '0')}`;
}

export function toClientUser(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    accountSource: row.account_source || 'custom',
    registrationDate: row.created_at,
    contactNumber: row.contact_number || '',
    address: row.address || '',
    dateOfBirth: row.date_of_birth || '',
    accountStatus: row.account_status || 'Active',
    onlineStatus: row.online_status || 'online',
    avatar: row.avatar || '',
    termsAgreementAccepted: row.terms_agreement_accepted || false,
    termsAcceptedAt: row.terms_accepted_at || '',
    termsVersion: row.terms_version || '',
    studentNumber: row.student_number || '',
    course: row.course || '',
    yearLevel: row.year_level || '',
    section: row.section || '',
    programStatus: row.program_status || '',
    employeeId: row.employee_id || '',
    department: row.department || '',
    specialization: row.specialization || '',
    assignedCourses: row.assigned_courses || '',
    adminId: row.admin_id || '',
    systemRole: row.system_role || '',
    accessLevel: row.access_level || ''
  };
}

export async function findUserByEmail(email: string) {
  const result = await query(
    `
      SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
        t.employee_id, t.department, t.specialization, t.assigned_courses,
        a.admin_id, a.system_role, a.access_level
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN admins a ON a.user_id = u.id
      WHERE LOWER(u.email) = LOWER($1)
    `,
    [email]
  );

  return result.rows[0] || null;
}

export async function findUserById(id: string) {
  const result = await query(
    `
      SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
        t.employee_id, t.department, t.specialization, t.assigned_courses,
        a.admin_id, a.system_role, a.access_level
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN admins a ON a.user_id = u.id
      WHERE u.id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

