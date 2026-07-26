require("dotenv").config();

const bcrypt = require("bcrypt");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (!allowedOrigins.length || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options(/.*/, cors());
app.use(express.json({ limit: "10mb" }));

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && JWT_SECRET === "change-this-secret") {
    throw new Error("JWT_SECRET must be configured in production.");
}

const clampNumber = (value, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.min(Math.max(parsed, min), max);
};

const cleanText = (value, maxLength = 255) => String(value ?? "").trim().slice(0, maxLength);

const buildUserId = (email, role) => {
    const seed = String(email)
        .trim()
        .toLowerCase()
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `${String(role).slice(0, 3).toUpperCase()}-${String(seed).padStart(4, "0")}`;
};

const signToken = (user) => jwt.sign({
    id: user.id,
    userId: user.user_id,
    email: user.email,
    role: user.role
}, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const toClientUser = (row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    accountSource: row.account_source || "custom",
    registrationDate: row.created_at,
    contactNumber: row.contact_number || "",
    address: row.address || "",
    dateOfBirth: row.date_of_birth || "",
    accountStatus: row.account_status || "Active",
    onlineStatus: row.online_status || "online",
    avatar: row.avatar || "",
    termsAgreementAccepted: row.terms_agreement_accepted || false,
    termsAcceptedAt: row.terms_accepted_at || "",
    termsVersion: row.terms_version || "",
    studentNumber: row.student_number || "",
    course: row.course || "",
    yearLevel: row.year_level || "",
    section: row.section || "",
    programStatus: row.program_status || "",
    employeeId: row.employee_id || "",
    department: row.department || "",
    specialization: row.specialization || "",
    assignedCourses: row.assigned_courses || "",
    adminId: row.admin_id || "",
    systemRole: row.system_role || "",
    accessLevel: row.access_level || ""
});

const toClientRecommendation = (row) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name || "",
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title || "",
    currentTopic: row.current_topic || "",
    type: row.recommendation_type,
    trigger: row.trigger_event,
    reason: row.reason,
    generatedDate: row.generated_at,
    status: row.status,
    title: row.title,
    summary: row.summary,
    actions: row.actions || [],
    primaryActionLabel: row.primary_action_label || "",
    targetView: row.target_view || "dashboard",
    quizScore: row.quiz_score === null ? undefined : Number(row.quiz_score),
    codingScore: row.coding_score === null ? undefined : Number(row.coding_score),
    videoCompleted: row.video_completed,
    lessonCompleted: row.lesson_completed,
    quizAttempts: row.quiz_attempts,
    codingAttempts: row.coding_attempts,
    progressPercentage: row.progress_percentage === null ? undefined : Number(row.progress_percentage)
});

const toClientLesson = (row) => ({
    id: row.id,
    title: row.title,
    module: row.module || "",
    sequence: Number(row.sequence || 0),
    duration: row.duration || "",
    videoUrl: row.video_url || "",
    description: row.description || "",
    learningObjectives: row.learning_objectives || [],
    status: row.status || "Draft",
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const toClientAssessment = (row) => ({
    id: row.id,
    lessonId: row.lesson_id,
    title: row.title,
    quizType: row.quiz_type,
    passingScore: Number(row.passing_score || 0),
    attempts: Number(row.attempts || 0),
    questions: row.questions || [],
    status: row.status || "Draft",
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const toClientPracticeChallenge = (row) => ({
    id: row.id,
    topicId: row.topic_id,
    lessonId: row.lesson_id || "",
    title: row.title,
    description: row.description,
    learningObjectives: row.learning_objectives || [],
    requirements: row.requirements || [],
    starterCode: row.starter_code || "",
    sampleInput: row.sample_input || "",
    sampleOutput: row.sample_output || "",
    passingScore: Number(row.passing_score || 70),
    status: row.status || "Draft",
    testCases: row.test_cases || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const findUserByEmail = async (email) => {
    const result = await pool.query(`
        SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
               t.employee_id, t.department, t.specialization, t.assigned_courses,
               a.admin_id, a.system_role, a.access_level
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
        LEFT JOIN admins a ON a.user_id = u.id
        WHERE LOWER(u.email) = LOWER($1)
    `, [email]);
    return result.rows[0] || null;
};

const findUserById = async (id) => {
    const result = await pool.query(`
        SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
               t.employee_id, t.department, t.specialization, t.assigned_courses,
               a.admin_id, a.system_role, a.access_level
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
        LEFT JOIN admins a ON a.user_id = u.id
        WHERE u.id = $1
    `, [id]);
    return result.rows[0] || null;
};

const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!token) return res.status(401).json({ success: false, message: "Authentication token is required." });

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const result = await pool.query("SELECT id FROM users WHERE id = $1", [payload.id]);
        if (result.rowCount === 0) {
            return res.status(401).json({ success: false, message: "User session is no longer valid." });
        }
        req.authUser = payload;
        return next();
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired authentication token." });
    }
};

const requireRole = (roles) => (req, res, next) => {
    if (!req.authUser) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!roles.includes(req.authUser.role)) {
        return res.status(403).json({ success: false, message: "You do not have permission to access this resource." });
    }
    return next();
};

const initializeDatabase = async () => {
    await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await pool.query(`
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    `);
    await pool.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'user_id'
              AND data_type = 'uuid'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'id'
          ) THEN
            ALTER TABLE users RENAME COLUMN user_id TO id;
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'full_name'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'name'
          ) THEN
            ALTER TABLE users RENAME COLUMN full_name TO name;
          END IF;
        END $$
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role user_role NOT NULL,
          account_status TEXT NOT NULL DEFAULT 'Active',
          contact_number TEXT DEFAULT '',
          address TEXT DEFAULT '',
          date_of_birth TEXT DEFAULT '',
          online_status TEXT DEFAULT 'online',
          avatar TEXT DEFAULT '',
          terms_agreement_accepted BOOLEAN NOT NULL DEFAULT FALSE,
          terms_accepted_at TIMESTAMPTZ,
          terms_version TEXT DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
        ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'student';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'Active';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number TEXT DEFAULT '';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TEXT DEFAULT '';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS online_status TEXT DEFAULT 'online';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_agreement_accepted BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        UPDATE users
        SET
          id = COALESCE(id, gen_random_uuid()),
          user_id = COALESCE(NULLIF(user_id, ''), UPPER(LEFT(role::TEXT, 3)) || '-' || SUBSTRING(MD5(email), 1, 8)),
          name = COALESCE(NULLIF(name, ''), email),
          password_hash = COALESCE(password_hash, ''),
          account_status = COALESCE(account_status, 'Active'),
          contact_number = COALESCE(contact_number, ''),
          address = COALESCE(address, ''),
          date_of_birth = COALESCE(date_of_birth, ''),
          online_status = COALESCE(online_status, 'online'),
          avatar = COALESCE(avatar, ''),
          terms_agreement_accepted = COALESCE(terms_agreement_accepted, FALSE),
          terms_version = COALESCE(terms_version, ''),
          created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, NOW());
        ALTER TABLE users ALTER COLUMN id SET NOT NULL;
        ALTER TABLE users ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE users ALTER COLUMN name SET NOT NULL;
        ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
        ALTER TABLE users ALTER COLUMN account_status SET NOT NULL;
        ALTER TABLE users ALTER COLUMN terms_agreement_accepted SET NOT NULL;
        ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
        ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email));
        CREATE TABLE IF NOT EXISTS students (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          student_number TEXT UNIQUE,
          course TEXT,
          year_level TEXT,
          section TEXT,
          program_status TEXT DEFAULT 'Regular',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS teachers (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          employee_id TEXT UNIQUE,
          department TEXT,
          specialization TEXT,
          assigned_courses TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS admins (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          admin_id TEXT UNIQUE,
          system_role TEXT,
          access_level TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS user_terms_agreements (
          agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          accepted BOOLEAN NOT NULL DEFAULT TRUE,
          accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_address TEXT,
          version TEXT NOT NULL,
          user_role user_role NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS lessons (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          module TEXT DEFAULT '',
          sequence INTEGER NOT NULL DEFAULT 0,
          duration TEXT DEFAULT '',
          video_url TEXT DEFAULT '',
          description TEXT DEFAULT '',
          learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
          status TEXT NOT NULL DEFAULT 'Draft',
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Draft';
        CREATE TABLE IF NOT EXISTS assessments (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          quiz_type TEXT NOT NULL DEFAULT 'Multiple Choice',
          passing_score NUMERIC NOT NULL DEFAULT 70,
          attempts INTEGER NOT NULL DEFAULT 1,
          questions JSONB NOT NULL DEFAULT '[]'::jsonb,
          status TEXT NOT NULL DEFAULT 'Draft',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS student_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          video_id TEXT NOT NULL,
          last_position NUMERIC NOT NULL DEFAULT 0,
          completion_percentage NUMERIC NOT NULL DEFAULT 0,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          date_completed TIMESTAMPTZ,
          notes TEXT DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_user_id, video_id)
        );
        CREATE TABLE IF NOT EXISTS quiz_attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          assessment_id TEXT NOT NULL,
          lesson_id TEXT DEFAULT '',
          score INTEGER NOT NULL,
          total INTEGER NOT NULL,
          percentage NUMERIC NOT NULL,
          correct_answers INTEGER NOT NULL,
          incorrect_answers INTEGER NOT NULL,
          passed BOOLEAN NOT NULL DEFAULT FALSE,
          attempt_number INTEGER NOT NULL,
          answers JSONB NOT NULL DEFAULT '{}'::jsonb,
          date_completed TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS programming_challenges (
          id TEXT PRIMARY KEY,
          topic_id TEXT NOT NULL,
          lesson_id TEXT DEFAULT '',
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
          requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
          starter_code TEXT DEFAULT '',
          sample_input TEXT DEFAULT '',
          sample_output TEXT DEFAULT '',
          passing_score NUMERIC NOT NULL DEFAULT 70,
          status TEXT NOT NULL DEFAULT 'Draft',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Draft';
        ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        CREATE TABLE IF NOT EXISTS challenge_test_cases (
          id TEXT PRIMARY KEY,
          challenge_id TEXT NOT NULL REFERENCES programming_challenges(id) ON DELETE CASCADE,
          input TEXT DEFAULT '',
          expected_output TEXT NOT NULL,
          is_hidden BOOLEAN NOT NULL DEFAULT TRUE,
          matcher TEXT DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS practice_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id TEXT NOT NULL,
          challenge_id TEXT NOT NULL REFERENCES programming_challenges(id) ON DELETE CASCADE,
          source_code TEXT NOT NULL,
          program_output TEXT DEFAULT '',
          compile_status TEXT NOT NULL DEFAULT 'not_run',
          runtime NUMERIC DEFAULT 0,
          memory_usage NUMERIC,
          score NUMERIC NOT NULL DEFAULT 0,
          error_message TEXT DEFAULT '',
          test_results JSONB NOT NULL DEFAULT '[]'::jsonb,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_locked BOOLEAN NOT NULL DEFAULT TRUE,
          UNIQUE(student_id, challenge_id)
        );
        CREATE TABLE IF NOT EXISTS recommendation_history (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          student_name TEXT DEFAULT '',
          lesson_id TEXT NOT NULL,
          lesson_title TEXT DEFAULT '',
          current_topic TEXT DEFAULT '',
          recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('Remedial', 'Continue', 'Advanced')),
          trigger_event TEXT NOT NULL CHECK (trigger_event IN ('Video Completion', 'Quiz Score', 'Coding Score', 'Lesson Completion')),
          reason TEXT NOT NULL,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          actions JSONB NOT NULL DEFAULT '[]'::jsonb,
          primary_action_label TEXT DEFAULT '',
          target_view TEXT DEFAULT 'dashboard',
          quiz_score NUMERIC,
          coding_score NUMERIC,
          video_completed BOOLEAN NOT NULL DEFAULT FALSE,
          lesson_completed BOOLEAN NOT NULL DEFAULT FALSE,
          quiz_attempts INTEGER,
          coding_attempts INTEGER,
          progress_percentage NUMERIC,
          status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
          generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_recommendation_history_student ON recommendation_history(student_id, generated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_recommendation_history_type ON recommendation_history(recommendation_type, status);

        CREATE TABLE IF NOT EXISTS login_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          login_date DATE NOT NULL DEFAULT CURRENT_DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_id, login_date)
        );

        CREATE TABLE IF NOT EXISTS lesson_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
          video_completed BOOLEAN NOT NULL DEFAULT FALSE,
          quiz_passed BOOLEAN NOT NULL DEFAULT FALSE,
          practice_completed BOOLEAN NOT NULL DEFAULT FALSE,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_id, lesson_id)
        );

        CREATE TABLE IF NOT EXISTS video_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
          current_time NUMERIC NOT NULL DEFAULT 0,
          duration NUMERIC NOT NULL DEFAULT 0,
          watch_percentage NUMERIC NOT NULL DEFAULT 0,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_id, lesson_id)
        );

        CREATE TABLE IF NOT EXISTS practice_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          challenge_id TEXT NOT NULL REFERENCES programming_challenges(id) ON DELETE CASCADE,
          started BOOLEAN NOT NULL DEFAULT TRUE,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          score NUMERIC NOT NULL DEFAULT 0,
          source_code TEXT,
          submission_count INTEGER NOT NULL DEFAULT 1,
          completion_time_seconds INTEGER,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_id, challenge_id)
        );

        CREATE TABLE IF NOT EXISTS student_xp (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          xp_amount INTEGER NOT NULL,
          source_activity TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS student_badges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          badge_name TEXT NOT NULL,
          badge_title TEXT NOT NULL,
          badge_desc TEXT NOT NULL,
          badge_icon TEXT NOT NULL,
          badge_color TEXT NOT NULL,
          awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_id, badge_name)
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          activity_type TEXT NOT NULL,
          activity_detail TEXT NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
};

const seedDemoUsers = async () => {
    const demoUsers = [
        ["Dmitry Vance (Alex Mercer)", "dmitry@oophub.edu", "password123", "student"],
        ["Dr. Elena Vance", "elena@oophub.edu", "password123", "teacher"],
        ["Jerico Vance (Admin)", "jericokunn@gmail.com", "password123", "admin"]
    ];

    for (const [name, email, password, role] of demoUsers) {
        const existing = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        if (existing.rowCount) continue;

        const passwordHash = await bcrypt.hash(password, 12);
        const userResult = await pool.query(`
            INSERT INTO users (user_id, name, email, password_hash, role, terms_agreement_accepted, terms_accepted_at, terms_version)
            VALUES ($1, $2, LOWER($3), $4, $5, TRUE, NOW(), '2026.06.26')
            RETURNING id
        `, [buildUserId(email, role), name, email, passwordHash, role]);
        const id = userResult.rows[0].id;

        if (role === "student") {
            await pool.query(`
                INSERT INTO students (user_id, student_number, course, year_level, section, program_status)
                VALUES ($1, '2026-0001', 'BS Computer Science', '3rd Year', 'CS-3A', 'Regular')
            `, [id]);
        } else if (role === "teacher") {
            await pool.query(`
                INSERT INTO teachers (user_id, employee_id, department, specialization, assigned_courses)
                VALUES ($1, 'EMP-0001', 'College of Computer Studies', 'Object-Oriented Programming', 'OOP 101, Advanced Java, Software Architecture')
            `, [id]);
        } else if (role === "admin") {
            await pool.query(`
                INSERT INTO admins (user_id, admin_id, system_role, access_level)
                VALUES ($1, 'ADM-0001', 'Super Admin', 'Level 5 - Full Access')
            `, [id]);
        }
    }
};

const seedLessons = async () => {
    const lessons = [
        [
            "oop_lesson_1",
            "Classes & Objects",
            "OOP Fundamentals",
            1,
            "13:50",
            "/videos/lesson1.mp4",
            "Introduces Java classes as blueprints and objects as instances with fields, methods, state, and behavior.",
            JSON.stringify(["Class blueprint", "Object instance", "Fields and methods", "new keyword", "State and behavior"]),
            "Published"
        ],
        [
            "oop_lesson_2",
            "Constructors",
            "OOP Fundamentals",
            2,
            "17:29",
            "/videos/lesson2.mp4",
            "Explains Java constructors, object initialization, constructor names, parameters, and default constructor behavior.",
            JSON.stringify(["Constructor purpose", "Same name as class", "No return type", "Parameterized constructor", "Default constructor"]),
            "Published"
        ],
        [
            "oop_lesson_3",
            "Object Methods",
            "OOP Fundamentals",
            3,
            "18:15",
            "/videos/lesson3.mp4",
            "Covers object methods as class-defined behaviors, calling methods through objects, parameters, returns, and field access.",
            JSON.stringify(["Object behavior", "Method call", "Parameters", "Return values", "Instance field access"]),
            "Published"
        ],
        [
            "oop_lesson_4",
            "Encapsulation",
            "OOP Fundamentals",
            4,
            "12:05",
            "/OOP%20Lesson/Topic4-Inheritance.mp4",
            "Explains data hiding with private fields and controlled access through getter and setter methods.",
            JSON.stringify(["Data hiding", "private fields", "getters", "setters", "validation"]),
            "Published"
        ],
        [
            "oop_lesson_5",
            "Constructor Overloading",
            "OOP Fundamentals",
            5,
            "10:42",
            "/OOP%20Lesson/Topic5-MethodOveriding.mp4",
            "Shows how one class can define multiple constructors with different parameter lists for flexible object creation.",
            JSON.stringify(["Constructor overload", "Different parameters", "this()", "Initialization paths", "Compile-time selection"]),
            "Published"
        ],
        [
            "oop_lesson_6",
            "Inheritance",
            "Core OOP",
            6,
            "16:10",
            "/videos/lesson6.mp4",
            "Introduces inheritance in Java, showing how child classes reuse and extend parent class fields and methods.",
            JSON.stringify(["Parent class", "Child class", "extends keyword", "is-a relationship", "Code reuse"]),
            "Published"
        ],
        [
            "oop_lesson_7",
            "Polymorphism",
            "Core OOP",
            7,
            "14:20",
            "/videos/lesson7.mp4",
            "Covers polymorphism through overloaded methods, overridden behavior, parent references, and dynamic method dispatch.",
            JSON.stringify(["Many forms", "Method overloading", "Method overriding", "Parent reference", "Runtime dispatch"]),
            "Published"
        ],
        [
            "oop_lesson_8",
            "Abstract Classes",
            "Advanced OOP",
            8,
            "11:55",
            "/OOP%20Lesson/Topic8%20abstraction%20.mp4?v=compressed-20260726",
            "Explains abstract classes as shared base definitions that can declare required behavior and provide reusable concrete methods.",
            JSON.stringify(["abstract class", "Abstract method", "Concrete method", "Shared base class", "Subclass responsibility"]),
            "Published"
        ],
        [
            "oop_lesson_9",
            "Interfaces / Abstraction",
            "Advanced OOP",
            9,
            "13:35",
            "/OOP%20Lesson/topic9-INTERFACE.mp4?v=compressed-20260726-2124",
            "Introduces interfaces and abstraction as ways to expose essential behavior while hiding implementation details.",
            JSON.stringify(["interface keyword", "implements keyword", "Behavior contract", "Implementation hiding", "Default methods"]),
            "Published"
        ],
        [
            "oop_lesson_10",
            "Array of Objects",
            "Advanced OOP",
            10,
            "18:40",
            "/videos/lesson10.mp4",
            "Shows how arrays can store object references, how each element must be initialized, and how loops process object collections.",
            JSON.stringify(["Object reference array", "Element initialization", "Null elements", "Array traversal", "Object state per element"]),
            "Published"
        ],
        [
            "oop_lesson_11",
            "Enum",
            "Advanced OOP",
            11,
            "15:25",
            "/videos/lesson11.mp4",
            "Explains Java enums as type-safe named constants that can also contain fields, constructors, and methods.",
            JSON.stringify(["enum keyword", "Named constants", "Type safety", "switch with enum", "Enum fields and methods"]),
            "Published"
        ]
    ];

    for (const lesson of lessons) {
        await pool.query(`
            INSERT INTO lessons (id, title, module, sequence, duration, video_url, description, learning_objectives, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              module = EXCLUDED.module,
              sequence = EXCLUDED.sequence,
              duration = EXCLUDED.duration,
              video_url = EXCLUDED.video_url,
              description = EXCLUDED.description,
              learning_objectives = EXCLUDED.learning_objectives,
              status = EXCLUDED.status,
              updated_at = NOW()
        `, lesson);
    }
};

const seedPracticeChallenges = async () => {
    const topics = [
        ["practice_1", "classes-objects", "oop_lesson_1", "Create a Student object"],
        ["practice_2", "constructors", "oop_lesson_2", "Initialize a Book"],
        ["practice_3", "encapsulation", "oop_lesson_4", "Protect BankAccount balance"],
        ["practice_4", "inheritance", "oop_lesson_6", "Extend Employee into Manager"],
        ["practice_5", "polymorphism", "oop_lesson_7", "Override notification sending"],
        ["practice_6", "abstraction", "oop_lesson_8", "Implement an abstract shape"],
        ["practice_7", "interfaces", "oop_lesson_9", "Implement Payable"],
        ["practice_8", "exception-handling", "oop_lesson_10", "Validate division safely"],
        ["practice_9", "collections", "oop_lesson_10", "Track unique names"],
        ["practice_10", "file-handling", "oop_lesson_11", "Read simple file content"],
        ["practice_11", "mini-oop-project", "oop_lesson_11", "Mini library checkout"]
    ];

    for (const [id, topicId, lessonId, title] of topics) {
        await pool.query(`
            INSERT INTO programming_challenges (
              id, topic_id, lesson_id, title, description, learning_objectives,
              requirements, starter_code, sample_input, sample_output, passing_score
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, '', $9, 70)
            ON CONFLICT (id) DO UPDATE SET
              topic_id = EXCLUDED.topic_id,
              lesson_id = EXCLUDED.lesson_id,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              learning_objectives = EXCLUDED.learning_objectives,
              requirements = EXCLUDED.requirements,
              starter_code = EXCLUDED.starter_code,
              sample_output = EXCLUDED.sample_output
        `, [
            id,
            topicId,
            lessonId,
            title,
            `Automated Java practice challenge for ${topicId.replace(/-/g, " ")}.`,
            JSON.stringify(["Apply the topic in Java", "Pass visible and hidden tests"]),
            JSON.stringify(["Keep the class named Main", "Print the required sample output"]),
            "public class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n",
            "Expected output depends on the published challenge."
        ]);

        await pool.query(`
            INSERT INTO challenge_test_cases (id, challenge_id, expected_output, is_hidden, matcher)
            VALUES ($1, $2, $3, FALSE, 'class\\s+Main')
            ON CONFLICT (id) DO UPDATE SET expected_output = EXCLUDED.expected_output, matcher = EXCLUDED.matcher
        `, [`${id}_sample`, id, "Expected output depends on the published challenge."]);
    }
// --- Student Analytics Tracking Engine Helpers ---
const logActivity = async (studentId, type, detail, metadata = {}) => {
    try {
        await pool.query(
            "INSERT INTO activity_logs (student_id, activity_type, activity_detail, metadata) VALUES ($1, $2, $3, $4::jsonb)",
            [studentId, type, detail, JSON.stringify(metadata)]
        );
    } catch (err) {
        console.error("Error logging student activity:", err);
    }
};

const awardXP = async (studentId, amount, activityType) => {
    if (amount <= 0) return 0;
    try {
        const exists = await pool.query(
            "SELECT id FROM student_xp WHERE student_id = $1 AND source_activity = $2",
            [studentId, activityType]
        );
        if (exists.rowCount > 0) {
            return 0; // Already awarded
        }
        await pool.query(
            "INSERT INTO student_xp (student_id, xp_amount, source_activity) VALUES ($1, $2, $3)",
            [studentId, amount, activityType]
        );
        await logActivity(studentId, "xp_gain", `Gained ${amount} XP from: ${activityType}`, { amount, activityType });
        return amount;
    } catch (err) {
        console.error("Error awarding XP:", err);
        return 0;
    }
};

const recordLogin = async (studentId) => {
    try {
        await pool.query(
            "INSERT INTO login_history (student_id, login_date) VALUES ($1, CURRENT_DATE) ON CONFLICT (student_id, login_date) DO NOTHING",
            [studentId]
        );
        await logActivity(studentId, "login", "Logged in to the OOP hub");
        await checkAndAwardBadges(studentId);
    } catch (err) {
        console.error("Error recording student login:", err);
    }
};

const calculateStreak = async (studentId) => {
    try {
        const result = await pool.query(
            "SELECT DISTINCT login_date::text FROM login_history WHERE student_id = $1 ORDER BY login_date DESC",
            [studentId]
        );
        const dates = result.rows.map(r => r.login_date);
        if (dates.length === 0) return 0;

        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) {
            return 0;
        }

        let currentStreak = 0;
        let checkDate = new Date();
        let checkDateStr = checkDate.toISOString().split('T')[0];

        if (!dates.includes(checkDateStr)) {
            checkDate = yesterday;
            checkDateStr = yesterdayStr;
        }

        while (dates.includes(checkDateStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
            checkDateStr = checkDate.toISOString().split('T')[0];
        }
        return currentStreak;
    } catch (err) {
        console.error("Error calculating streak:", err);
        return 0;
    }
};

const checkModuleCompletion = async (studentId, moduleName) => {
    if (!moduleName) return;
    try {
        const totalLessonsRes = await pool.query("SELECT COUNT(*)::int FROM lessons WHERE module = $1", [moduleName]);
        const totalLessons = totalLessonsRes.rows[0].count;
        if (totalLessons === 0) return;

        const completedLessonsRes = await pool.query(
            "SELECT COUNT(*)::int FROM lesson_progress WHERE student_id = $1 AND completed = TRUE AND lesson_id IN (SELECT id FROM lessons WHERE module = $2)",
            [studentId, moduleName]
        );
        const completedLessons = completedLessonsRes.rows[0].count;

        if (completedLessons === totalLessons) {
            await awardXP(studentId, 100, `Module Completion: ${moduleName}`);
        }
    } catch (err) {
        console.error("Error checking module completion:", err);
    }
};

const checkAndAwardBadges = async (studentId) => {
    const awardBadge = async (name, title, desc, icon, color) => {
        try {
            await pool.query(`
                INSERT INTO student_badges (student_id, badge_name, badge_title, badge_desc, badge_icon, badge_color)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (student_id, badge_name) DO NOTHING
            `, [studentId, name, title, desc, icon, color]);
        } catch (err) {
            console.error("Error inserting student badge:", err);
        }
    };

    try {
        // 1. First Login Badge
        const loginCountRes = await pool.query("SELECT COUNT(*)::int FROM login_history WHERE student_id = $1", [studentId]);
        if (loginCountRes.rows[0].count > 0) {
            await awardBadge(
                'first_login', 'First Steps', 'Started the OOP learning path', '🔑',
                'bg-sky-50 text-sky-700 border border-sky-100'
            );
        }

        // 2. Complete 5 Lessons Badge
        const completedCountRes = await pool.query("SELECT COUNT(*)::int FROM lesson_progress WHERE student_id = $1 AND completed = TRUE", [studentId]);
        const completedCount = completedCountRes.rows[0].count;
        if (completedCount >= 5) {
            await awardBadge(
                'lessons_5', 'OOP Apprentice', 'Completed 5 Java OOP lessons', '📚',
                'bg-emerald-50 text-emerald-805 border border-emerald-100'
            );
        }

        // 3. Complete All Lessons Badge
        if (completedCount >= 11) {
            await awardBadge(
                'lessons_all', 'OOP Master', 'Completed all 11 Java OOP lessons', '🎓',
                'bg-purple-50 text-purple-700 border border-purple-100'
            );
        }

        // 4. Pass 3 quizzes on first attempt
        const quizAttemptsRes = await pool.query(`
            SELECT COUNT(*)::int FROM quiz_attempts
            WHERE student_user_id = $1 AND attempt_number = 1 AND passed = TRUE
        `, [studentId]);
        if (quizAttemptsRes.rows[0].count >= 3) {
            await awardBadge(
                'quiz_first_3', 'Quick Thinker', 'Passed 3 quiz assessments on first attempt', '⚡',
                'bg-amber-50 text-amber-700 border border-amber-100'
            );
        }

        // 5. Perfect score on any quiz
        const perfectQuizRes = await pool.query(`
            SELECT COUNT(*)::int FROM quiz_attempts
            WHERE student_user_id = $1 AND score = total
        `, [studentId]);
        if (perfectQuizRes.rows[0].count > 0) {
            await awardBadge(
                'quiz_perfect', 'Perfect Score', 'Got 100% on any quiz assessment', '🎯',
                'bg-rose-50 text-rose-700 border border-rose-100'
            );
        }

        // 6. Complete a practice activity in less than 2 minutes
        const fastPracticeRes = await pool.query(`
            SELECT COUNT(*)::int FROM practice_results
            WHERE student_id = $1 AND completion_time_seconds <= 120 AND score >= 70
        `, [studentId]);
        if (fastPracticeRes.rows[0].count > 0) {
            await awardBadge(
                'speed_coder', 'Speed Coder', 'Completed a coding challenge in under 2 minutes', '🏎️',
                'bg-cyan-50 text-cyan-700 border border-cyan-100'
            );
        }
    } catch (err) {
        console.error("Error executing auto-badge checker:", err);
    }
};

const verifyLessonCompletion = async (studentId, lessonId) => {
    try {
        const videoRes = await pool.query(
            "SELECT completed FROM student_progress WHERE student_user_id = $1 AND video_id = $2",
            [studentId, lessonId]
        );
        const videoCompleted = videoRes.rows[0]?.completed || false;

        const quizRes = await pool.query(
            "SELECT passed FROM quiz_attempts WHERE student_user_id = $1 AND lesson_id = $2 AND passed = TRUE LIMIT 1",
            [studentId, lessonId]
        );
        const quizPassed = quizRes.rowCount > 0;

        const challengeRes = await pool.query(
            "SELECT id FROM programming_challenges WHERE lesson_id = $1 LIMIT 1",
            [lessonId]
        );
        let practiceCompleted = true;
        if (challengeRes.rowCount > 0) {
            const challengeId = challengeRes.rows[0].id;
            const practiceRes = await pool.query(
                "SELECT score FROM practice_submissions WHERE student_id = $1::text AND challenge_id = $2",
                [studentId, challengeId]
            );
            const score = Number(practiceRes.rows[0]?.score || 0);
            practiceCompleted = score >= 70;
        }

        const completed = videoCompleted && quizPassed && practiceCompleted;
        await pool.query(`
            INSERT INTO lesson_progress (student_id, lesson_id, video_completed, quiz_passed, practice_completed, completed, completed_at)
            VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 THEN NOW() ELSE NULL END)
            ON CONFLICT (student_id, lesson_id) DO UPDATE SET
              video_completed = EXCLUDED.video_completed,
              quiz_passed = EXCLUDED.quiz_passed,
              practice_completed = EXCLUDED.practice_completed,
              completed = EXCLUDED.completed,
              completed_at = CASE WHEN EXCLUDED.completed THEN NOW() ELSE lesson_progress.completed_at END,
              updated_at = NOW()
        `, [studentId, lessonId, videoCompleted, quizPassed, practiceCompleted, completed]);

        if (completed) {
            await logActivity(studentId, "lesson_complete", `Completed OOP Lesson: ${lessonId}`, { lessonId });

            const lessonInfo = await pool.query("SELECT module FROM lessons WHERE id = $1", [lessonId]);
            if (lessonInfo.rowCount > 0) {
                const moduleName = lessonInfo.rows[0].module;
                await checkModuleCompletion(studentId, moduleName);
            }

            await checkAndAwardBadges(studentId);
        }
    } catch (err) {
        console.error("Error verifying lesson completion:", err);
    }
};

app.get("/", (_req, res) => {
    res.send("Backend Running");
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok", backend: "Render", timestamp: new Date().toISOString() });
});

app.get("/api/test", async (_req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/auth/register", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const {
            name,
            email,
            password,
            role,
            studentNumber,
            course,
            yearLevel,
            section,
            employeeId,
            department,
            specialization,
            assignedCourses,
            termsVersion
        } = req.body || {};

        if (!name || String(name).trim().length < 3) {
            return res.status(400).json({ success: false, message: "Name must be at least 3 characters." });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
            return res.status(400).json({ success: false, message: "A valid email address is required." });
        }
        if (!password || String(password).length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
        }
        if (!["student", "teacher", "admin"].includes(role)) {
            return res.status(400).json({ success: false, message: "Role must be student, teacher, or admin." });
        }

        const existing = await findUserByEmail(email);
        if (existing) {
            return res.status(409).json({ success: false, message: "An account is already registered with this email address." });
        }

        await client.query("BEGIN");
        const passwordHash = await bcrypt.hash(password, 12);
        const computedUserId = buildUserId(email, role);
        const userResult = await client.query(`
            INSERT INTO users (user_id, name, email, password_hash, role, terms_agreement_accepted, terms_accepted_at, terms_version)
            VALUES ($1, $2, LOWER($3), $4, $5, TRUE, NOW(), $6)
            RETURNING *
        `, [computedUserId, String(name).trim(), email, passwordHash, role, termsVersion || "2026.06.26"]);
        const user = userResult.rows[0];

        if (role === "student") {
            await client.query(`
                INSERT INTO students (user_id, student_number, course, year_level, section, program_status)
                VALUES ($1, $2, $3, $4, $5, 'Regular')
            `, [user.id, studentNumber || computedUserId, course || "", yearLevel || "", section || ""]);
        }
        if (role === "teacher") {
            await client.query(`
                INSERT INTO teachers (user_id, employee_id, department, specialization, assigned_courses)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                user.id,
                employeeId || computedUserId,
                department || "College of Computer Studies",
                specialization || "Object-Oriented Programming",
                assignedCourses || "OOP 101, Advanced Java"
            ]);
        }
        await client.query(`
            INSERT INTO user_terms_agreements (user_id, accepted, version, user_role, ip_address)
            VALUES ($1, TRUE, $2, $3, $4)
        `, [user.id, termsVersion || "2026.06.26", role, req.ip]);
        await client.query("COMMIT");

        const fullUser = await findUserById(user.id);
        const token = signToken(fullUser);
        res.status(201).json({ success: true, message: "Account registered successfully.", token, user: toClientUser(fullUser) });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
});

app.post("/api/auth/login", async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }
        const user = await findUserByEmail(email);
        if (!user) return res.status(401).json({ success: false, message: "Invalid email or password." });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, message: "Invalid email or password." });

        const token = signToken(user);
        res.json({ success: true, message: "Login successful.", token, user: toClientUser(user) });
    } catch (error) {
        next(error);
    }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
    try {
        const user = await findUserById(req.authUser.id);
        res.json({ success: true, user: toClientUser(user) });
    } catch (error) {
        next(error);
    }
});

app.get("/api/users", requireAuth, requireRole(["admin", "teacher"]), async (_req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
                   t.employee_id, t.department, t.specialization, t.assigned_courses,
                   a.admin_id, a.system_role, a.access_level
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN teachers t ON t.user_id = u.id
            LEFT JOIN admins a ON a.user_id = u.id
            ORDER BY u.created_at DESC
        `);
        res.json({ success: true, data: result.rows.map(toClientUser) });
    } catch (error) {
        next(error);
    }
});

app.put("/api/users/:id", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role !== "admin" && req.authUser.id !== req.params.id) {
            return res.status(403).json({ success: false, message: "You can only update your own profile." });
        }
        const updates = req.body || {};
        await pool.query(`
            UPDATE users SET
              name = COALESCE($2, name),
              contact_number = COALESCE($3, contact_number),
              address = COALESCE($4, address),
              date_of_birth = COALESCE($5, date_of_birth),
              online_status = COALESCE($6, online_status),
              avatar = COALESCE($7, avatar),
              updated_at = NOW()
            WHERE id = $1
        `, [req.params.id, updates.name, updates.contactNumber, updates.address, updates.dateOfBirth, updates.onlineStatus, updates.avatar]);
        const user = await findUserById(req.params.id);
        res.json({ success: true, data: toClientUser(user) });
    } catch (error) {
        next(error);
    }
});

app.get("/api/admin/overview", requireAuth, requireRole(["admin"]), async (_req, res, next) => {
    try {
        const [students, teachers, lectures, assessments, activities, recent] = await Promise.all([
            pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'"),
            pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'teacher'"),
            pool.query("SELECT COUNT(*)::int AS count FROM lessons"),
            pool.query("SELECT COUNT(*)::int AS count FROM assessments"),
            pool.query("SELECT COUNT(*)::int AS count FROM programming_challenges"),
            pool.query(`
                SELECT activity, created_at FROM (
                  SELECT name || ' registered as ' || role::text AS activity, created_at FROM users
                  UNION ALL
                  SELECT 'Lecture updated: ' || title AS activity, updated_at AS created_at FROM lessons
                  UNION ALL
                  SELECT 'Quiz updated: ' || title AS activity, updated_at AS created_at FROM assessments
                  UNION ALL
                  SELECT 'Practice activity updated: ' || title AS activity, updated_at AS created_at FROM programming_challenges
                  UNION ALL
                  SELECT 'Quiz attempt submitted for ' || assessment_id AS activity, date_completed AS created_at FROM quiz_attempts
                  UNION ALL
                  SELECT 'Practice submission received for ' || challenge_id AS activity, submitted_at AS created_at FROM practice_submissions
                ) events
                ORDER BY created_at DESC
                LIMIT 10
            `)
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    totalStudents: students.rows[0].count,
                    totalTeachers: teachers.rows[0].count,
                    totalLectures: lectures.rows[0].count,
                    totalAssessments: assessments.rows[0].count,
                    totalPracticeActivities: activities.rows[0].count
                },
                recentActivities: recent.rows
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/lessons", async (_req, res, next) => {
    try {
        const result = await pool.query("SELECT * FROM lessons ORDER BY sequence, title");
        res.json({ success: true, data: result.rows.map(toClientLesson) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/lessons", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    try {
        const body = req.body || {};
        const id = cleanText(body.id || `lesson_${Date.now()}`, 120);
        const title = cleanText(body.title || body.lessonTitle || "", 255);
        if (!title) return res.status(400).json({ success: false, message: "Lesson title is required." });
        const objectives = Array.isArray(body.learningObjectives)
            ? body.learningObjectives.slice(0, 20)
            : String(body.learningObjectives || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);

        const result = await pool.query(`
            INSERT INTO lessons (id, title, module, sequence, duration, video_url, description, learning_objectives, status, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)
            RETURNING *
        `, [
            id,
            title,
            cleanText(body.module || "", 255),
            Math.floor(clampNumber(body.sequence ?? body.lessonOrder ?? 0, 0, 10000)),
            cleanText(body.duration || "", 40),
            cleanText(body.videoUrl || body.video_url || "", 2000),
            cleanText(body.description || "", 5000),
            JSON.stringify(objectives),
            cleanText(body.status || "Draft", 40),
            JSON.stringify(body.metadata && typeof body.metadata === "object" ? body.metadata : {})
        ]);
        res.status(201).json({ success: true, data: toClientLesson(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.put("/api/lessons/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    try {
        const body = req.body || {};
        const objectives = Array.isArray(body.learningObjectives)
            ? body.learningObjectives.slice(0, 20)
            : body.learningObjectives === undefined
                ? undefined
                : String(body.learningObjectives || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);

        const result = await pool.query(`
            UPDATE lessons SET
              title = COALESCE($2, title),
              module = COALESCE($3, module),
              sequence = COALESCE($4, sequence),
              duration = COALESCE($5, duration),
              video_url = COALESCE($6, video_url),
              description = COALESCE($7, description),
              learning_objectives = COALESCE($8::jsonb, learning_objectives),
              status = COALESCE($9, status),
              metadata = COALESCE($10::jsonb, metadata),
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [
            req.params.id,
            body.title === undefined && body.lessonTitle === undefined ? null : cleanText(body.title || body.lessonTitle || "", 255),
            body.module === undefined ? null : cleanText(body.module || "", 255),
            body.sequence === undefined && body.lessonOrder === undefined ? null : Math.floor(clampNumber(body.sequence ?? body.lessonOrder, 0, 10000)),
            body.duration === undefined ? null : cleanText(body.duration || "", 40),
            body.videoUrl === undefined && body.video_url === undefined ? null : cleanText(body.videoUrl || body.video_url || "", 2000),
            body.description === undefined ? null : cleanText(body.description || "", 5000),
            objectives === undefined ? null : JSON.stringify(objectives),
            body.status === undefined ? null : cleanText(body.status || "Draft", 40),
            body.metadata === undefined ? null : JSON.stringify(body.metadata && typeof body.metadata === "object" ? body.metadata : {})
        ]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Lecture not found." });
        res.json({ success: true, data: toClientLesson(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/lessons/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    try {
        const result = await pool.query("DELETE FROM lessons WHERE id = $1 RETURNING id", [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Lecture not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/api/assessments", requireAuth, async (_req, res, next) => {
    try {
        const result = await pool.query("SELECT * FROM assessments ORDER BY updated_at DESC, title");
        res.json({ success: true, data: result.rows.map(toClientAssessment) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/assessments", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    try {
        const body = req.body || {};
        const id = cleanText(body.id || `quiz_${Date.now()}`, 120);
        const title = cleanText(body.title || "", 255);
        const lessonId = cleanText(body.lessonId || body.lesson_id || "", 120);
        if (!title || !lessonId) return res.status(400).json({ success: false, message: "Quiz title and lesson are required." });
        const result = await pool.query(`
            INSERT INTO assessments (id, lesson_id, title, quiz_type, passing_score, attempts, questions, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
            RETURNING *
        `, [
            id,
            lessonId,
            title,
            cleanText(body.quizType || "Multiple Choice", 80),
            clampNumber(body.passingScore ?? body.passing_score ?? 70, 0, 100),
            Math.floor(clampNumber(body.attempts ?? 1, 1, 100)),
            JSON.stringify(Array.isArray(body.questions) ? body.questions : []),
            cleanText(body.status || "Draft", 40),
            req.authUser.id
        ]);
        res.status(201).json({ success: true, data: toClientAssessment(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.put("/api/assessments/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    try {
        const body = req.body || {};
        const result = await pool.query(`
            UPDATE assessments SET
              lesson_id = COALESCE($2, lesson_id),
              title = COALESCE($3, title),
              quiz_type = COALESCE($4, quiz_type),
              passing_score = COALESCE($5, passing_score),
              attempts = COALESCE($6, attempts),
              questions = COALESCE($7::jsonb, questions),
              status = COALESCE($8, status),
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [
            req.params.id,
            body.lessonId === undefined && body.lesson_id === undefined ? null : cleanText(body.lessonId || body.lesson_id || "", 120),
            body.title === undefined ? null : cleanText(body.title || "", 255),
            body.quizType === undefined ? null : cleanText(body.quizType || "", 80),
            body.passingScore === undefined && body.passing_score === undefined ? null : clampNumber(body.passingScore ?? body.passing_score, 0, 100),
            body.attempts === undefined ? null : Math.floor(clampNumber(body.attempts, 1, 100)),
            body.questions === undefined ? null : JSON.stringify(Array.isArray(body.questions) ? body.questions : []),
            body.status === undefined ? null : cleanText(body.status || "Draft", 40)
        ]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Quiz not found." });
        res.json({ success: true, data: toClientAssessment(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/assessments/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    try {
        const result = await pool.query("DELETE FROM assessments WHERE id = $1 RETURNING id", [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Quiz not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/lessons", async (_req, res, next) => {
    try {
        const result = await pool.query("SELECT * FROM lessons ORDER BY sequence, title");
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

app.get("/api/progress/:studentId", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role === "student" && req.authUser.id !== req.params.studentId) {
            return res.status(403).json({ success: false, message: "Students can only view their own progress." });
        }
        const result = await pool.query(
            "SELECT * FROM student_progress WHERE student_user_id = $1 ORDER BY updated_at DESC",
            [req.params.studentId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

app.put("/api/progress", requireAuth, async (req, res, next) => {
    try {
        const { videoId, lastPosition = 0, completionPercentage = 0, completed = false, notes = "" } = req.body || {};
        if (!videoId) return res.status(400).json({ success: false, message: "videoId is required." });
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can update lesson progress." });
        }

        const safeVideoId = cleanText(videoId, 120);
        const safeLastPosition = clampNumber(lastPosition, 0, 60 * 60 * 6);
        const safeCompletionPercentage = clampNumber(completionPercentage, 0, 100);
        const safeCompleted = Boolean(completed) && safeCompletionPercentage >= 95;
        const safeNotes = cleanText(notes, 5000);

        const result = await pool.query(`
            INSERT INTO student_progress (student_user_id, video_id, last_position, completion_percentage, completed, date_completed, notes)
            VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN NOW() ELSE NULL END, $6)
            ON CONFLICT (student_user_id, video_id) DO UPDATE SET
              last_position = EXCLUDED.last_position,
              completion_percentage = GREATEST(student_progress.completion_percentage, EXCLUDED.completion_percentage),
              completed = student_progress.completed OR EXCLUDED.completed,
              date_completed = CASE
                WHEN student_progress.completed THEN student_progress.date_completed
                WHEN EXCLUDED.completed THEN NOW()
                ELSE student_progress.date_completed
              END,
              notes = EXCLUDED.notes,
              updated_at = NOW()
            RETURNING *
        `, [req.authUser.id, safeVideoId, safeLastPosition, safeCompletionPercentage, safeCompleted, safeNotes]);

        // Get lesson duration
        const durationRes = await pool.query("SELECT duration FROM lessons WHERE id = $1", [safeVideoId]);
        let durationSeconds = 0;
        if (durationRes.rowCount > 0 && durationRes.rows[0].duration) {
            const parts = durationRes.rows[0].duration.split(':').map(Number);
            if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1];
            else if (parts.length === 3) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        // Insert into video_progress
        await pool.query(`
            INSERT INTO video_progress (student_id, lesson_id, current_time, duration, watch_percentage, completed)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (student_id, lesson_id) DO UPDATE SET
              current_time = EXCLUDED.current_time,
              duration = EXCLUDED.duration,
              watch_percentage = GREATEST(video_progress.watch_percentage, EXCLUDED.watch_percentage),
              completed = video_progress.completed OR EXCLUDED.completed,
              updated_at = NOW()
        `, [req.authUser.id, safeVideoId, safeLastPosition, durationSeconds, safeCompletionPercentage, safeCompleted]);

        if (safeCompleted) {
            await awardXP(req.authUser.id, 20, `Video Completion: ${safeVideoId}`);
        }
        await verifyLessonCompletion(req.authUser.id, safeVideoId);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/api/quiz-attempts/:studentId", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role === "student" && req.authUser.id !== req.params.studentId) {
            return res.status(403).json({ success: false, message: "Students can only view their own quiz attempts." });
        }
        const result = await pool.query(`
            SELECT DISTINCT ON (assessment_id) *
            FROM quiz_attempts
            WHERE student_user_id = $1
            ORDER BY assessment_id, attempt_number DESC, date_completed DESC
        `, [req.params.studentId]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

app.post("/api/quiz-attempts", requireAuth, async (req, res, next) => {
    try {
        const {
            assessmentId,
            lessonId = "",
            score = 0,
            total = 0,
            percentage = 0,
            correctAnswers = 0,
            incorrectAnswers = 0,
            passed = false,
            attemptNumber = 1,
            answers = {},
            dateCompleted
        } = req.body || {};

        if (!assessmentId) return res.status(400).json({ success: false, message: "assessmentId is required." });
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can submit quiz attempts." });
        }

        const safeTotal = Math.max(1, Math.floor(clampNumber(total, 1, 100)));
        const safeScore = Math.floor(clampNumber(score, 0, safeTotal));
        const computedPercentage = Math.round((safeScore / safeTotal) * 100);
        const safeCorrectAnswers = Math.floor(clampNumber(correctAnswers, 0, safeTotal));
        const safeIncorrectAnswers = Math.floor(clampNumber(incorrectAnswers, 0, safeTotal));
        const safeAttemptNumber = Math.max(1, Math.floor(clampNumber(attemptNumber, 1, 1000)));
        const safeAnswers = answers && typeof answers === "object" && !Array.isArray(answers) ? answers : {};

        const result = await pool.query(`
            INSERT INTO quiz_attempts (
              student_user_id, assessment_id, lesson_id, score, total, percentage,
              correct_answers, incorrect_answers, passed, attempt_number, answers, date_completed
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, COALESCE($12::timestamptz, NOW()))
            RETURNING *
        `, [
            req.authUser.id,
            cleanText(assessmentId, 120),
            cleanText(lessonId, 120),
            safeScore,
            safeTotal,
            computedPercentage,
            safeCorrectAnswers,
            safeIncorrectAnswers,
            Boolean(passed) && computedPercentage >= 70,
            safeAttemptNumber,
            JSON.stringify(safeAnswers),
            dateCompleted || null
        ]);

        const safeAssessmentId = cleanText(assessmentId, 120);
        const safeLessonId = cleanText(lessonId, 120);
        const isPassedNow = Boolean(passed) && computedPercentage >= 70;

        // Award completion and pass XP
        await awardXP(req.authUser.id, 30, `Quiz Completion: ${safeAssessmentId}`);
        if (isPassedNow) {
            await awardXP(req.authUser.id, 50, `Quiz Pass: ${safeAssessmentId}`);
        }

        // Log activity
        await logActivity(req.authUser.id, "quiz_attempt", `Submitted quiz for ${safeLessonId || safeAssessmentId} with score ${safeScore}/${safeTotal}`, {
            assessmentId: safeAssessmentId,
            lessonId: safeLessonId,
            score: safeScore,
            total: safeTotal,
            passed: isPassedNow,
            attemptNumber: safeAttemptNumber
        });

        // Verify lesson completion
        if (safeLessonId) {
            await verifyLessonCompletion(req.authUser.id, safeLessonId);
        }

        // Check badges
        await checkAndAwardBadges(req.authUser.id);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/api/recommendations", requireAuth, async (req, res, next) => {
    try {
        const requestedStudentId = cleanText(req.query.studentId || "", 120);
        const params = [];
        let where = "";

        if (req.authUser.role === "student") {
            params.push(req.authUser.id, req.authUser.userId, req.authUser.email);
            where = "WHERE student_id IN ($1, $2, $3)";
        } else if (requestedStudentId) {
            params.push(requestedStudentId);
            where = "WHERE student_id = $1";
        }

        const result = await pool.query(`
            SELECT *
            FROM recommendation_history
            ${where}
            ORDER BY generated_at DESC
            LIMIT 200
        `, params);
        res.json({ success: true, data: result.rows.map(toClientRecommendation) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/recommendations", requireAuth, async (req, res, next) => {
    try {
        const recommendation = req.body || {};
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can generate adaptive recommendations." });
        }

        const type = recommendation.type;
        const trigger = recommendation.trigger;
        if (!["Remedial", "Continue", "Advanced"].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid recommendation type." });
        }
        if (!["Video Completion", "Quiz Score", "Coding Score", "Lesson Completion"].includes(trigger)) {
            return res.status(400).json({ success: false, message: "Invalid recommendation trigger." });
        }

        const result = await pool.query(`
            INSERT INTO recommendation_history (
              id, student_id, student_name, lesson_id, lesson_title, current_topic,
              recommendation_type, trigger_event, reason, title, summary, actions,
              primary_action_label, target_view, quiz_score, coding_score,
              video_completed, lesson_completed, quiz_attempts, coding_attempts,
              progress_percentage, status, generated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11, $12::jsonb,
              $13, $14, $15, $16,
              $17, $18, $19, $20,
              $21, $22, COALESCE($23::timestamptz, NOW())
            )
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              summary = EXCLUDED.summary
            RETURNING *
        `, [
            cleanText(recommendation.id || `rec_${Date.now()}`, 160),
            cleanText(recommendation.studentId || req.authUser.id, 160),
            cleanText(recommendation.studentName || "", 255),
            cleanText(recommendation.lessonId || "", 120),
            cleanText(recommendation.lessonTitle || "", 255),
            cleanText(recommendation.currentTopic || "", 255),
            type,
            trigger,
            cleanText(recommendation.reason || "", 500),
            cleanText(recommendation.title || "", 255),
            cleanText(recommendation.summary || "", 1000),
            JSON.stringify(Array.isArray(recommendation.actions) ? recommendation.actions.slice(0, 10) : []),
            cleanText(recommendation.primaryActionLabel || "", 120),
            cleanText(recommendation.targetView || "dashboard", 40),
            recommendation.quizScore === undefined ? null : clampNumber(recommendation.quizScore, 0, 100),
            recommendation.codingScore === undefined ? null : clampNumber(recommendation.codingScore, 0, 100),
            Boolean(recommendation.videoCompleted),
            Boolean(recommendation.lessonCompleted),
            recommendation.quizAttempts === undefined ? null : Math.floor(clampNumber(recommendation.quizAttempts, 0, 1000)),
            recommendation.codingAttempts === undefined ? null : Math.floor(clampNumber(recommendation.codingAttempts, 0, 1000)),
            recommendation.progressPercentage === undefined ? null : clampNumber(recommendation.progressPercentage, 0, 100),
            ["Pending", "Completed"].includes(recommendation.status) ? recommendation.status : "Pending",
            recommendation.generatedDate || null
        ]);
        res.status(201).json({ success: true, data: toClientRecommendation(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.patch("/api/recommendations/:id/complete", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(`
            UPDATE recommendation_history
            SET status = 'Completed', completed_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Recommendation not found." });
        res.json({ success: true, data: toClientRecommendation(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.get("/api/practice-challenges", requireAuth, async (_req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT c.*, COALESCE(json_agg(t.*) FILTER (WHERE t.id IS NOT NULL), '[]') AS test_cases
            FROM programming_challenges c
            LEFT JOIN challenge_test_cases t ON t.challenge_id = c.id
            GROUP BY c.id
            ORDER BY c.id
        `);
        res.json({ success: true, data: result.rows.map(toClientPracticeChallenge) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/practice-challenges", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    const client = await pool.connect();
    try {
        const body = req.body || {};
        const id = cleanText(body.id || `practice_${Date.now()}`, 120);
        const title = cleanText(body.title || "", 255);
        if (!title) return res.status(400).json({ success: false, message: "Activity title is required." });
        await client.query("BEGIN");
        const result = await client.query(`
            INSERT INTO programming_challenges (
              id, topic_id, lesson_id, title, description, learning_objectives,
              requirements, starter_code, sample_input, sample_output, passing_score, status, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            id,
            cleanText(body.topicId || body.topic_id || "oop", 120),
            cleanText(body.lessonId || body.lesson_id || "", 120),
            title,
            cleanText(body.description || body.instructions || "", 5000),
            JSON.stringify(Array.isArray(body.learningObjectives) ? body.learningObjectives : []),
            JSON.stringify(Array.isArray(body.requirements) ? body.requirements : []),
            String(body.starterCode || body.starter_code || "").slice(0, 50000),
            String(body.sampleInput || body.sample_input || "").slice(0, 10000),
            String(body.sampleOutput || body.expectedOutput || body.sample_output || "").slice(0, 10000),
            clampNumber(body.passingScore ?? body.passing_score ?? 70, 0, 100),
            cleanText(body.status || "Draft", 40),
            req.authUser.id
        ]);

        const testCases = Array.isArray(body.testCases) ? body.testCases : [];
        for (const testCase of testCases.slice(0, 100)) {
            await client.query(`
                INSERT INTO challenge_test_cases (id, challenge_id, input, expected_output, is_hidden, matcher)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                cleanText(testCase.id || `case_${Date.now()}_${Math.random().toString(36).slice(2)}`, 120),
                id,
                String(testCase.input || "").slice(0, 10000),
                String(testCase.expectedOutput || testCase.expected_output || "").slice(0, 10000),
                testCase.isHidden !== undefined ? Boolean(testCase.isHidden) : true,
                cleanText(testCase.matcher || "", 120)
            ]);
        }

        await client.query("COMMIT");
        res.status(201).json({ success: true, data: toClientPracticeChallenge({ ...result.rows[0], test_cases: testCases }) });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
});

app.put("/api/practice-challenges/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    const client = await pool.connect();
    try {
        const body = req.body || {};
        await client.query("BEGIN");
        const result = await client.query(`
            UPDATE programming_challenges SET
              topic_id = COALESCE($2, topic_id),
              lesson_id = COALESCE($3, lesson_id),
              title = COALESCE($4, title),
              description = COALESCE($5, description),
              learning_objectives = COALESCE($6::jsonb, learning_objectives),
              requirements = COALESCE($7::jsonb, requirements),
              starter_code = COALESCE($8, starter_code),
              sample_input = COALESCE($9, sample_input),
              sample_output = COALESCE($10, sample_output),
              passing_score = COALESCE($11, passing_score),
              status = COALESCE($12, status),
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [
            req.params.id,
            body.topicId === undefined && body.topic_id === undefined ? null : cleanText(body.topicId || body.topic_id || "", 120),
            body.lessonId === undefined && body.lesson_id === undefined ? null : cleanText(body.lessonId || body.lesson_id || "", 120),
            body.title === undefined ? null : cleanText(body.title || "", 255),
            body.description === undefined && body.instructions === undefined ? null : cleanText(body.description || body.instructions || "", 5000),
            body.learningObjectives === undefined ? null : JSON.stringify(Array.isArray(body.learningObjectives) ? body.learningObjectives : []),
            body.requirements === undefined ? null : JSON.stringify(Array.isArray(body.requirements) ? body.requirements : []),
            body.starterCode === undefined && body.starter_code === undefined ? null : String(body.starterCode || body.starter_code || "").slice(0, 50000),
            body.sampleInput === undefined && body.sample_input === undefined ? null : String(body.sampleInput || body.sample_input || "").slice(0, 10000),
            body.sampleOutput === undefined && body.expectedOutput === undefined && body.sample_output === undefined ? null : String(body.sampleOutput || body.expectedOutput || body.sample_output || "").slice(0, 10000),
            body.passingScore === undefined && body.passing_score === undefined ? null : clampNumber(body.passingScore ?? body.passing_score, 0, 100),
            body.status === undefined ? null : cleanText(body.status || "Draft", 40)
        ]);
        if (!result.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Practice activity not found." });
        }
        if (Array.isArray(body.testCases)) {
            await client.query("DELETE FROM challenge_test_cases WHERE challenge_id = $1", [req.params.id]);
            for (const testCase of body.testCases.slice(0, 100)) {
                await client.query(`
                    INSERT INTO challenge_test_cases (id, challenge_id, input, expected_output, is_hidden, matcher)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    cleanText(testCase.id || `case_${Date.now()}_${Math.random().toString(36).slice(2)}`, 120),
                    req.params.id,
                    String(testCase.input || "").slice(0, 10000),
                    String(testCase.expectedOutput || testCase.expected_output || "").slice(0, 10000),
                    testCase.isHidden !== undefined ? Boolean(testCase.isHidden) : true,
                    cleanText(testCase.matcher || "", 120)
                ]);
            }
        }
        await client.query("COMMIT");
        res.json({ success: true, data: toClientPracticeChallenge({ ...result.rows[0], test_cases: body.testCases || [] }) });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
});

app.delete("/api/practice-challenges/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res, next) => {
    try {
        const result = await pool.query("DELETE FROM programming_challenges WHERE id = $1 RETURNING id", [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Practice activity not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/api/admin/monitoring", requireAuth, requireRole(["admin", "teacher"]), async (_req, res, next) => {
    try {
        const [students, teachers] = await Promise.all([
            pool.query(`
                SELECT
                  u.id, u.name, u.email, u.account_status, s.student_number, s.course, s.year_level,
                  COALESCE(ROUND(AVG(sp.completion_percentage)), 0) AS progress,
                  COALESCE(ROUND(AVG(qa.percentage)), 0) AS quiz_average,
                  COALESCE(ROUND(AVG(ps.score)), 0) AS programming_score
                FROM users u
                JOIN students s ON s.user_id = u.id
                LEFT JOIN student_progress sp ON sp.student_user_id = u.id
                LEFT JOIN quiz_attempts qa ON qa.student_user_id = u.id
                LEFT JOIN practice_submissions ps ON ps.student_id IN (u.id::text, u.user_id, u.email)
                WHERE u.role = 'student'
                GROUP BY u.id, s.student_number, s.course, s.year_level
                ORDER BY u.created_at DESC
            `),
            pool.query(`
                SELECT u.id, u.name, u.email, u.account_status, t.employee_id, t.department
                FROM users u
                JOIN teachers t ON t.user_id = u.id
                WHERE u.role = 'teacher'
                ORDER BY u.created_at DESC
            `)
        ]);
        res.json({ success: true, data: { students: students.rows, teachers: teachers.rows } });
    } catch (error) {
        next(error);
    }
});

app.get("/api/admin/reports", requireAuth, requireRole(["admin"]), async (_req, res, next) => {
    try {
        const [studentProgress, quizReport, practiceReport, completionReport] = await Promise.all([
            pool.query(`
                SELECT u.name, u.email, s.student_number, s.course, s.year_level,
                       COALESCE(ROUND(AVG(sp.completion_percentage)), 0) AS progress
                FROM users u
                JOIN students s ON s.user_id = u.id
                LEFT JOIN student_progress sp ON sp.student_user_id = u.id
                WHERE u.role = 'student'
                GROUP BY u.id, s.student_number, s.course, s.year_level
                ORDER BY u.name
            `),
            pool.query(`
                SELECT assessment_id, lesson_id, COUNT(*)::int AS attempts,
                       COALESCE(ROUND(AVG(percentage)), 0) AS average_score,
                       COALESCE(MAX(percentage), 0) AS highest_score
                FROM quiz_attempts
                GROUP BY assessment_id, lesson_id
                ORDER BY assessment_id
            `),
            pool.query(`
                SELECT pc.title, COUNT(ps.id)::int AS submissions,
                       COALESCE(ROUND(AVG(ps.score)), 0) AS average_score
                FROM programming_challenges pc
                LEFT JOIN practice_submissions ps ON ps.challenge_id = pc.id
                GROUP BY pc.id
                ORDER BY pc.title
            `),
            pool.query(`
                SELECT l.id, l.title, l.module, COUNT(sp.id)::int AS started,
                       COUNT(*) FILTER (WHERE sp.completed)::int AS completed
                FROM lessons l
                LEFT JOIN student_progress sp ON sp.video_id = l.id
                GROUP BY l.id
                ORDER BY l.sequence, l.title
            `)
        ]);
        res.json({
            success: true,
            data: {
                studentProgress: studentProgress.rows,
                quizReport: quizReport.rows,
                practiceReport: practiceReport.rows,
                lessonCompletionReport: completionReport.rows
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/practice-submissions", requireAuth, requireRole(["teacher", "admin"]), async (_req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT ps.*, pc.title AS challenge_title, pc.topic_id, pc.lesson_id
            FROM practice_submissions ps
            JOIN programming_challenges pc ON pc.id = ps.challenge_id
            ORDER BY ps.submitted_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

app.get("/api/practice-submissions/me", requireAuth, requireRole(["student"]), async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT ps.*, pc.title AS challenge_title, pc.topic_id, pc.lesson_id
            FROM practice_submissions ps
            JOIN programming_challenges pc ON pc.id = ps.challenge_id
            WHERE ps.student_id = $1
            ORDER BY ps.submitted_at DESC
        `, [req.authUser.id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

app.post("/api/practice-submissions", requireAuth, requireRole(["student"]), async (req, res, next) => {
    try {
        const {
            challengeId,
            sourceCode,
            programOutput = "",
            compileStatus = "not_run",
            runtime = 0,
            memoryUsage = null,
            score = 0,
            errorMessage = "",
            testResults = []
        } = req.body || {};

        if (!challengeId || !sourceCode) {
            return res.status(400).json({ success: false, message: "challengeId and sourceCode are required." });
        }

        const existing = await pool.query(
            "SELECT id, is_locked FROM practice_submissions WHERE student_id = $1 AND challenge_id = $2",
            [req.authUser.id, cleanText(challengeId, 120)]
        );
        if (existing.rows[0]?.is_locked) {
            return res.status(409).json({ success: false, message: "This challenge has already been submitted." });
        }

        const result = await pool.query(`
            INSERT INTO practice_submissions (
              student_id, challenge_id, source_code, program_output, compile_status,
              runtime, memory_usage, score, error_message, test_results, is_locked
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, TRUE)
            ON CONFLICT (student_id, challenge_id) DO UPDATE SET
              source_code = EXCLUDED.source_code,
              program_output = EXCLUDED.program_output,
              compile_status = EXCLUDED.compile_status,
              runtime = EXCLUDED.runtime,
              memory_usage = EXCLUDED.memory_usage,
              score = EXCLUDED.score,
              error_message = EXCLUDED.error_message,
              test_results = EXCLUDED.test_results,
              submitted_at = NOW(),
              is_locked = TRUE
            RETURNING *
        `, [
            req.authUser.id,
            cleanText(challengeId, 120),
            String(sourceCode).slice(0, 50000),
            String(programOutput).slice(0, 20000),
            ["success", "failed", "runtime_error", "not_run"].includes(compileStatus) ? compileStatus : "not_run",
            clampNumber(runtime, 0, 30000),
            memoryUsage === null ? null : clampNumber(memoryUsage, 0, 4096),
            clampNumber(score, 0, 100),
            String(errorMessage).slice(0, 20000),
            JSON.stringify(Array.isArray(testResults) ? testResults : [])
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.patch("/api/practice-submissions/:id/reopen", requireAuth, requireRole(["teacher", "admin"]), async (req, res, next) => {
    try {
        const result = await pool.query(`
            UPDATE practice_submissions
            SET is_locked = FALSE
            WHERE id = $1
            RETURNING *
        `, [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Submission not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/hello", (_req, res) => {
    res.send("Hello World");
});

app.use((err, _req, res, _next) => {
    console.error(err);
    const message = err.code === "23505"
        ? "A record with the same unique value already exists."
        : err.message || "Internal server error.";
    res.status(err.status || 500).json({ success: false, message });
});

const PORT = process.env.PORT || 5000;

initializeDatabase()
    .then(async () => {
        try {
            await seedDemoUsers();
            await seedLessons();
            await seedPracticeChallenges();
            console.log("Database seeded successfully.");
        } catch (seedErr) {
            console.error("Database seeding failed:", seedErr);
        }

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("PostgreSQL initialization failed");
        console.error(err);
        process.exit(1);
    });
