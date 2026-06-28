import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './pool';
import { hashPassword } from '../utils/auth';
import { buildUserId } from '../utils/users';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, 'schema.sql');

export async function initializeDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await query(schema);
  await seedDemoUsers();
  await seedCourses();
}

async function seedDemoUsers() {
  const demoUsers = [
    {
      name: 'Dmitry Vance (Alex Mercer)',
      email: 'dmitry@oophub.edu',
      password: 'password123',
      role: 'student' as const,
      profile: {
        studentNumber: '2026-0001',
        course: 'BS Computer Science',
        yearLevel: '3rd Year',
        section: 'CS-3A',
        programStatus: 'Regular'
      }
    },
    {
      name: 'Dr. Elena Vance',
      email: 'elena@oophub.edu',
      password: 'password123',
      role: 'teacher' as const,
      profile: {
        employeeId: 'EMP-0001',
        department: 'College of Computer Studies',
        specialization: 'Object-Oriented Programming',
        assignedCourses: 'OOP 101, Advanced Java, Software Architecture'
      }
    },
    {
      name: 'Jerico Vance (Admin)',
      email: 'jericokunn@gmail.com',
      password: 'password123',
      role: 'admin' as const,
      profile: {
        adminId: 'ADM-0001',
        systemRole: 'Super Admin',
        accessLevel: 'Level 5 - Full Access'
      }
    }
  ];

  for (const demoUser of demoUsers) {
    const exists = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [demoUser.email]);
    if (exists.rowCount) continue;

    const userId = buildUserId(demoUser.email, demoUser.role);
    const passwordHash = await hashPassword(demoUser.password);
    const inserted = await query(
      `
        INSERT INTO users (
          user_id, name, email, password_hash, role, account_status,
          terms_agreement_accepted, terms_accepted_at, terms_version
        )
        VALUES ($1, $2, LOWER($3), $4, $5, 'Active', TRUE, NOW(), '2026.06.26')
        RETURNING id
      `,
      [userId, demoUser.name, demoUser.email, passwordHash, demoUser.role]
    );

    const id = inserted.rows[0].id;

    if (demoUser.role === 'student') {
      await query(
        `
          INSERT INTO students (user_id, student_number, course, year_level, section, program_status)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          id,
          demoUser.profile.studentNumber,
          demoUser.profile.course,
          demoUser.profile.yearLevel,
          demoUser.profile.section,
          demoUser.profile.programStatus
        ]
      );
    }

    if (demoUser.role === 'teacher') {
      await query(
        `
          INSERT INTO teachers (user_id, employee_id, department, specialization, assigned_courses)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          id,
          demoUser.profile.employeeId,
          demoUser.profile.department,
          demoUser.profile.specialization,
          demoUser.profile.assignedCourses
        ]
      );
    }

    if (demoUser.role === 'admin') {
      await query(
        `
          INSERT INTO admins (user_id, admin_id, system_role, access_level)
          VALUES ($1, $2, $3, $4)
        `,
        [id, demoUser.profile.adminId, demoUser.profile.systemRole, demoUser.profile.accessLevel]
      );
    }
  }
}

async function seedCourses() {
  const courses = [
    ['oop', 'OOP Fundamentals', 'Master classes, inheritance, polymorphism, and memory v-tables.'],
    ['java_lang', 'Java Programming', 'Dive into syntax, arrays, exception streams, and heap memory.'],
    ['swing_ui', 'Java Swing UI', 'Construct desktop applications with panels, containers, and listener events.']
  ];

  for (const course of courses) {
    await query(
      `
        INSERT INTO courses (id, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `,
      course
    );
  }
}

