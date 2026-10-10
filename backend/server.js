require("dotenv").config();

const bcrypt = require("bcrypt");
const cors = require("cors");
const express = require("express");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { OOP_PARSED_QUESTIONS } = require("./questionBank");
const { ACTIVE_OOP_PRACTICE_CHALLENGES, ACTIVE_OOP_PRACTICE_IDS } = require("./oopPracticeCatalog");
const { validateBasicJavaStructure } = require("./basicJavaValidator");
const { getJavaToolchainDiagnostics } = require("./javaToolchain");
const { normalizeAssessmentPercentage, isPassingAssessment } = require("./assessmentValidation");
const { assessmentMatchesLesson } = require("./assessmentEligibility");
const execFileAsync = promisify(execFile);

const app = express();
const PRACTICE_CHALLENGES = ACTIVE_OOP_PRACTICE_CHALLENGES;

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsMiddleware = cors({
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
});
app.use(corsMiddleware);
app.options(/.*/, corsMiddleware);
app.use(express.json({ limit: "10mb" }));

const notificationStreams = new Map();

const sendNotificationEvent = (userId, notification) => {
    const clients = notificationStreams.get(String(userId));
    if (!clients) return;
    const payload = "data: " + JSON.stringify({ type: "notification", notification }) + "\n\n";
    for (const client of clients) client.write(payload);
};

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const isProduction = process.env.NODE_ENV === "production";
const ASSESSMENT_PASSING_SCORE = 60;
const VIDEO_COMPLETION_THRESHOLD = 95;
const MAX_ASSESSMENT_ATTEMPTS = 3;
let practiceSubmissionKeyColumn = "id";

const insertCappedAssessmentAttempt = async ({ studentId, assessmentId, storage, fallbackAttemptNumber = 1, insertQuery, buildParams, beforeInsert }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [String(studentId) + ":" + String(assessmentId)]);
        const attemptTable = storage === "swing" ? "swing_quiz_attempts" : "quiz_attempts";
        const studentColumn = storage === "swing" ? "student_id" : "student_user_id";
        const countResult = await client.query("SELECT COUNT(*)::int AS attempt_count, COALESCE(MAX(attempt_number), 0)::int AS max_attempt FROM " + attemptTable + " WHERE " + studentColumn + " = $1 AND assessment_id = $2", [studentId, assessmentId]);
        const attemptCount = Number(countResult.rows[0]?.attempt_count || 0);
        if (attemptCount >= MAX_ASSESSMENT_ATTEMPTS) {
            await client.query("ROLLBACK");
            return { limited: true, attemptCount };
        }
        const attemptNumber = Math.max(Number(fallbackAttemptNumber || 1), Number(countResult.rows[0]?.max_attempt || 0) + 1);
        if (beforeInsert) await beforeInsert(client);
        const inserted = await client.query(insertQuery, buildParams(attemptNumber));
        await client.query("COMMIT");
        return { limited: false, attemptCount: attemptCount + 1, attemptNumber, row: inserted.rows[0] };
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        throw error;
    } finally {
        client.release();
    }
};

const normalizedAssessmentPercentageSql = (alias = "qa") => `CASE
    WHEN ${alias}.percentage IS NULL THEN 0
    WHEN ${alias}.percentage BETWEEN 0 AND 1 AND ${alias}.total > 0
      THEN (${alias}.score::numeric / ${alias}.total::numeric) * 100
    ELSE ${alias}.percentage
  END`;


if (isProduction && JWT_SECRET === "change-this-secret") {
    throw new Error("JWT_SECRET must be configured in production.");
}

const clampNumber = (value, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.min(Math.max(parsed, min), max);
};

const evaluateJavaSubmission = async (challenge, sourceCode) => {
    const toolchain = await assertJavaToolchain();
    const validation = validateBasicJavaStructure(challenge, sourceCode);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "oophub-java-"));
    const sourcePath = path.join(tempDir, "Main.java");
    try {
        await fs.writeFile(sourcePath, String(sourceCode), "utf8");
        let compilerError = "";
        try {
            await execFileAsync(toolchain.javacPath, ["-encoding", "UTF-8", sourcePath], { timeout: 10000, windowsHide: true });
        } catch (error) {
            if (error.code === "ENOENT") {
                error.code = "JAVA_COMPILER_UNAVAILABLE";
                error.diagnostics = toolchain;
                throw error;
            }
            compilerError = String(error.stderr || error.stdout || error.message || "Java compilation failed.").trim();
        }
        if (compilerError) {
            const requirements = validation.requirements.map(item => (
                item.requirement === "Constructor detected" && /constructor .*cannot be applied|actual and formal argument lists differ/i.test(compilerError)
                    ? { ...item, passed: false, message: compilerError }
                    : item
            ));
            return {
                ...validation,
                requirements,
                oopStructureCheck: requirements.every(item => item.passed) ? "passed" : "needs_review",
                compilationCheck: "failed",
                compileStatus: "failed",
                evaluationStatus: "COMPILATION_FAILED",
                score: 0,
                passed: false,
                practiceCompleted: false,
                canRetry: true,
                editorLocked: false,
                compilerError,
                note: compilerError
            };
        }

        let programOutput = "";
        let runtimeError = "";
        try {
            const result =             await execFileAsync(toolchain.javaPath, ["-cp", tempDir, "Main"], { timeout: 10000, windowsHide: true });
            programOutput = String(result.stdout || "").trim();
        } catch (error) {
            if (error.code === "ENOENT") {
                error.code = "JAVA_COMPILER_UNAVAILABLE";
                error.diagnostics = toolchain;
                throw error;
            }
            runtimeError = String(error.stderr || error.stdout || error.message || "Java execution failed.").trim();
        }

        const expectedOutput = String(challenge?.sampleOutput || "").trim();
        const outputPassed = !runtimeError && (!expectedOutput || programOutput === expectedOutput);
        const requirementsPassed = validation.requirements.every(item => item.passed);
        const passed = outputPassed && requirementsPassed;
        const score = passed ? 100 : 0;
        return {
            ...validation,
            compilationCheck: "success",
            compileStatus: runtimeError ? "runtime_error" : "success",
            evaluationStatus: runtimeError ? "RUNTIME_FAILED" : (passed ? "PASSED" : "TEST_FAILED"),
            score,
            passed,
            practiceCompleted: passed,
            canRetry: !passed,
            editorLocked: passed,
            compilerError: runtimeError,
            programOutput,
            note: runtimeError || (outputPassed ? validation.note : `Expected output: ${expectedOutput}; received: ${programOutput || "(none)"}.`)
        };
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
};

const cleanText = (value, maxLength = 255) => String(value ?? "").trim().slice(0, maxLength);

const buildEvaluationResults = (validation, challenge) => [
    {
        id: "compilation",
        isHidden: false,
        passed: validation.compileStatus === "success",
        expectedOutput: "Compilation succeeds",
        actualOutput: validation.compileStatus === "success" ? "Compilation succeeds" : "",
        message: validation.compilerError || "javac compilation succeeded."
    },
    ...validation.requirements.map((item, index) => ({
        id: `static_${index + 1}`,
        isHidden: false,
        passed: item.passed,
        expectedOutput: item.requirement,
        actualOutput: item.passed ? item.requirement : "",
        message: item.message
    })),
    ...(validation.compileStatus === "success" && validation.programOutput !== undefined
        ? [{
            id: "output",
            isHidden: false,
            passed: validation.passed,
            expectedOutput: String(challenge?.sampleOutput || ""),
            actualOutput: validation.programOutput,
            message: validation.note
        }]
        : [])
];

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

const toClientNotification = (row) => ({
    id: row.id,
    recipientUserId: row.recipient_user_id,
    type: row.notification_type,
    title: row.title,
    message: row.message,
    timestamp: row.created_at,
    createdAt: row.created_at,
    isRead: row.is_read,
    readAt: row.read_at || undefined,
    relatedSubmissionId: row.related_submission_id || undefined,
    relatedPracticeId: row.related_practice_id || undefined,
    teacherId: row.teacher_id || undefined,
    teacherName: row.teacher_name || row.metadata?.teacherName || undefined,
    practiceTitle: row.practice_title || row.metadata?.practiceTitle || undefined,
    grade: row.grade === null || row.grade === undefined ? undefined : Number(row.grade),
    maxGrade: row.max_grade === null || row.max_grade === undefined ? undefined : Number(row.max_grade),
    feedback: row.feedback || row.metadata?.feedback || undefined,
    remedialRequired: row.remedial_required === null || row.remedial_required === undefined ? undefined : Boolean(row.remedial_required),
    metadata: row.metadata || {}
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveUserUuid = async (clientOrPool, identifier) => {
    if (!identifier) return null;
    const str = String(identifier).trim();
    if (UUID_REGEX.test(str)) {
        return str;
    }
    const res = await clientOrPool.query(
        "SELECT id FROM users WHERE id::text = $1 OR user_id = $1 OR LOWER(email) = LOWER($1) LIMIT 1",
        [str]
    );
    return res.rows[0]?.id || null;
};

const createOrUpdateNotification = async (client, payload) => {
    const recipientUserId = await resolveUserUuid(client, payload.recipientUserId);
    if (!recipientUserId) {
        console.warn(`[createOrUpdateNotification] Failed to resolve recipient user: ${payload.recipientUserId}`);
        return null;
    }

    const teacherId = payload.teacherId && UUID_REGEX.test(String(payload.teacherId).trim())
        ? String(payload.teacherId).trim()
        : null;

    const relatedSubmissionId = payload.relatedSubmissionId && UUID_REGEX.test(String(payload.relatedSubmissionId).trim())
        ? String(payload.relatedSubmissionId).trim()
        : null;

    const existing = await client.query(`
        SELECT id FROM notifications
        WHERE recipient_user_id = $1::uuid
          AND (
            ($3::uuid IS NOT NULL AND related_submission_id = $3::uuid)
            OR ($3::uuid IS NULL AND related_practice_id = $4::text AND created_at > NOW() - INTERVAL '1 day')
          )
          AND (
            notification_type = $2::text
            OR (
              $2::text IN ('submission_graded', 'submission_passed', 'remedial_required', 'practice_graded', 'practice_reviewed')
              AND notification_type IN ('submission_graded', 'submission_passed', 'remedial_required', 'practice_graded', 'practice_reviewed')
            )
          )
        LIMIT 1
    `, [recipientUserId, payload.type, relatedSubmissionId, payload.relatedPracticeId || null]);

    const values = [
        recipientUserId,
        payload.type,
        payload.title,
        payload.message,
        relatedSubmissionId,
        payload.relatedPracticeId || null,
        teacherId,
        payload.teacherName || null,
        payload.practiceTitle || null,
        payload.grade ?? null,
        payload.maxGrade ?? 100,
        payload.feedback || "",
        payload.remedialRequired ?? null,
        JSON.stringify(payload.metadata || {})
    ];

    const result = existing.rowCount
        ? await client.query(`
            UPDATE notifications
            SET notification_type = $1::text,
                title = $2::text,
                message = $3::text,
                related_practice_id = $4::text,
                teacher_id = $5::uuid,
                teacher_name = $6::text,
                practice_title = $7::text,
                grade = $8::numeric,
                max_grade = $9::numeric,
                feedback = $10::text,
                remedial_required = $11::boolean,
                metadata = $12::jsonb,
                is_read = FALSE,
                read_at = NULL,
                created_at = NOW()
            WHERE id = $13::uuid
            RETURNING *
        `, [
            payload.type,
            payload.title,
            payload.message,
            payload.relatedPracticeId || null,
            teacherId,
            payload.teacherName || null,
            payload.practiceTitle || null,
            payload.grade ?? null,
            payload.maxGrade ?? 100,
            payload.feedback || "",
            payload.remedialRequired ?? null,
            JSON.stringify(payload.metadata || {}),
            existing.rows[0].id
        ])
        : await client.query(`
            INSERT INTO notifications (
              recipient_user_id, notification_type, title, message, related_submission_id,
              related_practice_id, teacher_id, teacher_name, practice_title, grade, max_grade,
              feedback, remedial_required, metadata
            )
            VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::uuid, $6::text, $7::uuid, $8::text, $9::text, $10::numeric, $11::numeric, $12::text, $13::boolean, $14::jsonb)
            RETURNING *
        `, values);

    return toClientNotification(result.rows[0]);
};

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

const normalizeChallengeTestCase = (testCase) => ({
    id: testCase.id,
    input: testCase.input ?? testCase.input_data ?? "",
    expectedOutput: testCase.expectedOutput ?? testCase.expected_output ?? "",
    isHidden: Boolean(testCase.isHidden ?? testCase.is_hidden),
    matcher: testCase.matcher || ""
});

const toClientPracticeChallenge = (row) => {
    const canonical = PRACTICE_CHALLENGES.find(challenge => challenge.id === row.id);
    return {
        // Database rows contain data only; executable OOP checks remain in the
        // trusted server-side challenge catalogue.
        oopRequirements: canonical?.oopRequirements || [],
        rubric: canonical?.rubric,
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
        testCases: (canonical?.testCases || row.test_cases || []).map(normalizeChallengeTestCase),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const findUserByEmail = async (email) => {
    const result = await pool.query(`
        SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
               t.employee_id, t.department, t.specialization, t.assigned_courses
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
        WHERE LOWER(u.email) = LOWER($1)
    `, [email]);
    return result.rows[0] || null;
};

const findUserById = async (id) => {
    const result = await pool.query(`
        SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
               t.employee_id, t.department, t.specialization, t.assigned_courses
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
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
        const result = await pool.query(
            "SELECT id, user_id, email, role FROM users WHERE id = $1",
            [payload.id]
        );
        if (result.rowCount === 0) {
            return res.status(401).json({ success: false, message: "User session is no longer valid." });
        }
        if (result.rows[0].role === "admin") {
            return res.status(403).json({ success: false, message: "Administrator accounts are no longer available." });
        }
        // Authorization and identity are refreshed from PostgreSQL so a stale
        // token cannot retain a changed role or cross-user identifier.
        req.authUser = { ...payload, ...result.rows[0] };
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
          CREATE TYPE user_role AS ENUM ('student', 'teacher');
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
          passing_score NUMERIC NOT NULL DEFAULT 60,
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
                CREATE TABLE IF NOT EXISTS ranking_state (
                    student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    current_rank INTEGER NOT NULL,
                    previous_rank INTEGER,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
          passing_score NUMERIC NOT NULL DEFAULT 80,
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
          compile_status TEXT NOT NULL DEFAULT 'not_executed',
          runtime NUMERIC DEFAULT 0,
          memory_usage NUMERIC,
          score NUMERIC,
          error_message TEXT DEFAULT '',
          test_results JSONB NOT NULL DEFAULT '[]'::jsonb,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_locked BOOLEAN NOT NULL DEFAULT FALSE,
          teacher_score NUMERIC,
          teacher_feedback TEXT DEFAULT '',
          graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
          graded_at TIMESTAMPTZ,
          review_status TEXT NOT NULL DEFAULT 'pending_review',
          reopened_by UUID REFERENCES users(id) ON DELETE SET NULL,
          reopened_at TIMESTAMPTZ
        );
        ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS teacher_score NUMERIC;
        ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS teacher_feedback TEXT DEFAULT '';
        ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
        ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending_review';
        ALTER TABLE practice_submissions ALTER COLUMN review_status SET DEFAULT 'pending_review';
        ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
        ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS remedial_required BOOLEAN DEFAULT FALSE;
        ALTER TABLE practice_submissions DROP CONSTRAINT IF EXISTS practice_submissions_student_id_challenge_id_key;
        ALTER TABLE practice_submissions ALTER COLUMN score DROP NOT NULL;
        ALTER TABLE practice_submissions DROP CONSTRAINT IF EXISTS practice_submissions_compile_status_check;
        ALTER TABLE practice_submissions ADD CONSTRAINT practice_submissions_compile_status_check CHECK (compile_status IN ('not_run', 'not_executed', 'success', 'failed', 'runtime_error'));
        UPDATE practice_submissions
        SET is_locked = FALSE
        WHERE compile_status IN ('failed', 'runtime_error')
           OR (COALESCE(score, 0) = 0 AND is_locked = TRUE);
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          notification_type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          related_submission_id UUID REFERENCES practice_submissions(id) ON DELETE SET NULL,
          related_practice_id TEXT,
          teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
          teacher_name TEXT,
          practice_title TEXT,
          grade NUMERIC,
          max_grade NUMERIC DEFAULT 100,
          feedback TEXT DEFAULT '',
          remedial_required BOOLEAN,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          read_at TIMESTAMPTZ,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_user_id, is_read);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_recipient_type_submission_unique
          ON notifications(recipient_user_id, notification_type, related_submission_id)
          WHERE related_submission_id IS NOT NULL;
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
          "current_time" NUMERIC NOT NULL DEFAULT 0,
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

        CREATE TABLE IF NOT EXISTS swing_lessons (
          id TEXT PRIMARY KEY,
          sequence INTEGER NOT NULL UNIQUE,
          title TEXT NOT NULL,
          topics JSONB NOT NULL DEFAULT '[]'::jsonb,
          objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
          content JSONB NOT NULL DEFAULT '[]'::jsonb,
          code_example TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS swing_videos (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          duration TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          embed_url TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS swing_quizzes (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          passing_percentage INTEGER NOT NULL DEFAULT 60,
          question_count INTEGER NOT NULL DEFAULT 10,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS swing_questions (
          id TEXT PRIMARY KEY,
          quiz_id TEXT NOT NULL REFERENCES swing_quizzes(id) ON DELETE CASCADE,
          prompt TEXT NOT NULL,
          choices JSONB NOT NULL DEFAULT '[]'::jsonb,
          correct_answer TEXT NOT NULL,
          explanation TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS swing_programming_exercises (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          difficulty TEXT NOT NULL DEFAULT 'Beginner',
          instructions TEXT NOT NULL,
          starter_code TEXT NOT NULL DEFAULT '',
          test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS swing_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL REFERENCES swing_programming_exercises(id) ON DELETE CASCADE,
          source_code TEXT NOT NULL,
          program_output TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'submitted',
          score NUMERIC NOT NULL DEFAULT 0,
          feedback TEXT NOT NULL DEFAULT '',
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          graded_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS swing_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
          content_completed BOOLEAN NOT NULL DEFAULT FALSE,
          video_completed BOOLEAN NOT NULL DEFAULT FALSE,
          quiz_passed BOOLEAN NOT NULL DEFAULT FALSE,
          exercise_completed BOOLEAN NOT NULL DEFAULT FALSE,
          overall_percentage NUMERIC NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_id, lesson_id)
        );

        CREATE INDEX IF NOT EXISTS idx_swing_videos_lesson ON swing_videos(lesson_id);
        CREATE INDEX IF NOT EXISTS idx_swing_questions_quiz ON swing_questions(quiz_id);
        CREATE INDEX IF NOT EXISTS idx_swing_submissions_student ON swing_submissions(student_id, submitted_at DESC);
        CREATE INDEX IF NOT EXISTS idx_swing_progress_student ON swing_progress(student_id, lesson_id);
        ALTER TABLE swing_progress ADD COLUMN IF NOT EXISTS video_last_position NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE swing_progress ADD COLUMN IF NOT EXISTS video_percentage NUMERIC NOT NULL DEFAULT 0;
        UPDATE swing_progress SET video_percentage = 100 WHERE video_completed = TRUE AND video_percentage = 0;
        CREATE TABLE IF NOT EXISTS swing_quiz_attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id TEXT NOT NULL,
          assessment_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
          score INTEGER NOT NULL DEFAULT 0,
          total INTEGER NOT NULL DEFAULT 1,
          percentage NUMERIC NOT NULL DEFAULT 0,
          correct_answers INTEGER NOT NULL DEFAULT 0,
          incorrect_answers INTEGER NOT NULL DEFAULT 0,
          passed BOOLEAN NOT NULL DEFAULT FALSE,
          attempt_number INTEGER NOT NULL DEFAULT 1,
          answers JSONB NOT NULL DEFAULT '{}'::jsonb,
          date_completed TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_swing_quiz_attempts_student ON swing_quiz_attempts(student_id, lesson_id, attempt_number DESC);
    `);
    const practiceSubmissionColumns = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'practice_submissions'
          AND column_name IN ('id', 'submission_id')
    `);
    const availableSubmissionKeys = new Set(practiceSubmissionColumns.rows.map(row => row.column_name));
    if (availableSubmissionKeys.has('id')) {
        practiceSubmissionKeyColumn = 'id';
    } else if (availableSubmissionKeys.has('submission_id')) {
        practiceSubmissionKeyColumn = 'submission_id';
    } else {
        throw new Error('practice_submissions has no supported submission identifier column (expected id or submission_id).');
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
            "Array of Objects",
            "Advanced OOP",
            11,
            "15:25",
            "/JAVA%20OOP%20Video%20Lesson/Lesson%2011%20Array%20Of%20Object.mp4",
            "Shows how arrays can store object references, how each element must be initialized, and how loops process object collections.",
            JSON.stringify(["Object reference array", "Element initialization", "Null elements", "Array traversal", "Object state per element"]),
            "Published"
        ],
        [
            "oop_lesson_12",
            "Enum",
            "Advanced OOP",
            12,
            "15:25",
            "/JAVA%20OOP%20Video%20Lesson/Lesson%2012%20Enum.mp4",
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

    // Create monitoring_requests table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS monitoring_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(teacher_id, student_id)
        )
    `);

    // Create teacher_feedback table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS teacher_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id TEXT NOT NULL DEFAULT 'java-oop',
          lesson_id TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          read_at TIMESTAMPTZ
        )
    `);

    // Create assessment_sessions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS assessment_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          assessment_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL DEFAULT '',
          attempt_number INTEGER NOT NULL DEFAULT 1,
          session_token TEXT UNIQUE NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'invalidated')),
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          violation_count INTEGER NOT NULL DEFAULT 0,
          time_limit_seconds INTEGER NOT NULL DEFAULT 600,
          question_order JSONB NOT NULL DEFAULT '[]'::jsonb,
          score INTEGER,
          total INTEGER,
          percentage NUMERIC,
          passed BOOLEAN,
          answers JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_assessment_sessions_student ON assessment_sessions(student_user_id, started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_assessment_sessions_token ON assessment_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_assessment_sessions_active ON assessment_sessions(student_user_id, assessment_id, status);
    `);

    // Create assessment_security_events table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS assessment_security_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID REFERENCES assessment_sessions(id) ON DELETE CASCADE,
          student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          assessment_id TEXT NOT NULL,
          lesson_id TEXT DEFAULT '',
          event_type TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_assessment_security_events_session ON assessment_security_events(session_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_assessment_security_events_student ON assessment_security_events(student_user_id, created_at DESC);
    `);
};

const classifyLearningState = ({ learningScore = 0, quizScore = 0, practiceScore = 0, completedLessons = 0, totalLessons = 0 }) => {
    const score = Number(learningScore) || 0;
    const quiz = Number(quizScore) || 0;
    const practice = Number(practiceScore) || 0;
    const complete = totalLessons > 0 && completedLessons >= totalLessons;
    const learningState = score >= 80 && quiz >= 75 && practice >= 75 && complete
        ? "MASTERED"
        : score >= 50
            ? "DEVELOPING"
            : "BEGINNER";
    const strengths = [];
    const weaknesses = [];
    if (quiz >= 75) strengths.push("assessment performance"); else weaknesses.push("quiz performance");
    if (practice >= 75) strengths.push("practical programming"); else weaknesses.push("Practice IDE performance");
    if (totalLessons > 0 && completedLessons >= totalLessons) strengths.push("lesson completion"); else weaknesses.push("OOP lesson completion");
    let interpretation = learningState === "MASTERED"
        ? "The student demonstrates strong understanding of the covered OOP concepts through assessment, practical activities, and completion of the required learning path."
        : learningState === "DEVELOPING"
            ? `The student demonstrates developing understanding of OOP concepts. ${strengths.length ? `Strengths include ${strengths.join(" and ")}. ` : ""}${weaknesses.length ? `Additional work is recommended in ${weaknesses.join(" and ")}.` : "Continued practice is recommended to strengthen mastery."}`
            : `The student is building foundational OOP knowledge. Continued lessons, guided assessment practice, and Practice IDE activity are recommended${weaknesses.length ? `, especially in ${weaknesses.join(" and ")}` : ""}.`;
    return { learningState, interpretation, strengths, weaknesses };
};

const seedPracticeChallenges = async (db = pool) => {
    const topics = [
        ["practice_1", "classes-objects", "oop_lesson_1", "Create a Student object"],
        ["practice_2", "constructors", "oop_lesson_2", "Initialize a Book"],
        ["practice_3", "object-methods", "oop_lesson_3", "Build a calculator method"],
        ["practice_4", "encapsulation", "oop_lesson_4", "Protect BankAccount balance"],
        ["practice_5", "constructor-overloading", "oop_lesson_5", "Overload a Profile constructor"],
        ["practice_6", "inheritance", "oop_lesson_6", "Extend Employee into Manager"],
        ["practice_7", "polymorphism", "oop_lesson_7", "Override notification sending"],
        ["practice_8", "abstraction", "oop_lesson_8", "Implement an abstract shape"],
        ["practice_9", "interfaces", "oop_lesson_9", "Implement Payable"],
        ["practice_10", "arrays-objects-10", "oop_lesson_10", "Process an array of objects"],
        ["practice_11", "arrays-objects-11", "oop_lesson_11", "Find an object in an array"],
        ["practice_12", "enum", "oop_lesson_12", "Use an enum for course status"]
    ];

    const seedChallengeIds = new Set();
    const seedTestCaseIds = new Map();
    for (const [id] of topics) {
        if (seedChallengeIds.has(id)) {
            throw new Error(`Duplicate practice challenge seed id: ${id}`);
        }
        seedChallengeIds.add(id);
        const challenge = PRACTICE_CHALLENGES.find(item => item.id === id);
        if (!challenge) continue;
        for (const testCase of challenge.testCases || []) {
            const previousChallengeId = seedTestCaseIds.get(testCase.id);
            if (previousChallengeId) {
                throw new Error(`Duplicate challenge test-case seed id: ${testCase.id} (${previousChallengeId}, ${id})`);
            }
            seedTestCaseIds.set(testCase.id, id);
        }
    }

    const client = await db.connect();
    try {
        await client.query("BEGIN");
        for (const [id, topicId, lessonId, title] of topics) {
            const challenge = PRACTICE_CHALLENGES.find(item => item.id === id);
            if (!challenge) continue;
            await client.query(`
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
            challenge.description,
            JSON.stringify(challenge.learningObjectives),
            JSON.stringify(challenge.requirements),
            challenge.starterCode,
            challenge.sampleOutput
            ]);

            // Seed IDs are stable. Preserve an existing row because it may have
            // been customized in production; DO NOTHING also makes repeated or
            // concurrent startup safe without deleting rows or touching student
            // submissions.
            for (const testCase of challenge.testCases || []) {
                await client.query(`
                INSERT INTO challenge_test_cases (id, challenge_id, input, expected_output, is_hidden, matcher)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO NOTHING
            `, [
                testCase.id,
                id,
                testCase.input || "",
                testCase.expectedOutput || "",
                Boolean(testCase.isHidden),
                testCase.matcher || ""
                ]);
            }
        }

        // Keep obsolete challenge rows and their historical submissions, but
        // remove them from the active OOP catalogue.
        await client.query(`
            UPDATE programming_challenges
            SET status = 'Archived', updated_at = NOW()
            WHERE id = ANY($1::text[])
        `, [["practice_13", "practice_14"]]);

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

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

const getStudentPoints = async (studentId) => {
    try {
        const res = await pool.query("SELECT COALESCE(SUM(xp_amount), 0)::int AS points FROM student_xp WHERE student_id = $1", [studentId]);
        return res.rows[0].points;
    } catch (err) {
        console.error("Error getting student points:", err);
        return 0;
    }
};

const getStudentProgressSummary = async (studentId) => {
    try {
        // 1. Get all published lessons
        const lessonsRes = await pool.query("SELECT * FROM lessons ORDER BY sequence, title");
        const lessons = lessonsRes.rows;

        // 2. Get user info
        const userRes = await pool.query("SELECT email, name FROM users WHERE id = $1", [studentId]);
        const user = userRes.rows[0] || { email: '', name: 'Student' };

        // 3. Get video progress
        const videoRes = await pool.query("SELECT * FROM student_progress WHERE student_user_id = $1", [studentId]);
        const videoMap = {};
        videoRes.rows.forEach(v => {
            videoMap[v.video_id] = v;
        });

        // 4. Get quiz attempts
        const quizRes = await pool.query("SELECT * FROM quiz_attempts WHERE student_user_id = $1", [studentId]);
        const quizMap = {};
        quizRes.rows.forEach(q => {
            const lid = q.lesson_id || q.assessment_id;
            if (!quizMap[lid] || q.percentage > quizMap[lid].percentage) {
                quizMap[lid] = q;
            }
        });

        // 5. Get practice submissions
        const practiceRes = await pool.query(`
            SELECT ps.*, pc.lesson_id 
            FROM practice_submissions ps
            JOIN programming_challenges pc ON pc.id = ps.challenge_id
            WHERE ps.student_id = $1::text
        `, [studentId]);
        const practiceMap = {};
        practiceRes.rows.forEach(p => {
            const lid = p.lesson_id;
            const pScore = p.teacher_score ?? p.score ?? -1;
            const currentScore = practiceMap[lid] ? (practiceMap[lid].teacher_score ?? practiceMap[lid].score ?? -1) : -1;
            if (!practiceMap[lid] || Number(pScore) > Number(currentScore)) {
                practiceMap[lid] = p;
            }
        });

        // 6. Get challenges list to check if a lesson has challenges
        const challengeRes = await pool.query("SELECT id, lesson_id FROM programming_challenges");
        const challenges = challengeRes.rows;

        // 7. Calculate per-lesson progress
        let totalLessonProgressSum = 0;
        let completedVideos = 0;
        let passedQuizzes = 0;
        let passedPractices = 0;

        const lessonProgresses = lessons.map(lesson => {
            const video = videoMap[lesson.id];
            const quiz = quizMap[lesson.id];
            const practice = practiceMap[lesson.id];

            const videoCompleted = video?.completed || false;
            const videoPercent = Number(video?.completion_percentage || 0);
            const videoCompletedAt = video?.date_completed || null;

            const quizPassed = quiz?.passed || false;
            const quizPercent = Number(quiz?.percentage || 0);
            const quizCompletedAt = quiz?.date_completed || null;

            const hasChallenge = challenges.some(c => c.lesson_id === lesson.id);
            const practicePassed = hasChallenge ? (practice?.score >= 70) : true;
            const practiceScore = hasChallenge ? Number(practice?.score || 0) : 100;
            const practiceSubmittedAt = practice?.submitted_at || null;

            if (videoCompleted) completedVideos++;
            if (quizPassed) passedQuizzes++;
            if (practicePassed && hasChallenge) passedPractices++;

            // Weight calculation
            let overallLessonProgress = 0;
            if (videoCompleted) overallLessonProgress += 33.33;
            if (quizPassed) overallLessonProgress += 33.33;
            if (practicePassed) overallLessonProgress += 33.34;
            overallLessonProgress = Math.min(100, Math.round(overallLessonProgress * 100) / 100);

            totalLessonProgressSum += overallLessonProgress;

            return {
                lessonId: lesson.id,
                sequence: lesson.sequence,
                title: lesson.title,
                videoCompleted,
                videoPercent,
                videoCompletedAt,
                quizPassed,
                quizPercent,
                quizCompletedAt,
                practicePassed,
                practiceScore,
                practiceSubmittedAt,
                overallLessonProgress
            };
        });

        // Overall progress: Average of all lessons progress
        const overallCourseProgress = lessons.length > 0
            ? Math.min(100, Math.round((totalLessonProgressSum / lessons.length) * 100) / 100)
            : 0;

        // Points, Streak, Badges
        const points = await getStudentPoints(studentId);
        const streak = await calculateStreak(studentId);
        const badgesRes = await pool.query("SELECT * FROM student_badges WHERE student_id = $1", [studentId]);
        const badges = badgesRes.rows;

        // Last activity date
        let lastActivityAt = null;
        const allDates = [];
        videoRes.rows.forEach(v => { if (v.updated_at) allDates.push(new Date(v.updated_at)); });
        quizRes.rows.forEach(q => { if (q.date_completed) allDates.push(new Date(q.date_completed)); });
        practiceRes.rows.forEach(p => { if (p.submitted_at) allDates.push(new Date(p.submitted_at)); });
        if (allDates.length > 0) {
            lastActivityAt = new Date(Math.max(...allDates)).toISOString();
        }

        // Status rule
        let status = 'Not Started';
        if (overallCourseProgress >= 100) {
            status = 'Completed';
        } else if (overallCourseProgress > 0) {
            // At Risk: no activity for > 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            if (lastActivityAt && new Date(lastActivityAt) < sevenDaysAgo) {
                status = 'At Risk';
            } else {
                status = 'In Progress';
            }
        }

        // Build realtime activity logs
        const realtime = [];
        lessonProgresses.forEach(lp => {
            if (lp.videoCompleted) {
                realtime.push({ id: `${lp.lessonId}-video`, label: `${lp.title} video`, status: 'Completed' });
            } else if (lp.videoPercent > 0) {
                realtime.push({ id: `${lp.lessonId}-video`, label: `${lp.title} video`, status: 'In Progress' });
            }
            if (lp.quizPassed) {
                realtime.push({ id: `${lp.lessonId}-quiz`, label: `${lp.title} assessment`, status: 'Passed' });
            } else if (lp.quizPercent > 0) {
                realtime.push({ id: `${lp.lessonId}-quiz`, label: `${lp.title} assessment`, status: 'In Progress' });
            }
            if (lp.practicePassed && challenges.some(c => c.lesson_id === lp.lessonId)) {
                realtime.push({ id: `${lp.lessonId}-practice`, label: `${lp.title} Practice IDE`, status: 'Submitted' });
            } else if (lp.practiceScore > 0 && challenges.some(c => c.lesson_id === lp.lessonId)) {
                realtime.push({ id: `${lp.lessonId}-practice`, label: `${lp.title} Practice IDE`, status: 'In Progress' });
            }
        });
        // Sort/filter realtime list to get latest 5 actions
        const sortedRealtime = realtime.slice(-5).reverse();
        if (sortedRealtime.length === 0) {
            sortedRealtime.push({ id: 'not-started', label: 'OOP learning path', status: 'Not Started' });
        }

        // Calculate averages for video, quiz, practice
        const totalVideos = lessons.length;
        const totalQuizzes = lessons.length;
        const totalPractices = challenges.length || 1;

        const videoProgressAvg = Math.round((completedVideos / totalVideos) * 100);
        const quizScoreAvg = Math.round((passedQuizzes / totalQuizzes) * 100);
        const practiceScoreAvg = Math.round((passedPractices / totalPractices) * 100);

        return {
            studentId,
            studentEmail: user.email,
            studentName: user.name,
            points,
            streak,
            videoProgress: videoProgressAvg,
            quizScore: quizScoreAvg,
            practiceScore: practiceScoreAvg,
            overallProgress: overallCourseProgress,
            completedVideos,
            passedQuizzes,
            passedPractices,
            status,
            lessons: lessonProgresses,
            realtime: sortedRealtime,
            badges,
            lastActivityAt,
            updatedAt: new Date().toISOString()
        };
    } catch (err) {
        console.error("Error generating student progress summary:", err);
        throw err;
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

const getLessonEvidence = async (studentId, lessonId) => {
    let isSwing = false;
    let lessonResult = await pool.query(
        "SELECT id, sequence, module FROM lessons WHERE id = $1 AND status <> 'Archived'",
        [lessonId]
    );
    if (!lessonResult.rowCount) {
        lessonResult = await pool.query(
            "SELECT id, sequence, 'Java Swing' AS module FROM swing_lessons WHERE id = $1",
            [lessonId]
        );
        if (!lessonResult.rowCount) return null;
        isSwing = true;
    }
    const lesson = lessonResult.rows[0];

    let videoProgress = 0;
    let videoCompleted = false;
    let assessmentScore = null;
    let assessmentPassed = false;
    let practiceRequired = false;
    let practiceCompleted = false;

    if (!isSwing) {
        const videoResult = await pool.query(
            `SELECT COALESCE(MAX(completion_percentage), 0) AS completion_percentage
             FROM student_progress
             WHERE student_user_id = $1 AND video_id = $2`,
            [studentId, lessonId]
        );
        const quizResult = await pool.query(
            `SELECT
                EXISTS (
                    SELECT 1
                    FROM quiz_attempts qa
                    WHERE qa.student_user_id = $1
                      AND COALESCE(qa.lesson_id, '') IN ($2, '')
                      AND (
                        qa.assessment_id = 'oop_assessment_' || (SELECT sequence FROM lessons WHERE id = $2)
                        OR EXISTS (SELECT 1 FROM assessments a WHERE a.id = qa.assessment_id AND a.lesson_id = $2)
                      )
                      AND ${normalizedAssessmentPercentageSql("qa")} >= ${ASSESSMENT_PASSING_SCORE}
                ) AS passed,
                (SELECT ${normalizedAssessmentPercentageSql("latest")} FROM quiz_attempts latest WHERE latest.student_user_id = $1 AND latest.lesson_id = $2 ORDER BY latest.attempt_number DESC, latest.date_completed DESC LIMIT 1) AS percentage`,
            [studentId, lessonId]
        );
        const challengeResult = await pool.query(`
            SELECT pc.id, pc.passing_score,
                   latest.score, latest.teacher_score, latest.compile_status,
                   latest.review_status, latest.remedial_required
            FROM programming_challenges pc
            LEFT JOIN LATERAL (
                SELECT ps.score, ps.teacher_score, ps.compile_status,
                       ps.review_status, ps.remedial_required
                FROM practice_submissions ps
                WHERE (ps.student_id = $1::text OR ps.student_id IN (SELECT user_id FROM users WHERE id::text = $1::text))
                  AND ps.challenge_id = pc.id
                ORDER BY ps.submitted_at DESC
                LIMIT 1
            ) latest ON TRUE
            WHERE pc.lesson_id = $2 AND pc.status <> 'Archived'
            ORDER BY pc.id
            LIMIT 1
        `, [studentId, lessonId]);

        videoProgress = Number(videoResult.rows[0]?.completion_percentage || 0);
        videoCompleted = videoProgress >= VIDEO_COMPLETION_THRESHOLD;
        assessmentPassed = Boolean(quizResult.rows[0]?.passed);
        assessmentScore = quizResult.rows[0]?.percentage === null || quizResult.rows[0]?.percentage === undefined
            ? null : Number(quizResult.rows[0].percentage);

        // Every lesson requires a submission. Teacher review fields are
        // deliberately excluded from progression.
        practiceRequired = true;
        const practice = challengeResult.rows[0];
        // Practice completion is authoritative only when a student submission
        // exists. Teacher review is a separate workflow.
        practiceCompleted = Boolean(practice?.id);
    } else {
        const swingProgressResult = await pool.query(
            `SELECT video_completed, video_percentage, video_last_position, quiz_passed, exercise_completed, overall_percentage
             FROM swing_progress 
             WHERE student_id = $1 AND lesson_id = $2`,
            [studentId, lessonId]
        );

        const row = swingProgressResult.rows[0];
        videoProgress = Number(row?.video_percentage || 0);
        videoCompleted = videoProgress >= VIDEO_COMPLETION_THRESHOLD;
        assessmentPassed = Boolean(row?.quiz_passed);
        practiceRequired = true;
        practiceCompleted = Boolean(row?.exercise_completed);
    }

    return {
        ...lesson,
        lessonId: lesson.id,
        isSwing,
        videoProgress,
        videoCompleted,
        assessmentScore,
        assessmentPassed,
        practiceRequired,
        practiceCompleted,
        assessmentUnlocked: videoCompleted,
        practiceUnlocked: Boolean(videoCompleted && assessmentPassed),
        nextLessonUnlocked: Boolean(videoCompleted && assessmentPassed && practiceCompleted),
        completed: Boolean(videoCompleted && assessmentPassed && practiceCompleted)
    };
};

const getOOPCompletionStatus = async (studentId) => {
    const lessonsResult = await pool.query(`
        SELECT id
        FROM lessons
        WHERE status <> 'Archived'
        ORDER BY sequence, id
    `);
    const evidence = await Promise.all(
        lessonsResult.rows.map(lesson => getLessonEvidence(studentId, lesson.id))
    );
    const lessonsComplete = evidence.length > 0 && evidence.every(item => item?.completed === true);
    const assessmentsComplete = evidence.length > 0 && evidence.every(item => item?.assessmentPassed === true);
    const practiceComplete = evidence.length > 0 && evidence.every(item => item?.practiceCompleted === true);
    return {
        lessonsComplete,
        assessmentsComplete,
        practiceComplete,
        oopComplete: lessonsComplete && assessmentsComplete && practiceComplete,
        totalLessons: evidence.length,
        completedLessons: evidence.filter(item => item?.completed === true).length
    };
};

const getLessonAccessState = async (studentId, lessonId) => {
    const current = await getLessonEvidence(studentId, lessonId);
    if (!current) return { canAccess: false, reason: "Lesson not found." };

    const withLessonAccess = (canAccess, reason = null) => ({
        canAccess,
        reason,
        current: {
            ...current,
            lessonUnlocked: canAccess,
            accessReason: reason
        }
    });

    let previousLessonId = null;

    if (!current.isSwing) {
        if (current.sequence <= 1) return withLessonAccess(true);
        const previousResult = await pool.query(
            `SELECT id FROM lessons WHERE sequence = $1 AND status <> 'Archived' LIMIT 1`,
            [current.sequence - 1]
        );
        if (previousResult.rowCount) previousLessonId = previousResult.rows[0].id;
    } else {
        if (current.sequence <= 1) {
            const previousResult = await pool.query(
                `SELECT id FROM lessons WHERE sequence = 12 AND status <> 'Archived' LIMIT 1`
            );
            if (previousResult.rowCount) previousLessonId = previousResult.rows[0].id;
        } else {
            const previousResult = await pool.query(
                `SELECT id FROM swing_lessons WHERE sequence = $1 LIMIT 1`,
                [current.sequence - 1]
            );
            if (previousResult.rowCount) previousLessonId = previousResult.rows[0].id;
        }
    }

    if (!previousLessonId) return withLessonAccess(false, "Complete the previous lesson requirements first.");

    const previous = await getLessonEvidence(studentId, previousLessonId);
    const previousLessonCompleted = Boolean(previous?.completed);
    if (previousLessonCompleted) return withLessonAccess(true);

    const reason = !previous?.videoCompleted
        ? `Complete the previous lesson video to at least ${VIDEO_COMPLETION_THRESHOLD}% first.`
        : !previous?.assessmentPassed
            ? "Pass the previous lesson assessment before continuing."
            : "Complete the previous lesson practice before continuing.";
    return withLessonAccess(false, reason);
};

const classifyEventSeverity = (eventType) => {
    switch (eventType) {
        case "COPY_ATTEMPT":
        case "CUT_ATTEMPT":
        case "CONTEXT_MENU_ATTEMPT":
            return "LOW";
        case "TAB_SWITCH":
        case "WINDOW_BLUR":
        case "WINDOW_FOCUS":
        case "PAGE_LEAVE":
        case "PAGE_RETURN":
        case "PASTE_ATTEMPT":
            return "MEDIUM";
        case "MULTIPLE_SESSION":
        case "INVALID_SESSION":
        case "EXPIRED_SESSION":
        case "SECURITY_TAMPER":
            return "HIGH";
        default:
            return "LOW";
    }
};

const shuffleArray = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const resolveAssessmentQuestions = (assessmentId, lessonId = "") => {
    if (lessonId && OOP_PARSED_QUESTIONS[lessonId]) {
        return OOP_PARSED_QUESTIONS[lessonId];
    }
    if (assessmentId && OOP_PARSED_QUESTIONS[assessmentId]) {
        return OOP_PARSED_QUESTIONS[assessmentId];
    }
    const match = String(assessmentId).match(/oop_assessment_(\d+)/);
    if (match) {
        const key = `oop_lesson_${match[1]}`;
        if (OOP_PARSED_QUESTIONS[key]) return OOP_PARSED_QUESTIONS[key];
    }
    const lessonMatch = String(lessonId).match(/oop_lesson_(\d+)/);
    if (lessonMatch) {
        const key = `oop_lesson_${lessonMatch[1]}`;
        if (OOP_PARSED_QUESTIONS[key]) return OOP_PARSED_QUESTIONS[key];
    }
    return OOP_PARSED_QUESTIONS.oop_lesson_1 || [];
};

const generateSessionQuestions = (rawQuestions, maxCount = 15) => {
    const shuffled = shuffleArray(rawQuestions).slice(0, maxCount);
    return shuffled.map((q) => {
        const shuffledOptions = shuffleArray(q.options || []);
        return {
            id: q.id,
            lessonId: q.lessonId,
            question: q.question,
            options: shuffledOptions,
            difficulty: q.difficulty || "Medium",
            codeSnippet: q.codeSnippet || ""
        };
    });
};

const verifyLessonCompletion = async (studentId, lessonId) => {
    try {
        const evidence = await getLessonEvidence(studentId, lessonId);
        if (!evidence) return;
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
        `, [studentId, lessonId, evidence.videoCompleted, evidence.assessmentPassed, evidence.practiceCompleted, evidence.completed]);

        if (evidence.completed) {
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
    getJavaToolchainDiagnostics().then((java) => {
        res.json({ status: "ok", backend: "Render", database: "postgresql", java, timestamp: new Date().toISOString() });
    });
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

const isStrongPassword = (pwd) => {
    if (!pwd || typeof pwd !== "string") return false;
    const hasMinLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    return hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
};

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
        if (!password || !isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be strong: at least 8 characters long and contain uppercase, lowercase, a number, and a special character."
            });
        }
        if (!["student", "teacher"].includes(role)) {
            return res.status(400).json({ success: false, message: "Role must be student or teacher." });
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
        if (user.role === "admin") {
            return res.status(403).json({ success: false, message: "Administrator accounts are no longer available." });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, message: "Invalid email or password." });

        const token = signToken(user);
        res.json({ success: true, message: "Login successful.", token, user: toClientUser(user) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/auth/forgot-password", async (req, res, next) => {
    try {
        const { email } = req.body || {};
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
            return res.status(400).json({ success: false, message: "Valid email address is required.", exists: false });
        }
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email address.", exists: false });
        }
        if (user.role === "admin") {
            return res.status(403).json({ success: false, message: "Administrator accounts are no longer available.", exists: false });
        }
        return res.json({ success: true, message: "Account verified. You can now reset your password.", exists: true });
    } catch (error) {
        next(error);
    }
});

app.post("/api/auth/reset-password", async (req, res, next) => {
    try {
        const { email, newPassword } = req.body || {};
        if (!email || !newPassword) {
            return res.status(400).json({ success: false, message: "Email and new password are required." });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "New password must be strong: at least 8 characters long and contain uppercase, lowercase, a number, and a special character."
            });
        }
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [passwordHash, user.id]);
        return res.json({ success: true, message: "Password has been successfully updated. You can now sign in." });
    } catch (error) {
        next(error);
    }
});

app.post("/api/auth/lookup-account", async (req, res, next) => {
    try {
        const { identifier } = req.body || {};
        const term = String(identifier || "").trim().toLowerCase();
        if (!term) {
            return res.status(400).json({ success: false, message: "Please provide a username, student number, or teacher ID." });
        }

        const result = await pool.query(`
            SELECT u.name, u.email, u.role, s.student_number, t.employee_id
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN teachers t ON t.user_id = u.id
            WHERE LOWER(u.email) = $1
               OR LOWER(u.name) = $1
               OR LOWER(COALESCE(s.student_number, '')) = $1
               OR LOWER(COALESCE(t.employee_id, '')) = $1
            LIMIT 1
        `, [term]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "No matching account found with the provided details." });
        }

        const row = result.rows[0];
        const [userPart, domain] = row.email.split("@");
        const maskedEmail = userPart.length <= 2
            ? `${userPart[0]}*@${domain}`
            : `${userPart[0]}${"*".repeat(Math.min(userPart.length - 2, 6))}${userPart.slice(-1)}@${domain}`;

        return res.json({
            success: true,
            message: "Account found.",
            user: {
                name: row.name,
                email: maskedEmail,
                role: row.role,
                studentNumber: row.student_number,
                employeeId: row.employee_id
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/notifications", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT * FROM notifications
            WHERE recipient_user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.authUser.id]);
        res.json({ success: true, data: result.rows.map(toClientNotification) });
    } catch (error) {
        next(error);
    }
});

app.patch("/api/notifications/:id/read", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(`
            UPDATE notifications
            SET is_read = TRUE, read_at = COALESCE(read_at, NOW())
            WHERE id = $1 AND recipient_user_id = $2
            RETURNING *
        `, [req.params.id, req.authUser.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Notification not found." });
        res.json({ success: true, data: toClientNotification(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.patch("/api/notifications/read-all", requireAuth, async (req, res, next) => {
    try {
        await pool.query(`
            UPDATE notifications
            SET is_read = TRUE, read_at = COALESCE(read_at, NOW())
            WHERE recipient_user_id = $1 AND is_read = FALSE
        `, [req.authUser.id]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

app.get("/api/notifications/stream", async (req, res) => {
    const token = req.query.token || "";
    try {
        const payload = jwt.verify(String(token), JWT_SECRET);
        const result = await pool.query("SELECT id FROM users WHERE id = $1", [payload.id]);
        if (!result.rowCount) return res.status(401).end();

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no"
        });
        res.write("data: " + JSON.stringify({ type: "connected" }) + "\n\n");

        const userId = String(payload.id);
        const clients = notificationStreams.get(userId) || new Set();
        clients.add(res);
        notificationStreams.set(userId, clients);

        req.on("close", () => {
            const current = notificationStreams.get(userId);
            if (!current) return;
            current.delete(res);
            if (!current.size) notificationStreams.delete(userId);
        });
    } catch {
        res.status(401).end();
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

app.get("/api/users", requireAuth, requireRole(["teacher", "student"]), async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
                   t.employee_id, t.department, t.specialization, t.assigned_courses
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN teachers t ON t.user_id = u.id
            ORDER BY u.created_at DESC
        `);
        
        let users = result.rows.map(toClientUser);
        
        if (req.authUser.role === "student") {
            users = users
                .filter(u => u.role === "student")
                .map(u => ({
                    id: u.id,
                    userId: u.userId,
                    name: u.name,
                    role: u.role,
                    email: u.id === req.authUser.id ? u.email : undefined,
                    registrationDate: u.registrationDate,
                    onlineStatus: u.onlineStatus,
                    avatar: u.avatar,
                    course: u.course,
                    yearLevel: u.yearLevel,
                    section: u.section,
                    programStatus: u.programStatus
                }));
        }
        
        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
});

app.get("/api/rankings", requireAuth, requireRole(["teacher", "student"]), async (_req, res, next) => {
    try {
        const result = await pool.query(`
            WITH lesson_totals AS (
                SELECT COUNT(*)::int AS total_lessons
                FROM lessons
                WHERE status <> 'Archived'
            ),
            best_quizzes AS (
                SELECT DISTINCT ON (student_user_id, assessment_id)
                       student_user_id, assessment_id, percentage, date_completed
                FROM quiz_attempts
                ORDER BY student_user_id, assessment_id, percentage DESC, date_completed DESC
            ),
            best_practice AS (
                SELECT DISTINCT ON (ps.student_id, ps.challenge_id)
                       ps.student_id::uuid AS student_id, ps.challenge_id, ps.score, ps.submitted_at
                FROM practice_submissions ps
                ORDER BY ps.student_id, ps.challenge_id, ps.score DESC, ps.submitted_at DESC
            ),
            video_metrics AS (
                SELECT student_user_id,
                       COUNT(*) FILTER (WHERE completed)::int AS completed_lessons,
                       COALESCE(SUM(completion_percentage), 0) AS total_completion,
                       MAX(updated_at) AS updated_at
                FROM student_progress
                GROUP BY student_user_id
            ),
            activity_metrics AS (
                SELECT student_id,
                       COUNT(*) FILTER (WHERE completed)::int AS completed_lessons,
                       MAX(updated_at) AS updated_at
                FROM lesson_progress
                GROUP BY student_id
            ),
            metrics AS (
                SELECT
                    u.id AS student_id,
                    u.name,
                    u.email,
                    u.avatar,
                    lt.total_lessons,
                    COALESCE(am.completed_lessons, 0)::int AS completed_lessons,
                    COALESCE(ROUND(vm.total_completion / NULLIF(lt.total_lessons, 0)), 0)::int AS oop_progress,
                    COALESCE(ROUND(AVG(bq.percentage)), 0)::int AS quiz_score,
                    COALESCE(ROUND(AVG(bp.score)), 0)::int AS practice_score,
                    GREATEST(
                        COALESCE(am.updated_at, vm.updated_at, to_timestamp(0)),
                        COALESCE(MAX(bq.date_completed), to_timestamp(0)),
                        COALESCE(MAX(bp.submitted_at), to_timestamp(0))
                    ) AS updated_at
                FROM users u
                CROSS JOIN lesson_totals lt
                LEFT JOIN student_progress sp ON sp.student_user_id = u.id
                LEFT JOIN video_metrics vm ON vm.student_user_id = u.id
                LEFT JOIN activity_metrics am ON am.student_id = u.id
                LEFT JOIN best_quizzes bq ON bq.student_user_id = u.id
                LEFT JOIN best_practice bp ON bp.student_id = u.id
                WHERE u.role = 'student' AND u.account_status = 'Active'
                GROUP BY u.id, u.name, u.email, u.avatar, lt.total_lessons, vm.total_completion, vm.updated_at, am.completed_lessons, am.updated_at
            ),
            ranked AS (
                SELECT metrics.*,
                       ROUND((oop_progress * 0.40) + (quiz_score * 0.30) + (practice_score * 0.30), 2) AS learning_score,
                       ROW_NUMBER() OVER (
                           ORDER BY
                             ((oop_progress * 0.40) + (quiz_score * 0.30) + (practice_score * 0.30)) DESC,
                             updated_at DESC,
                             LOWER(name),
                             student_id
                       )::int AS rank
                FROM metrics
            )
            SELECT ranked.*, rs.current_rank AS previous_rank
            FROM ranked
            LEFT JOIN ranking_state rs ON rs.student_id = ranked.student_id
            ORDER BY ranked.rank
        `);

        const entries = result.rows.map(row => {
            const rank = Number(row.rank);
            const previousRank = row.previous_rank === null || row.previous_rank === undefined ? null : Number(row.previous_rank);
            const movementAmount = previousRank === null ? 0 : previousRank - rank;
            const movement = previousRank === null ? 'new' : movementAmount > 0 ? 'up' : movementAmount < 0 ? 'down' : 'stable';
            const completedLessons = Number(row.completed_lessons || 0);
            const totalLessons = Number(row.total_lessons || 0);
            const oopProgress = Number(row.oop_progress || 0);
            const quizScore = Number(row.quiz_score || 0);
            const practiceScore = Number(row.practice_score || 0);
            const learningScore = Number(row.learning_score || 0);
            const learningClassification = classifyLearningState({ learningScore, quizScore, practiceScore, completedLessons, totalLessons });
            const milestones = [];
            if (completedLessons > 0) milestones.push('First Lesson');
            if (quizScore > 0) milestones.push('First Quiz');
            if (practiceScore > 0) milestones.push('First Practice IDE');
            if (completedLessons === totalLessons && totalLessons > 0) milestones.push('OOP Complete');
            return {
                studentId: row.student_id,
                name: row.name,
                email: row.email,
                avatar: row.avatar || '',
                rank,
                previousRank,
                movement,
                movementAmount: Math.abs(movementAmount),
                learningScore,
                oopProgress,
                quizScore,
                practiceScore,
                status: learningScore >= 100 ? 'Completed' : learningScore > 0 ? 'In Progress' : 'Not Started',
                learningState: learningClassification.learningState,
                interpretation: learningClassification.interpretation,
                strengths: learningClassification.strengths,
                weaknesses: learningClassification.weaknesses,
                completedLessons,
                totalLessons,
                milestones,
                recentActivity: row.updated_at ? new Date(row.updated_at).toISOString() : '',
                updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : ''
            };
        });

        await Promise.all(entries.map(entry => pool.query(`
            INSERT INTO ranking_state (student_id, current_rank, previous_rank, updated_at)
            VALUES ($1, $2, NULL, NOW())
            ON CONFLICT (student_id) DO UPDATE SET
              previous_rank = ranking_state.current_rank,
              current_rank = EXCLUDED.current_rank,
              updated_at = NOW()
        `, [entry.studentId, entry.rank])));

        res.json({ success: true, data: entries });
    } catch (error) {
        next(error);
    }
});

app.put("/api/users/:id", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.id !== req.params.id) {
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

/* Removed admin-only overview endpoint.
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
*/

app.get("/api/lessons", async (_req, res, next) => {
    try {
        const result = await pool.query("SELECT * FROM lessons ORDER BY sequence, title");
        res.json({ success: true, data: result.rows.map(toClientLesson) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/lessons", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
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

app.put("/api/lessons/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
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

app.delete("/api/lessons/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
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

app.post("/api/assessments", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
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
            clampNumber(body.passingScore ?? body.passing_score ?? ASSESSMENT_PASSING_SCORE, 0, 100),
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

app.put("/api/assessments/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
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

app.delete("/api/assessments/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const result = await pool.query("DELETE FROM assessments WHERE id = $1 RETURNING id", [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Quiz not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// --- Secure Assessment Session Management Endpoints ---

app.post("/api/assessments/session/start", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can start assessment sessions." });
        }
        const { assessmentId, lessonId = "" } = req.body || {};
        if (!assessmentId) {
            return res.status(400).json({ success: false, message: "assessmentId is required." });
        }

        const safeAssessmentId = cleanText(assessmentId, 120);
        const requestedLessonId = cleanText(lessonId, 120);
        const assessmentDefinition = await pool.query(
            "SELECT lesson_id FROM assessments WHERE id = $1 LIMIT 1",
            [safeAssessmentId]
        );
        const definedLessonId = assessmentDefinition.rows[0]?.lesson_id
            ? cleanText(assessmentDefinition.rows[0].lesson_id, 120)
            : "";
        const safeLessonId = definedLessonId || requestedLessonId;

        if (!safeLessonId) {
            return res.status(400).json({ success: false, message: "lessonId is required for assessment access." });
        }
        if (definedLessonId && requestedLessonId && definedLessonId !== requestedLessonId) {
            return res.status(403).json({ success: false, message: "Assessment does not belong to this lesson." });
        }

        // Assessment eligibility is based on the authenticated student's
        // current-lesson evidence and sequential lesson access.
        const access = await getLessonAccessState(req.authUser.id, safeLessonId);
        const evidence = access.current;
        if (!access.canAccess || !evidence?.assessmentUnlocked) {
            return res.status(403).json({
                success: false,
                errorCode: evidence?.assessmentUnlocked ? "LESSON_LOCKED" : "VIDEO_INCOMPLETE",
                message: evidence?.assessmentUnlocked
                    ? (access.reason || "Complete the previous lesson requirements first.")
                    : "Complete at least 95% of the current lesson video before starting its assessment.",
                data: evidence
            });
        }

        const attemptCountResult = await pool.query("SELECT COUNT(*)::int AS attempt_count FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = $2", [req.authUser.id, safeAssessmentId]);
        const attemptCount = Number(attemptCountResult.rows[0]?.attempt_count || 0);
        if (attemptCount >= MAX_ASSESSMENT_ATTEMPTS) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount, maxAttempts: MAX_ASSESSMENT_ATTEMPTS, message: "You have used all " + MAX_ASSESSMENT_ATTEMPTS + " attempts for this assessment." });
        }

        // Check if student has an existing active session for this assessment
        const existingActive = await pool.query(`
            SELECT * FROM assessment_sessions
            WHERE student_user_id = $1 AND assessment_id = $2 AND status = 'active'
            ORDER BY started_at DESC LIMIT 1
        `, [req.authUser.id, safeAssessmentId]);

        const clientToken = req.headers["x-session-token"] || req.body?.sessionToken;

        if (existingActive.rowCount > 0) {
            const activeSession = existingActive.rows[0];
            const now = Date.now();
            const expiresAtMs = new Date(activeSession.expires_at).getTime();
            const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

            if (remainingSeconds > 0) {
                // If client presents matching session token (reconnect/refresh), resume it
                if (clientToken && clientToken === activeSession.session_token) {
                    return res.json({
                        success: true,
                        resumed: true,
                        data: {
                            sessionId: activeSession.id,
                            sessionToken: activeSession.session_token,
                            assessmentId: activeSession.assessment_id,
                            lessonId: activeSession.lesson_id,
                            startedAt: activeSession.started_at,
                            expiresAt: activeSession.expires_at,
                            remainingSeconds,
                            violationCount: activeSession.violation_count,
                            attemptNumber: activeSession.attempt_number,
                            questions: activeSession.question_order,
                            savedAnswers: activeSession.answers || {}
                        }
                    });
                } else {
                    // Duplicate session attempt from another tab/device
                    await pool.query(`
                        INSERT INTO assessment_security_events (session_id, student_user_id, assessment_id, lesson_id, event_type, severity, metadata)
                        VALUES ($1, $2, $3, $4, 'MULTIPLE_SESSION', 'HIGH', $5::jsonb)
                    `, [activeSession.id, req.authUser.id, safeAssessmentId, activeSession.lesson_id, JSON.stringify({ ip: req.ip, userAgent: req.headers["user-agent"] })]);

                    await pool.query("UPDATE assessment_sessions SET violation_count = violation_count + 1 WHERE id = $1", [activeSession.id]);

                    return res.status(409).json({
                        success: false,
                        errorCode: "DUPLICATE_SESSION",
                        message: "This assessment is already active in another session.",
                        activeSessionId: activeSession.id
                    });
                }
            } else {
                // Expire existing session
                await pool.query("UPDATE assessment_sessions SET status = 'expired' WHERE id = $1", [activeSession.id]);
            }
        }

        // Generate attempt number
        const attemptResult = await pool.query(
            "SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM assessment_sessions WHERE student_user_id = $1 AND assessment_id = $2",
            [req.authUser.id, safeAssessmentId]
        );
        const attemptNumber = Number(attemptResult.rows[0]?.next_attempt || 1);

        const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const timeLimitSeconds = 600; // 10 minutes
        const expiresAt = new Date(Date.now() + timeLimitSeconds * 1000);

        // Fetch question bank and randomize questions and option order
        const rawQuestions = resolveAssessmentQuestions(safeAssessmentId, safeLessonId);
        const randomizedQuestions = generateSessionQuestions(rawQuestions, 15);

        const result = await pool.query(`
            INSERT INTO assessment_sessions (
              student_user_id, assessment_id, lesson_id, attempt_number, session_token,
              status, started_at, expires_at, violation_count, time_limit_seconds, question_order
            )
            VALUES ($1, $2, $3, $4, $5, 'active', NOW(), $6, 0, $7, $8::jsonb)
            RETURNING *
        `, [
            req.authUser.id,
            safeAssessmentId,
            safeLessonId,
            attemptNumber,
            sessionToken,
            expiresAt,
            timeLimitSeconds,
            JSON.stringify(randomizedQuestions)
        ]);

        const session = result.rows[0];

        // Log session start event
        await pool.query(`
            INSERT INTO assessment_security_events (session_id, student_user_id, assessment_id, lesson_id, event_type, severity, metadata)
            VALUES ($1, $2, $3, $4, 'SESSION_START', 'LOW', $5::jsonb)
        `, [session.id, req.authUser.id, safeAssessmentId, safeLessonId, JSON.stringify({ attemptNumber, expiresAt })]);

        res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                sessionToken: session.session_token,
                assessmentId: session.assessment_id,
            storage: "oop",
                lessonId: session.lesson_id,
                startedAt: session.started_at,
                expiresAt: session.expires_at,
                remainingSeconds: timeLimitSeconds,
                violationCount: 0,
                attemptNumber,
                questions: randomizedQuestions,
                savedAnswers: {}
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/assessments/session/active/:assessmentId", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students have active assessment sessions." });
        }
        const safeAssessmentId = cleanText(req.params.assessmentId, 120);
        const result = await pool.query(`
            SELECT * FROM assessment_sessions
            WHERE student_user_id = $1 AND assessment_id = $2 AND status = 'active'
            ORDER BY started_at DESC LIMIT 1
        `, [req.authUser.id, safeAssessmentId]);

        if (!result.rowCount) {
            return res.json({ success: true, data: null });
        }

        const session = result.rows[0];
        const now = Date.now();
        const expiresAtMs = new Date(session.expires_at).getTime();
        const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

        if (remainingSeconds <= 0) {
            await pool.query("UPDATE assessment_sessions SET status = 'expired' WHERE id = $1", [session.id]);
            return res.json({ success: true, data: null });
        }

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                sessionToken: session.session_token,
                assessmentId: session.assessment_id,
            storage: "oop",
                lessonId: session.lesson_id,
                startedAt: session.started_at,
                expiresAt: session.expires_at,
                remainingSeconds,
                violationCount: session.violation_count,
            attemptNumber: cappedInsert.attemptNumber,
                questions: session.question_order,
                savedAnswers: session.answers || {}
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post("/api/assessments/session/:sessionId/event", requireAuth, async (req, res, next) => {
    try {
        const { eventType, metadata = {}, answers } = req.body || {};
        if (!eventType) {
            return res.status(400).json({ success: false, message: "eventType is required." });
        }

        const sessionResult = await pool.query(
            "SELECT * FROM assessment_sessions WHERE id = $1 AND student_user_id = $2",
            [req.params.sessionId, req.authUser.id]
        );

        if (!sessionResult.rowCount) {
            return res.status(404).json({ success: false, message: "Active assessment session not found." });
        }

        const session = sessionResult.rows[0];
        const severity = classifyEventSeverity(eventType);

        // Optionally update saved in-progress answers if provided
        if (answers && typeof answers === "object" && !Array.isArray(answers)) {
            await pool.query(
                "UPDATE assessment_sessions SET answers = $1::jsonb, updated_at = NOW() WHERE id = $2",
                [JSON.stringify(answers), session.id]
            );
        }

        await pool.query(`
            INSERT INTO assessment_security_events (session_id, student_user_id, assessment_id, lesson_id, event_type, severity, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        `, [
            session.id,
            req.authUser.id,
            session.assessment_id,
            session.lesson_id,
            cleanText(eventType, 80),
            severity,
            JSON.stringify(metadata && typeof metadata === "object" ? metadata : {})
        ]);

        const updateRes = await pool.query(
            "UPDATE assessment_sessions SET violation_count = violation_count + 1 WHERE id = $1 RETURNING violation_count",
            [session.id]
        );

        const newViolationCount = updateRes.rows[0]?.violation_count || session.violation_count + 1;

        res.json({
            success: true,
            violationCount: newViolationCount,
            severity,
            threshold: 3,
            message: "Security event recorded."
        });
    } catch (error) {
        next(error);
    }
});

app.post("/api/assessments/session/:sessionId/submit", requireAuth, async (req, res, next) => {
    try {
        const { answers = {} } = req.body || {};
        const sessionResult = await pool.query(
            "SELECT * FROM assessment_sessions WHERE id = $1 AND student_user_id = $2",
            [req.params.sessionId, req.authUser.id]
        );

        if (!sessionResult.rowCount) {
            return res.status(404).json({ success: false, message: "Assessment session not found." });
        }

        const session = sessionResult.rows[0];
        const access = await getLessonAccessState(req.authUser.id, session.lesson_id);
        if (!access.canAccess || !access.current?.assessmentUnlocked) {
            return res.status(403).json({
                success: false,
                errorCode: access.current?.assessmentUnlocked ? "LESSON_LOCKED" : "VIDEO_INCOMPLETE",
                message: access.current?.assessmentUnlocked
                    ? (access.reason || "Complete the previous lesson requirements first.")
                    : "Complete at least 95% of the current lesson video before submitting its assessment.",
                data: access.current
            });
        }
        if (session.status === "completed") {
            return res.status(409).json({ success: false, message: "This assessment session has already been completed." });
        }

        const questions = Array.isArray(session.question_order) ? session.question_order : [];
        const rawBank = resolveAssessmentQuestions(session.assessment_id, session.lesson_id);
        const bankMap = new Map(rawBank.map(q => [q.id, q]));

        let score = 0;
        const total = questions.length || 1;
        const review = [];

        for (const q of questions) {
            const master = bankMap.get(q.id);
            const submittedAnswer = answers[q.id];
            const isCorrect = Boolean(master && submittedAnswer && master.correctAnswer === submittedAnswer);
            if (isCorrect) score += 1;

            review.push({
                id: q.id,
                lessonId: q.lessonId || session.lesson_id,
                question: q.question,
                options: q.options,
                difficulty: q.difficulty,
                codeSnippet: q.codeSnippet,
                selectedAnswer: submittedAnswer || "",
                correctAnswer: master ? master.correctAnswer : "",
                explanation: master ? master.explanation : "",
                isCorrect
            });
        }

        const percentage = Math.round((score / total) * 100);
        const passed = percentage >= ASSESSMENT_PASSING_SCORE;
        const correctAnswers = score;
        const incorrectAnswers = total - score;

        const attemptCountResult = await pool.query("SELECT COUNT(*)::int AS attempt_count FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = $2", [req.authUser.id, session.assessment_id]);
        const attemptCount = Number(attemptCountResult.rows[0]?.attempt_count || 0);
        if (attemptCount >= MAX_ASSESSMENT_ATTEMPTS) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount, maxAttempts: MAX_ASSESSMENT_ATTEMPTS, message: "You have used all " + MAX_ASSESSMENT_ATTEMPTS + " attempts for this assessment." });
        }


        // Insert into quiz_attempts for authoritative history
        const cappedInsert = await insertCappedAssessmentAttempt({
            studentId: req.authUser.id,
            assessmentId: session.assessment_id,
            storage: "oop",
            fallbackAttemptNumber: session.attempt_number,
            beforeInsert: client => client.query("UPDATE assessment_sessions SET status = 'completed', completed_at = NOW(), score = $1, total = $2, percentage = $3, passed = $4, answers = $5::jsonb, updated_at = NOW() WHERE id = $6", [score, total, percentage, passed, JSON.stringify(answers), session.id]),
            insertQuery: "INSERT INTO quiz_attempts (student_user_id, assessment_id, lesson_id, score, total, percentage, correct_answers, incorrect_answers, passed, attempt_number, answers, date_completed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW()) RETURNING *",
            buildParams: attemptNumber => [req.authUser.id, session.assessment_id, session.lesson_id, score, total, percentage, correctAnswers, incorrectAnswers, passed, attemptNumber, JSON.stringify(answers)]
        });
        if (cappedInsert.limited) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount: cappedInsert.attemptCount, maxAttempts: MAX_ASSESSMENT_ATTEMPTS, message: "You have used all " + MAX_ASSESSMENT_ATTEMPTS + " attempts for this assessment." });
        }
        const attemptInsert = { rows: [cappedInsert.row] };

        // Award XP
        await awardXP(req.authUser.id, 30, `Quiz Completion: ${session.assessment_id}`);
        if (passed) {
            await awardXP(req.authUser.id, 50, `Quiz Pass: ${session.assessment_id}`);
        }

        // Log activity
        await logActivity(req.authUser.id, "quiz_attempt", `Completed secure quiz for ${session.lesson_id || session.assessment_id} with score ${score}/${total} (${percentage}%)`, {
            sessionId: session.id,
            assessmentId: session.assessment_id,
            storage: "oop",
            lessonId: session.lesson_id,
            score,
            total,
            passed,
            attemptNumber: session.attempt_number,
            violations: session.violation_count
        });

        // Verify lesson completion
        if (session.lesson_id) {
            await verifyLessonCompletion(req.authUser.id, session.lesson_id);
        }

        // Check badges
        await checkAndAwardBadges(req.authUser.id);

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                attempt: attemptInsert.rows[0],
                score,
                total,
                percentage,
                passed,
                passingScore: ASSESSMENT_PASSING_SCORE,
                correctAnswers,
                incorrectAnswers,
                violationCount: session.violation_count,
                review,
                attemptCount: cappedInsert.attemptCount,
                maxAttempts: MAX_ASSESSMENT_ATTEMPTS,
            }
        });
    } catch (error) {
        if (error?.code === "23505" && (error?.constraint === "uq_quiz_attempt_student_assessment_number" || error?.constraint === "uq_swing_quiz_attempt_student_assessment_number")) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", maxAttempts: MAX_ASSESSMENT_ATTEMPTS, message: "This assessment attempt was already recorded by another request." });
        }
        next(error);
    }
});

app.get("/api/assessments/sessions/student/:studentId", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role === "student" && req.authUser.id !== req.params.studentId) {
            return res.status(403).json({ success: false, message: "Students can only view their own assessment sessions." });
        }
        const result = await pool.query(`
            SELECT s.*, 
                   COUNT(e.id)::int AS total_security_events,
                   COUNT(e.id) FILTER (WHERE e.severity = 'HIGH')::int AS high_severity_events,
                   CASE WHEN s.percentage IS NOT NULL
                        THEN s.percentage >= ${ASSESSMENT_PASSING_SCORE}
                        ELSE s.passed
                   END AS passed
            FROM assessment_sessions s
            LEFT JOIN assessment_security_events e ON e.session_id = s.id
            WHERE s.student_user_id = $1
            GROUP BY s.id
            ORDER BY s.started_at DESC
        `, [req.params.studentId]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

app.get("/api/assessments/sessions/:sessionId/events", requireAuth, requireRole(["teacher", "student"]), async (req, res, next) => {
    try {
        const sessionRes = await pool.query("SELECT * FROM assessment_sessions WHERE id = $1", [req.params.sessionId]);
        if (!sessionRes.rowCount) {
            return res.status(404).json({ success: false, message: "Assessment session not found." });
        }
        if (req.authUser.role === "student" && sessionRes.rows[0].student_user_id !== req.authUser.id) {
            return res.status(403).json({ success: false, message: "Students can only view their own assessment events." });
        }
        const events = await pool.query(`
            SELECT * FROM assessment_security_events
            WHERE session_id = $1
            ORDER BY created_at ASC
        `, [req.params.sessionId]);
        res.json({ success: true, session: sessionRes.rows[0], data: events.rows });
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
            `SELECT sp.id, sp.student_user_id, sp.video_id, sp.last_position,
                    sp.completion_percentage,
                    (sp.completed OR sp.completion_percentage >= 95) AS completed,
                    sp.date_completed, sp.notes, sp.created_at, sp.updated_at
             FROM student_progress sp
             WHERE sp.student_user_id = $1
             ORDER BY sp.updated_at DESC`,
            [req.params.studentId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

app.get("/api/lesson-access/:lessonId", requireAuth, requireRole(["student"]), async (req, res, next) => {
    try {
        const access = await getLessonAccessState(req.authUser.id, cleanText(req.params.lessonId, 120));
        const current = access.current;
        res.json({
            success: true,
            data: {
                ...access,
                canStart: Boolean(access.canAccess && current?.assessmentUnlocked),
                reason: access.canAccess
                    ? (current?.assessmentUnlocked ? null : "VIDEO_INCOMPLETE")
                    : access.reason,
                videoProgress: Number(current?.videoProgress || 0),
                passingScore: ASSESSMENT_PASSING_SCORE
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/student-results/:studentId", requireAuth, requireRole(["teacher", "student"]), async (req, res, next) => {
    try {
        const studentId = req.params.studentId;
        const identity = await pool.query(`
            SELECT u.id, u.user_id, u.name, u.email, u.role,
                   s.student_number, s.course, s.year_level, s.section, s.program_status
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            WHERE u.id::text = $1 OR u.user_id = $1 OR LOWER(u.email) = LOWER($1)
            LIMIT 1
        `, [studentId]);

        if (!identity.rowCount) return res.status(404).json({ success: false, message: "Student not found." });
        const targetUser = identity.rows[0];

        if (targetUser.role !== "student") {
            return res.status(404).json({ success: false, message: "Student not found." });
        }

        if (req.authUser.role === "student" && req.authUser.id !== targetUser.id && req.authUser.userId !== targetUser.user_id) {
            return res.status(403).json({ success: false, message: "Students can only view their own results." });
        }

        const dbStudentId = targetUser.id;
        const oopCompletion = await getOOPCompletionStatus(dbStudentId);
        const [course, videos, quizzes, practice, swing, oopTopics, swingTopics] = await Promise.all([
            pool.query(`
                SELECT COUNT(*)::int AS total_lessons,
                       COUNT(*) FILTER (WHERE sp.completed AND COALESCE(qa.passed, FALSE) AND ps.challenge_id IS NOT NULL)::int AS completed_lessons
                FROM lessons l
                LEFT JOIN student_progress sp ON sp.student_user_id = $1 AND sp.video_id = l.id
                LEFT JOIN LATERAL (
                  SELECT passed FROM quiz_attempts WHERE student_user_id = $1 AND lesson_id = l.id
                  ORDER BY attempt_number DESC, date_completed DESC LIMIT 1
                ) qa ON TRUE
                LEFT JOIN LATERAL (
                  SELECT ps.challenge_id, ps.score, ps.teacher_score, ps.compile_status FROM practice_submissions ps
                  JOIN programming_challenges pc ON pc.id = ps.challenge_id
                                    WHERE ps.student_id = $1::text AND pc.lesson_id = l.id
                  ORDER BY ps.submitted_at DESC LIMIT 1
                ) ps ON TRUE
                WHERE l.status <> 'Archived'
            `, [dbStudentId]),
            pool.query(`
                SELECT COUNT(*)::int AS total_videos,
                       COUNT(*) FILTER (WHERE completed)::int AS completed_videos,
                       COALESCE(ROUND(AVG(completion_percentage)), 0)::int AS video_percentage
                FROM student_progress WHERE student_user_id = $1
            `, [dbStudentId]),
            pool.query(`
                SELECT COUNT(*)::int AS quiz_attempts, COALESCE(ROUND(AVG(percentage)), 0)::int AS average_quiz_score
                FROM (
                  SELECT DISTINCT ON (assessment_id) percentage
                  FROM quiz_attempts WHERE student_user_id = $1
                  ORDER BY assessment_id, attempt_number DESC, date_completed DESC
                ) latest
            `, [dbStudentId]),
            pool.query(`
                SELECT COUNT(pc.id)::int AS total_practice_activities,
                       COUNT(ps.challenge_id)::int AS submitted_practice_activities,
                      COUNT(ps.challenge_id)::int AS completed_practice_activities,
                      COALESCE(ROUND(AVG(ps.teacher_score)), 0)::int AS average_practice_score
                FROM programming_challenges pc
                LEFT JOIN practice_submissions ps ON ps.challenge_id = pc.id AND ps.student_id = $1::text
                WHERE pc.status <> 'Archived'
            `, [dbStudentId]),
            pool.query(`
                SELECT COUNT(DISTINCT ss.id)::int AS swing_submissions,
                       COUNT(DISTINCT sp.id) FILTER (WHERE sp.content_completed OR sp.video_completed OR sp.quiz_passed OR sp.exercise_completed)::int AS swing_completed_activities,
                       COUNT(DISTINCT sl.id) FILTER (WHERE NOT (COALESCE(sp.content_completed, FALSE) AND COALESCE(sp.video_completed, FALSE) AND COALESCE(sp.quiz_passed, FALSE) AND COALESCE(sp.exercise_completed, FALSE)))::int AS swing_pending_activities
                FROM swing_lessons sl
                LEFT JOIN swing_progress sp ON sp.lesson_id = sl.id AND sp.student_id = $1
                LEFT JOIN swing_programming_exercises se ON se.lesson_id = sl.id
                LEFT JOIN swing_submissions ss ON ss.exercise_id = se.id AND ss.student_id = $1
            `, [dbStudentId])
                        , pool.query(`
                                SELECT l.id, l.title, l.sequence,
                                             sp.completion_percentage AS video_percentage,
                                             (COALESCE(sp.completed, FALSE) OR COALESCE(sp.completion_percentage, 0) >= 95) AS video_completed,
                                                                                         qa.percentage AS quiz_percentage,
                                                                                         EXISTS (
                                                                                             SELECT 1
                                                                                             FROM quiz_attempts passed_attempt
                                                                                             WHERE passed_attempt.student_user_id = $1
                                                                                                 AND passed_attempt.lesson_id = l.id
                                                                                                 AND ${normalizedAssessmentPercentageSql("passed_attempt")} >= ${ASSESSMENT_PASSING_SCORE}
                                                                                         ) AS quiz_passed,
                                             ps.score AS practice_score,
                                             lp.completed AS lesson_completed,
                                             (sp.id IS NOT NULL OR qa.id IS NOT NULL OR ps.challenge_id IS NOT NULL OR lp.id IS NOT NULL) AS attempted
                                FROM lessons l
                                LEFT JOIN student_progress sp ON sp.student_user_id = $1 AND sp.video_id = l.id
                                LEFT JOIN lesson_progress lp ON lp.student_id = $1 AND lp.lesson_id = l.id
                                LEFT JOIN LATERAL (
                                    SELECT id, percentage, passed
                                    FROM quiz_attempts
                                    WHERE student_user_id = $1 AND lesson_id = l.id
                                    ORDER BY attempt_number DESC, date_completed DESC
                                    LIMIT 1
                                ) qa ON TRUE
                                LEFT JOIN LATERAL (
                                    SELECT ps.challenge_id, ps.score
                                    FROM practice_submissions ps
                                    JOIN programming_challenges pc ON pc.id = ps.challenge_id
                                    WHERE ps.student_id = $1::text AND pc.lesson_id = l.id
                                    ORDER BY ps.submitted_at DESC
                                    LIMIT 1
                                ) ps ON TRUE
                                WHERE l.status <> 'Archived'
                                ORDER BY l.sequence, l.title
                        `, [dbStudentId])
                        , pool.query(`
                                SELECT sl.id, sl.title, sl.sequence,
                                             sg.overall_percentage,
                                             sg.content_completed,
                                             sg.video_completed,
                                             sg.video_percentage,
                                             sg.video_last_position,
                                             sg.quiz_passed,
                                             sg.exercise_completed,
                                             qa.score AS quiz_score,
                                             qa.total AS quiz_total,
                                             qa.percentage AS quiz_percentage,
                                             qa.passed AS quiz_attempt_passed,
                                              qa.attempt_count AS quiz_attempt_count,
                                             ss.submission_score,
                                             (sg.id IS NOT NULL OR ss.submission_score IS NOT NULL) AS attempted
                                FROM swing_lessons sl
                                LEFT JOIN swing_progress sg ON sg.student_id = $1::text AND sg.lesson_id = sl.id
                                LEFT JOIN LATERAL (
                                     SELECT score, total, percentage, passed, (SELECT COUNT(*)::int FROM swing_quiz_attempts counted WHERE counted.student_id = $1::text AND counted.assessment_id = 'swing_assessment_' || sl.sequence) AS attempt_count
                                    FROM swing_quiz_attempts
                                    WHERE student_id = $1::text AND lesson_id = sl.id
                                    ORDER BY attempt_number DESC, date_completed DESC
                                    LIMIT 1
                                ) qa ON TRUE
                                LEFT JOIN LATERAL (
                                    SELECT MAX(score) AS submission_score
                                    FROM swing_submissions
                                    WHERE student_id = $1::text
                                        AND exercise_id IN (SELECT id FROM swing_programming_exercises WHERE lesson_id = sl.id)
                                ) ss ON TRUE
                                ORDER BY sl.sequence, sl.title
                        `, [dbStudentId])
        ]);
        const row = { ...course.rows[0], ...videos.rows[0], ...quizzes.rows[0], ...practice.rows[0], ...swing.rows[0] };
        const totalLessons = Number(row.total_lessons || 0);
        const totalVideos = Number(row.total_videos || totalLessons);
        const submittedPracticeActivities = Number(row.submitted_practice_activities || 0);
        const totalPracticeActivities = Number(row.total_practice_activities || 0);
        const oopTopicRows = await Promise.all(oopTopics.rows.map(async topic => {
            const accessState = await getLessonAccessState(dbStudentId, topic.id);
            const evidence = accessState.current;
            return {
                id: topic.id,
                title: topic.title,
                sequence: Number(topic.sequence || 0),
                attempted: Boolean(topic.attempted),
                videoPercentage: topic.video_percentage === null ? null : Number(topic.video_percentage),
                videoCompleted: Boolean(topic.video_completed),
                quizPercentage: topic.quiz_percentage === null ? null : Number(topic.quiz_percentage),
                quizPassed: topic.quiz_passed === null ? null : Boolean(topic.quiz_passed),
                practiceScore: topic.practice_score === null ? null : Number(topic.practice_score),
                practiceCompleted: Boolean(evidence?.practiceCompleted),
                lessonUnlocked: Boolean(accessState.canAccess),
                assessmentUnlocked: Boolean(accessState.canAccess && evidence?.assessmentUnlocked),
                practiceUnlocked: Boolean(accessState.canAccess && evidence?.practiceUnlocked),
                accessReason: accessState.reason,
                lessonProgress: Math.round((
                    (Math.min(100, Math.max(0, Number(topic.video_percentage || 0)) / 95 * 100) / 100) +
                    (evidence?.assessmentPassed ? 1 : 0) +
                    (evidence?.practiceCompleted ? 1 : 0)
                ) / 3 * 100),
                lessonCompleted: Boolean(evidence?.completed)
            };
        }));
        const completedLessons = oopTopicRows.filter(topic => topic.lessonCompleted).length;
        const effectiveTotalLessons = oopTopicRows.length || totalLessons;
        const oopComplete = oopCompletion.oopComplete;
        const swingTopicRows = oopCompletion.oopComplete ? await Promise.all(swingTopics.rows.map(async topic => {
            const accessState = await getLessonAccessState(dbStudentId, topic.id);
            const evidence = accessState.current;
            return {
                id: topic.id,
                title: topic.title,
                sequence: Number(topic.sequence || 0),
                attempted: Boolean(topic.attempted),
                overallPercentage: topic.overall_percentage === null ? null : Number(topic.overall_percentage),
                contentCompleted: Boolean(topic.content_completed),
                videoPercentage: Number(topic.video_percentage || 0),
                videoLastPosition: Number(topic.video_last_position || 0),
                videoCompleted: Boolean(evidence?.videoCompleted),
                quizScore: topic.quiz_score === null ? null : Number(topic.quiz_score),
                quizTotal: topic.quiz_total === null ? null : Number(topic.quiz_total),
                quizPercentage: topic.quiz_percentage === null ? null : Number(topic.quiz_percentage),
                 quizAttemptCount: Number(topic.quiz_attempt_count || 0),
                quizPassed: Boolean(evidence?.assessmentPassed),
                exerciseCompleted: Boolean(evidence?.practiceCompleted),
                submissionScore: topic.submission_score === null ? null : Number(topic.submission_score),
                lessonUnlocked: Boolean(accessState.canAccess),
                assessmentUnlocked: Boolean(accessState.canAccess && evidence?.assessmentUnlocked),
                practiceUnlocked: Boolean(accessState.canAccess && evidence?.practiceUnlocked),
                accessReason: accessState.reason,
                lessonCompleted: Boolean(evidence?.completed)
            };
        })) : [];
        // Overall progress measures evidence across all three required stages.
        // Mastery remains separately practice-gated through lessonCompleted.
        const overallProgress = effectiveTotalLessons
            ? Math.round(oopTopicRows.reduce((sum, topic) => sum + topic.lessonProgress, 0) / effectiveTotalLessons)
            : 0;
        const learningScore = Math.round((overallProgress * 0.40) + (Number(row.average_quiz_score || 0) * 0.30) + (Number(row.average_practice_score || 0) * 0.30));
        const learningClassification = classifyLearningState({
            learningScore,
            quizScore: Number(row.average_quiz_score || 0),
            practiceScore: Number(row.average_practice_score || 0),
            completedLessons,
            totalLessons: effectiveTotalLessons
        });
        res.json({
            success: true,
            data: {
                studentInfo: {
                    id: targetUser.id,
                    userId: targetUser.user_id,
                    name: targetUser.name,
                    email: targetUser.email,
                    section: targetUser.section || "Unassigned",
                    course: targetUser.course || "",
                    yearLevel: targetUser.year_level || "",
                    studentNumber: targetUser.student_number || ""
                },
                overallProgress,
                completedLessons,
                totalLessons: effectiveTotalLessons,
                completedVideos: Number(row.completed_videos || 0),
                totalVideos,
                videoPercentage: Number(row.video_percentage || 0),
                averageQuizScore: Number(row.average_quiz_score || 0),
                quizAttempts: Number(row.quiz_attempts || 0),
                completedPracticeActivities: Number(row.completed_practice_activities || 0),
                submittedPracticeActivities,
                totalPracticeActivities,
                practiceCompletionRate: totalPracticeActivities ? Math.round((submittedPracticeActivities / totalPracticeActivities) * 100) : 0,
                averagePracticeScore: Number(row.average_practice_score || 0),
                learningScore,
                learningState: learningClassification.learningState,
                learningStateInterpretation: learningClassification.interpretation,
                learningStrengths: learningClassification.strengths,
                learningWeaknesses: learningClassification.weaknesses,
                swingSubmissions: oopCompletion.oopComplete ? Number(row.swing_submissions || 0) : 0,
                swingCompletedActivities: oopCompletion.oopComplete ? Number(row.swing_completed_activities || 0) : 0,
                swingPendingActivities: oopCompletion.oopComplete ? Number(row.swing_pending_activities || 0) : 0,
                hasActivity: oopTopicRows.some(topic => topic.attempted) || (oopCompletion.oopComplete && swingTopicRows.some(topic => topic.attempted)),
                oopComplete: oopCompletion.oopComplete,
                swingUnlocked: oopCompletion.oopComplete,
                oopTopics: oopTopicRows,
                swingTopics: swingTopicRows
            }
        });
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
        const safeCompleted = safeCompletionPercentage >= 95;
        const safeNotes = cleanText(notes, 5000);
        const access = await getLessonAccessState(req.authUser.id, safeVideoId);
        if (!access.canAccess) {
            return res.status(403).json({ success: false, message: access.reason });
        }

        const previousProgress = await pool.query(
            "SELECT completion_percentage, completed FROM student_progress WHERE student_user_id = $1 AND video_id = $2",
            [req.authUser.id, safeVideoId]
        );
        const previousPercentage = Number(previousProgress.rows[0]?.completion_percentage || 0);
        const reachedMilestone = [25, 50, 75, 95].some(
            milestone => previousPercentage < milestone && safeCompletionPercentage >= milestone
        );

        const result = await pool.query(`
            INSERT INTO student_progress (student_user_id, video_id, last_position, completion_percentage, completed, date_completed, notes)
            VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN NOW() ELSE NULL END, $6)
            ON CONFLICT (student_user_id, video_id) DO UPDATE SET
              last_position = GREATEST(student_progress.last_position, EXCLUDED.last_position),
              completion_percentage = GREATEST(student_progress.completion_percentage, EXCLUDED.completion_percentage),
              completed = student_progress.completed OR EXCLUDED.completed
                OR GREATEST(student_progress.completion_percentage, EXCLUDED.completion_percentage) >= 95,
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
            INSERT INTO video_progress (student_id, lesson_id, "current_time", duration, watch_percentage, completed)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (student_id, lesson_id) DO UPDATE SET
              "current_time" = GREATEST(video_progress."current_time", EXCLUDED."current_time"),
              duration = EXCLUDED.duration,
              watch_percentage = GREATEST(video_progress.watch_percentage, EXCLUDED.watch_percentage),
              completed = video_progress.completed OR EXCLUDED.completed
                OR GREATEST(video_progress.watch_percentage, EXCLUDED.watch_percentage) >= 95,
              updated_at = NOW()
        `, [req.authUser.id, safeVideoId, safeLastPosition, durationSeconds, safeCompletionPercentage, safeCompleted]);

        if (safeCompleted) {
            await awardXP(req.authUser.id, 20, `Video Completion: ${safeVideoId}`);
        }
        if (reachedMilestone) {
            await logActivity(
                req.authUser.id,
                safeCompletionPercentage >= 95 ? "video_completed" : "video_progress",
                safeCompletionPercentage >= 95
                    ? `Completed video for lesson ${safeVideoId}`
                    : `Watched video for lesson ${safeVideoId} (${Math.round(safeCompletionPercentage)}%)`,
                { lessonId: safeVideoId, completionPercentage: safeCompletionPercentage }
            );
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
            SELECT DISTINCT ON (qa.assessment_id) qa.*,
                   ${normalizedAssessmentPercentageSql("qa")} AS percentage,
                   (${normalizedAssessmentPercentageSql("qa")} >= ${ASSESSMENT_PASSING_SCORE}) AS passed,
                    COUNT(*) OVER (PARTITION BY qa.assessment_id)::int AS attempt_count
            FROM quiz_attempts qa
            WHERE qa.student_user_id = $1
            ORDER BY qa.assessment_id, qa.attempt_number DESC, qa.date_completed DESC
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
            answers = {},
            dateCompleted
        } = req.body || {};

        if (!assessmentId) return res.status(400).json({ success: false, message: "assessmentId is required." });
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can submit quiz attempts." });
        }
        const safeLessonId = cleanText(lessonId, 120);
        const lessonAccess = await getLessonAccessState(req.authUser.id, safeLessonId);
        if (!lessonAccess.canAccess || !lessonAccess.current.videoCompleted) {
            return res.status(403).json({ success: false, message: lessonAccess.reason || "Complete the current lesson prerequisites before starting its assessment." });
        }

        const safeTotal = Math.max(1, Math.floor(clampNumber(total, 1, 100)));
        const safeScore = Math.floor(clampNumber(score, 0, safeTotal));
        const computedPercentage = Math.round(normalizeAssessmentPercentage({ score: safeScore, total: safeTotal }));
        const safeCorrectAnswers = Math.floor(clampNumber(correctAnswers, 0, safeTotal));
        const safeIncorrectAnswers = Math.floor(clampNumber(incorrectAnswers, 0, safeTotal));
        const safeAssessmentId = cleanText(assessmentId, 120);
        const attemptResult = await pool.query(
            "SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = $2",
            [req.authUser.id, safeAssessmentId]
        );
        const safeAttemptNumber = Number(attemptResult.rows[0]?.next_attempt || 1);
        const attemptCountResult = await pool.query("SELECT COUNT(*)::int AS attempt_count FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = $2", [req.authUser.id, safeAssessmentId]);
        const attemptCount = Number(attemptCountResult.rows[0]?.attempt_count || 0);
        if (attemptCount >= MAX_ASSESSMENT_ATTEMPTS) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount, maxAttempts: MAX_ASSESSMENT_ATTEMPTS, message: "You have used all " + MAX_ASSESSMENT_ATTEMPTS + " attempts for this assessment." });
        }

        const safeAnswers = answers && typeof answers === "object" && !Array.isArray(answers) ? answers : {};

        const cappedInsert = await insertCappedAssessmentAttempt({
            studentId: req.authUser.id,
            assessmentId: safeAssessmentId,
            storage: "oop",
            fallbackAttemptNumber: safeAttemptNumber,
            insertQuery: "INSERT INTO quiz_attempts (student_user_id, assessment_id, lesson_id, score, total, percentage, correct_answers, incorrect_answers, passed, attempt_number, answers, date_completed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, COALESCE($12::timestamptz, NOW())) RETURNING *",
            buildParams: attemptNumber => [req.authUser.id, safeAssessmentId, safeLessonId, safeScore, safeTotal, computedPercentage, safeCorrectAnswers, safeIncorrectAnswers, isPassingAssessment({ score: safeScore, total: safeTotal }), attemptNumber, JSON.stringify(safeAnswers), dateCompleted || null]
        });
        if (cappedInsert.limited) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount: cappedInsert.attemptCount, maxAttempts: MAX_ASSESSMENT_ATTEMPTS, message: "You have used all " + MAX_ASSESSMENT_ATTEMPTS + " attempts for this assessment." });
        }
        const result = { rows: [cappedInsert.row] };

        const isPassedNow = isPassingAssessment({ score: safeScore, total: safeTotal });

        // Award completion and pass XP
        await awardXP(req.authUser.id, 30, `Quiz Completion: ${safeAssessmentId}`);
        if (isPassedNow) {
            await awardXP(req.authUser.id, 50, `Quiz Pass: ${safeAssessmentId}`);
        }

        // Log activity
        await logActivity(req.authUser.id, isPassedNow ? "assessment_passed" : "assessment_failed", `${isPassedNow ? "Passed" : "Failed"} assessment for ${safeLessonId || safeAssessmentId}`, {
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
        if (error?.code === "23505" && (error?.constraint === "uq_quiz_attempt_student_assessment_number" || error?.constraint === "uq_swing_quiz_attempt_student_assessment_number")) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", maxAttempts: MAX_ASSESSMENT_ATTEMPTS, message: "This assessment attempt was already recorded by another request." });
        }
        next(error);
    }
});

app.put("/api/swing/progress", requireAuth, async (req, res, next) => {
    try {
        const { lessonId, videoCompleted, contentCompleted, videoPercentage = 0, lastPosition = 0, overallPercentage } = req.body || {};
        if (!lessonId) return res.status(400).json({ success: false, message: "lessonId is required." });
        if (req.authUser.role !== "student") return res.status(403).json({ success: false, message: "Only students can update progress." });

        const safeVideoPercentage = clampNumber(videoPercentage, 0, 100);
        const safeLastPosition = clampNumber(lastPosition, 0, 21600);
        const safeVideoCompleted = safeVideoPercentage >= VIDEO_COMPLETION_THRESHOLD;
        const access = await getLessonAccessState(req.authUser.id, lessonId);
        if (!access.canAccess) return res.status(403).json({ success: false, message: access.reason });

        const result = await pool.query(
            'INSERT INTO swing_progress (student_id, lesson_id, video_completed, content_completed, overall_percentage, video_last_position, video_percentage) VALUES ($1, $2, $3, COALESCE($4, FALSE), COALESCE($5, 0), $6, $7) ON CONFLICT (student_id, lesson_id) DO UPDATE SET video_completed = swing_progress.video_completed OR EXCLUDED.video_completed, content_completed = swing_progress.content_completed OR EXCLUDED.content_completed, overall_percentage = GREATEST(swing_progress.overall_percentage, EXCLUDED.overall_percentage), video_last_position = GREATEST(swing_progress.video_last_position, EXCLUDED.video_last_position), video_percentage = GREATEST(swing_progress.video_percentage, EXCLUDED.video_percentage), updated_at = NOW() RETURNING *',
            [req.authUser.id, lessonId, safeVideoCompleted, contentCompleted, overallPercentage, safeLastPosition, safeVideoPercentage]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});
app.post("/api/swing/quiz-attempts", requireAuth, async (req, res, next) => {
    try {
        const { assessmentId, lessonId, score, total, correctAnswers, incorrectAnswers, answers } = req.body || {};
        if (!assessmentId) return res.status(400).json({ success: false, message: "assessmentId is required." });
        if (req.authUser.role !== "student") return res.status(403).json({ success: false, message: "Only students can submit quiz attempts." });
        const swingLessonResult = await pool.query("SELECT sequence FROM swing_lessons WHERE id = $1", [lessonId]);
        if (!swingLessonResult.rowCount || assessmentId !== "swing_assessment_" + swingLessonResult.rows[0].sequence) {
            return res.status(400).json({ success: false, message: "The assessment does not belong to this Java Swing lesson." });
        }
        const access = await getLessonAccessState(req.authUser.id, lessonId);
        if (!access.canAccess || !access.current.videoCompleted) {
            return res.status(403).json({ success: false, message: access.reason || "Complete video first." });
        }
        const safeTotal = Math.max(1, Math.floor(Number(total) || 0));
        const safeScore = Math.max(0, Math.min(safeTotal, Math.floor(Number(score) || 0)));
        const computedPercentage = Math.round((safeScore / safeTotal) * 100);
        const safePassed = computedPercentage >= ASSESSMENT_PASSING_SCORE;
        const cappedInsert = await insertCappedAssessmentAttempt({
            studentId: req.authUser.id,
            assessmentId,
            storage: "swing",
            insertQuery: "INSERT INTO swing_quiz_attempts (student_id, assessment_id, lesson_id, score, total, percentage, correct_answers, incorrect_answers, passed, attempt_number, answers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) RETURNING *",
            buildParams: attemptNumber => [req.authUser.id, assessmentId, lessonId, safeScore, safeTotal, computedPercentage, Math.max(0, Math.min(safeTotal, Math.floor(Number(correctAnswers) || safeScore))), Math.max(0, Math.min(safeTotal, Math.floor(Number(incorrectAnswers) || (safeTotal - safeScore)))), safePassed, attemptNumber, JSON.stringify(answers && typeof answers === "object" ? answers : {})]
        });
        if (cappedInsert.limited) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount: cappedInsert.attemptCount, maxAttempts: MAX_ASSESSMENT_ATTEMPTS, message: "You have used all " + MAX_ASSESSMENT_ATTEMPTS + " attempts for this assessment." });
        }
        const result = await pool.query("INSERT INTO swing_progress (student_id, lesson_id, quiz_passed) VALUES ($1, $2, $3) ON CONFLICT (student_id, lesson_id) DO UPDATE SET quiz_passed = swing_progress.quiz_passed OR EXCLUDED.quiz_passed, updated_at = NOW() RETURNING *", [req.authUser.id, lessonId, safePassed]);
        res.json({ success: true, data: { ...result.rows[0], attemptCount: cappedInsert.attemptCount, attemptNumber: cappedInsert.attemptNumber, maxAttempts: MAX_ASSESSMENT_ATTEMPTS } });
    } catch (error) {
        next(error);
    }
});

app.post("/api/swing/submissions", requireAuth, async (req, res, next) => {
    try {
        const { challengeId, topicId, sourceCode, programOutput, compileStatus, score, errorMessage } = req.body || {};
        if (!challengeId) return res.status(400).json({ success: false, message: "challengeId is required." });
        if (req.authUser.role !== "student") return res.status(403).json({ success: false, message: "Only students can submit." });

        // topicId here is the lessonId.
        const exerciseResult = await pool.query(
            'SELECT id FROM swing_programming_exercises WHERE id = $1 AND lesson_id = $2',
            [challengeId, topicId]
        );
        if (!exerciseResult.rowCount) return res.status(400).json({ success: false, message: "The practice exercise does not belong to this lesson." });
        const access = await getLessonAccessState(req.authUser.id, topicId);
        if (!access.canAccess || !access.current.assessmentPassed) {
            return res.status(403).json({ success: false, message: access.reason || "Pass assessment first." });
        }

        const result = await pool.query(`
            INSERT INTO swing_submissions (student_id, exercise_id, source_code, program_output, status, score, feedback)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [req.authUser.id, challengeId, sourceCode, programOutput || errorMessage, compileStatus, score, ""]);

        // Submission, not compiler score or teacher review, completes the
        // practice gate for progression.
        await pool.query(`
            INSERT INTO swing_progress (student_id, lesson_id, exercise_completed)
            VALUES ($1, $2, TRUE)
            ON CONFLICT (student_id, lesson_id) DO UPDATE SET
              exercise_completed = TRUE,
              updated_at = NOW()
        `, [req.authUser.id, topicId]);

        const lessonAccess = await getLessonAccessState(req.authUser.id, topicId);
        const nextLessonResult = await pool.query(
            `SELECT id FROM swing_lessons
             WHERE sequence = (
               SELECT sequence + 1 FROM swing_lessons WHERE id = $1
             )
             LIMIT 1`,
            [topicId]
        );
        const nextLessonAccess = nextLessonResult.rowCount
            ? await getLessonAccessState(req.authUser.id, nextLessonResult.rows[0].id)
            : null;

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                practiceCompleted: Boolean(lessonAccess.current?.practiceCompleted),
                lessonCompleted: Boolean(lessonAccess.current?.completed),
                lessonAccess: lessonAccess.current,
                nextLessonAccess: nextLessonAccess?.current || null
            }
        });
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

app.get("/api/practice-challenges", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT c.*, COALESCE(json_agg(t.*) FILTER (WHERE t.id IS NOT NULL), '[]') AS test_cases
            FROM programming_challenges c
            LEFT JOIN challenge_test_cases t ON t.challenge_id = c.id
            WHERE c.id = ANY($1::text[])
            GROUP BY c.id
            ORDER BY c.id
        `, [ACTIVE_OOP_PRACTICE_IDS]);
        const challenges = result.rows.map(toClientPracticeChallenge);

        // For student role, NEVER expose hidden test cases or matchers to frontend
        if (req.authUser.role === "student") {
            const redacted = challenges.map(c => ({
                ...c,
                testCases: (c.testCases || [])
                    .filter(t => !t.isHidden && !t.is_hidden)
                    .map(t => ({
                        id: t.id,
                        input: t.input || "",
                        expectedOutput: t.expectedOutput || t.expected_output || "",
                        isHidden: false
                    }))
            }));
            return res.json({ success: true, data: redacted });
        }

        res.json({ success: true, data: challenges });
    } catch (error) {
        next(error);
    }
});

app.post("/api/practice-challenges/:id/run", requireAuth, async (req, res, next) => {
    try {
        const { sourceCode = "" } = req.body || {};
        const challengeId = cleanText(req.params.id, 120);

        // Find challenge in database or fallback
        const result = await pool.query(`
            SELECT c.*, COALESCE(json_agg(t.*) FILTER (WHERE t.id IS NOT NULL), '[]') AS test_cases
            FROM programming_challenges c
            LEFT JOIN challenge_test_cases t ON t.challenge_id = c.id
            WHERE c.id = $1
            GROUP BY c.id
        `, [challengeId]);

        let challenge = result.rows[0] ? toClientPracticeChallenge(result.rows[0]) : null;
        if (!challenge) {
            challenge = PRACTICE_CHALLENGES.find(c => c.id === challengeId) || null;
        }

        if (!challenge) {
            return res.status(404).json({ success: false, message: "Practice challenge not found." });
        }

        const challengeLessonId = challenge.lessonId || challenge.lesson_id;
        const lessonAccess = await getLessonAccessState(req.authUser.id, challengeLessonId);
        if (!lessonAccess.canAccess || !lessonAccess.current?.practiceUnlocked) {
            return res.status(403).json({ success: false, message: lessonAccess.reason || "Complete the lesson video and assessment before running practice." });
        }

        const validation = await evaluateJavaSubmission(challenge, String(sourceCode));
        const runResult = {
            compileStatus: validation.compileStatus,
            evaluationStatus: validation.evaluationStatus,
            executionStatus: validation.compileStatus === 'success' ? 'executed' : 'not_executed',
            validationStatus: validation.oopStructureCheck,
            score: validation.score,
            infrastructureError: false,
            runtime: 0,
            memoryUsage: 0,
            programOutput: validation.programOutput || '',
            errorMessage: validation.compilerError || validation.note,
            testResults: buildEvaluationResults(validation, challenge)
        };

        res.json({
            success: true,
            data: {
                compileStatus: runResult.compileStatus,
                evaluationStatus: runResult.evaluationStatus,
                executionStatus: runResult.executionStatus,
                validationStatus: runResult.validationStatus,
                score: runResult.score,
                infrastructureError: Boolean(runResult.infrastructureError),
                runtime: runResult.runtime,
                memoryUsage: runResult.memoryUsage,
                programOutput: runResult.programOutput,
                errorMessage: runResult.errorMessage,
                testResults: runResult.testResults
                ,
                canRetry: true,
                editorLocked: false,
                practiceCompleted: false,
                debug: runResult.debug
            }
        });
    } catch (error) {
        if (error.code === "JAVA_COMPILER_UNAVAILABLE") {
            return res.status(503).json({
                success: false,
                code: "JAVA_COMPILER_UNAVAILABLE",
                message: "The server Java compiler is unavailable. Your submission was not saved and practice completion was not changed.",
                diagnostics: error.diagnostics
            });
        }
        next(error);
    }
});

app.post("/api/practice-challenges", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
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
            clampNumber(body.passingScore ?? body.passing_score ?? 80, 0, 100),
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

app.put("/api/practice-challenges/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
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

app.delete("/api/practice-challenges/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const result = await pool.query("DELETE FROM programming_challenges WHERE id = $1 RETURNING id", [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Practice activity not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/api/monitoring-requests", requireAuth, requireRole(["teacher", "student"]), async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT mr.id, mr.status,
                   teacher.id AS teacher_id, teacher.name AS teacher_name, teacher.email AS teacher_email,
                   student.id AS student_user_id, student.user_id AS student_public_id,
                   student.name AS student_name, student.email AS student_email
            FROM monitoring_requests mr
            JOIN users teacher ON teacher.id = mr.teacher_id
            JOIN users student ON student.id = mr.student_id
            WHERE mr.teacher_id = $1 OR mr.student_id = $1
            ORDER BY mr.created_at DESC
        `, [req.authUser.id]);
        res.json({
            success: true,
            data: result.rows.map(row => ({
                id: row.id,
                teacherEmail: row.teacher_email,
                teacherName: row.teacher_name,
                studentEmail: row.student_email,
                studentName: row.student_name,
                studentId: row.student_public_id || row.student_user_id,
                status: row.status
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.post("/api/monitoring-requests", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const identifier = cleanText(req.body?.studentId || req.body?.studentEmail || "", 255);
        if (!identifier) return res.status(400).json({ success: false, message: "A student ID or email is required." });
        const student = await pool.query(`
            SELECT id, user_id, name, email
            FROM users
            WHERE role = 'student'
              AND (id::text = $1 OR user_id = $1 OR LOWER(email) = LOWER($1))
            LIMIT 1
        `, [identifier]);
        if (!student.rowCount) return res.status(404).json({ success: false, message: "Student not found." });
        const result = await pool.query(`
            INSERT INTO monitoring_requests (teacher_id, student_id, status)
            VALUES ($1, $2, 'pending')
            ON CONFLICT (teacher_id, student_id) DO UPDATE SET
              status = CASE WHEN monitoring_requests.status = 'rejected' THEN 'pending' ELSE monitoring_requests.status END,
              updated_at = NOW()
            RETURNING id, status
        `, [req.authUser.id, student.rows[0].id]);
        res.status(201).json({
            success: true,
            data: {
                id: result.rows[0].id,
                teacherEmail: req.authUser.email,
                teacherName: req.authUser.name || req.authUser.email,
                studentEmail: student.rows[0].email,
                studentName: student.rows[0].name,
                studentId: student.rows[0].user_id || student.rows[0].id,
                status: result.rows[0].status
            }
        });
    } catch (error) {
        next(error);
    }
});

app.patch("/api/monitoring-requests/:id", requireAuth, requireRole(["teacher", "student"]), async (req, res, next) => {
    try {
        const status = cleanText(req.body?.status || "", 20);
        if (!["pending", "accepted", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid monitoring request status." });
        }
        const result = await pool.query(`
            UPDATE monitoring_requests
            SET status = $2, updated_at = NOW()
            WHERE id = $1 AND (
              teacher_id = $3
              OR (student_id = $3 AND status = 'pending')
            )
            RETURNING id, status
        `, [req.params.id, status, req.authUser.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Monitoring request not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/api/teacher/monitoring", requireAuth, requireRole(["teacher"]), async (_req, res, next) => {
    try {
        const [students, teachers] = await Promise.all([
            pool.query(`
                WITH lesson_totals AS (
                    SELECT COUNT(*)::int AS total_lessons
                    FROM lessons
                    WHERE status <> 'Archived'
                ),
                lesson_evidence AS (
                    SELECT
                      u.id AS student_id,
                      l.id AS lesson_id,
                      COALESCE(sp.completion_percentage, 0) AS video_percentage,
                      COALESCE((
                        SELECT qa.percentage
                        FROM quiz_attempts qa
                        WHERE qa.student_user_id = u.id
                          AND qa.lesson_id = l.id
                        ORDER BY qa.attempt_number DESC, qa.date_completed DESC
                        LIMIT 1
                      ), 0) AS assessment_score,
                      EXISTS (
                        SELECT 1
                        FROM quiz_attempts qa
                        WHERE qa.student_user_id = u.id
                          AND qa.lesson_id = l.id
                          AND ${normalizedAssessmentPercentageSql("qa")} >= ${ASSESSMENT_PASSING_SCORE}
                      ) AS assessment_passed,
                      CASE
                        WHEN pc.id IS NULL THEN TRUE
                        ELSE COALESCE(practice.teacher_score, practice.score, 0) >= pc.passing_score
                          AND (practice.teacher_score IS NOT NULL OR practice.compile_status = 'success')
                          AND COALESCE(practice.remedial_required, FALSE) = FALSE
                      END AS practice_completed
                    FROM users u
                    CROSS JOIN lessons l
                    LEFT JOIN student_progress sp
                      ON sp.student_user_id = u.id AND sp.video_id = l.id
                    LEFT JOIN LATERAL (
                      SELECT pc.id, pc.passing_score
                      FROM programming_challenges pc
                      WHERE pc.lesson_id = l.id AND pc.status <> 'Archived'
                      ORDER BY pc.id
                      LIMIT 1
                    ) pc ON TRUE
                    LEFT JOIN LATERAL (
                      SELECT ps.score, ps.teacher_score, ps.compile_status, ps.remedial_required
                      FROM practice_submissions ps
                      JOIN programming_challenges pc2 ON pc2.id = ps.challenge_id
                      WHERE ps.student_id IN (u.id::text, u.user_id, u.email)
                        AND pc2.lesson_id = l.id
                      ORDER BY ps.submitted_at DESC
                      LIMIT 1
                    ) practice ON TRUE
                    WHERE u.role = 'student'
                      AND l.status <> 'Archived'
                ),
                student_metrics AS (
                    SELECT
                      le.student_id,
                      COUNT(*) FILTER (
                        WHERE le.video_percentage >= 95
                          AND le.assessment_passed
                          AND le.practice_completed
                      )::int AS completed_lessons,
                      ROUND(AVG(le.video_percentage))::int AS video_progress,
                      ROUND(AVG((
                        (LEAST(100, GREATEST(0, le.video_percentage)) / 95.0)
                        + CASE WHEN le.assessment_passed THEN 1 ELSE 0 END
                        + CASE WHEN le.practice_completed THEN 1 ELSE 0 END
                      ) / 3.0 * 100))::int AS overall_progress
                    FROM lesson_evidence le
                    GROUP BY le.student_id
                ),
                latest_quiz AS (
                    SELECT DISTINCT ON (qa.student_user_id, qa.assessment_id)
                      qa.student_user_id,
                      qa.percentage
                    FROM quiz_attempts qa
                    ORDER BY qa.student_user_id, qa.assessment_id, qa.attempt_number DESC, qa.date_completed DESC
                ),
                quiz_metrics AS (
                    SELECT student_user_id, ROUND(AVG(percentage))::int AS quiz_average
                    FROM latest_quiz
                    GROUP BY student_user_id
                ),
                practice_metrics AS (
                    SELECT
                      u.id AS student_id,
                      ROUND(AVG(COALESCE(ps.teacher_score, ps.score)))::int AS practice_average
                    FROM users u
                    LEFT JOIN practice_submissions ps
                      ON ps.student_id IN (u.id::text, u.user_id, u.email)
                    WHERE u.role = 'student'
                    GROUP BY u.id
                ),
                latest_activity AS (
                    SELECT DISTINCT ON (student_id)
                      student_id, type, action, lesson_id, lesson_title, lesson_sequence, timestamp
                    FROM (
                      SELECT
                        al.student_id::text,
                        CASE
                          WHEN al.activity_type IN ('lesson_complete', 'lesson_completed') THEN 'lesson_completed'
                          ELSE al.activity_type
                        END AS type,
                        al.activity_type AS action,
                        NULLIF(al.metadata->>'lessonId', '') AS lesson_id,
                        l.title AS lesson_title,
                        l.sequence AS lesson_sequence,
                        al.created_at AS timestamp,
                        0 AS priority
                      FROM activity_logs al
                      LEFT JOIN lessons l ON l.id = NULLIF(al.metadata->>'lessonId', '')
                      WHERE al.activity_type IN (
                        'video_progress', 'video_started', 'video_completed',
                        'assessment_submitted', 'assessment_passed', 'assessment_failed',
                        'practice_submitted', 'practice_compile_success',
                        'practice_compile_failed', 'practice_passed', 'practice_failed',
                        'lesson_unlocked', 'lesson_complete', 'lesson_completed'
                      )
                      UNION ALL
                      SELECT
                        ps.student_id::text AS student_id,
                        CASE WHEN COALESCE(ps.teacher_score, ps.score, 0) >= 70
                                  AND (ps.teacher_score IS NOT NULL OR ps.compile_status = 'success')
                             THEN 'practice_passed' ELSE 'practice_submission' END AS type,
                        CASE WHEN COALESCE(ps.teacher_score, ps.score, 0) >= 70
                                  AND (ps.teacher_score IS NOT NULL OR ps.compile_status = 'success')
                             THEN 'passed' ELSE 'submitted' END AS action,
                        pc.lesson_id,
                        l.title AS lesson_title,
                        l.sequence,
                        CASE WHEN COALESCE(ps.teacher_score, ps.score, 0) >= 70
                                  AND (ps.teacher_score IS NOT NULL OR ps.compile_status = 'success')
                             THEN COALESCE(ps.graded_at, ps.submitted_at) ELSE ps.submitted_at END,
                        1 AS priority
                      FROM practice_submissions ps
                      JOIN programming_challenges pc ON pc.id = ps.challenge_id
                      LEFT JOIN lessons l ON l.id = pc.lesson_id
                      UNION ALL
                      SELECT
                        qa.student_user_id::text,
                        CASE WHEN qa.passed THEN 'assessment_passed' ELSE 'assessment_failed' END,
                        CASE WHEN qa.passed THEN 'passed' ELSE 'failed' END,
                        qa.lesson_id,
                        l.title,
                        l.sequence,
                        qa.date_completed,
                        2
                      FROM quiz_attempts qa
                      LEFT JOIN lessons l ON l.id = qa.lesson_id
                      UNION ALL
                      SELECT
                        sp.student_user_id::text,
                        CASE WHEN sp.completed OR sp.completion_percentage >= 95
                             THEN 'video_completed' ELSE 'video_started' END,
                        CASE WHEN sp.completed OR sp.completion_percentage >= 95
                             THEN 'completed' ELSE 'started' END,
                        sp.video_id,
                        l.title,
                        l.sequence,
                        sp.updated_at,
                        3
                      FROM student_progress sp
                      LEFT JOIN lessons l ON l.id = sp.video_id
                      UNION ALL
                      SELECT
                        lp.student_id::text,
                        'lesson_completed',
                        'completed',
                        lp.lesson_id,
                        l.title,
                        l.sequence,
                        COALESCE(lp.completed_at, lp.updated_at),
                        4
                      FROM lesson_progress lp
                      LEFT JOIN lessons l ON l.id = lp.lesson_id
                      WHERE lp.completed = TRUE
                      UNION ALL
                      SELECT
                        vp.student_id::text,
                        CASE WHEN vp.completed OR vp.watch_percentage >= 95
                             THEN 'video_completed' ELSE 'video_progress' END,
                        CASE WHEN vp.completed OR vp.watch_percentage >= 95
                             THEN 'completed' ELSE 'progress_updated' END,
                        vp.lesson_id,
                        l.title,
                        l.sequence,
                        vp.updated_at,
                        5
                      FROM video_progress vp
                      LEFT JOIN lessons l ON l.id = vp.lesson_id
                    ) events
                    WHERE timestamp IS NOT NULL
                    ORDER BY student_id, timestamp DESC, priority ASC
                )
                SELECT
                  u.id, u.name, u.email, u.account_status, s.student_number, s.course, s.year_level, s.section,
                  CASE
                    WHEN lt.total_lessons = 0 THEN 0
                    ELSE COALESCE(sm.overall_progress, 0)
                  END AS progress,
                  COALESCE(sm.video_progress, 0) AS video_progress,
                  COALESCE(qm.quiz_average, 0) AS quiz_average,
                  COALESCE(pm.practice_average, 0) AS programming_score,
                  ROUND((
                    (COALESCE(sm.overall_progress, 0) * 0.40)
                    + (COALESCE(qm.quiz_average, 0) * 0.30)
                    + (COALESCE(pm.practice_average, 0) * 0.30)
                  ))::int AS learning_score,
                  la.type AS activity_type,
                  la.action AS activity_action,
                  la.lesson_id AS activity_lesson_id,
                  la.lesson_title AS activity_lesson_title,
                  la.lesson_sequence AS activity_lesson_sequence,
                  la.timestamp AS activity_timestamp
                FROM users u
                JOIN students s ON s.user_id = u.id
                CROSS JOIN lesson_totals lt
                LEFT JOIN student_metrics sm ON sm.student_id = u.id
                LEFT JOIN quiz_metrics qm ON qm.student_user_id = u.id
                LEFT JOIN practice_metrics pm ON pm.student_id = u.id
                LEFT JOIN latest_activity la ON la.student_id IN (u.id::text, u.user_id, u.email)
                WHERE u.role = 'student'
                GROUP BY u.id, s.student_number, s.course, s.year_level, s.section,
                         lt.total_lessons, sm.completed_lessons, sm.overall_progress, sm.video_progress,
                         qm.quiz_average, pm.practice_average,
                         la.type, la.action, la.lesson_id, la.lesson_title, la.lesson_sequence, la.timestamp
                ORDER BY u.created_at DESC
            `).catch(async error => {
                console.error("[teacher-monitoring] evidence query failed; using compatibility query", {
                    message: error.message,
                    code: error.code
                });
                return pool.query(`
                    SELECT
                      u.id, u.name, u.email, u.account_status,
                      s.student_number, s.course, s.year_level, s.section,
                      COALESCE(ROUND((
                        SELECT AVG(sp.completion_percentage)
                        FROM student_progress sp
                        WHERE sp.student_user_id = u.id
                      )), 0)::int AS progress,
                      COALESCE(ROUND((
                        SELECT AVG(sp.completion_percentage)
                        FROM student_progress sp
                        WHERE sp.student_user_id = u.id
                      )), 0)::int AS video_progress,
                      COALESCE(ROUND((
                        SELECT AVG(qa.percentage)
                        FROM quiz_attempts qa
                        WHERE qa.student_user_id = u.id
                      )), 0)::int AS quiz_average,
                      COALESCE(ROUND((
                        SELECT AVG(COALESCE(ps.teacher_score, ps.score))
                        FROM practice_submissions ps
                        WHERE ps.student_id IN (u.id::text, u.user_id, u.email)
                      )), 0)::int AS programming_score,
                      ROUND((
                        (COALESCE(ROUND((
                          SELECT AVG(sp.completion_percentage)
                          FROM student_progress sp
                          WHERE sp.student_user_id = u.id
                        )), 0) * 0.40)
                        + (COALESCE(ROUND((
                          SELECT AVG(qa.percentage)
                          FROM quiz_attempts qa
                          WHERE qa.student_user_id = u.id
                        )), 0) * 0.30)
                        + (COALESCE(ROUND((
                          SELECT AVG(COALESCE(ps.teacher_score, ps.score))
                          FROM practice_submissions ps
                          WHERE ps.student_id IN (u.id::text, u.user_id, u.email)
                        )), 0) * 0.30)
                      ))::int AS learning_score,
                      NULL::text AS activity_type,
                      NULL::text AS activity_action,
                      NULL::text AS activity_lesson_id,
                      NULL::text AS activity_lesson_title,
                      NULL::int AS activity_lesson_sequence,
                      NULL::timestamptz AS activity_timestamp
                    FROM users u
                    JOIN students s ON s.user_id = u.id
                    WHERE u.role = 'student'
                    ORDER BY u.created_at DESC
                `);
            }),
            pool.query(`
                SELECT u.id, u.name, u.email, u.account_status, t.employee_id, t.department
                FROM users u
                JOIN teachers t ON t.user_id = u.id
                WHERE u.role = 'teacher'
                ORDER BY u.created_at DESC
            `)
        ]);
        const monitoredStudents = await Promise.all(students.rows.map(async student => {
            const oopCompletion = await getOOPCompletionStatus(student.id);
            if (!oopCompletion.oopComplete) {
                return {
                    ...student,
                    oop_complete: false,
                    swing_submissions: 0,
                    swing_completed_activities: 0,
                    swing_pending_activities: 0
                };
            }
            const swingResult = await pool.query(`
                SELECT
                    COUNT(DISTINCT ss.id)::int AS swing_submissions,
                    COUNT(DISTINCT sp.id) FILTER (
                        WHERE sp.content_completed AND sp.video_completed
                    )::int AS swing_completed_activities,
                    COUNT(DISTINCT sp.id) FILTER (
                        WHERE NOT (sp.content_completed AND sp.video_completed)
                    )::int AS swing_pending_activities
                FROM swing_lessons sl
                LEFT JOIN swing_progress sp ON sp.student_id = $1::text AND sp.lesson_id = sl.id
                LEFT JOIN swing_programming_exercises se ON se.lesson_id = sl.id
                LEFT JOIN swing_submissions ss ON ss.student_id = $1::text AND ss.exercise_id = se.id
            `, [student.id]);
            return {
                ...student,
                oop_complete: true,
                ...swingResult.rows[0]
            };
        }));
        res.json({ success: true, data: { students: monitoredStudents, teachers: teachers.rows } });
    } catch (error) {
        next(error);
    }
});

/* Removed admin-only reports endpoint.
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
                SELECT pc.title, COUNT(ps.challenge_id)::int AS submissions,
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
*/


const selectPracticeSubmissionById = async (id) => {
    const result = await pool.query(`
        SELECT ps.*, pc.title AS challenge_title, pc.topic_id, pc.lesson_id, pc.description AS challenge_description,
               pc.requirements AS challenge_requirements, pc.sample_output AS challenge_sample_output,
               u.id AS student_user_id, u.name AS student_name, u.email AS student_email,
               COALESCE(s.section, 'Unassigned') AS section,
               grader.name AS graded_by_name
        FROM practice_submissions ps
        JOIN programming_challenges pc ON pc.id = ps.challenge_id
        LEFT JOIN users u ON ps.student_id IN (u.id::text, u.user_id, u.email)
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN users grader ON grader.id = ps.graded_by
        WHERE ps.${practiceSubmissionKeyColumn} = $1
    `, [id]);
    return result.rows[0] ? normalizeSubmissionTestResults(result.rows[0]) : null;
};

const normalizeSubmissionTestResults = (row) => ({
    ...row,
    id: row.id || row.submission_id,
    test_results: Array.isArray(row.test_results)
        ? row.test_results
        : Array.isArray(row.test_results?.requirements)
            ? row.test_results.requirements.map((item, index) => ({
                id: `static_${index + 1}`,
                isHidden: false,
                passed: Boolean(item.passed),
                expectedOutput: item.requirement || '',
                actualOutput: item.passed ? item.requirement || '' : '',
                message: item.message || ''
            }))
            : []
});

const normalizeTeacherSubmission = (row) => ({
    ...normalizeSubmissionTestResults(row),
    id: row.id,
    studentId: row.student_user_id || row.student_id,
    studentName: row.student_name || row.student_email || row.student_id,
    studentEmail: row.student_email || '',
    topicId: row.topic_id || row.challenge_id,
    topicTitle: row.challenge_title || row.topic_id || '',
    requirements: Array.isArray(row.challenge_requirements) ? row.challenge_requirements : [],
    sampleOutput: row.challenge_sample_output || '',
    lessonId: row.lesson_id || '',
    sourceCode: row.source_code || '',
    submissionStatus: row.review_status === 'graded' ? 'graded' : row.review_status === 'returned' ? 'returned' : row.review_status === 'pending_review' ? 'pending_review' : 'submitted',
    reviewStatus: row.review_status || 'submitted',
    status: row.review_status || 'submitted',
    teacherScore: row.teacher_score === null || row.teacher_score === undefined ? null : Number(row.teacher_score),
    teacherFeedback: row.teacher_feedback || '',
    compileStatus: row.compile_status || 'not_executed',
    testResults: Array.isArray(row.test_results) ? row.test_results : [],
    grade: row.teacher_score !== null && row.teacher_score !== undefined ? Number(row.teacher_score) : null,
    feedback: row.teacher_feedback || '',
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at || null
});

app.get("/api/practice-submissions", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const [studentCountResult, totalCountResult, result] = await Promise.all([
            pool.query(`
                SELECT COUNT(DISTINCT u.id)::int AS count
                FROM users u
                WHERE u.role = 'student'
                  AND EXISTS (
                    SELECT 1 FROM monitoring_requests mr
                    WHERE mr.teacher_id = $1
                      AND mr.status = 'accepted'
                  AND mr.student_id = u.id
                  )
            `, [req.authUser.id]),
            pool.query(`SELECT COUNT(*)::int AS count FROM practice_submissions`),
            pool.query(`
            SELECT ps.*, pc.title AS challenge_title, pc.topic_id, pc.lesson_id,
                   pc.description AS challenge_description, pc.requirements AS challenge_requirements,
                   pc.sample_output AS challenge_sample_output,
                   u.id AS student_user_id, u.name AS student_name, u.email AS student_email,
                   COALESCE(s.section, 'Unassigned') AS section,
                   grader.name AS graded_by_name
            FROM practice_submissions ps
            LEFT JOIN programming_challenges pc ON pc.id = ps.challenge_id
            LEFT JOIN users u ON ps.student_id IN (u.id::text, u.user_id, u.email)
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN users grader ON grader.id = ps.graded_by
            WHERE EXISTS (
                SELECT 1 FROM monitoring_requests mr
                WHERE mr.teacher_id = $1
                  AND mr.status = 'accepted'
                  AND (mr.student_id = u.id OR mr.student_id::text = ps.student_id)
            )
            ORDER BY ps.submitted_at DESC
            `, [req.authUser.id])
        ]);
        const submissions = result.rows.map(normalizeTeacherSubmission);
        console.info('[submission-monitoring]', {
            teacherId: req.authUser.id,
            teacherDatabaseId: req.authUser.id,
            studentsFound: Number(studentCountResult.rows[0]?.count || 0),
            submissionsFoundBeforeFiltering: Number(totalCountResult.rows[0]?.count || 0),
            visibleSubmissions: submissions.length
        });
        res.json({ success: true, data: submissions });
    } catch (error) {
        next(error);
    }
});

app.get("/api/practice-submissions/me", requireAuth, requireRole(["student"]), async (req, res, next) => {
    try {
        const authenticatedStudentIds = [
            req.authUser.id,
            req.authUser.userId,
            req.authUser.email
        ].filter(Boolean);
        const result = await pool.query(`
            SELECT ps.*, pc.title AS challenge_title, pc.topic_id, pc.lesson_id,
                   ps.teacher_score, ps.teacher_feedback, ps.graded_at, ps.review_status, ps.remedial_required,
                   grader.name AS graded_by_name
            FROM practice_submissions ps
            JOIN programming_challenges pc ON pc.id = ps.challenge_id
            LEFT JOIN users grader ON grader.id = ps.graded_by
            WHERE ps.student_id = ANY($1::text[])
            ORDER BY ps.submitted_at DESC
        `, [authenticatedStudentIds]);
        res.json({ success: true, data: result.rows.map(normalizeSubmissionTestResults) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/practice-submissions", requireAuth, requireRole(["student"]), async (req, res, next) => {
    try {
        const {
            challengeId,
            sourceCode
        } = req.body || {};

        if (!challengeId || typeof sourceCode !== "string" || !sourceCode.trim()) {
            return res.status(400).json({ success: false, message: "Code submission cannot be empty." });
        }
        if (sourceCode.length > 50000) {
            return res.status(413).json({ success: false, message: "Code submission cannot exceed 50,000 characters." });
        }

        const safeChallengeId = cleanText(challengeId, 120);

        const prerequisite = await pool.query(`
            SELECT pc.id, pc.lesson_id, pc.title AS challenge_title, pc.passing_score
            FROM programming_challenges pc
            WHERE pc.id = $1 AND pc.status <> 'Archived'
        `, [safeChallengeId]);

        if (!prerequisite.rowCount) {
            return res.status(404).json({ success: false, message: "Practice challenge not found." });
        }

        const lessonAccess = await getLessonAccessState(req.authUser.id, prerequisite.rows[0].lesson_id);
        if (!lessonAccess.canAccess || !lessonAccess.current.videoCompleted) {
            return res.status(403).json({ success: false, message: "Pass the current lesson assessment before submitting practice." });
        }
        const lessonId = prerequisite.rows[0].lesson_id;
        const assessmentResult = await pool.query(`
            SELECT qa.assessment_id, qa.lesson_id, qa.score, qa.total, qa.percentage, qa.correct_answers
            FROM quiz_attempts qa
            WHERE qa.student_user_id = $1
              AND (
                qa.lesson_id = $2
                OR qa.assessment_id = 'oop_assessment_' || (SELECT sequence FROM lessons WHERE id = $2)
                OR EXISTS (
                    SELECT 1 FROM assessments a
                    WHERE a.id = qa.assessment_id AND a.lesson_id = $2
                )
              )
            ORDER BY qa.attempt_number DESC, qa.date_completed DESC
        `, [req.authUser.id, lessonId]);
        const databaseAssessmentIds = (await pool.query(
            "SELECT id FROM assessments WHERE lesson_id = $1",
            [lessonId]
        )).rows.map(row => row.id);
        const canonicalAssessmentId = `oop_assessment_${String(lessonId).match(/(\d+)$/)?.[1] || ""}`;
        const quizPassed = assessmentResult.rows.some(attempt => (
            assessmentMatchesLesson({
                assessmentId: attempt.assessment_id,
                attemptLessonId: attempt.lesson_id,
                lessonId,
                canonicalAssessmentId,
                databaseAssessmentIds
            }) && normalizeAssessmentPercentage(attempt) >= ASSESSMENT_PASSING_SCORE
        ));
        if (!quizPassed) {
            return res.status(403).json({ success: false, message: `Pass the required assessment with ${ASSESSMENT_PASSING_SCORE}% or higher before submitting practice.` });
        }

        const result = await pool.query(`
            INSERT INTO practice_submissions (
              student_id, challenge_id, source_code, program_output, compile_status,
              runtime, memory_usage, score, error_message, test_results, is_locked, review_status
            )
            VALUES ($1, $2, $3, '', 'not_executed', 0, NULL, NULL, '', '[]'::jsonb, FALSE, 'pending_review')
            RETURNING *
        `, [
            req.authUser.id,
            safeChallengeId,
            String(sourceCode).slice(0, 50000)
        ]);

        await logActivity(
            req.authUser.id,
            "practice_submitted",
            `Submitted practice for ${prerequisite.rows[0].challenge_title || safeChallengeId}`,
            {
                lessonId: prerequisite.rows[0].lesson_id || null,
                challengeId: safeChallengeId,
                submissionStatus: 'pending_review'
            }
        );

        try {
            const notificationClient = await pool.connect();
            try {
                await notificationClient.query("BEGIN");
                const teachers = await notificationClient.query(
                    "SELECT teacher_id FROM monitoring_requests WHERE student_id = $1 AND status = 'accepted'",
                    [req.authUser.id]
                );
                for (const teacher of teachers.rows) {
                    const notification = await createOrUpdateNotification(notificationClient, {
                        recipientUserId: teacher.teacher_id,
                        type: "new_practice_submission",
                        title: "New Practice Submission",
                        message: (req.authUser.email || "A student") + " submitted " + (prerequisite.rows[0].challenge_title || safeChallengeId) + " practice.",
                        relatedSubmissionId: result.rows[0].id,
                        relatedPracticeId: safeChallengeId,
                        practiceTitle: prerequisite.rows[0].challenge_title || safeChallengeId,
                        grade: null,
                        maxGrade: 100,
                        metadata: { studentId: req.authUser.id, studentEmail: req.authUser.email || "" }
                    });
                    sendNotificationEvent(teacher.teacher_id, notification);
                }
                await notificationClient.query("COMMIT");
            } catch (notificationError) {
                await notificationClient.query("ROLLBACK");
                console.warn("Unable to create teacher submission notification:", notificationError);
            } finally {
                notificationClient.release();
            }
        } catch (notificationError) {
            console.warn("Unable to initialize teacher submission notification:", notificationError);
        }

        await verifyLessonCompletion(req.authUser.id, prerequisite.rows[0].lesson_id);
        const updatedLessonAccess = await getLessonAccessState(req.authUser.id, prerequisite.rows[0].lesson_id);
        const nextLessonResult = await pool.query(
            `SELECT id FROM lessons
             WHERE sequence = (
               SELECT sequence + 1 FROM lessons WHERE id = $1
             ) AND status <> 'Archived'
             LIMIT 1`,
            [prerequisite.rows[0].lesson_id]
        );
        const nextLessonAccess = nextLessonResult.rowCount
            ? await getLessonAccessState(req.authUser.id, nextLessonResult.rows[0].id)
            : null;

        res.status(201).json({
            success: true,
            data: {
                ...result.rows[0],
                passed: true,
                practiceCompleted: true,
                lessonCompleted: Boolean(updatedLessonAccess.current?.completed),
                lessonAccess: updatedLessonAccess.current,
                nextLessonAccess: nextLessonAccess?.current || null,
                canRetry: false,
                editorLocked: true,
                submissionStatus: 'pending_review'
            }
        });
    } catch (error) {
        if (error.code === "JAVA_COMPILER_UNAVAILABLE") {
            return res.status(503).json({
                success: false,
                code: "JAVA_COMPILER_UNAVAILABLE",
                message: "The server Java compiler is unavailable. Your submission was not saved and practice completion was not changed.",
                diagnostics: error.diagnostics
            });
        }
        next(error);
    }
});

app.patch("/api/practice-submissions/:id/reopen", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    const client = await pool.connect();
    let notification = null;
    let updated = null;
    try {
        await client.query("BEGIN");
        const existingResult = await client.query(`
            SELECT ps.*, pc.title AS challenge_title, u.id AS student_user_id, u.name AS student_name, u.email AS student_email, teacher.name AS teacher_name
            FROM practice_submissions ps
            JOIN programming_challenges pc ON pc.id = ps.challenge_id
            LEFT JOIN users u ON ps.student_id IN (u.id::text, u.user_id, u.email)
            LEFT JOIN users teacher ON teacher.id = $2
            WHERE ps.${practiceSubmissionKeyColumn} = $1
        `, [req.params.id, req.authUser.id]);
        const existing = existingResult.rows[0];
        if (!existing) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Submission not found." });
        }
        const authorization = await client.query(`
            SELECT 1 FROM monitoring_requests
            WHERE teacher_id = $1
              AND status = 'accepted'
              AND (student_id = $2 OR student_id::text = $3)
            LIMIT 1
        `, [req.authUser.id, existing.student_user_id || existing.student_id, existing.student_id]);
        if (!authorization.rowCount) {
            await client.query("ROLLBACK");
            return res.status(403).json({ success: false, message: "You are not authorized to reopen this student's submission." });
        }
        await client.query(`
            UPDATE practice_submissions
            SET is_locked = FALSE,
                review_status = 'returned',
                reopened_by = $2,
                reopened_at = NOW()
            WHERE id = $1
        `, [req.params.id, req.authUser.id]);
        const updatedResult = await client.query(`
            SELECT ps.*, pc.title AS challenge_title, pc.topic_id, pc.lesson_id,
                   u.id AS student_user_id, u.name AS student_name, u.email AS student_email,
                   COALESCE(s.section, 'Unassigned') AS section,
                   reopener.name AS graded_by_name
            FROM practice_submissions ps
            JOIN programming_challenges pc ON pc.id = ps.challenge_id
            LEFT JOIN users u ON ps.student_id IN (u.id::text, u.user_id, u.email)
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN users reopener ON reopener.id = ps.reopened_by
            WHERE ps.${practiceSubmissionKeyColumn} = $1
        `, [req.params.id]);
        updated = updatedResult.rows[0];
        const teacherName = existing.teacher_name || req.authUser.email || "your teacher";
        const practiceTitle = existing.challenge_title || existing.challenge_id;
        const studentRecipientId = existing.student_user_id || existing.student_id;
        notification = await createOrUpdateNotification(client, {
            recipientUserId: studentRecipientId,
            type: "practice_reopened",
            title: "Practice Submission Reopened",
            message: "Your " + practiceTitle + " practice submission has been reopened by " + teacherName + ". You have another attempt available.",
            relatedSubmissionId: existing.id,
            relatedPracticeId: existing.challenge_id,
            teacherId: req.authUser.id,
            teacherName,
            practiceTitle,
            metadata: { studentName: existing.student_name || "", studentEmail: existing.student_email || "" }
        });
        await client.query("COMMIT");
        if (studentRecipientId) {
            sendNotificationEvent(studentRecipientId, notification);
            if (existing.student_id && existing.student_id !== studentRecipientId) {
                sendNotificationEvent(existing.student_id, notification);
            }
        }
        res.json({ success: true, data: updated, submission: updated, notification });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
});

app.patch("/api/practice-submissions/:id/grade", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    const client = await pool.connect();
    let notification = null;
    let updated = null;
    try {
        const body = req.body || {};
        const grade = Number(body.grade ?? body.score);
        if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
            return res.status(400).json({ success: false, message: "Grade must be between 0 and 100." });
        }
        const feedback = cleanText(body.feedback || "", 5000);
        if (!feedback) {
            return res.status(400).json({ success: false, message: "Teacher feedback is required." });
        }
        const remedialRequired = Boolean(body.remedialRequired ?? body.remedial_required ?? false);
        const allowedStatuses = new Set(['submitted', 'reviewed', 'passed', 'failed']);
        const reviewStatus = remedialRequired || grade < 70 ? 'returned' : 'graded';
        await client.query("BEGIN");
        const existingResult = await client.query(`
            SELECT ps.*, pc.title AS challenge_title, pc.topic_id, pc.lesson_id,
                   u.id AS student_user_id, u.name AS student_name, u.email AS student_email,
                   teacher.name AS teacher_name
            FROM practice_submissions ps
            JOIN programming_challenges pc ON pc.id = ps.challenge_id
            LEFT JOIN users u ON ps.student_id IN (u.id::text, u.user_id, u.email)
            LEFT JOIN users teacher ON teacher.id = $2
            WHERE ps.${practiceSubmissionKeyColumn} = $1
        `, [req.params.id, req.authUser.id]);
        const existing = existingResult.rows[0];
        if (!existing) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Submission not found." });
        }
        const authorization = await client.query(`
            SELECT 1 FROM monitoring_requests
            WHERE teacher_id = $1
              AND status = 'accepted'
              AND (student_id = $2 OR student_id::text = $3)
            LIMIT 1
        `, [req.authUser.id, existing.student_user_id || existing.student_id, existing.student_id]);
        if (!authorization.rowCount) {
            await client.query("ROLLBACK");
            return res.status(403).json({ success: false, message: "You are not authorized to review this student's submission." });
        }
        const gradeUpdate = await client.query(`
            UPDATE practice_submissions
            SET teacher_score = $2,
                teacher_feedback = $3,
                graded_by = $4,
                graded_at = NOW(),
                review_status = $6,
                remedial_required = $5
            WHERE id = $1
            RETURNING id, student_id, challenge_id, teacher_score, teacher_feedback, graded_by, graded_at, review_status
        `, [req.params.id, grade, feedback, req.authUser.id, remedialRequired, reviewStatus]);
        if (gradeUpdate.rowCount !== 1) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "The practice submission could not be graded because it no longer exists." });
        }
        const updatedResult = await client.query(`
            SELECT ps.*, pc.title AS challenge_title, pc.topic_id, pc.lesson_id,
               u.id AS student_user_id, u.name AS student_name, u.email AS student_email,
               COALESCE(s.section, 'Unassigned') AS section,
               grader.name AS graded_by_name
            FROM practice_submissions ps
            JOIN programming_challenges pc ON pc.id = ps.challenge_id
            LEFT JOIN users u ON ps.student_id IN (u.id::text, u.user_id, u.email)
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN users grader ON grader.id = ps.graded_by
            WHERE ps.${practiceSubmissionKeyColumn} = $1
        `, [req.params.id]);
        updated = updatedResult.rows[0];
        const teacherName = existing.teacher_name || req.authUser.email || "your teacher";
        const practiceTitle = existing.challenge_title || existing.challenge_id;
        const studentRecipientId = existing.student_user_id || existing.student_id;
        
        notification = await createOrUpdateNotification(client, {
            recipientUserId: studentRecipientId,
            type: remedialRequired ? "remedial_required" : "submission_graded",
            title: remedialRequired ? "Practice Returned for Revision" : "Practice Graded",
            message: "Your " + practiceTitle + " practice submission has been reviewed by " + teacherName + ".\nGrade: " + grade + "/100\nFeedback: " + feedback + "\nRemedial work required: " + (remedialRequired ? "Yes" : "No"),
            relatedSubmissionId: existing.id,
            relatedPracticeId: existing.challenge_id,
            teacherId: req.authUser.id,
            teacherName,
            practiceTitle,
            grade,
            maxGrade: 100,
            feedback,
            remedialRequired,
            metadata: { studentName: existing.student_name || "", studentEmail: existing.student_email || "" }
        });
        if (!notification) {
            throw new Error("Unable to create the student grading notification.");
        }

        await client.query("COMMIT");

        // After commit, notify student and verify lesson completion
        if (studentRecipientId) {
            sendNotificationEvent(studentRecipientId, notification);
            if (existing.student_id && existing.student_id !== studentRecipientId) {
                sendNotificationEvent(existing.student_id, notification);
            }
            if (existing.lesson_id && grade >= 70 && !remedialRequired) {
                await verifyLessonCompletion(studentRecipientId, existing.lesson_id);
            }
            await logActivity(
                studentRecipientId,
                grade >= 70 && !remedialRequired ? "practice_passed" : "practice_returned",
                `${grade >= 70 && !remedialRequired ? "Passed" : "Returned"} practice for ${practiceTitle}`,
                {
                    lessonId: existing.lesson_id || null,
                    challengeId: existing.challenge_id,
                    grade
                }
            );
        }

        res.json({ success: true, data: updated, submission: updated, notification });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
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

console.log('[submission-service] runtime: Render Node.js + PostgreSQL + configured JDK');

if (require.main === module) {
initializeDatabase()
    .then(async () => {
        try {
            await seedLessons();
            await seedPracticeChallenges();
            
            console.log("Database seeded successfully.");
        } catch (seedErr) {
            console.error("Database seeding failed:", seedErr);
            throw seedErr;
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
}

module.exports = { app, initializeDatabase, seedPracticeChallenges };




