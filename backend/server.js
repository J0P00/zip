const bcrypt = require("bcrypt");
const cors = require("cors");
const express = require("express");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const multer = require("multer");
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();
const { execFile } = require("child_process");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { OOP_PARSED_QUESTIONS, ALL_OOP_QUESTIONS, TOPIC_NAMES, generatePreTestSessionQuestions } = require("./questionBank");
const { buildOopTopicNameMap, computeOopTopicPerformance } = require("./oopTopicPerformance");
const { computePreTestInsights } = require("./preTestAnalytics");
const { ACTIVE_OOP_PRACTICE_CHALLENGES, ACTIVE_OOP_PRACTICE_IDS } = require("./oopPracticeCatalog");
const {
    SWING_PASSING_SCORE,
    JAVA_SWING_LESSONS,
    JAVA_SWING_VIDEOS,
    JAVA_SWING_ASSESSMENTS,
    JAVA_SWING_EXERCISES,
    SWING_QUESTIONS_BY_LESSON
} = require("./javaSwingCatalog");
const { validateBasicJavaStructure } = require("./basicJavaValidator");
const { getJavaToolchainDiagnostics } = require("./javaToolchain");
const { normalizeAssessmentPercentage, isPassingAssessment } = require("./assessmentValidation");
const { assessmentMatchesLesson } = require("./assessmentEligibility");
const { calculateLessonProgress, calculateCourseProgress, calculateTotalCourseProgress, isPracticeCompleted } = require("./progressCalculation");
const execFileAsync = promisify(execFile);

const app = express();
const PRACTICE_CHALLENGES = ACTIVE_OOP_PRACTICE_CHALLENGES;

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (!allowedOrigins.length || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return true;
    }
    const cleanOrigin = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (allowedOrigins.some(o => o.replace(/^https?:\/\//, '').replace(/\/$/, '') === cleanOrigin)) {
        return true;
    }
    // Always permit the production frontend and vercel app deployments
    if (origin === 'https://oop-pedagogical.vercel.app' || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
        return true;
    }
    // Local development
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return true;
    }
    return false;
};

const corsMiddleware = cors({
    origin(origin, callback) {
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }
        console.warn(`[CORS] Blocked unrecognized origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
});
app.use(corsMiddleware);
app.options(/.*/, corsMiddleware);

const studentUuidMatchSql = (colName, paramIndex1 = 1, paramIndex2 = 2, paramIndex3 = 3) => `(
    ${colName}::text = $${paramIndex1}::text
    ${paramIndex2 ? `OR ${colName}::text = $${paramIndex2}::text` : ''}
    ${paramIndex3 ? `OR LOWER(${colName}::text) = LOWER($${paramIndex3}::text)` : ''}
)`;

const studentTextMatchSql = (colName, paramIndex1 = 1, paramIndex2 = 2, paramIndex3 = 3) => `(
    ${colName}::text = $${paramIndex1}::text
    ${paramIndex2 ? `OR ${colName}::text = $${paramIndex2}::text` : ''}
    ${paramIndex3 ? `OR ${colName}::text = $${paramIndex3}::text` : ''}
)`;
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
const ASSESSMENT_PASSING_SCORE = 80;
const PRE_TEST_PASSING_SCORE = 60;
const VIDEO_COMPLETION_THRESHOLD = 95;
const MAX_ASSESSMENT_ATTEMPTS = 3;
const PRE_TEST_TIME_LIMIT_SECONDS = 10 * 60;
let practiceSubmissionKeyColumn = "id";

const insertCappedAssessmentAttempt = async ({ studentId, assessmentId, storage, fallbackAttemptNumber = 1, insertQuery, buildParams, beforeInsert, maxAttempts = MAX_ASSESSMENT_ATTEMPTS }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [String(studentId) + ":" + String(assessmentId)]);
        const attemptTable = storage === "swing" ? "swing_quiz_attempts" : "quiz_attempts";
        const studentColumn = storage === "swing" ? "student_id" : "student_user_id";
        const countResult = await client.query("SELECT COUNT(*)::int AS attempt_count, COALESCE(MAX(attempt_number), 0)::int AS max_attempt FROM " + attemptTable + " WHERE " + studentColumn + " = $1 AND assessment_id = $2", [studentId, assessmentId]);
        const attemptCount = Number(countResult.rows[0]?.attempt_count || 0);
        if (attemptCount >= maxAttempts) {
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
const isValidVideoUrl = value => {
    const trimmed = cleanText(value, 2000);
    if (!trimmed) return false;
    if (trimmed.startsWith("/")) return true;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
};

const logDiagnosticError = (operation, paramName, rawValue, reason) => {
    let sanitizedVal = rawValue;
    if (typeof rawValue === "object" && rawValue !== null) {
        sanitizedVal = "[Object]";
    } else {
        sanitizedVal = String(rawValue ?? "").slice(0, 100);
    }
    console.warn(`[Content Management Error] Failing operation: "${operation}", Invalid parameter: "${paramName}" (value: "${sanitizedVal}") - Reason: ${reason}`);
};

const validateId = (id, paramName = "id", operation = "unknown", { required = true } = {}) => {
    if (id === undefined || id === null) {
        if (!required) return { valid: true, value: null };
        logDiagnosticError(operation, paramName, id, "Missing required identifier");
        return { valid: false, status: 400, message: `${paramName} is required.` };
    }
    const str = String(id).trim();
    if (!str) {
        if (!required) return { valid: true, value: null };
        logDiagnosticError(operation, paramName, id, "Empty identifier");
        return { valid: false, status: 400, message: `${paramName} cannot be empty.` };
    }
    if (str === "NaN" || str === "undefined" || str === "null" || (typeof id === "number" && Number.isNaN(id))) {
        logDiagnosticError(operation, paramName, id, "Identifier is NaN, undefined, or null string");
        return { valid: false, status: 400, message: `Invalid ${paramName}: cannot be "${str}".` };
    }
    if (str === "0" || (typeof id === "number" && id === 0)) {
        logDiagnosticError(operation, paramName, id, "Identifier cannot be zero (no arbitrary substitute)");
        return { valid: false, status: 400, message: `Invalid ${paramName}: 0 is not a valid identifier.` };
    }
    if (/^\d+$/.test(str)) {
        const num = Number(str);
        if (!Number.isSafeInteger(num) || num <= 0) {
            logDiagnosticError(operation, paramName, id, "Numeric identifier out of safe range or <= 0");
            return { valid: false, status: 400, message: `Invalid numeric ${paramName}: must be a positive integer.` };
        }
    }
    if (!/^[a-zA-Z0-9_\-.:@]+$/.test(str)) {
        logDiagnosticError(operation, paramName, id, "Identifier contains invalid characters");
        return { valid: false, status: 400, message: `Invalid ${paramName}: contains invalid characters.` };
    }
    return { valid: true, value: str };
};

const validateStorageSize = (rawSize, operation = "unknown") => {
    if (rawSize === undefined) return { valid: true, value: undefined };
    if (rawSize === null || rawSize === "") return { valid: true, value: null };
    if (typeof rawSize === "string" && rawSize.trim().toLowerCase() === "nan") {
        logDiagnosticError(operation, "storageSize", rawSize, "storageSize passed as NaN string");
        return { valid: false, status: 400, message: "storageSize cannot be NaN." };
    }
    const num = Number(rawSize);
    if (!Number.isFinite(num) || Number.isNaN(num) || num < 0) {
        logDiagnosticError(operation, "storageSize", rawSize, `Invalid non-finite or negative storageSize: ${rawSize}`);
        return { valid: false, status: 400, message: "storageSize must be a valid non-negative integer or null." };
    }
    return { valid: true, value: Math.floor(num) };
};

const validateSequenceNumber = (rawSeq, operation = "unknown", { required = false, defaultVal = null, min = 1, max = 10000 } = {}) => {
    if (rawSeq === undefined || rawSeq === null) {
        if (required) {
            logDiagnosticError(operation, "sequence", rawSeq, "Missing required sequence number");
            return { valid: false, status: 400, message: "Sequence number is required." };
        }
        return { valid: true, value: defaultVal };
    }
    if (typeof rawSeq === "string" && (rawSeq.trim() === "" || rawSeq.trim().toLowerCase() === "nan")) {
        logDiagnosticError(operation, "sequence", rawSeq, "Sequence is empty or NaN string");
        return { valid: false, status: 400, message: "Sequence must be a valid number, not NaN or empty." };
    }
    const num = Number(rawSeq);
    if (!Number.isFinite(num) || Number.isNaN(num)) {
        logDiagnosticError(operation, "sequence", rawSeq, `Sequence is not a finite number: ${rawSeq}`);
        return { valid: false, status: 400, message: "Sequence must be a valid number." };
    }
    const clamped = Math.floor(clampNumber(num, min, max));
    return { valid: true, value: clamped };
};

const validateScoreNumber = (rawScore, paramName = "passingScore", operation = "unknown", { min = 0, max = 100, defaultVal = null, required = false } = {}) => {
    if (rawScore === undefined || rawScore === null) {
        if (required) {
            logDiagnosticError(operation, paramName, rawScore, `Missing required ${paramName}`);
            return { valid: false, status: 400, message: `${paramName} is required.` };
        }
        return { valid: true, value: defaultVal };
    }
    if (typeof rawScore === "string" && (rawScore.trim() === "" || rawScore.trim().toLowerCase() === "nan")) {
        logDiagnosticError(operation, paramName, rawScore, `${paramName} is empty or NaN string`);
        return { valid: false, status: 400, message: `${paramName} must be a valid number, not NaN or empty.` };
    }
    const num = Number(rawScore);
    if (!Number.isFinite(num) || Number.isNaN(num) || num < min || num > max) {
        logDiagnosticError(operation, paramName, rawScore, `${paramName} is out of bounds [${min}, ${max}] or NaN: ${rawScore}`);
        return { valid: false, status: 400, message: `${paramName} must be a number between ${min} and ${max}.` };
    }
    return { valid: true, value: num };
};

const STORAGE_PROVIDER = "local";
const configuredMaxVideoSize = Number(process.env.LOCAL_VIDEO_MAX_BYTES);
const MAX_VIDEO_SIZE_BYTES = Number.isInteger(configuredMaxVideoSize) && configuredMaxVideoSize > 0
    ? configuredMaxVideoSize
    : 25 * 1024 * 1024;
const LOCAL_VIDEO_DIR = path.resolve(process.env.LOCAL_VIDEO_DIR || path.join(__dirname, "uploads", "videos"));
const LOCAL_VIDEO_TEMP_DIR = path.join(os.tmpdir(), "oophub-video-uploads");
const SUPPORTED_VIDEO_TYPES = new Set(["video/mp4"]);

const localUploadStorage = multer.diskStorage({
    destination: async (_req, _file, callback) => {
        try {
            await fs.mkdir(LOCAL_VIDEO_TEMP_DIR, { recursive: true });
            callback(null, LOCAL_VIDEO_TEMP_DIR);
        } catch (error) {
            callback(error);
        }
    },
    filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.upload`)
});

const uploadVideoFile = multer({
    storage: localUploadStorage,
    limits: { fileSize: MAX_VIDEO_SIZE_BYTES, files: 1 },
    fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        if (file.mimetype !== "video/mp4" || extension !== ".mp4") {
            return callback(new Error("Only MP4 video files are supported."));
        }
        callback(null, true);
    }
});

const validateVideoUpload = ({ contentType, fileSize }) => {
    const safeType = cleanText(contentType, 120).toLowerCase();
    const safeSize = Number(fileSize);
    if (!SUPPORTED_VIDEO_TYPES.has(safeType)) {
        const error = new Error("Unsupported video type. Upload an MP4 video file.");
        error.status = 400;
        throw error;
    }
    if (!Number.isInteger(safeSize) || safeSize <= 0 || safeSize > MAX_VIDEO_SIZE_BYTES) {
        const error = new Error(`Video files must be larger than zero and no more than ${Math.floor(MAX_VIDEO_SIZE_BYTES / (1024 * 1024))} MB.`);
        error.status = 400;
        throw error;
    }
    return { contentType: safeType, fileSize: safeSize };
};

const buildStorageKey = (lessonId, fileName, contentType) => {
    const baseName = String(fileName || "video").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "video";
    return `lesson-videos/${cleanText(lessonId, 120)}/${crypto.randomUUID()}-${baseName}.mp4`;
};

const isStorageKey = (key) => typeof key === "string" && /^lesson-videos\/[a-zA-Z0-9._-]+\/[a-f0-9-]+-[^/]+\.mp4$/i.test(key);

const storageMarker = (key) => `storage://${STORAGE_PROVIDER}/${key}`;

const localStoragePath = (key) => {
    if (!isStorageKey(key)) {
        const error = new Error("Invalid storage object key.");
        error.status = 400;
        throw error;
    }
    const target = path.resolve(LOCAL_VIDEO_DIR, key);
    if (target !== LOCAL_VIDEO_DIR && !target.startsWith(`${LOCAL_VIDEO_DIR}${path.sep}`)) {
        const error = new Error("Invalid storage object key.");
        error.status = 400;
        throw error;
    }
    return target;
};

const isMp4File = async (filePath) => {
    const handle = await fs.open(filePath, "r");
    try {
        const header = Buffer.alloc(32);
        const { bytesRead } = await handle.read(header, 0, header.length, 0);
        return bytesRead >= 12 && header.toString("ascii", 4, 8) === "ftyp" && header.toString("ascii", 8, 12).trim().length > 0;
    } finally {
        await handle.close();
    }
};

const finalizeLocalUpload = async (sourcePath, storageKey) => {
    const destinationPath = localStoragePath(storageKey);
    const destinationTempPath = `${destinationPath}.${crypto.randomUUID()}.partial`;
    try {
        await fs.mkdir(path.dirname(destinationPath), { recursive: true });
        await fs.copyFile(sourcePath, destinationTempPath);

        const [sourceStat, destinationTempStat] = await Promise.all([
            fs.stat(sourcePath),
            fs.stat(destinationTempPath)
        ]);
        if (!sourceStat.isFile() || !destinationTempStat.isFile() || sourceStat.size !== destinationTempStat.size) {
            const error = new Error("Video upload could not be finalized because the copied file size did not match.");
            error.status = 500;
            throw error;
        }

        // Both paths are now inside the Render upload filesystem, so this rename is atomic.
        await fs.rename(destinationTempPath, destinationPath);
        await fs.rm(sourcePath, { force: true }).catch(error => {
            console.warn("Temporary video cleanup after finalization failed:", error.message);
        });
        return destinationPath;
    } catch (error) {
        await fs.rm(destinationTempPath, { force: true }).catch(() => undefined);
        throw error;
    }
};

const assertStorageObject = async (key, expectedType, expectedSize, userId) => {
    const filePath = localStoragePath(key);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
        const error = new Error("Uploaded video was not found on the backend.");
        error.status = 404;
        throw error;
    }
    if (!(await isMp4File(filePath))) {
        const error = new Error("The uploaded file is not a valid MP4 video.");
        error.status = 400;
        throw error;
    }
    if (expectedType && expectedType !== "video/mp4") {
        const error = new Error("Stored video content type does not match the upload.");
        error.status = 400;
        throw error;
    }
    if (expectedSize && Number(stat.size) !== Number(expectedSize)) {
        const error = new Error("Stored video size does not match the upload.");
        error.status = 400;
        throw error;
    }
    return { ContentType: "video/mp4", ContentLength: stat.size, path: filePath };
};

const getStoragePlaybackUrl = async (key, contentType) => {
    await assertStorageObject(key, contentType, null, null);
    return `/api/videos/storage-playback?key=${encodeURIComponent(key)}`;
};

const deleteStorageObject = async (key) => {
    if (!isStorageKey(key)) return;
    await fs.rm(localStoragePath(key), { force: true });
};

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

const isTeacherAuthorizedForStudent = async (clientOrPool, teacherId, studentIdentifier) => {
    if (!teacherId || !studentIdentifier) return false;
    const studentUuid = await resolveUserUuid(clientOrPool, studentIdentifier);
    if (!studentUuid) return false;
    const res = await clientOrPool.query(`
        SELECT 1 FROM monitoring_requests
        WHERE teacher_id = $1
          AND student_id = $2
          AND status = 'accepted'
        LIMIT 1
    `, [teacherId, studentUuid]);
    return Boolean(res.rowCount);
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

const isSwingLessonId = (lessonId = "") => /^swing_lesson_\d+$/i.test(String(lessonId).trim()) || String(lessonId).trim().toLowerCase().startsWith("swing_");
const OOP_LESSON_FILTER_SQL = "(id NOT LIKE 'swing_%' AND COALESCE(course_id, 'oop_fundamentals') <> 'java_swing' AND LOWER(COALESCE(module, '')) NOT LIKE '%swing%' AND COALESCE(track, 'oop') <> 'swing')";
const OOP_LESSON_ALIAS_FILTER_SQL = (alias = "l") => `(${alias}.id NOT LIKE 'swing_%' AND COALESCE(${alias}.course_id, 'oop_fundamentals') <> 'java_swing' AND LOWER(COALESCE(${alias}.module, '')) NOT LIKE '%swing%' AND COALESCE(${alias}.track, 'oop') <> 'swing')`;

const OOP_CLOUDINARY_VIDEOS = {
    oop_lesson_1: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200171/Lesson_1Classes_Objects.mp4",
    oop_lesson_2: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200164/Lesson_2_Constructor.mp4",
    oop_lesson_3: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200165/Lesson_3Object_Method.mp4",
    oop_lesson_4: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200173/Lesson_4_Encapsulation.mp4",
    oop_lesson_5: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200164/Lesson_5_Constructor_Overloading.mp4",
    oop_lesson_6: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200163/Lesson_6_Inheritance.mp4",
    oop_lesson_7: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200159/Lesson_7_Polymorphism.mp4",
    oop_lesson_8: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200159/Lesson_8_Abstract_Classes.mp4",
    oop_lesson_9: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200162/Lesson_9_Interfaces_Abstract.mp4",
    oop_lesson_10: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200166/Lesson_10_Interfaces.mp4",
    oop_lesson_11: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200177/Lesson_11_Array_Of_Object.mp4",
    oop_lesson_12: "https://res.cloudinary.com/jaudkms2/video/upload/v1791200177/Lesson_12_Enum.mp4"
};

const resolveLessonVideoUrl = (row) => {
    const rawUrl = String(row.video_url || "").trim();
    if (row.storage_provider === STORAGE_PROVIDER && row.storage_key) {
        return rawUrl;
    }
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
        return rawUrl;
    }
    return OOP_CLOUDINARY_VIDEOS[row.id] || rawUrl;
};

const toClientLesson = (row) => {
    if (!row) return null;
    const isSwing = isSwingLessonId(row.id) || row.course_id === "java_swing" || String(row.module || "").toLowerCase().includes("swing") || row.track === "swing" || row.metadata?.track === "swing";
    const track = row.track || row.metadata?.track || (isSwing ? "swing" : "oop");

    let learningObjectives = [];
    if (Array.isArray(row.learning_objectives)) {
        learningObjectives = row.learning_objectives;
    } else if (Array.isArray(row.learningObjectives)) {
        learningObjectives = row.learningObjectives;
    } else if (Array.isArray(row.concepts)) {
        learningObjectives = row.concepts;
    } else if (typeof row.learning_objectives === "string") {
        try {
            const parsed = JSON.parse(row.learning_objectives);
            learningObjectives = Array.isArray(parsed) ? parsed : [row.learning_objectives];
        } catch {
            learningObjectives = row.learning_objectives.split(",").map(s => s.trim()).filter(Boolean);
        }
    } else if (typeof row.learningObjectives === "string") {
        try {
            const parsed = JSON.parse(row.learningObjectives);
            learningObjectives = Array.isArray(parsed) ? parsed : [row.learningObjectives];
        } catch {
            learningObjectives = row.learningObjectives.split(",").map(s => s.trim()).filter(Boolean);
        }
    }

    return {
        id: row.id,
        title: row.title || "",
        track,
        module: row.module || (isSwing ? "Java Swing" : "Object-Oriented Programming (Java)"),
        courseId: row.course_id || (isSwing ? "java_swing" : "oop_fundamentals"),
        sequence: Number(row.sequence || 0),
        duration: row.duration || "",
        videoUrl: resolveLessonVideoUrl(row),
        storageProvider: row.storage_provider || "",
        storageKey: row.storage_key || "",
        storageContentType: row.storage_content_type || "",
        description: row.description || "",
        learningObjectives,
        learning_objectives: learningObjectives,
        topics: [],
        assessments: [],
        practice_challenges: [],
        questions: [],
        content: {
            video: null,
            assessment: null,
            practice: null
        },
        status: row.status || "Draft",
        metadata: row.metadata || {},
        citationText: row.metadata?.citationText || row.metadata?.citation_text || "",
        citationUrl: row.metadata?.citationUrl || row.metadata?.citation_url || "",
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const getLessonContent = async (lessonId) => {
    const [videoResult, assessmentResult, practiceResult] = await Promise.all([
        pool.query(`
            SELECT id, title, video_url, duration, status, storage_provider, storage_key, storage_content_type, storage_size
            FROM lesson_videos
            WHERE lesson_id = $1
            ORDER BY sequence ASC, created_at ASC
            LIMIT 1
        `, [lessonId]),
        pool.query(`
            SELECT id, title, quiz_type, passing_score, attempts, questions, status
            FROM assessments
            WHERE lesson_id = $1
            ORDER BY updated_at DESC, created_at ASC
            LIMIT 1
        `, [lessonId]),
        pool.query(`
            SELECT id, title, description, starter_code, sample_input, sample_output, passing_score, status
            FROM programming_challenges
            WHERE lesson_id = $1
            ORDER BY updated_at DESC, created_at ASC
            LIMIT 1
        `, [lessonId])
    ]);

    let videoRow = videoResult.rows[0] || null;
    let assessmentRow = assessmentResult.rows[0] || null;
    let practiceRow = practiceResult.rows[0] || null;

    if (isSwingLessonId(lessonId)) {
        if (!videoRow) {
            try {
                const swingVidRes = await pool.query(
                    "SELECT id, title, embed_url AS video_url, duration FROM swing_videos WHERE lesson_id = $1 LIMIT 1",
                    [lessonId]
                );
                if (swingVidRes.rowCount) {
                    videoRow = { ...swingVidRes.rows[0], status: "Published" };
                }
            } catch {}
            if (!videoRow) {
                const fallbackVid = JAVA_SWING_VIDEOS.find(v => v.lessonId === lessonId);
                if (fallbackVid) {
                    videoRow = {
                        id: fallbackVid.id,
                        title: fallbackVid.title,
                        video_url: fallbackVid.embedUrl,
                        duration: fallbackVid.duration,
                        status: "Published"
                    };
                }
            }
        }
        if (!assessmentRow) {
            const fallbackAssessment = JAVA_SWING_ASSESSMENTS.find(a => a.lessonId === lessonId);
            try {
                const swingQuizRes = await pool.query(
                    "SELECT id, title, passing_percentage FROM swing_quizzes WHERE lesson_id = $1 LIMIT 1",
                    [lessonId]
                );
                if (swingQuizRes.rowCount) {
                    const qRes = await pool.query(
                        "SELECT id, prompt, choices, correct_answer, explanation FROM swing_questions WHERE quiz_id = $1 ORDER BY id ASC",
                        [swingQuizRes.rows[0].id]
                    );
                    assessmentRow = {
                        id: swingQuizRes.rows[0].id,
                        title: swingQuizRes.rows[0].title,
                        quiz_type: "Multiple Choice",
                        passing_score: Number(swingQuizRes.rows[0].passing_percentage || SWING_PASSING_SCORE),
                        attempts: MAX_ASSESSMENT_ATTEMPTS,
                        questions: qRes.rowCount ? qRes.rows.map(q => ({
                            id: q.id,
                            lessonId,
                            question: q.prompt,
                            options: q.choices || [],
                            correctAnswer: q.correct_answer,
                            explanation: q.explanation || "",
                            difficulty: "Easy"
                        })) : (fallbackAssessment?.questions || []),
                        status: "Published"
                    };
                }
            } catch {}
            if (!assessmentRow && fallbackAssessment) {
                assessmentRow = {
                    id: fallbackAssessment.id,
                    title: fallbackAssessment.title,
                    quiz_type: fallbackAssessment.quizType || "Multiple Choice",
                    passing_score: fallbackAssessment.passingScore || SWING_PASSING_SCORE,
                    attempts: fallbackAssessment.attempts || MAX_ASSESSMENT_ATTEMPTS,
                    questions: fallbackAssessment.questions || [],
                    status: "Published"
                };
            }
        }
        if (!practiceRow) {
            const fallbackExercise = JAVA_SWING_EXERCISES.find(e => e.lessonId === lessonId);
            try {
                const swingExRes = await pool.query(
                    "SELECT id, title, instructions, starter_code FROM swing_programming_exercises WHERE lesson_id = $1 LIMIT 1",
                    [lessonId]
                );
                if (swingExRes.rowCount) {
                    practiceRow = {
                        id: swingExRes.rows[0].id,
                        title: swingExRes.rows[0].title,
                        description: swingExRes.rows[0].instructions || fallbackExercise?.description || "",
                        starter_code: swingExRes.rows[0].starter_code || fallbackExercise?.starterCode || "",
                        sample_input: fallbackExercise?.sampleInput || "No stdin required",
                        sample_output: fallbackExercise?.sampleOutput || "",
                        passing_score: Number(fallbackExercise?.passingScore || SWING_PASSING_SCORE),
                        status: "Published"
                    };
                }
            } catch {}
            if (!practiceRow && fallbackExercise) {
                practiceRow = {
                    id: fallbackExercise.id,
                    title: fallbackExercise.title,
                    description: fallbackExercise.description,
                    starter_code: fallbackExercise.starterCode,
                    sample_input: fallbackExercise.sampleInput,
                    sample_output: fallbackExercise.sampleOutput,
                    passing_score: fallbackExercise.passingScore || SWING_PASSING_SCORE,
                    status: "Published"
                };
            }
        }
    } else {
        if (!assessmentRow && OOP_PARSED_QUESTIONS[lessonId]) {
            const seqMatch = String(lessonId).match(/oop_lesson_(\d+)/);
            const seqNum = seqMatch ? seqMatch[1] : "1";
            const topicName = TOPIC_NAMES[lessonId] || lessonId;
            assessmentRow = {
                id: `oop_assessment_${seqNum}`,
                title: `${topicName} Assessment`,
                quiz_type: "Multiple Choice",
                passing_score: ASSESSMENT_PASSING_SCORE,
                attempts: MAX_ASSESSMENT_ATTEMPTS,
                questions: OOP_PARSED_QUESTIONS[lessonId],
                status: "Published"
            };
        }
        if (!practiceRow) {
            const fallbackPractice = PRACTICE_CHALLENGES.find(c => c.lessonId === lessonId);
            if (fallbackPractice) {
                practiceRow = {
                    id: fallbackPractice.id,
                    title: fallbackPractice.title,
                    description: fallbackPractice.description,
                    starter_code: fallbackPractice.starterCode,
                    sample_input: fallbackPractice.sampleInput || "",
                    sample_output: fallbackPractice.sampleOutput || "",
                    passing_score: fallbackPractice.passingScore || 70,
                    status: "Published"
                };
            }
        }
    }

    return {
        video: videoRow ? {
            id: videoRow.id,
            title: videoRow.title,
            videoUrl: videoRow.video_url || "",
            duration: videoRow.duration || "",
            status: videoRow.status || "Published",
            storageProvider: videoRow.storage_provider || "",
            storageKey: videoRow.storage_key || "",
            contentType: videoRow.storage_content_type || "",
            size: videoRow.storage_size === null || videoRow.storage_size === undefined ? null : Number(videoRow.storage_size)
        } : null,
        assessment: assessmentRow ? {
            id: assessmentRow.id,
            title: assessmentRow.title,
            quizType: assessmentRow.quiz_type || "Multiple Choice",
            passingScore: Number(assessmentRow.passing_score || ASSESSMENT_PASSING_SCORE),
            attempts: Number(assessmentRow.attempts || MAX_ASSESSMENT_ATTEMPTS),
            questions: Array.isArray(assessmentRow.questions)
                ? assessmentRow.questions
                : (typeof assessmentRow.questions === "string"
                    ? (function() { try { const p = JSON.parse(assessmentRow.questions); return Array.isArray(p) ? p : []; } catch { return []; } })()
                    : []),
            status: assessmentRow.status || "Published"
        } : null,
        practice: practiceRow ? {
            id: practiceRow.id,
            title: practiceRow.title,
            description: practiceRow.description || "",
            starterCode: practiceRow.starter_code || "",
            sampleInput: practiceRow.sample_input || "",
            sampleOutput: practiceRow.sample_output || "",
            passingScore: Number(practiceRow.passing_score || 70),
            status: practiceRow.status || "Published"
        } : null
    };
};

const toClientVideo = (row) => ({
    id: row.id,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title || "",
    title: row.title,
    videoUrl: row.video_url,
    duration: row.duration || "",
    description: row.description || "",
    sequence: Number(row.sequence || 1),
    status: row.status || "Published",
    cloudinaryPublicId: row.cloudinary_public_id || "",
    cloudinaryResourceType: row.cloudinary_resource_type || "",
    storageProvider: row.storage_provider || "",
    storageKey: row.storage_key || "",
    storageContentType: row.storage_content_type || "",
    storageSize: row.storage_size === null || row.storage_size === undefined ? null : Number(row.storage_size),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const toClientLessonForRequest = async (row, req) => {
    const lesson = toClientLesson(row);
    if (!lesson) return null;
    const content = await getLessonContent(row.id);
    lesson.content = content || { video: null, assessment: null, practice: null };
    if (content?.assessment) {
        lesson.assessments = [content.assessment];
    }
    if (content?.practice) {
        lesson.practice_challenges = [content.practice];
    }
    if (row.storage_provider === STORAGE_PROVIDER && row.storage_key) {
        lesson.videoUrl = "";
        let canPlay = Boolean(req.authUser && ["student", "teacher"].includes(req.authUser.role));
        if (canPlay && req.authUser.role === "student") {
            const access = await getLessonAccessState(req.authUser.id, row.id);
            canPlay = Boolean(access.canAccess);
        }
        if (canPlay) {
            try {
                lesson.videoUrl = await getStoragePlaybackUrl(row.storage_key, row.storage_content_type || undefined);
            } catch (error) {
                console.error("Stored lesson video could not be verified:", error.message);
            }
        }
    }
    return lesson;
};

const toClientVideoForRequest = async (row, req) => {
    const video = toClientVideo(row);
    if (row.storage_provider === STORAGE_PROVIDER && row.storage_key) {
        video.videoUrl = "";
        if (req.authUser && ["student", "teacher"].includes(req.authUser.role)) {
            try {
                video.videoUrl = await getStoragePlaybackUrl(row.storage_key, row.storage_content_type || undefined);
            } catch (error) {
                console.error("Stored managed video could not be verified:", error.message);
            }
        }
    }
    return video;
};

const toClientResource = (row) => ({
    id: row.id,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title || "",
    title: row.title,
    resourceType: row.resource_type || "pdf",
    fileUrl: row.file_url,
    fileSize: row.file_size || "",
    description: row.description || "",
    status: row.status || "Published",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const toClientPreTest = (row) => ({
    id: row.id || "oop_pre_test",
    courseId: row.course_id || "oop_fundamentals",
    title: row.title || "Java OOP Pre-Test Assessment",
    description: row.description || "",
    questionPoolCount: Number(row.question_pool_count || 240),
    questionsPerAttempt: Number(row.questions_per_attempt || 20),
    timeLimitSeconds: Number(row.time_limit_seconds || PRE_TEST_TIME_LIMIT_SECONDS),
    passingScore: Number(row.passing_score || PRE_TEST_PASSING_SCORE),
    maxAttempts: Number(row.max_attempts || 3),
    status: row.status || "Published",
    postTestAssessmentId: row.post_test_assessment_id || "oop_post_test",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const toClientAssessment = (row) => {
    let questions = [];
    if (Array.isArray(row.questions)) {
        questions = row.questions;
    } else if (typeof row.questions === "string") {
        try {
            const parsed = JSON.parse(row.questions);
            questions = Array.isArray(parsed) ? parsed : [];
        } catch {
            questions = [];
        }
    }
    return {
        id: row.id,
        lessonId: row.lesson_id,
        title: row.title || "",
        quizType: row.quiz_type || "Multiple Choice",
        passingScore: Number(row.passing_score || 0),
        attempts: Number(row.attempts || 0),
        questions,
        status: row.status || "Draft",
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const normalizeChallengeTestCase = (testCase) => ({
    id: testCase.id,
    input: testCase.input ?? testCase.input_data ?? "",
    expectedOutput: testCase.expectedOutput ?? testCase.expected_output ?? "",
    isHidden: Boolean(testCase.isHidden ?? testCase.is_hidden),
    matcher: testCase.matcher || ""
});

const toClientPracticeChallenge = (row) => {
    const canonical = PRACTICE_CHALLENGES.find(challenge => challenge.id === row.id)
        || JAVA_SWING_EXERCISES.find(challenge => challenge.id === row.id);
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
        const identifier = String(payload.id || payload.userId || payload.email || "");
        const result = await pool.query(
            "SELECT id, user_id, email, role FROM users WHERE id::text = $1 OR user_id = $1 OR LOWER(email) = LOWER($1) LIMIT 1",
            [identifier]
        );
        if (result.rowCount === 0) {
            return res.status(401).json({ success: false, message: "User session is no longer valid." });
        }
        if (result.rows[0].role === "admin") {
            return res.status(403).json({ success: false, message: "Administrator accounts are no longer available." });
        }
        // Authorization and identity are refreshed from PostgreSQL so a stale
        // token cannot retain a changed role or cross-user identifier.
        req.authUser = {
            ...payload,
            ...result.rows[0],
            id: result.rows[0].id,
            user_id: result.rows[0].user_id,
            userId: result.rows[0].user_id || payload.userId,
            email: result.rows[0].email,
            role: result.rows[0].role
        };
        return next();
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired authentication token." });
    }
};

const optionalAuth = async (req, _res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!token) return next();
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const result = await pool.query("SELECT id, user_id, email, role FROM users WHERE id = $1", [payload.id]);
        if (result.rowCount && result.rows[0].role !== "admin") req.authUser = { ...payload, ...result.rows[0] };
    } catch {
        // Anonymous lesson requests retain legacy behavior; private storage URLs are omitted.
    }
    return next();
};

const requireRole = (roles) => (req, res, next) => {
    if (!req.authUser) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!roles.includes(req.authUser.role)) {
        return res.status(403).json({ success: false, message: "You do not have permission to access this resource." });
    }
    return next();
};

const executeInitQuery = async (stepName, sql, params = []) => {
    try {
        return await pool.query(sql, params);
    } catch (err) {
        console.error(`PostgreSQL initialization failed at step: [${stepName}]`);
        if (err.code) {
            console.error(`PostgreSQL Error Code: ${err.code}`);
        }
        if (err.position && typeof sql === 'string') {
            const pos = parseInt(err.position, 10);
            if (!isNaN(pos) && pos > 0) {
                console.error(`PostgreSQL Error Position: ${pos}`);
                const start = Math.max(0, pos - 60);
                const end = Math.min(sql.length, pos + 60);
                const snippet = sql.substring(start, end).replace(/[\r\n\t]+/g, ' ');
                console.error(`SQL near position ${pos}: "...${snippet}..."`);
            }
        }
        console.error(`Error details: ${err.message}`);
        throw err;
    }
};

const initializeDatabase = async () => {
    await executeInitQuery("Extension pgcrypto", "CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await executeInitQuery("Create user_role enum", `
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('student', 'teacher');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    `);
    await executeInitQuery("Migrate user column names", `
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
    await executeInitQuery("Core schema and tables", `
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
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'oop';
        UPDATE lessons SET track = 'swing' WHERE module = 'Java Swing' OR id LIKE 'swing_%' OR metadata->>'track' = 'swing';
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
        ALTER TABLE assessments ALTER COLUMN passing_score SET DEFAULT 80;
        UPDATE assessments SET passing_score = 80 WHERE id <> 'oop_pre_test';
        UPDATE assessments SET passing_score = 60 WHERE id = 'oop_pre_test';
        UPDATE quiz_attempts SET passed = TRUE WHERE (score::numeric / NULLIF(total, 0)::numeric * 100) >= 80 AND passed = FALSE;
        UPDATE quiz_attempts SET passed = FALSE WHERE (score::numeric / NULLIF(total, 0)::numeric * 100) < 80 AND assessment_id <> 'oop_pre_test' AND passed = TRUE;
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
          practice_submitted BOOLEAN NOT NULL DEFAULT FALSE,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_id, lesson_id)
        );
        ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS practice_submitted BOOLEAN DEFAULT FALSE;

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
          passing_percentage INTEGER NOT NULL DEFAULT 80,
          question_count INTEGER NOT NULL DEFAULT 10,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE swing_quizzes ALTER COLUMN passing_percentage SET DEFAULT 80;
        UPDATE swing_quizzes SET passing_percentage = 80;
        UPDATE swing_quiz_attempts SET passed = TRUE WHERE (score::numeric / NULLIF(total, 0)::numeric * 100) >= 80 AND passed = FALSE;
        UPDATE swing_quiz_attempts SET passed = FALSE WHERE (score::numeric / NULLIF(total, 0)::numeric * 100) < 80 AND passed = TRUE;

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

        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS course_id TEXT DEFAULT 'oop_fundamentals';
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_by UUID;
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS storage_provider TEXT;
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS storage_key TEXT;
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS storage_content_type TEXT;
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS storage_size BIGINT;

        CREATE TABLE IF NOT EXISTS lesson_videos (
          id TEXT PRIMARY KEY DEFAULT ('vid_' || SUBSTRING(gen_random_uuid()::text, 1, 12)),
          lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          video_url TEXT NOT NULL,
          duration TEXT DEFAULT '',
          description TEXT DEFAULT '',
          sequence INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE lesson_videos ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
        ALTER TABLE lesson_videos ADD COLUMN IF NOT EXISTS cloudinary_resource_type TEXT;
        ALTER TABLE lesson_videos ADD COLUMN IF NOT EXISTS storage_provider TEXT;
        ALTER TABLE lesson_videos ADD COLUMN IF NOT EXISTS storage_key TEXT;
        ALTER TABLE lesson_videos ADD COLUMN IF NOT EXISTS storage_content_type TEXT;
        ALTER TABLE lesson_videos ADD COLUMN IF NOT EXISTS storage_size BIGINT;
        CREATE INDEX IF NOT EXISTS idx_lesson_videos_lesson ON lesson_videos(lesson_id, sequence);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_videos_storage_key_unique ON lesson_videos(storage_key) WHERE storage_key IS NOT NULL;

        CREATE TABLE IF NOT EXISTS learning_resources (
          id TEXT PRIMARY KEY DEFAULT ('res_' || SUBSTRING(gen_random_uuid()::text, 1, 12)),
          lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          resource_type TEXT NOT NULL DEFAULT 'pdf' CHECK (resource_type IN ('pdf', 'presentation', 'handout', 'code', 'reference', 'link', 'other')),
          file_url TEXT NOT NULL,
          file_size TEXT DEFAULT '',
          description TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_learning_resources_lesson ON learning_resources(lesson_id, status);

        CREATE TABLE IF NOT EXISTS pre_tests (
          id TEXT PRIMARY KEY DEFAULT 'oop_pre_test',
          course_id TEXT NOT NULL DEFAULT 'oop_fundamentals',
          title TEXT NOT NULL DEFAULT 'Java OOP Pre-Test Assessment',
          description TEXT DEFAULT 'Diagnostic pre-test assessing prior knowledge across 12 OOP topics with 20 randomized questions from a 240-question bank.',
          question_pool_count INTEGER NOT NULL DEFAULT 240,
          questions_per_attempt INTEGER NOT NULL DEFAULT 20,
          time_limit_seconds INTEGER NOT NULL DEFAULT 600,
          passing_score NUMERIC NOT NULL DEFAULT 60,
          max_attempts INTEGER NOT NULL DEFAULT 3,
          status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
          post_test_assessment_id TEXT DEFAULT 'oop_post_test',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        INSERT INTO pre_tests (id, course_id, title, description, question_pool_count, questions_per_attempt, time_limit_seconds, passing_score, max_attempts, status, post_test_assessment_id)
        VALUES ('oop_pre_test', 'oop_fundamentals', 'Java OOP Pre-Test Assessment', 'Diagnostic pre-test assessing prior knowledge across 12 OOP topics with 20 randomized questions from a 240-question bank.', 240, 20, 600, 60, 3, 'Published', 'oop_post_test')
        ON CONFLICT (id) DO NOTHING;
        UPDATE pre_tests SET time_limit_seconds = 600 WHERE id = 'oop_pre_test' AND time_limit_seconds = 1200;

        -- Authoritative video progress normalization and repair
        UPDATE student_progress
        SET completed = TRUE
        WHERE completion_percentage >= 95 AND completed = FALSE;

        UPDATE student_progress
        SET completion_percentage = 100
        WHERE completed = TRUE AND completion_percentage < 95;

        UPDATE video_progress
        SET completed = TRUE
        WHERE watch_percentage >= 95 AND completed = FALSE;

        UPDATE video_progress
        SET watch_percentage = 100
        WHERE completed = TRUE AND watch_percentage < 95;

        -- Normalize legacy number IDs (e.g. video_id = '1' -> 'oop_lesson_1')
        INSERT INTO student_progress (student_user_id, video_id, last_position, completion_percentage, completed, date_completed, notes, created_at, updated_at)
        SELECT student_user_id, 'oop_lesson_' || video_id, last_position, completion_percentage, completed, date_completed, notes, created_at, updated_at
        FROM student_progress
        WHERE video_id ~ '^[0-9]+$'
        ON CONFLICT (student_user_id, video_id) DO UPDATE SET
          last_position = GREATEST(student_progress.last_position, EXCLUDED.last_position),
          completion_percentage = GREATEST(student_progress.completion_percentage, EXCLUDED.completion_percentage),
          completed = student_progress.completed OR EXCLUDED.completed,
          updated_at = NOW();

        -- Cross-sync video_progress from student_progress
        INSERT INTO video_progress (student_id, lesson_id, "current_time", duration, watch_percentage, completed, created_at, updated_at)
        SELECT sp.student_user_id, sp.video_id, sp.last_position, 0, sp.completion_percentage, sp.completed, sp.created_at, sp.updated_at
        FROM student_progress sp
        JOIN lessons l ON l.id = sp.video_id
        ON CONFLICT (student_id, lesson_id) DO UPDATE SET
          "current_time" = GREATEST(video_progress."current_time", EXCLUDED."current_time"),
          watch_percentage = GREATEST(video_progress.watch_percentage, EXCLUDED.watch_percentage),
          completed = video_progress.completed OR EXCLUDED.completed,
          updated_at = NOW();

        -- Cross-sync student_progress from video_progress
        INSERT INTO student_progress (student_user_id, video_id, last_position, completion_percentage, completed, created_at, updated_at)
        SELECT vp.student_id, vp.lesson_id, vp."current_time", vp.watch_percentage, vp.completed, vp.created_at, vp.updated_at
        FROM video_progress vp
        ON CONFLICT (student_user_id, video_id) DO UPDATE SET
          last_position = GREATEST(student_progress.last_position, EXCLUDED.last_position),
          completion_percentage = GREATEST(student_progress.completion_percentage, EXCLUDED.completion_percentage),
          completed = student_progress.completed OR EXCLUDED.completed,
          updated_at = NOW();
    `);
    const practiceSubmissionColumns = await executeInitQuery("Check practice_submissions columns", `
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

const seedLessons = async (db = pool) => {
    const lessons = [
        [
            "oop_lesson_1",
            "Classes & Objects",
            "OOP Fundamentals",
            1,
            "04:55",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_1,
            "Introduces Java classes as blueprints and objects as instances with fields, methods, state, and behavior.",
            JSON.stringify(["Class blueprint", "Object instance", "Fields and methods", "new keyword", "State and behavior"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_2",
            "Constructors",
            "OOP Fundamentals",
            2,
            "05:25",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_2,
            "Explains Java constructors, object initialization, constructor names, parameters, and default constructor behavior.",
            JSON.stringify(["Constructor purpose", "Same name as class", "No return type", "Parameterized constructor", "Default constructor"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_3",
            "Object Methods",
            "OOP Fundamentals",
            3,
            "05:04",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_3,
            "Covers object methods as class-defined behaviors, calling methods through objects, parameters, returns, and field access.",
            JSON.stringify(["Object behavior", "Method call", "Parameters", "Return values", "Instance field access"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_4",
            "Encapsulation",
            "OOP Fundamentals",
            4,
            "06:10",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_4,
            "Explains data hiding with private fields and controlled access through getter and setter methods.",
            JSON.stringify(["Data hiding", "private fields", "getters", "setters", "validation"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_5",
            "Constructor Overloading",
            "OOP Fundamentals",
            5,
            "02:34",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_5,
            "Shows how one class can define multiple constructors with different parameter lists for flexible object creation.",
            JSON.stringify(["Constructor overload", "Different parameters", "this()", "Initialization paths", "Compile-time selection"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_6",
            "Inheritance",
            "Core OOP",
            6,
            "03:00",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_6,
            "Introduces inheritance in Java, showing how child classes reuse and extend parent class fields and methods.",
            JSON.stringify(["Parent class", "Child class", "extends keyword", "is-a relationship", "Code reuse"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_7",
            "Polymorphism",
            "Core OOP",
            7,
            "02:24",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_7,
            "Covers polymorphism through overloaded methods, overridden behavior, parent references, and dynamic method dispatch.",
            JSON.stringify(["Many forms", "Method overloading", "Method overriding", "Parent reference", "Runtime dispatch"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_8",
            "Abstract Classes",
            "Advanced OOP",
            8,
            "02:29",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_8,
            "Explains abstract classes as shared base definitions that can declare required behavior and provide reusable concrete methods.",
            JSON.stringify(["abstract class", "Abstract method", "Concrete method", "Shared base class", "Subclass responsibility"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_9",
            "Interfaces / Abstraction",
            "Advanced OOP",
            9,
            "10:40",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_9,
            "Introduces interfaces and abstraction as ways to expose essential behavior while hiding implementation details.",
            JSON.stringify(["interface keyword", "implements keyword", "Behavior contract", "Implementation hiding", "Default methods"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_10",
            "Interfaces",
            "Advanced OOP",
            10,
            "21:24",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_10,
            "Shows how arrays can store object references, how each element must be initialized, and how loops process object collections.",
            JSON.stringify(["Object reference array", "Element initialization", "Null elements", "Array traversal", "Object state per element"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_11",
            "Array of Objects",
            "Advanced OOP",
            11,
            "23:26",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_11,
            "Shows how arrays can store object references, how each element must be initialized, and how loops process object collections.",
            JSON.stringify(["Object reference array", "Element initialization", "Null elements", "Array traversal", "Object state per element"]),
            "Published",
            "oop_fundamentals"
        ],
        [
            "oop_lesson_12",
            "Enum",
            "Advanced OOP",
            12,
            "32:11",
            OOP_CLOUDINARY_VIDEOS.oop_lesson_12,
            "Explains Java enums as type-safe named constants that can also contain fields, constructors, and methods.",
            JSON.stringify(["enum keyword", "Named constants", "Type safety", "switch with enum", "Enum fields and methods"]),
            "Published",
            "oop_fundamentals"
        ],
        ...JAVA_SWING_LESSONS.map((swingLesson) => {
            const swingVideo = JAVA_SWING_VIDEOS.find(v => v.lessonId === swingLesson.id);
            return [
                swingLesson.id,
                swingLesson.title,
                "Java Swing",
                12 + Number(swingLesson.sequence),
                swingVideo?.duration || "15:00",
                swingVideo?.embedUrl || "",
                swingLesson.introduction || swingLesson.summary || "",
                JSON.stringify(swingLesson.objectives || []),
                "Published",
                "java_swing"
            ];
        })
    ];

    for (const lesson of lessons) {
        await db.query(`
            INSERT INTO lessons (id, title, module, sequence, duration, video_url, description, learning_objectives, status, course_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              title = COALESCE(NULLIF(lessons.title, ''), EXCLUDED.title),
              module = COALESCE(NULLIF(lessons.module, ''), EXCLUDED.module),
              sequence = CASE
                WHEN lessons.id LIKE 'swing_%' AND lessons.sequence <= 12 THEN EXCLUDED.sequence
                WHEN lessons.sequence <= 0 THEN EXCLUDED.sequence
                ELSE lessons.sequence
              END,
              duration = EXCLUDED.duration,
              video_url = CASE
                WHEN EXCLUDED.video_url LIKE 'http%' THEN EXCLUDED.video_url
                ELSE COALESCE(NULLIF(lessons.video_url, ''), EXCLUDED.video_url)
              END,
              description = COALESCE(NULLIF(lessons.description, ''), EXCLUDED.description),
              learning_objectives = CASE
                WHEN lessons.learning_objectives IS NULL OR lessons.learning_objectives = '[]'::jsonb THEN EXCLUDED.learning_objectives
                ELSE lessons.learning_objectives
              END,
              status = COALESCE(NULLIF(lessons.status, ''), EXCLUDED.status),
              course_id = EXCLUDED.course_id,
              updated_at = NOW()
        `, lesson);
    }

    try {
        // Seed Java Swing dedicated tables idempotently without duplicating records
        for (const swingLesson of JAVA_SWING_LESSONS) {
            await db.query(`
                INSERT INTO swing_lessons (
                  id, sequence, title, topics, objectives, content, code_example
                )
                VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
                ON CONFLICT (id) DO UPDATE SET
                  sequence = EXCLUDED.sequence,
                  title = COALESCE(NULLIF(swing_lessons.title, ''), EXCLUDED.title),
                  topics = EXCLUDED.topics,
                  objectives = EXCLUDED.objectives,
                  content = EXCLUDED.content,
                  code_example = EXCLUDED.code_example,
                  updated_at = NOW()
            `, [
                swingLesson.id,
                swingLesson.sequence,
                swingLesson.title,
                JSON.stringify(swingLesson.topics || []),
                JSON.stringify(swingLesson.objectives || []),
                JSON.stringify(swingLesson.content || []),
                swingLesson.codeExample || ""
            ]);
        }

        for (const swingVid of JAVA_SWING_VIDEOS) {
            await db.query(`
                INSERT INTO swing_videos (id, lesson_id, title, duration, description, embed_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                  embed_url = COALESCE(NULLIF(swing_videos.embed_url, ''), EXCLUDED.embed_url),
                  duration = COALESCE(NULLIF(swing_videos.duration, ''), EXCLUDED.duration)
            `, [swingVid.id, swingVid.lessonId, swingVid.title, swingVid.duration, swingVid.description, swingVid.embedUrl]);
        }

        for (const swingAssessment of JAVA_SWING_ASSESSMENTS) {
            const questionList = swingAssessment.questions || [];
            await db.query(`
                INSERT INTO swing_quizzes (id, lesson_id, title, passing_percentage, question_count)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                  passing_percentage = EXCLUDED.passing_percentage,
                  question_count = EXCLUDED.question_count
            `, [swingAssessment.id, swingAssessment.lessonId, swingAssessment.title, SWING_PASSING_SCORE, questionList.length || 20]);

            for (const q of questionList) {
                await db.query(`
                    INSERT INTO swing_questions (id, quiz_id, prompt, choices, correct_answer, explanation)
                    VALUES ($1, $2, $3, $4::jsonb, $5, $6)
                    ON CONFLICT (id) DO NOTHING
                `, [q.id, swingAssessment.id, q.question, JSON.stringify(q.options || []), q.correctAnswer, q.explanation || ""]);
            }
        }

        for (const swingEx of JAVA_SWING_EXERCISES) {
            await db.query(`
                INSERT INTO swing_programming_exercises (
                  id, lesson_id, title, difficulty, instructions, starter_code, test_cases
                )
                VALUES ($1, $2, $3, 'Beginner', $4, $5, $6::jsonb)
                ON CONFLICT (id) DO NOTHING
            `, [
                swingEx.id,
                swingEx.lessonId,
                swingEx.title,
                swingEx.description,
                swingEx.starterCode || "",
                JSON.stringify(swingEx.testCases || [])
            ]);

            await db.query(`
                INSERT INTO programming_challenges (
                  id, topic_id, lesson_id, title, description, learning_objectives,
                  requirements, starter_code, sample_input, sample_output, passing_score, status
                )
                VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, 'Published')
                ON CONFLICT (id) DO NOTHING
            `, [
                swingEx.id,
                swingEx.topicId,
                swingEx.lessonId,
                swingEx.title,
                swingEx.description,
                JSON.stringify(swingEx.learningObjectives || []),
                JSON.stringify(swingEx.requirements || []),
                swingEx.starterCode || "",
                swingEx.sampleInput || "No stdin required",
                swingEx.sampleOutput || "",
                swingEx.passingScore || SWING_PASSING_SCORE
            ]);

            for (const tc of swingEx.testCases || []) {
                const tcId = `${swingEx.id}_${tc.id}`;
                await db.query(`
                    INSERT INTO challenge_test_cases (id, challenge_id, input, expected_output, is_hidden, matcher)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (id) DO NOTHING
                `, [tcId, swingEx.id, tc.input || "", tc.expectedOutput || "", Boolean(tc.isHidden), tc.matcher || ""]);
            }
        }

        // Seed lesson_videos per lesson if not already present (reuses existing records, never duplicates)
        for (const lesson of lessons) {
            const [id, title, _mod, _seq, duration, videoUrl, description] = lesson;
            const swingVid = JAVA_SWING_VIDEOS.find(v => v.lessonId === id);
            const videoId = swingVid ? swingVid.id : `vid_${id}`;
            const videoTitle = swingVid ? swingVid.title : `${title} Video Lecture`;
            const videoDesc = swingVid ? swingVid.description : description;
            await db.query(`
                INSERT INTO lesson_videos (id, lesson_id, title, video_url, duration, description, sequence, status)
                SELECT $1, $2, $3, $4, $5, $6, 1, 'Published'
                WHERE NOT EXISTS (SELECT 1 FROM lesson_videos WHERE lesson_id = $2)
                ON CONFLICT (id) DO NOTHING
            `, [videoId, id, videoTitle, videoUrl, duration, videoDesc]);
        }

        // Seed assessments for all 17 lessons (12 OOP + 5 Swing) if not already present
        for (let i = 1; i <= 12; i++) {
            const lessonId = `oop_lesson_${i}`;
            const assessmentId = `oop_assessment_${i}`;
            const topicTitle = TOPIC_NAMES[lessonId] || `Lesson ${i}`;
            const questions = OOP_PARSED_QUESTIONS[lessonId] || [];
            await db.query(`
                INSERT INTO assessments (id, lesson_id, title, quiz_type, passing_score, attempts, questions, status)
                SELECT $1, $2, $3, 'Multiple Choice', $4, $5, $6::jsonb, 'Published'
                WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE lesson_id = $2)
                ON CONFLICT (id) DO NOTHING
            `, [assessmentId, lessonId, `${topicTitle} Assessment`, ASSESSMENT_PASSING_SCORE, MAX_ASSESSMENT_ATTEMPTS, JSON.stringify(questions)]);
        }

        for (const swingAssessment of JAVA_SWING_ASSESSMENTS) {
            await db.query(`
                INSERT INTO assessments (id, lesson_id, title, quiz_type, passing_score, attempts, questions, status)
                SELECT $1, $2, $3, 'Multiple Choice', $4, $5, $6::jsonb, 'Published'
                WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE lesson_id = $2)
                ON CONFLICT (id) DO NOTHING
            `, [
                swingAssessment.id,
                swingAssessment.lessonId,
                swingAssessment.title,
                SWING_PASSING_SCORE,
                MAX_ASSESSMENT_ATTEMPTS,
                JSON.stringify(swingAssessment.questions || [])
            ]);
        }

        const existingResources = await db.query("SELECT COUNT(*)::int AS count FROM learning_resources");
        if (Number(existingResources.rows[0]?.count || 0) === 0) {
            const initialResources = [
                ['res_citation_1', 'oop_lesson_1', 'Java OOP Core Citations & Study Reference', 'reference', '/Citations/Citations%20of%2011%20topics%20in%20Java%20OOP.txt', '2 KB', 'Verified citations and topic syllabus for 11 Java OOP topics.'],
                ['res_swing_1', 'swing_lesson_1', 'Java Swing Handout: JFrame Components', 'pdf', '/Java%20Swing/Assessment-Quiz/Topic%201%20JFrame.pdf', '152 KB', 'Comprehensive study handout on JFrame basics and GUI structure.'],
                ['res_swing_2', 'swing_lesson_2', 'Java Swing Handout: JLabel & JTextField Encapsulation', 'pdf', '/Java%20Swing/Assessment-Quiz/Topic%202%20JLabel,JTextField&JTextArea_Assessment_.pdf', '139 KB', 'Component encapsulation and text input handling.'],
                ['res_swing_3', 'swing_lesson_3', 'Java Swing Handout: JButton & ActionListener', 'pdf', '/Java%20Swing/Assessment-Quiz/Topic%203%20JButton%20&%20ActionListener.pdf', '59 KB', 'Event handling and listener implementation patterns.'],
                ['res_swing_4', 'swing_lesson_4', 'Java Swing Handout: JPanel & Layout Managers', 'pdf', '/Java%20Swing/Assessment-Quiz/Topic%204%20JPanel%20&%20Layout%20Managers.pdf', '57 KB', 'Container hierarchy and layout managers.'],
                ['res_swing_5', 'swing_lesson_5', 'Java Swing Handout: JOptionPane Dialogs', 'pdf', '/Java%20Swing/Assessment-Quiz/Topic%205%20JOptionPane.pdf', '56 KB', 'Standard modal dialog patterns in Java Swing.']
            ];
            for (const [id, lessonId, title, rType, url, size, desc] of initialResources) {
                await db.query(`
                    INSERT INTO learning_resources (id, lesson_id, title, resource_type, file_url, file_size, description, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'Published')
                    ON CONFLICT (id) DO NOTHING
                `, [id, lessonId, title, rType, url, size, desc]);
            }
        }
    } catch (e) {
        console.warn("Non-fatal video/resource seeding error:", e.message);
    }

    if (db !== pool) return;

    // Create monitoring_requests table
    await executeInitQuery("Create monitoring_requests table", `
        CREATE TABLE IF NOT EXISTS monitoring_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(teacher_id, student_id)
        );
    `);

    // Create teacher_feedback table
    await executeInitQuery("Create teacher_feedback table", `
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
        );
    `);

    // Create assessment_sessions table
    await executeInitQuery("Create assessment_sessions table", `
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
        ALTER TABLE assessment_sessions ADD COLUMN IF NOT EXISTS insights JSONB DEFAULT NULL;
    `);

    // Create assessment_security_events table
    await executeInitQuery("Create assessment_security_events table", `
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
        // 1. Get all published OOP lessons
        const lessonsRes = await pool.query(`SELECT * FROM lessons WHERE status <> 'Archived' AND ${OOP_LESSON_FILTER_SQL} ORDER BY sequence, title`);
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
        const challengeRes = await pool.query("SELECT id, lesson_id, passing_score FROM programming_challenges");
        const challenges = challengeRes.rows;

        // 7. Calculate per-lesson progress
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

            const challenge = challenges.find(c => c.lesson_id === lesson.id);
            const hasChallenge = Boolean(challenge);
            // A missing challenge is missing evidence, not a completed practice.
            const practicePassed = isPracticeCompleted({
                id: practice?.id,
                score: practice?.score,
                teacherScore: practice?.teacher_score,
                compileStatus: practice?.compile_status,
                passingScore: challenge?.passing_score,
                remedialRequired: practice?.remedial_required
            });
            const practiceScore = hasChallenge ? Number(practice?.score || 0) : 0;
            const practiceSubmittedAt = practice?.submitted_at || null;

            if (videoCompleted) completedVideos++;
            if (quizPassed) passedQuizzes++;
            if (practicePassed && hasChallenge) passedPractices++;

            // Weight calculation
            const overallLessonProgress = calculateLessonProgress({ videoCompleted, assessmentPassed: quizPassed, practiceCompleted: practicePassed });

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
        const overallCourseProgress = calculateCourseProgress(lessonProgresses.map(lesson => lesson.overallLessonProgress));

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

const logProgressionDiagnostics = ({
    studentId,
    lessonId,
    predecessorLessonId = null,
    blockingPrerequisiteLessonId = null,
    successorLessonId = null,
    videoProgress,
    videoCompleted,
    assessmentScore,
    assessmentPassed,
    submissionId,
    challengeId,
    compileStatus,
    reviewStatus,
    remedialRequired,
    practiceCompleted,
    lessonCompleted,
    currentLessonUnlocked,
    nextLessonId,
    nextLessonUnlocked,
    accessReason
}) => {
    // Unambiguous diagnostic fields with backwards-compatible fallbacks
    const isCurrentUnlocked = currentLessonUnlocked !== undefined
        ? Boolean(currentLessonUnlocked)
        : Boolean(nextLessonUnlocked);
    const predId = predecessorLessonId || null;
    const blockingId = blockingPrerequisiteLessonId || null;
    const succId = successorLessonId || (nextLessonId && nextLessonId !== lessonId ? nextLessonId : null);

    console.log(`[Progression Diagnostic] Student: ${studentId} | Lesson: ${lessonId}`);
    console.log(`  - Video: ${videoProgress}% (completed: ${videoCompleted}) [threshold: ${VIDEO_COMPLETION_THRESHOLD}%]`);
    console.log(`  - Assessment: ${assessmentScore !== null ? `${assessmentScore}%` : 'N/A'} (passed: ${assessmentPassed}) [threshold: ${ASSESSMENT_PASSING_SCORE}%]`);
    console.log(`  - Practice: subId=${submissionId || 'none'}, challenge=${challengeId || 'none'}, compile=${compileStatus || 'N/A'}, review=${reviewStatus || 'N/A'}, remedial=${remedialRequired} (completed: ${practiceCompleted})`);
    console.log(`  - Current Lesson Evidence: completed=${lessonCompleted}`);
    const predDetails = predId
        ? ` (immediate predecessor: ${predId}${blockingId && blockingId !== predId ? `, blocked by prerequisite: ${blockingId}` : ''})`
        : ' (first lesson in course)';
    console.log(`  - Current Lesson (${lessonId}) Access: unlocked=${isCurrentUnlocked}${predDetails}${accessReason ? `, reason="${accessReason}"` : ''}`);
    if (succId) {
        console.log(`  - Successor Lesson (${succId}) Unlock Readiness: eligible=${lessonCompleted}`);
    }
};

const getLessonEvidence = async (studentId, lessonId) => {
    let isSwing = isSwingLessonId(lessonId);
    let lessonResult;
    if (isSwing) {
        lessonResult = await pool.query(
            `SELECT sl.id, sl.sequence, COALESCE(l.module, 'Java Swing') AS module, COALESCE(l.status, 'Published') AS status
             FROM swing_lessons sl
             LEFT JOIN lessons l ON l.id = sl.id
             WHERE sl.id = $1 AND COALESCE(l.status, 'Published') <> 'Archived'`,
            [lessonId]
        );
        if (!lessonResult.rowCount) {
            const fallbackSwing = JAVA_SWING_LESSONS.find(item => item.id === lessonId);
            const lessonRowResult = await pool.query(
                "SELECT id, sequence, module, status FROM lessons WHERE id = $1",
                [lessonId]
            );
            if (lessonRowResult.rowCount && lessonRowResult.rows[0].status === "Archived") {
                return null;
            }
            if (lessonRowResult.rowCount || fallbackSwing) {
                const rawSeq = Number(lessonRowResult.rows[0]?.sequence || fallbackSwing?.sequence || 1);
                lessonResult = {
                    rowCount: 1,
                    rows: [{
                        id: lessonId,
                        sequence: fallbackSwing ? fallbackSwing.sequence : (rawSeq > 12 ? rawSeq - 12 : rawSeq),
                        module: "Java Swing"
                    }]
                };
            } else {
                return null;
            }
        }
    } else {
        lessonResult = await pool.query(
            "SELECT id, sequence, module, track FROM lessons WHERE id = $1 AND status <> 'Archived'",
            [lessonId]
        );
        if (!lessonResult.rowCount) {
            lessonResult = await pool.query(
                "SELECT id, sequence, 'Java Swing' AS module FROM swing_lessons WHERE id = $1",
                [lessonId]
            );
            if (!lessonResult.rowCount) return null;
            isSwing = true;
        } else if (lessonResult.rows[0].track === 'swing' || String(lessonResult.rows[0].module || '').toLowerCase().includes('swing')) {
            isSwing = true;
        }
    }
    const lesson = lessonResult.rows[0];

    // Authoritative student identity resolution to prevent UUID/string mismatch
    const userRow = await pool.query(`
        SELECT u.id, u.user_id, u.email
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        WHERE u.id::text = $1 OR u.user_id = $1 OR LOWER(u.email) = LOWER($1)
           OR s.student_number = $1 OR s.id = $1
        LIMIT 1
    `, [String(studentId)]);
    const studentUuid = userRow.rows[0]?.id || studentId;
    const studentUserId = userRow.rows[0]?.user_id || String(studentId);
    const studentEmail = userRow.rows[0]?.email || "";

    const lessonSeqMatch = String(lessonId).match(/(\d+)$/);
    const lessonSeq = lessonSeqMatch ? parseInt(lessonSeqMatch[1], 10) : Number(lesson.sequence || 1);
    const expectedChallengeId = isSwing ? `swing_practice_${lessonSeq}` : `practice_${lessonSeq}`;

    let videoProgress = 0;
    let videoCompleted = false;
    let assessmentScore = null;
    let assessmentPassed = false;
    let practiceRequired = false;
    let practiceCompleted = false;
    let practiceSubmitted = false;
    let lpRow = null;
    let practiceSubmissionId = null;
    let practiceChallengeId = null;
    let practiceCompileStatus = null;
    let practiceReviewStatus = null;
    let practiceRemedialRequired = false;

    if (!isSwing) {
        const videoResult = await pool.query(
            `SELECT GREATEST(
                COALESCE((SELECT MAX(completion_percentage) FROM student_progress WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)} AND (video_id = $4 OR video_id = REPLACE($4, 'oop_lesson_', '') OR video_id = 'vid_' || $4 OR video_id = 'oop_lesson_' || $4)), 0),
                COALESCE((SELECT MAX(watch_percentage) FROM video_progress WHERE ${studentUuidMatchSql("student_id", 1, 2, 3)} AND (lesson_id = $4 OR lesson_id = REPLACE($4, 'oop_lesson_', '') OR lesson_id = 'oop_lesson_' || $4)), 0),
                COALESCE((SELECT 100 FROM lesson_progress WHERE ${studentUuidMatchSql("student_id", 1, 2, 3)} AND (lesson_id = $4 OR lesson_id = REPLACE($4, 'oop_lesson_', '') OR lesson_id = 'oop_lesson_' || $4) AND video_completed = TRUE), 0)
            ) AS completion_percentage,
            EXISTS (
                SELECT 1 FROM student_progress WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)} AND (video_id = $4 OR video_id = REPLACE($4, 'oop_lesson_', '') OR video_id = 'vid_' || $4 OR video_id = 'oop_lesson_' || $4) AND (completed = TRUE OR completion_percentage >= ${VIDEO_COMPLETION_THRESHOLD})
                UNION ALL
                SELECT 1 FROM video_progress WHERE ${studentUuidMatchSql("student_id", 1, 2, 3)} AND (lesson_id = $4 OR lesson_id = REPLACE($4, 'oop_lesson_', '') OR lesson_id = 'oop_lesson_' || $4) AND (completed = TRUE OR watch_percentage >= ${VIDEO_COMPLETION_THRESHOLD})
                UNION ALL
                SELECT 1 FROM lesson_progress WHERE ${studentUuidMatchSql("student_id", 1, 2, 3)} AND (lesson_id = $4 OR lesson_id = REPLACE($4, 'oop_lesson_', '') OR lesson_id = 'oop_lesson_' || $4) AND video_completed = TRUE
            ) AS is_completed`,
            [studentUuid, studentUserId, studentEmail, lessonId]
        );
        const quizResult = await pool.query(
            `SELECT
                EXISTS (
                    SELECT 1
                    FROM quiz_attempts qa
                    WHERE ${studentUuidMatchSql("qa.student_user_id", 1, 2, 3)}
                      AND (
                        qa.lesson_id = $4
                        OR qa.lesson_id = REPLACE($4, 'oop_lesson_', '')
                        OR qa.lesson_id = 'oop_lesson_' || $4
                        OR qa.assessment_id = 'oop_assessment_' || (SELECT sequence FROM lessons WHERE id = $4)
                        OR qa.assessment_id = 'oop_assessment_' || $5
                        OR qa.assessment_id = $4
                        OR qa.assessment_id = REPLACE($4, 'oop_lesson_', '')
                        OR EXISTS (SELECT 1 FROM assessments a WHERE a.id = qa.assessment_id AND (a.lesson_id = $4 OR a.lesson_id = REPLACE($4, 'oop_lesson_', '')))
                      )
                      AND (${normalizedAssessmentPercentageSql("qa")} >= ${ASSESSMENT_PASSING_SCORE} OR qa.passed = TRUE)
                ) AS passed,
                (SELECT ${normalizedAssessmentPercentageSql("latest")} FROM quiz_attempts latest
                 WHERE ${studentUuidMatchSql("latest.student_user_id", 1, 2, 3)}
                   AND (
                     latest.lesson_id = $4
                     OR latest.lesson_id = REPLACE($4, 'oop_lesson_', '')
                     OR latest.lesson_id = 'oop_lesson_' || $4
                     OR latest.assessment_id = 'oop_assessment_' || (SELECT sequence FROM lessons WHERE id = $4)
                     OR latest.assessment_id = 'oop_assessment_' || $5
                     OR latest.assessment_id = $4
                     OR latest.assessment_id = REPLACE($4, 'oop_lesson_', '')
                     OR EXISTS (SELECT 1 FROM assessments a WHERE a.id = latest.assessment_id AND (a.lesson_id = $4 OR a.lesson_id = REPLACE($4, 'oop_lesson_', '')))
                   )
                 ORDER BY latest.attempt_number DESC, latest.date_completed DESC LIMIT 1) AS percentage`,
            [studentUuid, studentUserId, studentEmail, lessonId, String(lessonSeq)]
        );

        // Query practice submissions directly using student relationships and challenge/lesson association
        const challengeResult = await pool.query(`
            SELECT ps.id AS submission_id,
                   ps.challenge_id,
                   COALESCE(pc.lesson_id, $4) AS lesson_id,
                   COALESCE(pc.passing_score, 70) AS passing_score,
                   ps.score,
                   ps.teacher_score,
                   ps.compile_status,
                   ps.review_status,
                   ps.remedial_required,
                   ps.source_code,
                   ps.submitted_at
            FROM practice_submissions ps
            LEFT JOIN programming_challenges pc ON pc.id = ps.challenge_id
            WHERE (
                ps.student_id = $1::text
                OR ps.student_id = $2::text
                OR ps.student_id = $3::text
                OR ps.student_id IN (SELECT id::text FROM users WHERE id::text = $1::text OR user_id = $2 OR LOWER(email) = LOWER($3))
                OR ps.student_id IN (SELECT user_id FROM users WHERE id::text = $1::text OR user_id = $2 OR LOWER(email) = LOWER($3))
                OR ps.student_id IN (SELECT email FROM users WHERE id::text = $1::text OR user_id = $2 OR LOWER(email) = LOWER($3))
                OR ps.student_id IN (SELECT s.student_number FROM students s WHERE s.user_id::text = $1::text OR s.id = $1::text)
            )
            AND (
                pc.lesson_id = $4
                OR pc.lesson_id = REPLACE($4, 'oop_lesson_', '')
                OR pc.lesson_id = 'oop_lesson_' || $6
                OR ps.challenge_id = $5
                OR pc.id = $5
                OR ps.challenge_id = 'practice_' || $6
                OR ps.challenge_id = 'practice-' || $6
                OR ps.challenge_id = 'oop_practice_' || $6
                OR ps.challenge_id = $4
                OR ps.challenge_id = REPLACE($4, 'oop_lesson_', '')
                OR ($6 = '1' AND (ps.challenge_id = 'classes-objects' OR ps.challenge_id = 'classes_and_objects'))
                OR ($6 = '2' AND ps.challenge_id = 'constructors')
                OR ($6 = '3' AND (ps.challenge_id = 'object-methods' OR ps.challenge_id = 'practice_3' OR pc.topic_id = 'object-methods'))
                OR ($6 = '4' AND ps.challenge_id = 'encapsulation')
                OR ($6 = '5' AND (ps.challenge_id = 'constructor-overloading' OR ps.challenge_id = 'constructor_overloading'))
                OR ($6 = '6' AND ps.challenge_id = 'inheritance')
                OR ($6 = '7' AND ps.challenge_id = 'polymorphism')
                OR ($6 = '8' AND (ps.challenge_id = 'abstract-classes' OR ps.challenge_id = 'abstract_classes'))
                OR ($6 = '9' AND (ps.challenge_id = 'interface-and-abstract' OR ps.challenge_id = 'interface_and_abstract'))
                OR ($6 = '10' AND ps.challenge_id = 'interfaces')
                OR ($6 = '11' AND (ps.challenge_id = 'array-of-objects' OR ps.challenge_id = 'array_of_objects'))
                OR ($6 = '12' AND (ps.challenge_id = 'enums' OR ps.challenge_id = 'enum'))
                OR ps.challenge_id = pc.topic_id
                OR ps.challenge_id IN (SELECT id FROM programming_challenges WHERE lesson_id = $4 OR lesson_id = REPLACE($4, 'oop_lesson_', ''))
                OR ps.challenge_id IN (SELECT topic_id FROM programming_challenges WHERE lesson_id = $4 OR lesson_id = REPLACE($4, 'oop_lesson_', ''))
            )
            ORDER BY 
              CASE WHEN ps.compile_status = 'success' AND COALESCE(ps.review_status, '') <> 'returned' AND COALESCE(ps.remedial_required, FALSE) = FALSE THEN 1 ELSE 2 END,
              ps.submitted_at DESC
            LIMIT 1
        `, [studentUuid, studentUserId, studentEmail, lessonId, expectedChallengeId, String(lessonSeq)]);

        videoProgress = Number(videoResult.rows[0]?.completion_percentage || 0);
        videoCompleted = videoProgress >= VIDEO_COMPLETION_THRESHOLD || Boolean(videoResult.rows[0]?.is_completed);
        assessmentPassed = Boolean(quizResult.rows[0]?.passed);
        assessmentScore = quizResult.rows[0]?.percentage === null || quizResult.rows[0]?.percentage === undefined
            ? null : Number(quizResult.rows[0].percentage);

        practiceRequired = true;
        const practice = challengeResult.rows[0];
        practiceSubmissionId = practice?.submission_id || null;
        practiceChallengeId = practice?.challenge_id || null;
        practiceCompileStatus = practice?.compile_status || null;
        practiceReviewStatus = practice?.review_status || null;
        practiceRemedialRequired = Boolean(practice?.remedial_required);

        // Reconcile submissions that were previously failed solely due to static check mismatches
        if (practice && (practiceCompileStatus === 'failed' || practiceCompileStatus === 'not_executed') && practice.source_code) {
            const recheck = validateBasicJavaStructure(
                { id: practice.challenge_id, lesson_id: lessonId, topicId: expectedChallengeId, title: 'Practice Challenge' },
                practice.source_code
            );
            if (recheck.oopStructureCheck === 'passed') {
                practiceCompileStatus = 'success';
                practice.compile_status = 'success';
                if (!practice.score || Number(practice.score) < 70) {
                    practice.score = 100;
                }
            }
        }

        // Also check authoritative lesson_progress as backup evidence if submission was verified
        const lessonProgressResult = await pool.query(`
            SELECT practice_completed, practice_submitted, completed
            FROM lesson_progress
            WHERE ${studentUuidMatchSql("student_id", 1, 2, 3)}
              AND (lesson_id = $4 OR lesson_id = REPLACE($4, 'oop_lesson_', '') OR lesson_id = 'oop_lesson_' || $4)
        `, [studentUuid, studentUserId, studentEmail, lessonId]);
        lpRow = lessonProgressResult.rows[0];

        // Practice completion requires a valid submission without remedial requirement.
        // Teacher review is separate and does not delay unlocking.
        practiceCompleted = isPracticeCompleted({
            id: practice?.submission_id,
            submissionId: practice?.submission_id,
            remedialRequired: practiceRemedialRequired,
            compileStatus: practiceCompileStatus,
            score: practice?.score,
            teacherScore: practice?.teacher_score,
            reviewStatus: practiceReviewStatus
        }) || (Boolean(lpRow?.practice_completed) && !practiceRemedialRequired);
        practiceSubmitted = Boolean(practiceSubmissionId || practiceCompleted || lpRow?.practice_submitted || lpRow?.practice_completed);
    } else {
        const swingProgressResult = await pool.query(
            `SELECT video_completed, video_percentage, video_last_position, quiz_passed, exercise_completed, overall_percentage
             FROM swing_progress 
             WHERE ${studentTextMatchSql("student_id", 1, 2, 3)} AND (lesson_id = $4 OR lesson_id = REPLACE($4, 'swing_lesson_', ''))`,
            [studentUuid, studentUserId, studentEmail, lessonId]
        );

        const row = swingProgressResult.rows[0];
        videoProgress = Number(row?.video_percentage || 0);
        videoCompleted = videoProgress >= VIDEO_COMPLETION_THRESHOLD || Boolean(row?.video_completed);
        assessmentPassed = Boolean(row?.quiz_passed);
        practiceRequired = true;
        practiceCompleted = Boolean(row?.exercise_completed);
        practiceSubmitted = practiceCompleted;
    }

    const isFullyCompleted = Boolean(videoCompleted && assessmentPassed && practiceCompleted);

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
        practiceSubmitted,
        practice_submitted: practiceSubmitted,
        practiceSubmissionId,
        practiceChallengeId,
        practiceCompileStatus,
        practiceReviewStatus,
        practiceRemedialRequired,
        assessmentUnlocked: videoCompleted,
        practiceUnlocked: Boolean(videoCompleted && assessmentPassed),
        nextLessonUnlocked: isFullyCompleted,
        completed: isFullyCompleted
    };
};

const REQUIRED_CANONICAL_OOP_LESSON_IDS = Object.freeze([
    'oop_lesson_1', 'oop_lesson_2', 'oop_lesson_3', 'oop_lesson_4',
    'oop_lesson_5', 'oop_lesson_6', 'oop_lesson_7', 'oop_lesson_8',
    'oop_lesson_9', 'oop_lesson_10', 'oop_lesson_11', 'oop_lesson_12'
]);

const getOOPCompletionStatus = async (studentId) => {
    // 1. Fetch the 12 required canonical OOP lessons using their stable identifiers
    const requiredLessonsResult = await pool.query(`
        SELECT id, sequence, title, module, course_id
        FROM lessons
        WHERE id = ANY($1::text[])
          AND status <> 'Archived'
        ORDER BY sequence, id
    `, [REQUIRED_CANONICAL_OOP_LESSON_IDS]);

    // Use actual database rows for the required 12 lessons (fallback to stable IDs if any not yet in DB)
    const targetLessons = requiredLessonsResult.rows.length >= 12
        ? requiredLessonsResult.rows
        : (requiredLessonsResult.rows.length > 0 
            ? requiredLessonsResult.rows 
            : REQUIRED_CANONICAL_OOP_LESSON_IDS.map((id, idx) => ({ id, sequence: idx + 1 })));

    const evidence = await Promise.all(
        targetLessons.map(lesson => getLessonEvidence(studentId, lesson.id))
    );
    const requiredCount = targetLessons.length;
    const completedCount = evidence.filter(item => item?.completed === true).length;
    const lessonsComplete = requiredCount > 0 && completedCount === requiredCount;
    const assessmentsComplete = requiredCount > 0 && evidence.every(item => item?.assessmentPassed === true);
    const practiceComplete = requiredCount > 0 && evidence.every(item => item?.practiceCompleted === true);

    // Total published OOP lessons in active dynamic catalog for analytics
    let totalPublishedOOP = requiredCount;
    try {
        const totalPublishedRes = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM lessons
            WHERE status <> 'Archived' AND ${OOP_LESSON_FILTER_SQL}
        `);
        totalPublishedOOP = Math.max(requiredCount, totalPublishedRes.rows[0]?.count || 0);
    } catch {}

    return {
        lessonsComplete,
        assessmentsComplete,
        practiceComplete,
        oopComplete: lessonsComplete && assessmentsComplete && practiceComplete,
        totalLessons: totalPublishedOOP,
        requiredLessons: requiredCount,
        completedLessons: completedCount
    };
};

const getSwingCompletionStatus = async (studentId) => {
    const swingResult = await pool.query(`
        SELECT id
        FROM swing_lessons
        ORDER BY sequence, id
    `);
    const fallbackList = swingResult.rowCount ? swingResult.rows : JAVA_SWING_LESSONS;
    const evidence = await Promise.all(
        fallbackList.map(lesson => getLessonEvidence(studentId, lesson.id))
    );
    const totalCount = evidence.length;
    const completedCount = evidence.filter(item => item?.completed === true).length;
    return {
        totalLessons: totalCount,
        completedLessons: completedCount,
        swingComplete: totalCount > 0 && completedCount === totalCount
    };
};

const getLessonAccessState = async (studentId, lessonId) => {
    const current = await getLessonEvidence(studentId, lessonId);
    if (!current) return { canAccess: false, reason: "Lesson not found." };

    const withLessonAccess = (canAccess, reason = null, predecessorId = null, successorId = null, blockingPrerequisiteId = null) => {
        logProgressionDiagnostics({
            studentId,
            lessonId,
            predecessorLessonId: predecessorId,
            blockingPrerequisiteLessonId: blockingPrerequisiteId,
            successorLessonId: successorId,
            videoProgress: current.videoProgress,
            videoCompleted: current.videoCompleted,
            assessmentScore: current.assessmentScore,
            assessmentPassed: current.assessmentPassed,
            submissionId: current.practiceSubmissionId,
            challengeId: current.practiceChallengeId,
            compileStatus: current.practiceCompileStatus,
            reviewStatus: current.practiceReviewStatus,
            remedialRequired: current.practiceRemedialRequired,
            practiceCompleted: current.practiceCompleted,
            lessonCompleted: current.completed,
            currentLessonUnlocked: canAccess,
            nextLessonId: successorId,
            nextLessonUnlocked: current.completed,
            accessReason: reason
        });
        return {
            canAccess,
            reason,
            predecessorId: predecessorId,
            blockingPrerequisiteId: blockingPrerequisiteId || null,
            current: {
                ...current,
                lessonUnlocked: canAccess,
                accessReason: reason,
                predecessorId: predecessorId,
                blockingPrerequisiteId: blockingPrerequisiteId || null
            }
        };
    };

    let activeTrackLessons = [];

    if (!current.isSwing) {
        const oopLessonsResult = await pool.query(`
            SELECT id, sequence, title, module, course_id, track
            FROM lessons
            WHERE status <> 'Archived' AND ${OOP_LESSON_FILTER_SQL}
            ORDER BY sequence ASC, id ASC
        `);
        activeTrackLessons = oopLessonsResult.rows;
        if (!activeTrackLessons.length) {
            activeTrackLessons = REQUIRED_CANONICAL_OOP_LESSON_IDS.map((id, idx) => ({
                id,
                sequence: idx + 1,
                title: `Lesson ${idx + 1}`
            }));
        } else {
            activeTrackLessons.sort((a, b) => {
                const aCanonicalIndex = REQUIRED_CANONICAL_OOP_LESSON_IDS.indexOf(a.id);
                const bCanonicalIndex = REQUIRED_CANONICAL_OOP_LESSON_IDS.indexOf(b.id);
                if (aCanonicalIndex !== -1 && bCanonicalIndex !== -1) {
                    return aCanonicalIndex - bCanonicalIndex;
                }
                if (aCanonicalIndex !== -1) {
                    const bSeq = Number(b.sequence || 0);
                    return bSeq > 0 && bSeq <= (aCanonicalIndex + 1) ? 1 : -1;
                }
                if (bCanonicalIndex !== -1) {
                    const aSeq = Number(a.sequence || 0);
                    return aSeq > 0 && aSeq <= (bCanonicalIndex + 1) ? -1 : 1;
                }
                const seqDiff = Number(a.sequence || 0) - Number(b.sequence || 0);
                if (seqDiff !== 0) return seqDiff;
                return String(a.id).localeCompare(String(b.id));
            });
        }
    } else {
        // Swing lessons require the 12 required OOP lessons to be completed before Swing unlocks
        const oopStatus = await getOOPCompletionStatus(studentId);
        if (!oopStatus.oopComplete) {
            return withLessonAccess(false, `Complete all 12 required Java OOP lessons before unlocking Java Swing.`);
        }

        const swingLessonsResult = await pool.query(`
            SELECT sl.id, sl.sequence, sl.title, 'Java Swing' AS module
            FROM swing_lessons sl
            LEFT JOIN lessons l ON l.id = sl.id
            WHERE COALESCE(l.status, 'Published') <> 'Archived'
            ORDER BY sl.sequence ASC, sl.id ASC
        `);
        activeTrackLessons = swingLessonsResult.rowCount ? swingLessonsResult.rows : JAVA_SWING_LESSONS;
    }

    const currentIndex = activeTrackLessons.findIndex(
        l => l.id === lessonId || l.id === String(lessonId).replace('oop_lesson_', '') || l.id === `oop_lesson_${lessonId}`
    );

    if (currentIndex === -1) {
        return withLessonAccess(false, "Lesson is archived or not part of the active course sequence.");
    }

    const predecessor = currentIndex > 0 ? activeTrackLessons[currentIndex - 1] : null;
    const successor = currentIndex < activeTrackLessons.length - 1 ? activeTrackLessons[currentIndex + 1] : null;

    if (currentIndex === 0) {
        // First active lesson in dynamic course catalog has no predecessor -> accessible
        return withLessonAccess(true, null, null, successor?.id || null, null);
    }

    // Verify all predecessors in the chain from sequence start to current
    for (let k = 0; k < currentIndex; k++) {
        const pred = activeTrackLessons[k];
        const predEvidence = await getLessonEvidence(studentId, pred.id);
        if (!predEvidence?.completed) {
            const isImmediate = (k === currentIndex - 1);
            const reason = isImmediate
                ? (!predEvidence?.videoCompleted
                    ? `Complete the previous lesson video to at least ${VIDEO_COMPLETION_THRESHOLD}% first.`
                    : !predEvidence?.assessmentPassed
                        ? "Pass the previous lesson assessment before continuing."
                        : "Complete the previous lesson practice before continuing.")
                : (!predEvidence?.videoCompleted
                    ? `Complete ${pred.title || pred.id} video to at least ${VIDEO_COMPLETION_THRESHOLD}% first.`
                    : !predEvidence?.assessmentPassed
                        ? `Pass ${pred.title || pred.id} assessment before continuing.`
                        : `Complete ${pred.title || pred.id} practice before continuing.`);
            return withLessonAccess(false, reason, predecessor?.id || null, successor?.id || null, pred.id);
        }
    }

    return withLessonAccess(true, null, predecessor?.id || null, successor?.id || null, null);
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

const resolveAssessmentQuestions = async (assessmentId, lessonId = "") => {
    if (assessmentId || lessonId) {
        try {
            const res = await pool.query(
                "SELECT questions FROM assessments WHERE id = $1 OR lesson_id = $2 ORDER BY updated_at DESC LIMIT 1",
                [assessmentId || "", lessonId || ""]
            );
            if (res.rowCount && res.rows[0].questions) {
                let parsed = res.rows[0].questions;
                if (typeof parsed === "string") {
                    try { parsed = JSON.parse(parsed); } catch {}
                }
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map(q => ({
                        id: q.id,
                        lessonId: q.lessonId || lessonId,
                        question: q.question || q.prompt || "",
                        codeSnippet: q.codeSnippet || "",
                        options: Array.isArray(q.options)
                            ? q.options.map(o => typeof o === "string" ? o : (o.text || o.label || ""))
                            : [],
                        correctAnswer: q.correctAnswer || (Array.isArray(q.options) ? q.options.find(o => o.id === q.correctOptionId)?.text : "") || "",
                        explanation: q.explanation || "",
                        difficulty: q.difficulty || "Medium"
                    }));
                }
            }
        } catch (e) {
            console.warn("Could not query DB for assessment questions:", e.message);
        }
    }
    if (lessonId && OOP_PARSED_QUESTIONS[lessonId]) {
        return OOP_PARSED_QUESTIONS[lessonId];
    }
    if (lessonId && SWING_QUESTIONS_BY_LESSON[lessonId]) {
        return SWING_QUESTIONS_BY_LESSON[lessonId];
    }
    if (assessmentId && OOP_PARSED_QUESTIONS[assessmentId]) {
        return OOP_PARSED_QUESTIONS[assessmentId];
    }
    const swingMatch = String(assessmentId).match(/swing_assessment_(\d+)/);
    if (swingMatch) {
        const key = `swing_lesson_${swingMatch[1]}`;
        if (SWING_QUESTIONS_BY_LESSON[key]) return SWING_QUESTIONS_BY_LESSON[key];
    }
    const swingLessonMatch = String(lessonId).match(/swing_lesson_(\d+)/);
    if (swingLessonMatch) {
        const key = `swing_lesson_${swingLessonMatch[1]}`;
        if (SWING_QUESTIONS_BY_LESSON[key]) return SWING_QUESTIONS_BY_LESSON[key];
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
        const userRow = await pool.query(
            "SELECT id FROM users WHERE id::text = $1 OR user_id = $1 OR LOWER(email) = LOWER($1) LIMIT 1",
            [String(studentId)]
        );
        const studentUuid = userRow.rows[0]?.id || studentId;
        const isUuid = studentUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(studentUuid));

        if (isUuid) {
            await pool.query(`
                INSERT INTO lesson_progress (student_id, lesson_id, video_completed, quiz_passed, practice_completed, practice_submitted, completed, completed_at)
                VALUES ($1, $2, $3, $4, $5, $5, $6, CASE WHEN $6 THEN NOW() ELSE NULL END)
                ON CONFLICT (student_id, lesson_id) DO UPDATE SET
                  video_completed = EXCLUDED.video_completed,
                  quiz_passed = EXCLUDED.quiz_passed,
                  practice_completed = EXCLUDED.practice_completed,
                  practice_submitted = EXCLUDED.practice_submitted OR lesson_progress.practice_submitted,
                  completed = EXCLUDED.completed,
                  completed_at = CASE WHEN EXCLUDED.completed THEN NOW() ELSE lesson_progress.completed_at END,
                  updated_at = NOW()
            `, [studentUuid, lessonId, evidence.videoCompleted, evidence.assessmentPassed, evidence.practiceCompleted, evidence.completed]);

            if (evidence.completed) {
                await logActivity(studentUuid, "lesson_complete", `Completed OOP Lesson: ${lessonId}`, { lessonId });

                const lessonInfo = await pool.query("SELECT module FROM lessons WHERE id = $1", [lessonId]);
                if (lessonInfo.rowCount > 0) {
                    const moduleName = lessonInfo.rows[0].module;
                    await checkModuleCompletion(studentUuid, moduleName);
                }

                await checkAndAwardBadges(studentUuid);
            }
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
                  AND ${OOP_LESSON_FILTER_SQL}
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

const buildDefaultSwingLessonRow = (swingLesson, swingVideo) => ({
    id: swingLesson.id,
    title: swingLesson.title,
    track: "swing",
    module: "Java Swing",
    course_id: "java_swing",
    sequence: 12 + Number(swingLesson.sequence),
    duration: swingVideo?.duration || "15:00",
    video_url: swingVideo?.embedUrl || "",
    description: swingLesson.introduction || swingLesson.summary || "",
    learning_objectives: swingLesson.objectives || [],
    status: "Published",
    metadata: { track: "swing" }
});

const fetchOrderedLessonRows = async () => {
    const result = await pool.query(`
        SELECT * FROM lessons
        ORDER BY
          CASE
            WHEN id LIKE 'swing_%' OR COALESCE(course_id, '') = 'java_swing' OR LOWER(COALESCE(module, '')) LIKE '%swing%' THEN 1
            ELSE 0
          END ASC,
          sequence ASC,
          title ASC
    `);
    const existingIds = new Set(result.rows.map(row => row.id));
    const missingSwing = JAVA_SWING_LESSONS.filter(item => !existingIds.has(item.id));
    if (missingSwing.length > 0) {
        let dbSwingRows = [];
        let dbSwingVideos = [];
        try {
            const [slRes, svRes] = await Promise.all([
                pool.query("SELECT * FROM swing_lessons ORDER BY sequence ASC"),
                pool.query("SELECT * FROM swing_videos")
            ]);
            dbSwingRows = slRes.rows || [];
            dbSwingVideos = svRes.rows || [];
        } catch {}

        for (const swingLesson of missingSwing) {
            const dbSl = dbSwingRows.find(r => r.id === swingLesson.id);
            const dbSv = dbSwingVideos.find(r => r.lesson_id === swingLesson.id);
            const fallbackVideo = JAVA_SWING_VIDEOS.find(v => v.lessonId === swingLesson.id);
            result.rows.push({
                id: swingLesson.id,
                title: dbSl?.title || swingLesson.title,
                track: "swing",
                module: "Java Swing",
                course_id: "java_swing",
                sequence: 12 + Number(dbSl?.sequence || swingLesson.sequence),
                duration: dbSv?.duration || fallbackVideo?.duration || "15:00",
                video_url: dbSv?.embed_url || fallbackVideo?.embedUrl || "",
                description: dbSl?.introduction || swingLesson.introduction || swingLesson.summary || "",
                learning_objectives: dbSl?.objectives || swingLesson.objectives || [],
                status: "Published",
                metadata: { track: "swing" }
            });
        }
    }
    result.rows.sort((a, b) => {
        const aSwing = isSwingLessonId(a.id) || a.course_id === "java_swing" || String(a.module || "").toLowerCase().includes("swing") ? 1 : 0;
        const bSwing = isSwingLessonId(b.id) || b.course_id === "java_swing" || String(b.module || "").toLowerCase().includes("swing") ? 1 : 0;
        if (aSwing !== bSwing) return aSwing - bSwing;
        const seqDiff = Number(a.sequence || 0) - Number(b.sequence || 0);
        if (seqDiff !== 0) return seqDiff;
        return String(a.title || "").localeCompare(String(b.title || ""));
    });
    return result.rows;
};

app.get("/api/lessons", optionalAuth, async (req, res, next) => {
    try {
        const rows = await fetchOrderedLessonRows();
        res.json({ success: true, data: await Promise.all(rows.map(row => toClientLessonForRequest(row, req))) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/lessons", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const body = req.body || {};
        let id;
        if (body.id !== undefined && body.id !== null) {
            const idCheck = validateId(body.id, "id", "POST /api/lessons");
            if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
            id = idCheck.value;
        } else {
            id = `lesson_${Date.now()}`;
        }
        const title = cleanText(body.title || body.lessonTitle || "", 255);
        if (!title) {
            logDiagnosticError("POST /api/lessons", "title", body.title, "Lesson title is required");
            return res.status(400).json({ success: false, message: "Lesson title is required." });
        }
        const objectives = Array.isArray(body.learningObjectives)
            ? body.learningObjectives.slice(0, 20)
            : String(body.learningObjectives || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
        const storageProvider = body.storageProvider || body.storage_provider
            ? cleanText(body.storageProvider || body.storage_provider || "", 40).toLowerCase()
            : "";
        const storageKey = cleanText(body.storageKey || body.storage_key || "", 500);
        const storageContentType = cleanText(body.storageContentType || body.storage_content_type || "", 120).toLowerCase();

        const storageSizeCheck = validateStorageSize(body.storageSize ?? body.storage_size, "POST /api/lessons");
        if (!storageSizeCheck.valid) return res.status(storageSizeCheck.status).json({ success: false, message: storageSizeCheck.message });
        const storageSize = storageSizeCheck.value ?? null;

        if (storageProvider) {
            if (storageProvider !== STORAGE_PROVIDER) {
                logDiagnosticError("POST /api/lessons", "storageProvider", storageProvider, "Unsupported storage provider");
                return res.status(400).json({ success: false, message: "Unsupported storage provider." });
            }
            validateVideoUpload({ contentType: storageContentType, fileSize: storageSize });
            await assertStorageObject(storageKey, storageContentType, storageSize, req.authUser.id);
        }

        const seqCheck = validateSequenceNumber(body.sequence ?? body.lessonOrder, "POST /api/lessons", { min: 0, defaultVal: 0 });
        if (!seqCheck.valid) return res.status(seqCheck.status).json({ success: false, message: seqCheck.message });
        const sequence = seqCheck.value;

        const videoUrl = storageProvider === STORAGE_PROVIDER && storageKey
            ? storageMarker(storageKey)
            : cleanText(body.videoUrl || body.video_url || "", 2000);

        let track = "oop";
        if (body.track !== undefined && body.track !== null) {
            const rawTrack = String(body.track).toLowerCase().trim();
            if (rawTrack !== "oop" && rawTrack !== "swing" && rawTrack !== "java_swing") {
                logDiagnosticError("POST /api/lessons", "track", body.track, "Track must be 'oop' or 'swing'");
                return res.status(400).json({ success: false, message: "Invalid track. Track must be 'oop' or 'swing'." });
            }
            track = (rawTrack === "swing" || rawTrack === "java_swing") ? "swing" : "oop";
        } else if (body.courseId === "java_swing" || String(body.module || "").toLowerCase().includes("swing") || String(id).startsWith("swing_")) {
            track = "swing";
        }

        const metadata = body.metadata && typeof body.metadata === "object" ? { ...body.metadata } : {};
        metadata.track = track;
        if (body.citationText || body.citation_text) {
            metadata.citationText = cleanText(body.citationText || body.citation_text || "", 1000);
        }
        if (body.citationUrl || body.citation_url) {
            metadata.citationUrl = cleanText(body.citationUrl || body.citation_url || "", 2000);
        }

        const result = await pool.query(`
            INSERT INTO lessons (id, title, module, sequence, duration, video_url, description, learning_objectives, status, metadata, storage_provider, storage_key, storage_content_type, storage_size, track)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            id,
            title,
            cleanText(body.module || "", 255),
            sequence,
            cleanText(body.duration || "", 40),
            videoUrl,
            cleanText(body.description || "", 5000),
            JSON.stringify(objectives),
            cleanText(body.status || "Draft", 40),
            JSON.stringify(metadata),
            storageProvider || null,
            storageKey || null,
            storageContentType || null,
            storageSize,
            track
        ]);
        if (track === "swing") {
            try {
                await pool.query(`
                    INSERT INTO swing_lessons (id, sequence, title, introduction, status)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO UPDATE SET
                      sequence = EXCLUDED.sequence,
                      title = EXCLUDED.title,
                      introduction = EXCLUDED.introduction,
                      status = EXCLUDED.status
                `, [id, sequence, title, cleanText(body.description || "", 5000), cleanText(body.status || "Draft", 40)]);
            } catch (swingSyncErr) {
                console.warn("Non-fatal swing_lessons insert sync warning:", swingSyncErr.message);
            }
        }
        res.status(201).json({ success: true, data: toClientLesson(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.put("/api/lessons/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const idCheck = validateId(req.params.id, "id", "PUT /api/lessons/:id");
        if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
        const lessonId = idCheck.value;

        const body = req.body || {};
        const objectives = Array.isArray(body.learningObjectives)
            ? body.learningObjectives.slice(0, 20)
            : body.learningObjectives === undefined
                ? undefined
                : String(body.learningObjectives || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);

        const storageProvider = body.storageProvider === undefined && body.storage_provider === undefined ? null : cleanText(body.storageProvider || body.storage_provider || "", 40).toLowerCase();
        const storageKey = body.storageKey === undefined && body.storage_key === undefined ? null : cleanText(body.storageKey || body.storage_key || "", 500);
        const storageContentType = body.storageContentType === undefined && body.storage_content_type === undefined ? null : cleanText(body.storageContentType || body.storage_content_type || "", 120).toLowerCase();

        const hasStorageSizeUpdate = body.storageSize !== undefined || body.storage_size !== undefined;
        let storageSize = null;
        if (hasStorageSizeUpdate) {
            const storageSizeCheck = validateStorageSize(body.storageSize ?? body.storage_size, "PUT /api/lessons/:id");
            if (!storageSizeCheck.valid) return res.status(storageSizeCheck.status).json({ success: false, message: storageSizeCheck.message });
            storageSize = storageSizeCheck.value;
        }

        if (storageProvider !== null && storageProvider !== "") {
            if (storageProvider !== STORAGE_PROVIDER) {
                logDiagnosticError("PUT /api/lessons/:id", "storageProvider", storageProvider, "Unsupported storage provider");
                return res.status(400).json({ success: false, message: "Unsupported storage provider." });
            }
            validateVideoUpload({ contentType: storageContentType, fileSize: storageSize });
            await assertStorageObject(storageKey, storageContentType, storageSize, req.authUser.id);
        }

        let sequence = null;
        if (body.sequence !== undefined || body.lessonOrder !== undefined) {
            const seqCheck = validateSequenceNumber(body.sequence ?? body.lessonOrder, "PUT /api/lessons/:id", { min: 0 });
            if (!seqCheck.valid) return res.status(seqCheck.status).json({ success: false, message: seqCheck.message });
            sequence = seqCheck.value;
        }

        const swingCatalogMatch = JAVA_SWING_LESSONS.find(item => item.id === lessonId);
        if (swingCatalogMatch) {
            const swingVideoMatch = JAVA_SWING_VIDEOS.find(v => v.lessonId === lessonId);
            const defaultRow = buildDefaultSwingLessonRow(swingCatalogMatch, swingVideoMatch);
            await pool.query(`
                INSERT INTO lessons (id, title, module, course_id, sequence, duration, video_url, description, learning_objectives, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
                ON CONFLICT (id) DO NOTHING
            `, [
                defaultRow.id,
                defaultRow.title,
                defaultRow.module,
                defaultRow.course_id,
                defaultRow.sequence,
                defaultRow.duration,
                defaultRow.video_url,
                defaultRow.description,
                JSON.stringify(defaultRow.learning_objectives),
                defaultRow.status
            ]);
        }

        let updatedMetadata = null;
        if (body.metadata !== undefined || body.citationText !== undefined || body.citation_text !== undefined || body.citationUrl !== undefined || body.citation_url !== undefined) {
            const currentRes = await pool.query("SELECT metadata FROM lessons WHERE id = $1", [lessonId]);
            const existingMeta = currentRes.rows[0]?.metadata && typeof currentRes.rows[0].metadata === "object" ? currentRes.rows[0].metadata : {};
            const inputMeta = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
            updatedMetadata = { ...existingMeta, ...inputMeta };
            if (body.citationText !== undefined || body.citation_text !== undefined) {
                updatedMetadata.citationText = cleanText(body.citationText || body.citation_text || "", 1000);
            }
            if (body.citationUrl !== undefined || body.citation_url !== undefined) {
                updatedMetadata.citationUrl = cleanText(body.citationUrl || body.citation_url || "", 2000);
            }
        }

        let track = null;
        if (body.track !== undefined && body.track !== null) {
            const rawTrack = String(body.track).toLowerCase().trim();
            if (rawTrack !== "oop" && rawTrack !== "swing" && rawTrack !== "java_swing") {
                logDiagnosticError("PUT /api/lessons/:id", "track", body.track, "Track must be 'oop' or 'swing'");
                return res.status(400).json({ success: false, message: "Invalid track. Track must be 'oop' or 'swing'." });
            }
            track = (rawTrack === "swing" || rawTrack === "java_swing") ? "swing" : "oop";
            if (updatedMetadata) updatedMetadata.track = track;
        }

        const result = await pool.query(`
            UPDATE lessons SET
              title = COALESCE($2, title),
              module = COALESCE($3, module),
              sequence = COALESCE($4, sequence),
              duration = COALESCE($5, duration),
              video_url = CASE WHEN $11 = 'local' THEN $14 ELSE COALESCE($6, video_url) END,
              description = COALESCE($7, description),
              learning_objectives = COALESCE($8::jsonb, learning_objectives),
              status = COALESCE($9, status),
              metadata = COALESCE($10::jsonb, metadata),
              storage_provider = CASE WHEN $11 = '' THEN NULL ELSE COALESCE($11, storage_provider) END,
              storage_key = CASE WHEN $11 = '' THEN NULL ELSE COALESCE($12, storage_key) END,
              storage_content_type = CASE WHEN $11 = '' THEN NULL ELSE COALESCE($13, storage_content_type) END,
              storage_size = CASE WHEN $11 = '' THEN NULL WHEN $16 THEN $15 ELSE storage_size END,
              track = COALESCE($17, track),
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [
            lessonId,
            body.title === undefined && body.lessonTitle === undefined ? null : cleanText(body.title || body.lessonTitle || "", 255),
            body.module === undefined ? null : cleanText(body.module || "", 255),
            sequence,
            body.duration === undefined ? null : cleanText(body.duration || "", 40),
            body.videoUrl === undefined && body.video_url === undefined ? null : cleanText(body.videoUrl || body.video_url || "", 2000),
            body.description === undefined ? null : cleanText(body.description || "", 5000),
            objectives === undefined ? null : JSON.stringify(objectives),
            body.status === undefined ? null : cleanText(body.status || "Draft", 40),
            updatedMetadata === null ? null : JSON.stringify(updatedMetadata),
            storageProvider,
            storageKey,
            storageContentType,
            storageProvider === STORAGE_PROVIDER && storageKey ? storageMarker(storageKey) : null,
            storageSize,
            hasStorageSizeUpdate,
            track
        ]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Lecture not found." });
        const updatedRow = result.rows[0];
        if (isSwingLessonId(lessonId)) {
            try {
                await pool.query(`
                    UPDATE swing_lessons SET
                      title = COALESCE($2, title),
                      objectives = COALESCE($3::jsonb, objectives),
                      updated_at = NOW()
                    WHERE id = $1
                `, [
                    lessonId,
                    updatedRow.title || null,
                    updatedRow.learning_objectives ? JSON.stringify(updatedRow.learning_objectives) : null
                ]);
                if (updatedRow.video_url) {
                    await pool.query(`
                        UPDATE swing_videos SET
                          embed_url = $2,
                          duration = COALESCE(NULLIF($3, ''), duration)
                        WHERE lesson_id = $1
                    `, [lessonId, updatedRow.video_url, updatedRow.duration || ""]);
                }
            } catch (swingSyncErr) {
                console.warn("Non-fatal Swing table sync warning:", swingSyncErr.message);
            }
        }
        res.json({ success: true, data: toClientLesson(updatedRow) });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/lessons/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const idCheck = validateId(req.params.id, "id", "DELETE /api/lessons/:id");
        if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
        await pool.query("DELETE FROM programming_challenges WHERE lesson_id = $1", [idCheck.value]);
        const result = await pool.query("DELETE FROM lessons WHERE id = $1 RETURNING id", [idCheck.value]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Lesson not found." });
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
        let id;
        if (body.id !== undefined && body.id !== null) {
            const idCheck = validateId(body.id, "id", "POST /api/assessments");
            if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
            id = idCheck.value;
        } else {
            id = `quiz_${Date.now()}`;
        }
        const title = cleanText(body.title || "", 255);
        const lessonIdCheck = validateId(body.lessonId ?? body.lesson_id, "lessonId", "POST /api/assessments");
        if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
        const lessonId = lessonIdCheck.value;

        if (!title) {
            logDiagnosticError("POST /api/assessments", "title", body.title, "Quiz title is required");
            return res.status(400).json({ success: false, message: "Quiz title and lesson are required." });
        }
        const passingScoreCheck = validateScoreNumber(body.passingScore ?? body.passing_score, "passingScore", "POST /api/assessments", { defaultVal: ASSESSMENT_PASSING_SCORE, min: 0, max: 100 });
        if (!passingScoreCheck.valid) return res.status(passingScoreCheck.status).json({ success: false, message: passingScoreCheck.message });

        const attemptsCheck = validateSequenceNumber(body.attempts, "POST /api/assessments", { min: 1, max: 100, defaultVal: 1 });
        if (!attemptsCheck.valid) return res.status(attemptsCheck.status).json({ success: false, message: attemptsCheck.message });

        const result = await pool.query(`
            INSERT INTO assessments (id, lesson_id, title, quiz_type, passing_score, attempts, questions, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
            RETURNING *
        `, [
            id,
            lessonId,
            title,
            cleanText(body.quizType || "Multiple Choice", 80),
            passingScoreCheck.value,
            attemptsCheck.value,
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
        const idCheck = validateId(req.params.id, "id", "PUT /api/assessments/:id");
        if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
        const assessmentId = idCheck.value;

        const body = req.body || {};
        let lessonId = null;
        if (body.lessonId !== undefined || body.lesson_id !== undefined) {
            const lessonIdCheck = validateId(body.lessonId ?? body.lesson_id, "lessonId", "PUT /api/assessments/:id");
            if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
            lessonId = lessonIdCheck.value;
        }

        let passingScore = null;
        if (body.passingScore !== undefined || body.passing_score !== undefined) {
            const scoreCheck = validateScoreNumber(body.passingScore ?? body.passing_score, "passingScore", "PUT /api/assessments/:id", { min: 0, max: 100 });
            if (!scoreCheck.valid) return res.status(scoreCheck.status).json({ success: false, message: scoreCheck.message });
            passingScore = scoreCheck.value;
        }

        let attempts = null;
        if (body.attempts !== undefined) {
            const attemptsCheck = validateSequenceNumber(body.attempts, "PUT /api/assessments/:id", { min: 1, max: 100 });
            if (!attemptsCheck.valid) return res.status(attemptsCheck.status).json({ success: false, message: attemptsCheck.message });
            attempts = attemptsCheck.value;
        }

        let result = await pool.query(`
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
            assessmentId,
            lessonId,
            body.title === undefined ? null : cleanText(body.title || "", 255),
            body.quizType === undefined ? null : cleanText(body.quizType || "", 80),
            passingScore,
            attempts,
            body.questions === undefined ? null : JSON.stringify(Array.isArray(body.questions) ? body.questions : []),
            body.status === undefined ? null : cleanText(body.status || "Draft", 40)
        ]);
        if (!result.rowCount && lessonId) {
            result = await pool.query(`
                INSERT INTO assessments (id, lesson_id, title, quiz_type, passing_score, attempts, questions, status, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                  lesson_id = EXCLUDED.lesson_id,
                  title = EXCLUDED.title,
                  quiz_type = EXCLUDED.quiz_type,
                  passing_score = EXCLUDED.passing_score,
                  attempts = EXCLUDED.attempts,
                  questions = EXCLUDED.questions,
                  status = EXCLUDED.status,
                  updated_at = NOW()
                RETURNING *
            `, [
                assessmentId,
                lessonId,
                cleanText(body.title || "Lesson Assessment", 255),
                cleanText(body.quizType || "Multiple Choice", 80),
                passingScore ?? ASSESSMENT_PASSING_SCORE,
                attempts ?? MAX_ASSESSMENT_ATTEMPTS,
                JSON.stringify(Array.isArray(body.questions) ? body.questions : []),
                cleanText(body.status || "Published", 40),
                req.authUser.id
            ]);
        }
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Quiz not found." });
        if (isSwingLessonId(result.rows[0].lesson_id)) {
            try {
                await pool.query(`
                    UPDATE swing_quizzes SET
                      title = COALESCE($2, title),
                      passing_percentage = COALESCE($3, passing_percentage)
                    WHERE lesson_id = $1
                `, [result.rows[0].lesson_id, result.rows[0].title, result.rows[0].passing_score]);
            } catch {}
        }
        res.json({ success: true, data: toClientAssessment(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/assessments/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const idCheck = validateId(req.params.id, "id", "DELETE /api/assessments/:id");
        if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
        const result = await pool.query("DELETE FROM assessments WHERE id = $1 RETURNING id", [idCheck.value]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Quiz not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// VIDEO MANAGEMENT ENDPOINTS (Teacher Content)
// ==========================================
app.get("/api/videos/storage-status", requireAuth, requireRole(["teacher"]), async (_req, res) => {
    res.json({
        success: true,
        data: {
            configured: true,
            maxFileSizeBytes: MAX_VIDEO_SIZE_BYTES,
            maxFileSizeMb: Math.floor(MAX_VIDEO_SIZE_BYTES / (1024 * 1024)),
            acceptedTypes: ["video/mp4"],
            provider: STORAGE_PROVIDER,
            uploadEndpoint: "/api/videos/upload"
        }
    });
});

app.post("/api/videos/upload", requireAuth, requireRole(["teacher"]), (req, res, next) => {
    uploadVideoFile.single("video")(req, res, async error => {
        if (error) {
            if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
                error.status = 400;
                error.message = `Video files must be no more than ${Math.floor(MAX_VIDEO_SIZE_BYTES / (1024 * 1024))} MB.`;
            } else if (!error.status) {
                error.status = 400;
            }
            return next(error);
        }
        let temporaryPath = req.file?.path || "";
        try {
            const lessonId = cleanText(req.body?.lessonId || req.body?.lesson_id || "", 120);
            if (!lessonId) return res.status(400).json({ success: false, message: "A lesson association is required." });
            const lesson = await pool.query("SELECT id FROM lessons WHERE id = $1 AND status <> 'Archived'", [lessonId]);
            if (!lesson.rowCount) return res.status(404).json({ success: false, message: "Lesson not found or archived." });
            if (!req.file) return res.status(400).json({ success: false, message: "Choose an MP4 video file." });
            const { contentType, fileSize } = validateVideoUpload({ contentType: req.file.mimetype, fileSize: req.file.size });
            if (!(await isMp4File(temporaryPath))) {
                const invalid = new Error("The selected file is not a valid MP4 video.");
                invalid.status = 400;
                throw invalid;
            }
            const key = buildStorageKey(lessonId, req.file.originalname, contentType);
            await finalizeLocalUpload(temporaryPath, key);
            temporaryPath = "";
            await assertStorageObject(key, contentType, fileSize, req.authUser.id);
            return res.status(201).json({ success: true, data: { provider: STORAGE_PROVIDER, key, contentType, fileSize, storageReference: storageMarker(key) } });
        } catch (error) {
            if (temporaryPath) await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
            next(error);
        }
    });
});

app.get("/api/videos/storage-playback", requireAuth, requireRole(["teacher", "student"]), async (req, res, next) => {
    try {
        const key = cleanText(req.query?.key || "", 500);
        if (!isStorageKey(key)) return res.status(400).json({ success: false, message: "Invalid video reference." });
        const result = await pool.query(`
            SELECT lesson_id FROM lesson_videos WHERE storage_provider = $1 AND storage_key = $2
            UNION
            SELECT id AS lesson_id FROM lessons WHERE storage_provider = $1 AND storage_key = $2
            LIMIT 1
        `, [STORAGE_PROVIDER, key]);
        const lessonId = result.rows[0]?.lesson_id;
        if (!lessonId) return res.status(404).json({ success: false, message: "Video not found." });
        if (req.authUser.role === "student") {
            const access = await getLessonAccessState(req.authUser.id, lessonId);
            if (!access.canAccess) return res.status(403).json({ success: false, message: access.reason || "You do not have access to this lesson." });
        }
        const stored = await assertStorageObject(key, "video/mp4", null, null);
        const range = req.headers.range;
        const size = Number(stored.ContentLength);
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Cache-Control", "private, no-store");
        if (!range) {
            res.setHeader("Content-Length", size);
            return fs.createReadStream(stored.path).pipe(res);
        }
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match) return res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
        const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2] || 0));
        const end = match[2] ? Number(match[2]) : size - 1;
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) {
            return res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
        }
        const safeEnd = Math.min(end, size - 1);
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${safeEnd}/${size}`);
        res.setHeader("Content-Length", safeEnd - start + 1);
        return fs.createReadStream(stored.path, { start, end: safeEnd }).pipe(res);
    } catch (error) {
        next(error);
    }
});

app.get("/api/videos/lesson/:lessonId/playback-url", requireAuth, requireRole(["teacher", "student"]), async (req, res, next) => {
    try {
        const lessonIdCheck = validateId(req.params.lessonId, "lessonId", "GET /api/videos/lesson/:lessonId/playback-url");
        if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
        const lessonId = lessonIdCheck.value;

        if (req.authUser.role === "student") {
            const access = await getLessonAccessState(req.authUser.id, lessonId);
            if (!access.canAccess) return res.status(403).json({ success: false, message: access.reason || "You do not have access to this lesson." });
        }
        const result = await pool.query("SELECT storage_provider, storage_key, storage_content_type FROM lessons WHERE id = $1", [lessonId]);
        const row = result.rows[0];
        if (!row || row.storage_provider !== STORAGE_PROVIDER || !row.storage_key) return res.status(404).json({ success: false, message: "A private video is not configured for this lesson." });
        const videoUrl = await getStoragePlaybackUrl(row.storage_key, row.storage_content_type || undefined);
        res.json({ success: true, data: { videoUrl, expiresIn: 0 } });
    } catch (error) {
        next(error);
    }
});

app.get("/api/videos", requireAuth, async (req, res, next) => {
    try {
        const { lessonId, status } = req.query || {};
        let sql = `
            SELECT lv.*, l.title AS lesson_title, l.sequence AS lesson_sequence
            FROM lesson_videos lv
            LEFT JOIN lessons l ON l.id = lv.lesson_id
            WHERE 1=1
        `;
        const params = [];
        if (lessonId !== undefined && lessonId !== null && String(lessonId).trim() !== "") {
            const lessonIdCheck = validateId(lessonId, "lessonId", "GET /api/videos");
            if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
            params.push(lessonIdCheck.value);
            sql += ` AND lv.lesson_id = $${params.length}`;
        }
        if (req.authUser.role === "student") {
            sql += ` AND lv.status = 'Published'`;
        } else if (status) {
            params.push(cleanText(status, 40));
            sql += ` AND lv.status = $${params.length}`;
        }
        sql += ` ORDER BY l.sequence ASC, lv.sequence ASC, lv.created_at ASC`;

        const result = await pool.query(sql, params);
        res.json({ success: true, data: await Promise.all(result.rows.map(row => toClientVideoForRequest(row, req))) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/videos", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    let client;
    let storageKey = "";
    let committed = false;
    try {
        const body = req.body || {};
        const title = cleanText(body.title || "", 255);
        const lessonIdCheck = validateId(body.lessonId ?? body.lesson_id, "lessonId", "POST /api/videos");
        if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
        const lessonId = lessonIdCheck.value;

        const storageProvider = cleanText(body.storageProvider || body.storage_provider || "", 40).toLowerCase();
        storageKey = cleanText(body.storageKey || body.storage_key || "", 500);
        const storageContentType = cleanText(body.storageContentType || body.storage_content_type || "", 120).toLowerCase();

        const storageSizeCheck = validateStorageSize(body.storageSize ?? body.storage_size, "POST /api/videos");
        if (!storageSizeCheck.valid) return res.status(storageSizeCheck.status).json({ success: false, message: storageSizeCheck.message });
        const storageSize = storageSizeCheck.value ?? null;

        const videoUrl = storageProvider === STORAGE_PROVIDER && storageKey ? storageMarker(storageKey) : cleanText(body.videoUrl || body.video_url || "", 2000);

        if (!title || !videoUrl) {
            logDiagnosticError("POST /api/videos", "title/videoUrl", { title, videoUrl }, "Title and video URL are required");
            return res.status(400).json({ success: false, message: "Title, video URL, and lesson association are required." });
        }
        if (!isValidVideoUrl(videoUrl)) {
            logDiagnosticError("POST /api/videos", "videoUrl", videoUrl, "Invalid video URL format");
            return res.status(400).json({ success: false, message: "Enter a valid http(s) video URL." });
        }
        if (storageProvider && storageProvider !== STORAGE_PROVIDER) {
            logDiagnosticError("POST /api/videos", "storageProvider", storageProvider, "Unsupported storage provider");
            return res.status(400).json({ success: false, message: "Unsupported storage provider." });
        }
        if (storageProvider === STORAGE_PROVIDER) {
            validateVideoUpload({ contentType: storageContentType, fileSize: storageSize });
            await assertStorageObject(storageKey, storageContentType, storageSize, req.authUser.id);
        }
        const submittedVideoUrl = body.videoUrl === undefined && body.video_url === undefined
            ? null
            : cleanText(body.videoUrl || body.video_url || "", 2000);
        if (submittedVideoUrl !== null && !isValidVideoUrl(submittedVideoUrl)) {
            logDiagnosticError("POST /api/videos", "submittedVideoUrl", submittedVideoUrl, "Invalid submitted video URL format");
            return res.status(400).json({ success: false, message: "Enter a valid http(s) video URL." });
        }

        let id;
        if (body.id !== undefined && body.id !== null) {
            const idCheck = validateId(body.id, "id", "POST /api/videos");
            if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
            id = idCheck.value;
        } else {
            id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }

        const duration = cleanText(body.duration || "", 40);
        const description = cleanText(body.description || "", 2000);
        client = await pool.connect();
        await client.query("BEGIN");
        const sequenceResult = await client.query(
            "SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM lesson_videos WHERE lesson_id = $1",
            [lessonId]
        );
        const sequence = Math.floor(clampNumber(sequenceResult.rows[0]?.next_sequence || 1, 1, 1000));
        const status = cleanText(body.status || "Published", 40);

        const result = await client.query(`
            INSERT INTO lesson_videos (id, lesson_id, title, video_url, duration, description, sequence, status, created_by, storage_provider, storage_key, storage_content_type, storage_size)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [id, lessonId, title, videoUrl, duration, description, sequence, status, req.authUser.id, storageProvider || null, storageKey || null, storageContentType || null, storageSize]);

        // Also update lesson's primary video_url if currently empty
        await client.query(`
            UPDATE lessons
            SET video_url = CASE WHEN $4 = $7 THEN $2 ELSE COALESCE(NULLIF(video_url, ''), $2) END,
                duration = CASE WHEN $4 = $7 AND $3 <> '' THEN $3 ELSE COALESCE(NULLIF(duration, ''), $3) END,
                storage_provider = CASE WHEN $4 = $7 THEN $4 ELSE storage_provider END,
                storage_key = CASE WHEN $4 = $7 THEN $5 ELSE storage_key END,
                storage_content_type = CASE WHEN $4 = $7 THEN $6 ELSE storage_content_type END,
                storage_size = CASE WHEN $4 = $7 THEN $8 ELSE storage_size END,
                updated_at = NOW()
            WHERE id = $1
        `, [lessonId, videoUrl, duration, storageProvider, storageKey || null, storageContentType || null, STORAGE_PROVIDER, storageSize]);

        if (isSwingLessonId(lessonId)) {
            await client.query(`
                UPDATE swing_videos
                SET title = COALESCE(NULLIF($2, ''), title),
                    embed_url = COALESCE(NULLIF($3, ''), embed_url),
                    duration = COALESCE(NULLIF($4, ''), duration),
                    description = COALESCE(NULLIF($5, ''), description)
                WHERE lesson_id = $1
            `, [lessonId, title, videoUrl, duration, description]);
        }

        await client.query("COMMIT");
        committed = true;
        res.status(201).json({ success: true, data: toClientVideo(result.rows[0]) });
    } catch (error) {
        if (client) {
            try { await client.query("ROLLBACK"); } catch {}
        }
        if (!committed && storageKey) {
            try { await deleteStorageObject(storageKey); } catch (cleanupError) {
                console.error("Local video cleanup after video save failure failed:", cleanupError.message);
            }
        }
        next(error);
    } finally {
        if (client) client.release();
    }
});

app.put("/api/videos/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const idCheck = validateId(req.params.id, "id", "PUT /api/videos/:id");
        if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
        const videoId = idCheck.value;

        const body = req.body || {};
        let lessonId = null;
        if (body.lessonId !== undefined || body.lesson_id !== undefined) {
            const lessonIdCheck = validateId(body.lessonId ?? body.lesson_id, "lessonId", "PUT /api/videos/:id");
            if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
            lessonId = lessonIdCheck.value;
        }

        const storageProvider = cleanText(body.storageProvider || body.storage_provider || "", 40).toLowerCase();
        const storageKey = cleanText(body.storageKey || body.storage_key || "", 500);
        const storageContentType = cleanText(body.storageContentType || body.storage_content_type || "", 120).toLowerCase();

        const hasStorageSizeUpdate = body.storageSize !== undefined || body.storage_size !== undefined;
        let storageSize = null;
        if (hasStorageSizeUpdate) {
            const storageSizeCheck = validateStorageSize(body.storageSize ?? body.storage_size, "PUT /api/videos/:id");
            if (!storageSizeCheck.valid) return res.status(storageSizeCheck.status).json({ success: false, message: storageSizeCheck.message });
            storageSize = storageSizeCheck.value;
        }

        if (storageProvider && storageProvider !== STORAGE_PROVIDER) {
            logDiagnosticError("PUT /api/videos/:id", "storageProvider", storageProvider, "Unsupported storage provider");
            return res.status(400).json({ success: false, message: "Unsupported storage provider." });
        }
        if (storageProvider === STORAGE_PROVIDER) {
            validateVideoUpload({ contentType: storageContentType, fileSize: storageSize });
            await assertStorageObject(storageKey, storageContentType, storageSize, req.authUser.id);
        }
        const submittedVideoUrl = body.videoUrl === undefined && body.video_url === undefined
            ? null
            : cleanText(body.videoUrl || body.video_url || "", 2000);
        if (submittedVideoUrl !== null && !isValidVideoUrl(submittedVideoUrl)) {
            logDiagnosticError("PUT /api/videos/:id", "submittedVideoUrl", submittedVideoUrl, "Invalid submitted video URL format");
            return res.status(400).json({ success: false, message: "Enter a valid http(s) video URL." });
        }

        let sequence = null;
        if (body.sequence !== undefined) {
            const seqCheck = validateSequenceNumber(body.sequence, "PUT /api/videos/:id", { min: 1, max: 1000 });
            if (!seqCheck.valid) return res.status(seqCheck.status).json({ success: false, message: seqCheck.message });
            sequence = seqCheck.value;
        }

        const result = await pool.query(`
            UPDATE lesson_videos SET
              lesson_id = COALESCE($2, lesson_id),
              title = COALESCE($3, title),
              video_url = COALESCE($4, video_url),
              duration = COALESCE($5, duration),
              description = COALESCE($6, description),
              sequence = COALESCE($7, sequence),
              status = COALESCE($8, status),
              cloudinary_public_id = COALESCE($9, cloudinary_public_id),
              cloudinary_resource_type = COALESCE($10, cloudinary_resource_type),
              storage_provider = CASE WHEN $11 = '' THEN NULL ELSE COALESCE($11, storage_provider) END,
              storage_key = CASE WHEN $12 = '' THEN NULL ELSE COALESCE($12, storage_key) END,
              storage_content_type = CASE WHEN $13 = '' THEN NULL ELSE COALESCE($13, storage_content_type) END,
              storage_size = CASE WHEN $15 THEN $14 ELSE storage_size END,
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [
            videoId,
            lessonId,
            body.title === undefined ? null : cleanText(body.title || "", 255),
            body.videoUrl === undefined && body.video_url === undefined ? null : cleanText(body.videoUrl || body.video_url || "", 2000),
            body.duration === undefined ? null : cleanText(body.duration || "", 40),
            body.description === undefined ? null : cleanText(body.description || "", 2000),
            sequence,
            body.status === undefined ? null : cleanText(body.status || "Published", 40),
            body.cloudinaryPublicId === undefined && body.cloudinary_public_id === undefined ? null : cleanText(body.cloudinaryPublicId || body.cloudinary_public_id || "", 500),
            body.cloudinaryResourceType === undefined && body.cloudinary_resource_type === undefined ? null : cleanText(body.cloudinaryResourceType || body.cloudinary_resource_type || "", 40),
            body.storageProvider === undefined && body.storage_provider === undefined ? null : storageProvider,
            body.storageKey === undefined && body.storage_key === undefined ? null : storageKey,
            body.storageContentType === undefined && body.storage_content_type === undefined ? null : storageContentType,
            storageSize,
            hasStorageSizeUpdate
        ]);

        if (!result.rowCount) return res.status(404).json({ success: false, message: "Video not found." });
        if (submittedVideoUrl !== null) {
            await pool.query(
                "UPDATE lessons SET video_url = $2, storage_provider = NULL, storage_key = NULL, storage_content_type = NULL, storage_size = NULL, updated_at = NOW() WHERE id = $1",
                [result.rows[0].lesson_id, submittedVideoUrl]
            );
        }
        if (isSwingLessonId(result.rows[0].lesson_id)) {
            try {
                await pool.query(`
                    UPDATE swing_videos
                    SET title = COALESCE($2, title),
                        embed_url = COALESCE($3, embed_url),
                        duration = COALESCE($4, duration),
                        description = COALESCE($5, description)
                    WHERE lesson_id = $1
                `, [result.rows[0].lesson_id, result.rows[0].title, result.rows[0].video_url, result.rows[0].duration, result.rows[0].description]);
            } catch {}
        }
        res.json({ success: true, data: toClientVideo(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/videos/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const idCheck = validateId(req.params.id, "id", "DELETE /api/videos/:id");
        if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
        const result = await pool.query("DELETE FROM lesson_videos WHERE id = $1 RETURNING id", [idCheck.value]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Video not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// LEARNING RESOURCE MANAGEMENT ENDPOINTS
// ==========================================
app.get("/api/learning-resources", requireAuth, async (req, res, next) => {
    try {
        const { lessonId, resourceType, status } = req.query || {};
        let sql = `
            SELECT lr.*, l.title AS lesson_title, l.sequence AS lesson_sequence
            FROM learning_resources lr
            LEFT JOIN lessons l ON l.id = lr.lesson_id
            WHERE 1=1
        `;
        const params = [];
        if (lessonId !== undefined && lessonId !== null && String(lessonId).trim() !== "") {
            const lessonIdCheck = validateId(lessonId, "lessonId", "GET /api/learning-resources");
            if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
            params.push(lessonIdCheck.value);
            sql += ` AND lr.lesson_id = $${params.length}`;
        }
        if (resourceType) {
            params.push(cleanText(resourceType, 40));
            sql += ` AND lr.resource_type = $${params.length}`;
        }
        if (req.authUser.role === "student") {
            sql += ` AND lr.status = 'Published'`;
        } else if (status) {
            params.push(cleanText(status, 40));
            sql += ` AND lr.status = $${params.length}`;
        }
        sql += ` ORDER BY l.sequence ASC, lr.title ASC`;

        const result = await pool.query(sql, params);
        res.json({ success: true, data: result.rows.map(toClientResource) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/learning-resources", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const body = req.body || {};
        const title = cleanText(body.title || "", 255);
        const fileUrl = cleanText(body.fileUrl || body.file_url || "", 2000);
        const lessonIdCheck = validateId(body.lessonId ?? body.lesson_id, "lessonId", "POST /api/learning-resources");
        if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
        const lessonId = lessonIdCheck.value;

        if (!title || !fileUrl) {
            logDiagnosticError("POST /api/learning-resources", "title/fileUrl", { title, fileUrl }, "Title and file URL are required");
            return res.status(400).json({ success: false, message: "Title, resource file/URL, and lesson association are required." });
        }

        let id;
        if (body.id !== undefined && body.id !== null) {
            const idCheck = validateId(body.id, "id", "POST /api/learning-resources");
            if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
            id = idCheck.value;
        } else {
            id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
        const resourceType = cleanText(body.resourceType || body.resource_type || "pdf", 40);
        const fileSize = cleanText(body.fileSize || body.file_size || "", 40);
        const description = cleanText(body.description || "", 2000);
        const status = cleanText(body.status || "Published", 40);

        const result = await pool.query(`
            INSERT INTO learning_resources (id, lesson_id, title, resource_type, file_url, file_size, description, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [id, lessonId, title, resourceType, fileUrl, fileSize, description, status, req.authUser.id]);

        res.status(201).json({ success: true, data: toClientResource(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.put("/api/learning-resources/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const idCheck = validateId(req.params.id, "id", "PUT /api/learning-resources/:id");
        if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
        const resourceId = idCheck.value;

        const body = req.body || {};
        let lessonId = null;
        if (body.lessonId !== undefined || body.lesson_id !== undefined) {
            const lessonIdCheck = validateId(body.lessonId ?? body.lesson_id, "lessonId", "PUT /api/learning-resources/:id");
            if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
            lessonId = lessonIdCheck.value;
        }

        const result = await pool.query(`
            UPDATE learning_resources SET
              lesson_id = COALESCE($2, lesson_id),
              title = COALESCE($3, title),
              resource_type = COALESCE($4, resource_type),
              file_url = COALESCE($5, file_url),
              file_size = COALESCE($6, file_size),
              description = COALESCE($7, description),
              status = COALESCE($8, status),
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [
            resourceId,
            lessonId,
            body.title === undefined ? null : cleanText(body.title || "", 255),
            body.resourceType === undefined && body.resource_type === undefined ? null : cleanText(body.resourceType || body.resource_type || "pdf", 40),
            body.fileUrl === undefined && body.file_url === undefined ? null : cleanText(body.fileUrl || body.file_url || "", 2000),
            body.fileSize === undefined && body.file_size === undefined ? null : cleanText(body.fileSize || body.file_size || "", 40),
            body.description === undefined ? null : cleanText(body.description || "", 2000),
            body.status === undefined ? null : cleanText(body.status || "Published", 40)
        ]);

        if (!result.rowCount) return res.status(404).json({ success: false, message: "Resource not found." });
        res.json({ success: true, data: toClientResource(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/learning-resources/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const idCheck = validateId(req.params.id, "id", "DELETE /api/learning-resources/:id");
        if (!idCheck.valid) return res.status(idCheck.status).json({ success: false, message: idCheck.message });
        const result = await pool.query("DELETE FROM learning_resources WHERE id = $1 RETURNING id", [idCheck.value]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Resource not found." });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// PRE-TEST MANAGEMENT & ASSESSMENT ENDPOINTS
// ==========================================
app.get("/api/pre-test", requireAuth, async (_req, res, next) => {
    try {
        const result = await pool.query("SELECT * FROM pre_tests WHERE id = 'oop_pre_test' LIMIT 1");
        const row = result.rows[0] || {
            id: "oop_pre_test",
            course_id: "oop_fundamentals",
            title: "Java OOP Pre-Test Assessment",
            description: "Diagnostic pre-test assessing prior knowledge across 12 OOP topics with 20 randomized questions from a 240-question bank.",
            question_pool_count: 240,
            questions_per_attempt: 20,
            time_limit_seconds: PRE_TEST_TIME_LIMIT_SECONDS,
            passing_score: PRE_TEST_PASSING_SCORE,
            max_attempts: 3,
            status: "Published",
            post_test_assessment_id: "oop_post_test"
        };
        res.json({ success: true, data: toClientPreTest(row) });
    } catch (error) {
        next(error);
    }
});

app.put("/api/pre-test", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const body = req.body || {};
        const result = await pool.query(`
            UPDATE pre_tests SET
              title = COALESCE($1, title),
              description = COALESCE($2, description),
              time_limit_seconds = COALESCE($3, time_limit_seconds),
              passing_score = COALESCE($4, passing_score),
              max_attempts = COALESCE($5, max_attempts),
              status = COALESCE($6, status),
              post_test_assessment_id = COALESCE($7, post_test_assessment_id),
              updated_at = NOW()
            WHERE id = 'oop_pre_test'
            RETURNING *
        `, [
            body.title === undefined ? null : cleanText(body.title, 255),
            body.description === undefined ? null : cleanText(body.description, 2000),
            body.timeLimitSeconds === undefined ? null : Math.floor(clampNumber(body.timeLimitSeconds, 60, 7200)),
            body.passingScore === undefined ? null : clampNumber(body.passingScore, 0, 100),
            body.maxAttempts === undefined ? null : Math.floor(clampNumber(body.maxAttempts, 1, 100)),
            body.status === undefined ? null : cleanText(body.status, 40),
            body.postTestAssessmentId === undefined ? null : cleanText(body.postTestAssessmentId, 120)
        ]);
        const row = result.rows[0] || { id: "oop_pre_test", ...body };
        res.json({ success: true, data: toClientPreTest(row) });
    } catch (error) {
        next(error);
    }
});

app.get("/api/pre-test/questions", requireAuth, requireRole(["teacher"]), async (_req, res, next) => {
    try {
        // Teacher preview of all 240 valid questions with answer key
        res.json({
            success: true,
            totalCount: ALL_OOP_QUESTIONS.length,
            topics: Object.keys(TOPIC_NAMES).map(key => ({ id: key, name: TOPIC_NAMES[key] })),
            data: ALL_OOP_QUESTIONS
        });
    } catch (error) {
        next(error);
    }
});

app.post("/api/pre-test/start", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can take pre-tests." });
        }

        // Check if pre-test is published
        const preTestConfig = await pool.query("SELECT * FROM pre_tests WHERE id = 'oop_pre_test' LIMIT 1");
        const config = preTestConfig.rows[0] || { status: "Published", max_attempts: 3, time_limit_seconds: PRE_TEST_TIME_LIMIT_SECONDS, passing_score: PRE_TEST_PASSING_SCORE };
        if (config.status !== "Published") {
            return res.status(403).json({ success: false, message: "The pre-test is currently not available." });
        }

        const maxAttempts = Number(config.max_attempts || 3);
        const attemptCountResult = await pool.query(
            "SELECT COUNT(*)::int AS attempt_count FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = 'oop_pre_test'",
            [req.authUser.id]
        );
        const attemptCount = Number(attemptCountResult.rows[0]?.attempt_count || 0);
        if (attemptCount >= maxAttempts) {
            return res.status(429).json({
                success: false,
                errorCode: "ATTEMPT_LIMIT_REACHED",
                attemptCount,
                maxAttempts,
                message: `You have used all ${maxAttempts} attempts for the pre-test.`
            });
        }

        // Check for existing active session to resume (page refresh / reconnect)
        const existingActive = await pool.query(`
            SELECT * FROM assessment_sessions
            WHERE student_user_id = $1 AND assessment_id = 'oop_pre_test' AND status = 'active'
            ORDER BY started_at DESC LIMIT 1
        `, [req.authUser.id]);

        if (existingActive.rowCount > 0) {
            const activeSession = existingActive.rows[0];
            const now = Date.now();
            const expiresAtMs = new Date(activeSession.expires_at).getTime();
            const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

            if (remainingSeconds > 0) {
                // Resume existing session with exact same 20 questions!
                return res.json({
                    success: true,
                    resumed: true,
                    data: {
                        sessionId: activeSession.id,
                        sessionToken: activeSession.session_token,
                        assessmentId: "oop_pre_test",
                        lessonId: "oop_fundamentals",
                        startedAt: activeSession.started_at,
                        expiresAt: activeSession.expires_at,
                        remainingSeconds,
                        attemptNumber: activeSession.attempt_number,
                        questions: activeSession.question_order,
                        savedAnswers: activeSession.answers || {}
                    }
                });
            } else {
                await pool.query("UPDATE assessment_sessions SET status = 'expired' WHERE id = $1", [activeSession.id]);
            }
        }

        // New attempt: randomly select exactly 20 distinct questions without replacement from 240 questions
        const attemptNumber = attemptCount + 1;
        const sessionToken = `pretest_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const timeLimitSeconds = Number(config.time_limit_seconds || PRE_TEST_TIME_LIMIT_SECONDS);
        const expiresAt = new Date(Date.now() + timeLimitSeconds * 1000);

        const { studentQuestions } = generatePreTestSessionQuestions(20);

        const sessionInsert = await pool.query(`
            INSERT INTO assessment_sessions (
              student_user_id, assessment_id, lesson_id, attempt_number, session_token,
              status, started_at, expires_at, violation_count, time_limit_seconds, question_order
            )
            VALUES ($1, 'oop_pre_test', 'oop_fundamentals', $2, $3, 'active', NOW(), $4, 0, $5, $6::jsonb)
            RETURNING *
        `, [req.authUser.id, attemptNumber, sessionToken, expiresAt, timeLimitSeconds, JSON.stringify(studentQuestions)]);

        const created = sessionInsert.rows[0];
        res.json({
            success: true,
            resumed: false,
            data: {
                sessionId: created.id,
                sessionToken: created.session_token,
                assessmentId: "oop_pre_test",
                lessonId: "oop_fundamentals",
                startedAt: created.started_at,
                expiresAt: created.expires_at,
                remainingSeconds: timeLimitSeconds,
                attemptNumber,
                questions: studentQuestions,
                savedAnswers: {}
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/pre-test/active", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role !== "student") {
            return res.json({ success: true, data: null });
        }
        const activeResult = await pool.query(`
            SELECT * FROM assessment_sessions
            WHERE student_user_id = $1 AND assessment_id = 'oop_pre_test' AND status = 'active'
            ORDER BY started_at DESC LIMIT 1
        `, [req.authUser.id]);

        if (!activeResult.rowCount) {
            return res.json({ success: true, data: null });
        }

        const activeSession = activeResult.rows[0];
        const now = Date.now();
        const expiresAtMs = new Date(activeSession.expires_at).getTime();
        const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

        if (remainingSeconds <= 0) {
            await pool.query("UPDATE assessment_sessions SET status = 'expired' WHERE id = $1", [activeSession.id]);
            return res.json({ success: true, data: null });
        }

        res.json({
            success: true,
            data: {
                sessionId: activeSession.id,
                sessionToken: activeSession.session_token,
                assessmentId: "oop_pre_test",
                lessonId: "oop_fundamentals",
                startedAt: activeSession.started_at,
                expiresAt: activeSession.expires_at,
                remainingSeconds,
                attemptNumber: activeSession.attempt_number,
                questions: activeSession.question_order,
                savedAnswers: activeSession.answers || {}
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post("/api/pre-test/submit", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can submit pre-tests." });
        }
        const { sessionId, answers = {} } = req.body || {};

        let sessionResult;
        if (sessionId) {
            sessionResult = await pool.query(
                "SELECT * FROM assessment_sessions WHERE id = $1 AND student_user_id = $2 AND assessment_id = 'oop_pre_test'",
                [sessionId, req.authUser.id]
            );
        } else {
            sessionResult = await pool.query(
                "SELECT * FROM assessment_sessions WHERE student_user_id = $1 AND assessment_id = 'oop_pre_test' AND status = 'active' AND expires_at > NOW() ORDER BY started_at DESC LIMIT 1",
                [req.authUser.id]
            );
        }

        if (!sessionResult.rowCount) {
            return res.status(404).json({ success: false, message: "Pre-test session not found or already completed." });
        }

        const session = sessionResult.rows[0];
        if (session.status !== "active" || (session.expires_at && new Date(session.expires_at).getTime() <= Date.now())) {
            return res.status(409).json({ success: false, message: "This pre-test session has already been completed or expired." });
        }

        const questions = Array.isArray(session.question_order) ? session.question_order : [];
        const bankMap = new Map(ALL_OOP_QUESTIONS.map(q => [q.id, q]));

        let score = 0;
        const total = questions.length || 20;
        const review = [];

        for (const q of questions) {
            const master = bankMap.get(q.id);
            const submittedAnswer = answers[q.id];
            const isCorrect = Boolean(master && submittedAnswer && master.correctAnswer === submittedAnswer);
            if (isCorrect) score += 1;

            review.push({
                id: q.id,
                lessonId: q.lessonId || master?.lessonId || "oop_fundamentals",
                topicName: q.topicName || master?.topicName || "OOP Fundamentals",
                question: q.question,
                options: q.options,
                difficulty: q.difficulty || master?.difficulty || "Medium",
                codeSnippet: q.codeSnippet,
                selectedAnswer: submittedAnswer || "",
                correctAnswer: master ? master.correctAnswer : "",
                explanation: master ? master.explanation : "",
                isCorrect
            });
        }

        const percentage = Math.round((score / total) * 100);
        const configResult = await pool.query("SELECT passing_score FROM pre_tests WHERE id = 'oop_pre_test' LIMIT 1");
        const configuredPassing = configResult.rows[0]?.passing_score;
        const passingScore = (configuredPassing !== undefined && configuredPassing !== null)
            ? Number(configuredPassing)
            : PRE_TEST_PASSING_SCORE;
        const passed = percentage >= passingScore;
        const correctAnswers = score;
        const incorrectAnswers = total - score;

        const durationSeconds = req.body?.timeSpentSeconds !== undefined
            ? Number(req.body.timeSpentSeconds)
            : (session.started_at ? Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)) : null);

        const insights = computePreTestInsights({
            questions,
            answers,
            score,
            total,
            percentage,
            passed,
            attemptNumber: session.attempt_number || 1,
            dateCompleted: new Date().toISOString(),
            startedAt: session.started_at,
            completedAt: new Date().toISOString(),
            timeSpentSeconds: durationSeconds,
            passingScore
        });

        // Atomically claim the session only if it belongs to authenticated student, is active, and is unexpired
        const claimResult = await pool.query(`
            UPDATE assessment_sessions
            SET status = 'completed', completed_at = NOW(), score = $1, total = $2, percentage = $3, passed = $4, answers = $5::jsonb, insights = $6::jsonb, updated_at = NOW()
            WHERE id = $7 AND student_user_id = $8 AND assessment_id = 'oop_pre_test' AND status = 'active' AND expires_at > NOW()
            RETURNING *
        `, [score, total, percentage, passed, JSON.stringify(answers), JSON.stringify(insights), session.id, req.authUser.id]);

        if (!claimResult.rowCount) {
            return res.status(409).json({ success: false, message: "This pre-test session could not be completed (already submitted or expired)." });
        }

        // Insert into quiz_attempts only after successful atomic claim
        await pool.query(`
            INSERT INTO quiz_attempts (student_user_id, assessment_id, lesson_id, score, total, percentage, correct_answers, incorrect_answers, passed, attempt_number, answers, date_completed)
            VALUES ($1, 'oop_pre_test', 'oop_fundamentals', $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
        `, [req.authUser.id, score, total, percentage, correctAnswers, incorrectAnswers, passed, session.attempt_number || 1, JSON.stringify(answers)]);

        await awardXP(req.authUser.id, 30, "Java OOP Diagnostic Pre-Test Completion");
        if (passed) {
            await awardXP(req.authUser.id, 50, "Java OOP Diagnostic Pre-Test Passed");
        }

        await logActivity(req.authUser.id, "assessment_submitted", `Completed Java OOP Pre-Test with score ${score}/${total} (${percentage}%)`, {
            assessmentId: "oop_pre_test",
            score,
            total,
            percentage,
            passed,
            isPreTest: true
        });

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                assessmentId: "oop_pre_test",
                score,
                total,
                percentage,
                passed,
                passingScore,
                attemptNumber: session.attempt_number || 1,
                dateCompleted: new Date().toISOString(),
                review,
                insights
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/pre-test/attempts", requireAuth, requireRole(["teacher"]), async (_req, res, next) => {
    try {
        const result = await pool.query(`
            WITH pre_attempts AS (
                SELECT
                  qa.id,
                  qa.student_user_id,
                  u.name AS student_name,
                  u.email AS student_email,
                  s.student_number,
                  s.section,
                  qa.score,
                  qa.total,
                  qa.percentage,
                  qa.passed,
                  qa.attempt_number,
                  qa.date_completed,
                  qa.answers
                FROM quiz_attempts qa
                JOIN users u ON u.id = qa.student_user_id
                LEFT JOIN students s ON s.user_id = u.id
                WHERE qa.assessment_id = 'oop_pre_test'
            ),
            post_attempts AS (
                SELECT DISTINCT ON (student_user_id)
                  student_user_id,
                  percentage AS post_test_percentage,
                  date_completed AS post_test_date
                FROM quiz_attempts
                WHERE assessment_id = 'oop_post_test'
                ORDER BY student_user_id, date_completed DESC
            )
            SELECT
              pa.*,
              po.post_test_percentage,
              po.post_test_date,
              CASE
                WHEN po.post_test_percentage IS NOT NULL
                  THEN (po.post_test_percentage - pa.percentage)
                ELSE NULL
              END AS score_improvement
            FROM pre_attempts pa
            LEFT JOIN post_attempts po ON po.student_user_id = pa.student_user_id
            ORDER BY pa.date_completed DESC
        `);

        res.json({
            success: true,
            data: result.rows.map(row => ({
                id: row.id,
                studentId: row.student_user_id,
                studentName: row.student_name,
                studentEmail: row.student_email,
                studentNumber: row.student_number || "",
                section: row.section || "",
                score: Number(row.score),
                total: Number(row.total),
                percentage: Number(row.percentage),
                passed: Boolean(row.passed),
                attemptNumber: Number(row.attempt_number),
                dateCompleted: row.date_completed,
                postTestPercentage: row.post_test_percentage !== null ? Number(row.post_test_percentage) : null,
                postTestDate: row.post_test_date,
                scoreImprovement: row.score_improvement !== null ? Number(row.score_improvement) : null
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/pre-test/my-attempts", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT id, score, total, percentage, passed, attempt_number, date_completed
            FROM quiz_attempts
            WHERE student_user_id = $1 AND assessment_id = 'oop_pre_test'
            ORDER BY attempt_number DESC, date_completed DESC
        `, [req.authUser.id]);

        res.json({
            success: true,
            data: result.rows.map(r => ({
                id: r.id,
                score: Number(r.score),
                total: Number(r.total),
                percentage: Number(r.percentage),
                passed: Boolean(r.passed),
                attemptNumber: Number(r.attempt_number),
                dateCompleted: r.date_completed
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/pre-test/my-insights", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can view their pre-test insights." });
        }

        const requestedAttempt = req.query.attempt ? Number(req.query.attempt) : null;

        // Query student's completed pre-test sessions
        const sessionsResult = await pool.query(`
            SELECT s.*, q.date_completed
            FROM assessment_sessions s
            LEFT JOIN quiz_attempts q ON q.student_user_id = s.student_user_id AND q.assessment_id = 'oop_pre_test' AND q.attempt_number = s.attempt_number
            WHERE s.student_user_id = $1 AND s.assessment_id = 'oop_pre_test' AND s.status = 'completed'
            ORDER BY s.attempt_number DESC, s.completed_at DESC
        `, [req.authUser.id]);

        let sessions = sessionsResult.rows;

        // If no completed assessment_sessions found, check quiz_attempts (for backward compatibility)
        if (sessions.length === 0) {
            const fallbackAttempts = await pool.query(`
                SELECT * FROM quiz_attempts
                WHERE student_user_id = $1 AND assessment_id = 'oop_pre_test'
                ORDER BY attempt_number DESC, date_completed DESC
            `, [req.authUser.id]);

            if (fallbackAttempts.rowCount === 0) {
                return res.json({
                    success: true,
                    hasCompletedPreTest: false,
                    data: null
                });
            }

            sessions = fallbackAttempts.rows.map(q => ({
                id: q.id,
                student_user_id: q.student_user_id,
                attempt_number: q.attempt_number,
                score: q.score,
                total: q.total,
                percentage: q.percentage,
                passed: q.passed,
                answers: q.answers || {},
                question_order: [],
                date_completed: q.date_completed,
                completed_at: q.date_completed,
                started_at: q.date_completed,
                insights: null
            }));
        }

        const attemptsSummary = sessions.map((s, idx) => ({
            attemptNumber: Number(s.attempt_number || idx + 1),
            score: Number(s.score),
            total: Number(s.total || 20),
            percentage: Number(s.percentage),
            passed: Boolean(s.passed),
            dateCompleted: s.date_completed || s.completed_at,
            isLatest: idx === 0
        }));

        let targetSession = sessions[0];
        if (requestedAttempt) {
            const found = sessions.find(s => Number(s.attempt_number) === requestedAttempt);
            if (found) targetSession = found;
        }

        const cfgResult = await pool.query("SELECT passing_score FROM pre_tests WHERE id = 'oop_pre_test' LIMIT 1");
        const passingScore = cfgResult.rows[0]?.passing_score ? Number(cfgResult.rows[0].passing_score) : PRE_TEST_PASSING_SCORE;

        let insights = targetSession.insights;
        if (!insights || typeof insights !== 'object' || !insights.topicPerformance) {
            const questions = Array.isArray(targetSession.question_order) && targetSession.question_order.length > 0
                ? targetSession.question_order
                : [];

            insights = computePreTestInsights({
                questions,
                answers: targetSession.answers || {},
                score: targetSession.score,
                total: targetSession.total,
                percentage: targetSession.percentage,
                passed: targetSession.passed,
                attemptNumber: targetSession.attempt_number,
                dateCompleted: targetSession.date_completed || targetSession.completed_at,
                startedAt: targetSession.started_at,
                completedAt: targetSession.completed_at,
                passingScore
            });

            if (targetSession.id) {
                pool.query("UPDATE assessment_sessions SET insights = $1::jsonb WHERE id = $2", [JSON.stringify(insights), targetSession.id]).catch(() => {});
            }
        }

        res.json({
            success: true,
            hasCompletedPreTest: true,
            data: {
                ...insights,
                attemptsSummary,
                totalAttempts: sessions.length
            }
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// ENHANCED TEACHER LEARNING ANALYTICS
// ==========================================
app.get("/api/teacher/analytics", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        // 1. Enrolled students
        const studentsQuery = await pool.query(`
            SELECT u.id, u.name, u.email, s.student_number, s.section, s.course, u.created_at AS enrollment_date
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            WHERE u.role = 'student'
            ORDER BY u.name ASC
        `);
        const allStudents = studentsQuery.rows;
        const totalEnrolled = allStudents.length;

        // 2. Published lessons
        const lessonsQuery = await pool.query(`
            SELECT id, title, sequence, module FROM lessons WHERE status <> 'Archived' AND ${OOP_LESSON_FILTER_SQL} ORDER BY sequence ASC
        `);
        const totalLessons = lessonsQuery.rows.length || 12;

        // 3. Quiz attempts across all students
        const allQuizAttempts = await pool.query(`
            SELECT qa.*, u.name as student_name
            FROM quiz_attempts qa
            JOIN users u ON u.id = qa.student_user_id
            ORDER BY qa.date_completed DESC
        `);

        // Calculate Course Overview
        const studentsWithQuiz = new Set(allQuizAttempts.rows.map(q => q.student_user_id));
        const quizOnlyLessons = allQuizAttempts.rows.filter(q => q.assessment_id !== "oop_pre_test");
        const avgQuizScore = quizOnlyLessons.length > 0
            ? Math.round(quizOnlyLessons.reduce((acc, q) => acc + Number(q.percentage || 0), 0) / quizOnlyLessons.length)
            : 0;
        const passedQuizCount = quizOnlyLessons.filter(q => q.passed || Number(q.percentage || 0) >= ASSESSMENT_PASSING_SCORE).length;
        const quizPassRate = quizOnlyLessons.length > 0
            ? Math.round((passedQuizCount / quizOnlyLessons.length) * 100)
            : 0;

        // Pre-test & Post-test stats
        const preTestAttempts = allQuizAttempts.rows.filter(q => q.assessment_id === "oop_pre_test");
        const postTestAttempts = allQuizAttempts.rows.filter(q => q.assessment_id === "oop_post_test");
        const uniquePreTestStudents = new Set(preTestAttempts.map(q => q.student_user_id));
        const uniquePostTestStudents = new Set(postTestAttempts.map(q => q.student_user_id));

        const preTestAvg = preTestAttempts.length > 0
            ? Math.round(preTestAttempts.reduce((acc, q) => acc + Number(q.percentage || 0), 0) / preTestAttempts.length)
            : 0;
        const postTestAvg = postTestAttempts.length > 0
            ? Math.round(postTestAttempts.reduce((acc, q) => acc + Number(q.percentage || 0), 0) / postTestAttempts.length)
            : 0;
        const averageImprovement = postTestAttempts.length > 0 && preTestAttempts.length > 0
            ? (postTestAvg - preTestAvg)
            : null;

        // Lesson completions per student
        const studentCompletedLessonsMap = new Map();
        for (const s of allStudents) {
            studentCompletedLessonsMap.set(s.id, new Set());
        }
        for (const q of quizOnlyLessons) {
            if (q.passed || Number(q.percentage || 0) >= ASSESSMENT_PASSING_SCORE) {
                const set = studentCompletedLessonsMap.get(q.student_user_id);
                if (set && q.lesson_id) set.add(q.lesson_id);
            }
        }

        let totalCompletedLessonsCount = 0;
        let fullyCompletedStudentsCount = 0;
        for (const [sId, completedSet] of studentCompletedLessonsMap.entries()) {
            totalCompletedLessonsCount += completedSet.size;
            if (completedSet.size >= totalLessons) fullyCompletedStudentsCount += 1;
        }

        const courseCompletionRate = totalEnrolled > 0
            ? Math.round((fullyCompletedStudentsCount / totalEnrolled) * 100)
            : 0;
        const totalRemainingLessons = Math.max(0, (totalEnrolled * totalLessons) - totalCompletedLessonsCount);

        // Score distributions (<60%, 60-69%, 70-79%, 80-89%, 90-100%)
        const distributionBuckets = {
            needsImprovement: { label: "< 60% (Needs Review)", count: 0, percentage: 0 },
            developing: { label: "60% - 69% (Developing)", count: 0, percentage: 0 },
            proficient: { label: "70% - 79% (Proficient)", count: 0, percentage: 0 },
            advanced: { label: "80% - 89% (Advanced)", count: 0, percentage: 0 },
            mastery: { label: "90% - 100% (Mastery)", count: 0, percentage: 0 }
        };

        for (const s of allStudents) {
            const studentQuizzes = quizOnlyLessons.filter(q => q.student_user_id === s.id);
            if (studentQuizzes.length > 0) {
                const sAvg = Math.round(studentQuizzes.reduce((acc, q) => acc + Number(q.percentage || 0), 0) / studentQuizzes.length);
                if (sAvg < 60) distributionBuckets.needsImprovement.count++;
                else if (sAvg < 70) distributionBuckets.developing.count++;
                else if (sAvg < 80) distributionBuckets.proficient.count++;
                else if (sAvg < 90) distributionBuckets.advanced.count++;
                else distributionBuckets.mastery.count++;
            }
        }
        const ratedStudentsCount = Math.max(1, Object.values(distributionBuckets).reduce((acc, b) => acc + b.count, 0));
        for (const key of Object.keys(distributionBuckets)) {
            distributionBuckets[key].percentage = Math.round((distributionBuckets[key].count / ratedStudentsCount) * 100);
        }

        // Topic performance across the 12 canonical OOP lessons, keyed by stable lesson ID
        // (quiz_attempts.lesson_id) and labeled with the lesson titles shown in Teacher Lesson Management.
        const oopTopicNames = buildOopTopicNameMap(lessonsQuery.rows);
        const topicPerformance = computeOopTopicPerformance(quizOnlyLessons, lessonsQuery.rows);

        // Pre-test vs Post-test comparison per student
        const prePostComparison = allStudents.map(s => {
            const preAttempt = preTestAttempts.find(q => q.student_user_id === s.id);
            const postAttempt = postTestAttempts.find(q => q.student_user_id === s.id);
            const preScore = preAttempt ? Number(preAttempt.percentage) : null;
            const postScore = postAttempt ? Number(postAttempt.percentage) : null;
            const diff = (preScore !== null && postScore !== null) ? (postScore - preScore) : null;
            return {
                studentId: s.id,
                name: s.name,
                email: s.email,
                studentNumber: s.student_number || "",
                section: s.section || "",
                preTestScore: preScore,
                postTestScore: postScore,
                scoreImprovement: diff,
                preTestDate: preAttempt?.date_completed || null,
                postTestDate: postAttempt?.date_completed || null
            };
        });

        // Students Requiring Additional Support (Transparent criteria, NOT solely low pre-test score)
        const studentsRequiringSupport = [];
        for (const s of allStudents) {
            const studentQuizzes = quizOnlyLessons.filter(q => q.student_user_id === s.id);
            const completedCount = studentCompletedLessonsMap.get(s.id)?.size || 0;
            const completionPct = Math.round((completedCount / totalLessons) * 100);

            const reasons = [];
            let recommendation = "";

            // Check criterion 1: Repeated quiz failures (>= 2 failed attempts or failing latest attempt)
            const failedAttempts = studentQuizzes.filter(q => !q.passed && Number(q.percentage || 0) < 60);
            if (failedAttempts.length >= 2) {
                const failedLessons = [...new Set(failedAttempts.map(q => oopTopicNames[q.lesson_id] || TOPIC_NAMES[q.lesson_id] || q.lesson_id))];
                reasons.push(`Repeated assessment difficulty in: ${failedLessons.join(", ")}`);
                recommendation = `Provide targeted 1-on-1 pedagogical review for ${failedLessons[0] || 'core OOP'}.`;
            }

            // Check criterion 2: Stalled lesson progress
            if (studentQuizzes.length > 0 && completionPct < 30) {
                reasons.push(`Progress stalled at ${completionPct}% (${completedCount}/${totalLessons} lessons completed)`);
                if (!recommendation) recommendation = `Encourage video tutorial completion and guide student through Lesson ${completedCount + 1}.`;
            }

            // Check criterion 3: Declining assessment performance
            if (studentQuizzes.length >= 2) {
                const latest = Number(studentQuizzes[0]?.percentage || 0);
                const prev = Number(studentQuizzes[1]?.percentage || 0);
                if (prev - latest >= 20) {
                    reasons.push(`Score declined significantly from ${prev}% to ${latest}%`);
                    if (!recommendation) recommendation = `Review recent practice code and clarify misunderstood concepts.`;
                }
            }

            if (reasons.length > 0) {
                studentsRequiringSupport.push({
                    studentId: s.id,
                    name: s.name,
                    email: s.email,
                    studentNumber: s.student_number || "",
                    section: s.section || "",
                    completedLessons: completedCount,
                    totalLessons,
                    completionPercentage: completionPct,
                    quizAttemptsCount: studentQuizzes.length,
                    reasons,
                    recommendedAction: recommendation
                });
            }
        }

        res.json({
            success: true,
            data: {
                courseOverview: {
                    totalEnrolled,
                    courseCompletionRate,
                    totalLessonsCompleted: totalCompletedLessonsCount,
                    totalLessonsRemaining: totalRemainingLessons,
                    assessmentParticipation: totalEnrolled > 0 ? Math.round((studentsWithQuiz.size / totalEnrolled) * 100) : 0,
                    averageAssessmentScore: avgQuizScore,
                    assessmentPassingRate: quizPassRate,
                    preTestAverageScore: preTestAvg,
                    postTestAverageScore: postTestAvg,
                    averageScoreImprovement: averageImprovement,
                    preTestTakersCount: uniquePreTestStudents.size,
                    postTestTakersCount: uniquePostTestStudents.size
                },
                scoreDistribution: distributionBuckets,
                topicPerformance,
                prePostComparison,
                studentsRequiringSupport,
                studentsList: allStudents.map(s => ({
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    studentNumber: s.student_number || "",
                    section: s.section || "",
                    completedLessons: studentCompletedLessonsMap.get(s.id)?.size || 0,
                    totalLessons
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/teacher/analytics/student/:studentId", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const studentId = req.params.studentId;
        const studentUser = await pool.query(`
            SELECT u.id, u.name, u.email, u.created_at, s.student_number, s.section, s.course, s.year_level
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            WHERE u.id = $1 AND u.role = 'student'
        `, [studentId]);

        if (!studentUser.rowCount) {
            return res.status(404).json({ success: false, message: "Student record not found." });
        }
        const student = studentUser.rows[0];

        const [quizzes, preTest, postTest, videos, lessons] = await Promise.all([
            pool.query("SELECT * FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id <> 'oop_pre_test' ORDER BY date_completed DESC", [studentId]),
            pool.query("SELECT * FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = 'oop_pre_test' ORDER BY attempt_number DESC LIMIT 1", [studentId]),
            pool.query("SELECT * FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = 'oop_post_test' ORDER BY attempt_number DESC LIMIT 1", [studentId]),
            pool.query("SELECT video_id, completion_percentage, completed, updated_at FROM student_progress WHERE student_user_id = $1", [studentId]),
            pool.query(`SELECT id, title, sequence, module FROM lessons WHERE status <> 'Archived' AND ${OOP_LESSON_FILTER_SQL} ORDER BY sequence ASC`)
        ]);

        const preScore = preTest.rows[0] ? Number(preTest.rows[0].percentage) : null;
        const postScore = postTest.rows[0] ? Number(postTest.rows[0].percentage) : null;
        const improvement = (preScore !== null && postScore !== null) ? (postScore - preScore) : null;

        const topicMap = {};
        for (const l of lessons.rows) {
            const lessonQuizzes = quizzes.rows.filter(q => q.lesson_id === l.id);
            const bestQuiz = lessonQuizzes.length > 0 ? Math.max(...lessonQuizzes.map(q => Number(q.percentage || 0))) : 0;
            const video = videos.rows.find(v => v.video_id === l.id);
            topicMap[l.id] = {
                lessonId: l.id,
                title: l.title,
                sequence: l.sequence,
                videoCompleted: Boolean(video?.completed || Number(video?.completion_percentage || 0) >= 95),
                videoPercentage: Number(video?.completion_percentage || 0),
                quizPassed: bestQuiz >= ASSESSMENT_PASSING_SCORE,
                bestQuizScore: bestQuiz,
                attemptsCount: lessonQuizzes.length
            };
        }

        const completedCount = Object.values(topicMap).filter(t => t.videoCompleted && t.quizPassed).length;
        const totalLessons = lessons.rows.length || 12;

        res.json({
            success: true,
            data: {
                student: {
                    id: student.id,
                    name: student.name,
                    email: student.email,
                    studentNumber: student.student_number || "",
                    section: student.section || "",
                    course: student.course || "",
                    yearLevel: student.year_level || ""
                },
                progress: {
                    completedLessons: completedCount,
                    totalLessons,
                    overallPercentage: Math.round((completedCount / totalLessons) * 100)
                },
                preTest: preTest.rows[0] ? {
                    score: Number(preTest.rows[0].score),
                    total: Number(preTest.rows[0].total),
                    percentage: preScore,
                    passed: Boolean(preTest.rows[0].passed),
                    dateCompleted: preTest.rows[0].date_completed
                } : null,
                postTest: postTest.rows[0] ? {
                    score: Number(postTest.rows[0].score),
                    total: Number(postTest.rows[0].total),
                    percentage: postScore,
                    passed: Boolean(postTest.rows[0].passed),
                    dateCompleted: postTest.rows[0].date_completed
                } : null,
                scoreImprovement: improvement,
                topics: Object.values(topicMap),
                recentQuizAttempts: quizzes.rows.slice(0, 10).map(q => ({
                    id: q.id,
                    lessonId: q.lesson_id,
                    topicName: buildOopTopicNameMap(lessons.rows)[q.lesson_id] || TOPIC_NAMES[q.lesson_id] || q.lesson_id,
                    score: Number(q.score),
                    total: Number(q.total),
                    percentage: Number(q.percentage),
                    passed: Boolean(q.passed),
                    attemptNumber: Number(q.attempt_number),
                    dateCompleted: q.date_completed
                }))
            }
        });
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

        if (safeAssessmentId !== "oop_pre_test") {
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
        }

        let preTestConfig = null;
        if (safeAssessmentId === "oop_pre_test") {
            const cfgResult = await pool.query("SELECT * FROM pre_tests WHERE id = 'oop_pre_test' LIMIT 1");
            preTestConfig = cfgResult.rows[0] || null;
        }
        const maxAttempts = safeAssessmentId === "oop_pre_test"
            ? Number(preTestConfig?.max_attempts || MAX_ASSESSMENT_ATTEMPTS)
            : MAX_ASSESSMENT_ATTEMPTS;

        const isSwingAssessment = safeAssessmentId.startsWith("swing_assessment_") || safeLessonId.startsWith("swing_lesson_");
        const attemptCountResult = await pool.query(
            isSwingAssessment
                ? "SELECT COUNT(*)::int AS attempt_count FROM swing_quiz_attempts WHERE student_id = $1 AND assessment_id = $2"
                : "SELECT COUNT(*)::int AS attempt_count FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = $2",
            [req.authUser.id, safeAssessmentId]
        );
        const attemptCount = Number(attemptCountResult.rows[0]?.attempt_count || 0);
        if (attemptCount >= maxAttempts) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount, maxAttempts, message: "You have used all " + maxAttempts + " attempts for this assessment." });
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

        // Reject new starts if pre-test is not published
        if (safeAssessmentId === "oop_pre_test" && preTestConfig && preTestConfig.status !== "Published") {
            return res.status(403).json({ success: false, message: "Pre-test is currently not available." });
        }

        // Generate attempt number
        const attemptResult = await pool.query(
            "SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM assessment_sessions WHERE student_user_id = $1 AND assessment_id = $2",
            [req.authUser.id, safeAssessmentId]
        );
        const attemptNumber = Number(attemptResult.rows[0]?.next_attempt || 1);

        const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const timeLimitSeconds = safeAssessmentId === "oop_pre_test"
            ? Number(preTestConfig?.time_limit_seconds || PRE_TEST_TIME_LIMIT_SECONDS)
            : 600;
        const expiresAt = new Date(Date.now() + timeLimitSeconds * 1000);

        // Fetch question bank and randomize questions and option order
        const rawQuestions = safeAssessmentId === "oop_pre_test"
            ? ALL_OOP_QUESTIONS
            : await resolveAssessmentQuestions(safeAssessmentId, safeLessonId);
        const randomizedQuestions = safeAssessmentId === "oop_pre_test"
            ? generatePreTestSessionQuestions(20).studentQuestions
            : generateSessionQuestions(rawQuestions, 15);

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
                storage: safeAssessmentId.startsWith("swing_") ? "swing" : "oop",
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
                storage: session.assessment_id.startsWith("swing_") ? "swing" : "oop",
                lessonId: session.lesson_id,
                startedAt: session.started_at,
                expiresAt: session.expires_at,
                remainingSeconds,
                violationCount: session.violation_count,
                attemptNumber: session.attempt_number,
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
        if (session.assessment_id !== "oop_pre_test") {
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
        }
        if (session.status === "completed") {
            return res.status(409).json({ success: false, message: "This assessment session has already been completed." });
        }

        const questions = Array.isArray(session.question_order) ? session.question_order : [];
        const rawBank = session.assessment_id === "oop_pre_test"
            ? ALL_OOP_QUESTIONS
            : await resolveAssessmentQuestions(session.assessment_id, session.lesson_id);
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

        let submitMaxAttempts = MAX_ASSESSMENT_ATTEMPTS;
        let submitPassingScore = ASSESSMENT_PASSING_SCORE;
        if (session.assessment_id === "oop_pre_test") {
            const cfgResult = await pool.query("SELECT * FROM pre_tests WHERE id = 'oop_pre_test' LIMIT 1");
            const preTestConfig = cfgResult.rows[0];
            if (preTestConfig) {
                submitMaxAttempts = Number(preTestConfig.max_attempts || MAX_ASSESSMENT_ATTEMPTS);
                if (preTestConfig.passing_score !== undefined && preTestConfig.passing_score !== null) {
                    submitPassingScore = Number(preTestConfig.passing_score);
                }
            }
        }

        const percentage = Math.round((score / total) * 100);
        const passed = percentage >= submitPassingScore;
        const correctAnswers = score;
        const incorrectAnswers = total - score;

        const isSwingAssessment = session.assessment_id.startsWith("swing_assessment_") || session.lesson_id.startsWith("swing_lesson_");
        const attemptCountResult = await pool.query(
            isSwingAssessment
                ? "SELECT COUNT(*)::int AS attempt_count FROM swing_quiz_attempts WHERE student_id = $1 AND assessment_id = $2"
                : "SELECT COUNT(*)::int AS attempt_count FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = $2",
            [req.authUser.id, session.assessment_id]
        );
        const attemptCount = Number(attemptCountResult.rows[0]?.attempt_count || 0);
        if (attemptCount >= submitMaxAttempts) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount, maxAttempts: submitMaxAttempts, message: "You have used all " + submitMaxAttempts + " attempts for this assessment." });
        }

        // Insert into quiz_attempts or swing_quiz_attempts for authoritative history
        const cappedInsert = await insertCappedAssessmentAttempt({
            studentId: req.authUser.id,
            assessmentId: session.assessment_id,
            storage: isSwingAssessment ? "swing" : "oop",
            fallbackAttemptNumber: session.attempt_number,
            maxAttempts: submitMaxAttempts,
            beforeInsert: async client => {
                let sessionInsights = null;
                if (session.assessment_id === "oop_pre_test") {
                    sessionInsights = computePreTestInsights({
                        questions,
                        answers,
                        score,
                        total,
                        percentage,
                        passed,
                        attemptNumber: session.attempt_number || 1,
                        dateCompleted: new Date().toISOString(),
                        startedAt: session.started_at,
                        completedAt: new Date().toISOString(),
                        passingScore: submitPassingScore
                    });
                }
                await client.query("UPDATE assessment_sessions SET status = 'completed', completed_at = NOW(), score = $1, total = $2, percentage = $3, passed = $4, answers = $5::jsonb, insights = $6::jsonb, updated_at = NOW() WHERE id = $7", [score, total, percentage, passed, JSON.stringify(answers), sessionInsights ? JSON.stringify(sessionInsights) : null, session.id]);
                if (isSwingAssessment) {
                    await client.query("INSERT INTO swing_progress (student_id, lesson_id, quiz_passed) VALUES ($1, $2, $3) ON CONFLICT (student_id, lesson_id) DO UPDATE SET quiz_passed = swing_progress.quiz_passed OR EXCLUDED.quiz_passed, updated_at = NOW()", [req.authUser.id, session.lesson_id, passed]);
                }
            },
            insertQuery: isSwingAssessment
                ? "INSERT INTO swing_quiz_attempts (student_id, assessment_id, lesson_id, score, total, percentage, correct_answers, incorrect_answers, passed, attempt_number, answers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) RETURNING *"
                : "INSERT INTO quiz_attempts (student_user_id, assessment_id, lesson_id, score, total, percentage, correct_answers, incorrect_answers, passed, attempt_number, answers, date_completed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW()) RETURNING *",
            buildParams: attemptNumber => isSwingAssessment
                ? [req.authUser.id, session.assessment_id, session.lesson_id, score, total, percentage, correctAnswers, incorrectAnswers, passed, attemptNumber, JSON.stringify(answers)]
                : [req.authUser.id, session.assessment_id, session.lesson_id, score, total, percentage, correctAnswers, incorrectAnswers, passed, attemptNumber, JSON.stringify(answers)]
        });
        if (cappedInsert.limited) {
            return res.status(429).json({ success: false, errorCode: "ATTEMPT_LIMIT_REACHED", attemptCount: cappedInsert.attemptCount, maxAttempts: submitMaxAttempts, message: "You have used all " + submitMaxAttempts + " attempts for this assessment." });
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
            storage: isSwingAssessment ? "swing" : "oop",
            lessonId: session.lesson_id,
            score,
            total,
            passed,
            attemptNumber: session.attempt_number,
            violations: session.violation_count
        });

        // Verify lesson completion
        if (!isSwingAssessment && session.lesson_id) {
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

const resetLessonAssessmentAndVideo = async (studentId, rawIdentifier) => {
    const studentUserRow = await pool.query(
        "SELECT id, user_id, email FROM users WHERE id::text = $1 OR user_id = $1 OR LOWER(email) = LOWER($1) LIMIT 1",
        [String(studentId)]
    );
    const studentUuid = studentUserRow.rows[0]?.id || studentId;
    const studentUserId = studentUserRow.rows[0]?.user_id || String(studentId);
    const studentEmail = studentUserRow.rows[0]?.email || "";

    const raw = String(rawIdentifier || "").trim();
    const isSwing = raw.toLowerCase().startsWith("swing");
    const numMatch = raw.match(/(\d+)/);
    const lessonSeq = numMatch ? parseInt(numMatch[1], 10) : null;

    let canonicalLessonId = raw;
    let canonicalAssessmentId = "";

    if (isSwing) {
        canonicalLessonId = lessonSeq ? `swing_lesson_${lessonSeq}` : raw;
        canonicalAssessmentId = lessonSeq ? `swing_assessment_${lessonSeq}` : raw;
    } else {
        canonicalLessonId = lessonSeq ? `oop_lesson_${lessonSeq}` : raw;
        canonicalAssessmentId = lessonSeq ? `oop_assessment_${lessonSeq}` : raw;
    }

    if (isSwing) {
        const sl = await pool.query("SELECT id, sequence FROM swing_lessons WHERE id = $1 OR sequence = $2 LIMIT 1", [canonicalLessonId, lessonSeq || 0]);
        if (sl.rowCount > 0) {
            canonicalLessonId = sl.rows[0].id;
            canonicalAssessmentId = `swing_assessment_${sl.rows[0].sequence}`;
        }
    } else {
        const ol = await pool.query("SELECT id, sequence FROM lessons WHERE id = $1 OR sequence = $2 LIMIT 1", [canonicalLessonId, lessonSeq || 0]);
        if (ol.rowCount > 0) {
            canonicalLessonId = ol.rows[0].id;
            canonicalAssessmentId = `oop_assessment_${ol.rows[0].sequence}`;
        }
    }

    const seqStr = lessonSeq ? String(lessonSeq) : "";

    // 1. Delete assessment sessions (security events cascade delete)
    await pool.query(`
        DELETE FROM assessment_sessions
        WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)}
          AND (
              assessment_id = $4
              OR assessment_id = $5
              OR lesson_id = $6
              OR lesson_id = $7
          )
    `, [studentUuid, studentUserId, studentEmail, canonicalAssessmentId, isSwing ? `swing_assessment_${seqStr}` : `oop_assessment_${seqStr}`, canonicalLessonId, seqStr]);

    // 2. Delete quiz attempts
    if (isSwing) {
        await pool.query(`
            DELETE FROM swing_quiz_attempts
            WHERE ${studentTextMatchSql("student_id", 1, 2, 3)}
              AND (
                  lesson_id = $4
                  OR lesson_id = REPLACE($4, 'swing_lesson_', '')
                  OR assessment_id = $5
                  OR assessment_id = 'swing_assessment_' || $6
              )
        `, [studentUuid, studentUserId, studentEmail, canonicalLessonId, canonicalAssessmentId, seqStr]);
    } else {
        await pool.query(`
            DELETE FROM quiz_attempts
            WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)}
              AND (
                  lesson_id = $4
                  OR lesson_id = $5
                  OR assessment_id = $6
                  OR assessment_id = 'oop_assessment_' || $7
                  OR EXISTS (SELECT 1 FROM assessments a WHERE a.id = quiz_attempts.assessment_id AND (a.lesson_id = $4 OR a.lesson_id = $5))
              )
        `, [studentUuid, studentUserId, studentEmail, canonicalLessonId, seqStr, canonicalAssessmentId, seqStr]);
    }

    // 3. Reset video progress in student_progress, video_progress, and lesson_progress (or swing_progress)
    if (isSwing) {
        await pool.query(`
            UPDATE swing_progress
            SET video_completed = FALSE,
                video_percentage = 0,
                video_last_position = 0,
                quiz_passed = FALSE,
                quiz_score = 0,
                quiz_total = 0,
                overall_percentage = 0,
                updated_at = NOW()
            WHERE ${studentTextMatchSql("student_id", 1, 2, 3)}
              AND (
                  lesson_id = $4
                  OR lesson_id = REPLACE($4, 'swing_lesson_', '')
                  OR lesson_id = $5
              )
        `, [studentUuid, studentUserId, studentEmail, canonicalLessonId, seqStr]);
    } else {
        await pool.query(`
            UPDATE student_progress
            SET completion_percentage = 0,
                last_position = 0,
                completed = FALSE,
                updated_at = NOW()
            WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)}
              AND (
                  video_id = $4
                  OR video_id = REPLACE($4, 'oop_lesson_', '')
                  OR video_id = 'vid_' || $4
                  OR video_id = $5
              )
        `, [studentUuid, studentUserId, studentEmail, canonicalLessonId, seqStr]);

        await pool.query(`
            UPDATE video_progress
            SET watch_percentage = 0,
                "current_time" = 0,
                completed = FALSE,
                updated_at = NOW()
            WHERE ${studentUuidMatchSql("student_id", 1, 2, 3)}
              AND (
                  lesson_id = $4
                  OR lesson_id = REPLACE($4, 'oop_lesson_', '')
                  OR lesson_id = $5
              )
        `, [studentUuid, studentUserId, studentEmail, canonicalLessonId, seqStr]);

        await pool.query(`
            UPDATE lesson_progress
            SET video_completed = FALSE,
                quiz_passed = FALSE,
                completed = FALSE,
                updated_at = NOW()
            WHERE ${studentUuidMatchSql("student_id", 1, 2, 3)}
              AND (
                  lesson_id = $4
                  OR lesson_id = REPLACE($4, 'oop_lesson_', '')
                  OR lesson_id = $5
              )
        `, [studentUuid, studentUserId, studentEmail, canonicalLessonId, seqStr]);
    }

    await logActivity(studentUuid, "assessment_reset", `Assessment attempts and video progress reset for ${canonicalLessonId}`, {
        lessonId: canonicalLessonId,
        assessmentId: canonicalAssessmentId
    });

    await verifyLessonCompletion(studentUuid, canonicalLessonId);

    const access = await getLessonAccessState(studentUuid, canonicalLessonId);
    return {
        studentId: studentUuid,
        lessonId: canonicalLessonId,
        assessmentId: canonicalAssessmentId,
        videoProgress: 0,
        videoCompleted: false,
        assessmentUnlocked: false,
        quizAttempts: 0,
        access
    };
};

app.post(["/api/assessments/:lessonId/reset", "/api/assessments/reset/:lessonId", "/api/assessments/reset"], requireAuth, async (req, res, next) => {
    try {
        const rawIdentifier = req.params.lessonId || req.body?.lessonId || req.body?.assessmentId;
        if (!rawIdentifier) {
            return res.status(400).json({ success: false, message: "lessonId or assessmentId is required." });
        }
        const targetStudentId = (req.authUser.role === "teacher" && (req.body?.studentId || req.query?.studentId))
            ? (req.body?.studentId || req.query?.studentId)
            : req.authUser.id;

        if (req.authUser.role === "teacher" && targetStudentId !== req.authUser.id) {
            const authorized = await isTeacherAuthorizedForStudent(pool, req.authUser.id, targetStudentId);
            if (!authorized) {
                return res.status(403).json({ success: false, message: "You are not authorized to reset this student's assessment." });
            }
        }

        const result = await resetLessonAssessmentAndVideo(targetStudentId, rawIdentifier);
        res.json({
            success: true,
            message: "Assessment attempts and video progress have been reset. Re-watch the lesson video to unlock the assessment.",
            data: result
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/assessments/sessions/student/:studentId", requireAuth, async (req, res, next) => {
    try {
        if (req.authUser.role === "student" && req.authUser.id !== req.params.studentId) {
            return res.status(403).json({ success: false, message: "Students can only view their own assessment sessions." });
        }
        if (req.authUser.role === "teacher") {
            const authorized = await isTeacherAuthorizedForStudent(pool, req.authUser.id, req.params.studentId);
            if (!authorized) {
                return res.status(403).json({ success: false, message: "You are not authorized to monitor this student." });
            }
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
        if (req.authUser.role === "teacher") {
            const authorized = await isTeacherAuthorizedForStudent(pool, req.authUser.id, sessionRes.rows[0].student_user_id);
            if (!authorized) {
                return res.status(403).json({ success: false, message: "You are not authorized to view this student's assessment events." });
            }
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
        const rows = await fetchOrderedLessonRows();
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.get("/api/progress/:studentId", requireAuth, async (req, res, next) => {
    try {
        const studentIdCheck = validateId(req.params.studentId, "studentId", "GET /api/progress/:studentId");
        if (!studentIdCheck.valid) return res.status(studentIdCheck.status).json({ success: false, message: studentIdCheck.message });
        const studentId = studentIdCheck.value;
        const userRow = await pool.query(
            "SELECT id, user_id, email FROM users WHERE id::text = $1 OR user_id = $1 OR LOWER(email) = LOWER($1) LIMIT 1",
            [studentId]
        );
        const resolvedId = userRow.rows[0]?.id || studentId;
        const resolvedUserId = userRow.rows[0]?.user_id || studentId;
        const resolvedEmail = userRow.rows[0]?.email || "";

        const authId = String(req.authUser.id || "");
        const authUserId = String(req.authUser.userId || req.authUser.user_id || "");
        const authEmail = String(req.authUser.email || "").toLowerCase();
        const targetId = String(resolvedId || "");
        const targetUId = String(resolvedUserId || "");
        const targetMail = String(resolvedEmail || "").toLowerCase();

        const isSelf = 
            (authId && (authId === targetId || authId === targetUId)) ||
            (authUserId && (authUserId === targetUId || authUserId === targetId)) ||
            (authEmail && authEmail === targetMail);

        if (req.authUser.role === "student" && !isSelf) {
            return res.status(403).json({ success: false, message: "Students can only view their own progress." });
        }

        if (req.authUser.role === "teacher" && !isSelf) {
            const authorized = await isTeacherAuthorizedForStudent(pool, req.authUser.id, resolvedId);
            if (!authorized) {
                return res.status(403).json({ success: false, message: "You are not authorized to monitor this student." });
            }
        }
        const result = await pool.query(
            `WITH combined_progress AS (
                SELECT 
                    sp.video_id AS raw_id,
                    sp.last_position,
                    sp.completion_percentage,
                    sp.completed,
                    sp.updated_at
                FROM student_progress sp
                WHERE ${studentUuidMatchSql("sp.student_user_id", 1, 2, 3)}
                UNION ALL
                SELECT 
                    vp.lesson_id AS raw_id,
                    vp."current_time" AS last_position,
                    vp.watch_percentage AS completion_percentage,
                    vp.completed,
                    vp.updated_at
                FROM video_progress vp
                WHERE ${studentUuidMatchSql("vp.student_id", 1, 2, 3)}
                UNION ALL
                SELECT 
                    sw.lesson_id AS raw_id,
                    sw.video_last_position AS last_position,
                    sw.video_percentage AS completion_percentage,
                    sw.video_completed AS completed,
                    sw.updated_at
                FROM swing_progress sw
                WHERE ${studentTextMatchSql("sw.student_id", 1, 2, 3)}
            ),
            normalized AS (
                SELECT
                    CASE 
                        WHEN raw_id ~ '^[0-9]+$' THEN 'oop_lesson_' || raw_id
                        WHEN raw_id LIKE 'vid_%' THEN REPLACE(raw_id, 'vid_', '')
                        ELSE raw_id
                    END AS canonical_id,
                    raw_id,
                    last_position,
                    completion_percentage,
                    completed,
                    updated_at
                FROM combined_progress
            ),
            aggregated AS (
                SELECT 
                    canonical_id,
                    MAX(last_position) AS last_position,
                    MAX(completion_percentage) AS completion_percentage,
                    (BOOL_OR(completed) OR MAX(completion_percentage) >= 95) AS completed,
                    MAX(updated_at) AS updated_at
                FROM normalized
                GROUP BY canonical_id
            )
            SELECT 
                canonical_id AS id,
                $1 AS student_user_id,
                canonical_id AS video_id,
                COALESCE(last_position, 0) AS last_position,
                COALESCE(completion_percentage, 0) AS completion_percentage,
                COALESCE(completed, FALSE) AS completed,
                CASE WHEN completed THEN updated_at ELSE NULL END AS date_completed,
                '' AS notes,
                updated_at AS created_at,
                COALESCE(updated_at, NOW()) AS updated_at
            FROM aggregated
            ORDER BY canonical_id ASC`,
            [resolvedId, resolvedUserId, resolvedEmail]
        );
        const rows = [];
        for (const r of result.rows) {
            rows.push(r);
            if (r.video_id && r.video_id.startsWith("oop_lesson_")) {
                const num = r.video_id.replace("oop_lesson_", "");
                rows.push({
                    ...r,
                    id: `${r.id}_alias`,
                    video_id: num
                });
            }
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

app.get("/api/lesson-access/:lessonId", requireAuth, requireRole(["student"]), async (req, res, next) => {
    try {
        const lessonIdCheck = validateId(req.params.lessonId, "lessonId", "GET /api/lesson-access/:lessonId");
        if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
        const access = await getLessonAccessState(req.authUser.id, lessonIdCheck.value);
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
    const requestId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let failureStage = "identity_lookup";
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

        if (!identity.rowCount) {
            console.warn(`[StudentResults:${requestId}] Stage: ${failureStage} - Student not found for identifier: ${studentId}`);
            return res.status(404).json({ success: false, message: "Student not found." });
        }
        const targetUser = identity.rows[0];

        if (targetUser.role !== "student") {
            console.warn(`[StudentResults:${requestId}] Stage: ${failureStage} - Target user is not a student (role=${targetUser.role})`);
            return res.status(404).json({ success: false, message: "Student not found." });
        }

        failureStage = "authorization_check";
        const authId = String(req.authUser.id || "");
        const authUserId = String(req.authUser.userId || req.authUser.user_id || "");
        const authEmail = String(req.authUser.email || "").toLowerCase();
        const targetId = String(targetUser.id || "");
        const targetUId = String(targetUser.user_id || "");
        const targetMail = String(targetUser.email || "").toLowerCase();

        const isSelf = 
            (authId && (authId === targetId || authId === targetUId)) ||
            (authUserId && (authUserId === targetUId || authUserId === targetId)) ||
            (authEmail && authEmail === targetMail);

        if (req.authUser.role === "student" && !isSelf) {
            console.warn(`[StudentResults:${requestId}] Stage: ${failureStage} - Access denied for student. authId=${authId}, targetId=${targetId}`);
            return res.status(403).json({ success: false, message: "Students can only view their own results." });
        }

        if (req.authUser.role === "teacher" && !isSelf) {
            const authorized = await isTeacherAuthorizedForStudent(pool, req.authUser.id, targetUser.id);
            if (!authorized) {
                console.warn(`[StudentResults:${requestId}] Stage: ${failureStage} - Teacher ${authId} unauthorized to monitor student ${targetUser.id}`);
                return res.status(403).json({ success: false, message: "You are not authorized to monitor this student." });
            }
        }

        failureStage = "oop_completion_check";
        const dbStudentId = targetUser.id;
        const targetUserId = targetUser.user_id || String(dbStudentId);
        const targetEmail = targetUser.email || "";

        let oopCompletion = { oopComplete: false };
        try {
            oopCompletion = await getOOPCompletionStatus(dbStudentId);
        } catch (oopErr) {
            console.warn(`[StudentResults:${requestId}] Warning in ${failureStage}:`, oopErr.message);
        }

        failureStage = "database_aggregations";
        const [course, videos, quizzes, practice, swing, oopTopics, swingTopics] = await Promise.all([
            pool.query(`
                SELECT COUNT(*)::int AS total_lessons,
                       COUNT(*) FILTER (
                           WHERE (COALESCE(sp.completed, FALSE) OR COALESCE(vp.completed, FALSE) OR COALESCE(lp.video_completed, FALSE) OR GREATEST(COALESCE(sp.completion_percentage, 0), COALESCE(vp.watch_percentage, 0)) >= 95)
                             AND COALESCE(qa.passed, FALSE)
                             AND (ps.submission_id IS NOT NULL OR lp.practice_completed)
                       )::int AS completed_lessons
                FROM lessons l
                LEFT JOIN student_progress sp ON ${studentUuidMatchSql("sp.student_user_id", 1, 2, 3)} AND (sp.video_id = l.id OR sp.video_id = REPLACE(l.id, 'oop_lesson_', ''))
                LEFT JOIN video_progress vp ON ${studentUuidMatchSql("vp.student_id", 1, 2, 3)} AND (vp.lesson_id = l.id OR vp.lesson_id = REPLACE(l.id, 'oop_lesson_', ''))
                LEFT JOIN lesson_progress lp ON ${studentUuidMatchSql("lp.student_id", 1, 2, 3)} AND lp.lesson_id = l.id
                LEFT JOIN LATERAL (
                  SELECT (${normalizedAssessmentPercentageSql("quiz_attempts")} >= ${ASSESSMENT_PASSING_SCORE} OR passed) AS passed
                  FROM quiz_attempts
                  WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)} AND (lesson_id = l.id OR assessment_id = 'oop_assessment_' || l.sequence)
                  ORDER BY attempt_number DESC, date_completed DESC LIMIT 1
                ) qa ON TRUE
                LEFT JOIN LATERAL (
                  SELECT ps.id AS submission_id, ps.challenge_id, ps.score, ps.teacher_score, ps.compile_status 
                  FROM practice_submissions ps
                  LEFT JOIN programming_challenges pc ON pc.id = ps.challenge_id
                  WHERE ${studentTextMatchSql("ps.student_id", 1, 2, 3)}
                    AND (
                      pc.lesson_id = l.id 
                      OR pc.lesson_id = REPLACE(l.id, 'oop_lesson_', '')
                      OR pc.lesson_id = 'oop_lesson_' || l.sequence
                      OR ps.challenge_id = 'practice_' || l.sequence
                      OR ps.challenge_id = 'practice-' || l.sequence
                      OR ps.challenge_id = 'oop_practice_' || l.sequence
                      OR ps.challenge_id = l.id
                      OR pc.topic_id = l.id
                      OR ps.challenge_id = pc.topic_id
                      OR (l.sequence = 3 AND (ps.challenge_id = 'object-methods' OR ps.challenge_id = 'practice_3'))
                      OR ps.challenge_id IN (SELECT id FROM programming_challenges WHERE lesson_id = l.id OR lesson_id = REPLACE(l.id, 'oop_lesson_', ''))
                      OR ps.challenge_id IN (SELECT topic_id FROM programming_challenges WHERE lesson_id = l.id OR lesson_id = REPLACE(l.id, 'oop_lesson_', ''))
                    )
                    AND COALESCE(ps.review_status, '') <> 'returned'
                    AND COALESCE(ps.remedial_required, FALSE) = FALSE
                    AND (ps.compile_status = 'success' OR (ps.source_code IS NOT NULL AND ps.source_code ~ '\bclass\s+'))
                  ORDER BY CASE WHEN ps.compile_status = 'success' THEN 1 ELSE 2 END, ps.submitted_at DESC LIMIT 1
                ) ps ON TRUE
                WHERE l.status <> 'Archived'
                  AND ${OOP_LESSON_ALIAS_FILTER_SQL("l")}
            `, [dbStudentId, targetUserId, targetEmail]),
            pool.query(`
                SELECT COUNT(*)::int AS total_videos,
                       COUNT(*) FILTER (WHERE completed)::int AS completed_videos,
                       COALESCE(ROUND(AVG(completion_percentage)), 0)::int AS video_percentage
                FROM (
                    SELECT 
                        GREATEST(
                            COALESCE(sp.completion_percentage, 0),
                            COALESCE(vp.watch_percentage, 0)
                        ) AS completion_percentage,
                        (COALESCE(sp.completed, FALSE) OR COALESCE(vp.completed, FALSE) OR COALESCE(lp.video_completed, FALSE) OR GREATEST(COALESCE(sp.completion_percentage, 0), COALESCE(vp.watch_percentage, 0)) >= 95) AS completed
                    FROM lessons l
                    LEFT JOIN student_progress sp ON ${studentUuidMatchSql("sp.student_user_id", 1, 2, 3)} AND (sp.video_id = l.id OR sp.video_id = REPLACE(l.id, 'oop_lesson_', ''))
                    LEFT JOIN video_progress vp ON ${studentUuidMatchSql("vp.student_id", 1, 2, 3)} AND (vp.lesson_id = l.id OR vp.lesson_id = REPLACE(l.id, 'oop_lesson_', ''))
                    LEFT JOIN lesson_progress lp ON ${studentUuidMatchSql("lp.student_id", 1, 2, 3)} AND lp.lesson_id = l.id
                    WHERE l.status <> 'Archived' AND ${OOP_LESSON_ALIAS_FILTER_SQL("l")}
                ) v
            `, [dbStudentId, targetUserId, targetEmail]),
            pool.query(`
                SELECT COUNT(*)::int AS quiz_attempts, COALESCE(ROUND(AVG(percentage)), 0)::int AS average_quiz_score
                FROM (
                  SELECT DISTINCT ON (assessment_id) percentage
                  FROM quiz_attempts WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)}
                  ORDER BY assessment_id, attempt_number DESC, date_completed DESC
                ) latest
            `, [dbStudentId, targetUserId, targetEmail]),
            pool.query(`
                SELECT COUNT(pc.id)::int AS total_practice_activities,
                       COUNT(ps.challenge_id)::int AS submitted_practice_activities,
                       COUNT(DISTINCT ps.challenge_id) FILTER (
                         WHERE ps.id IS NOT NULL
                           AND COALESCE(ps.remedial_required, FALSE) = FALSE
                           AND ps.compile_status = 'success'
                       )::int AS completed_practice_activities,
                      COALESCE(ROUND(AVG(ps.score)), 0)::int AS average_practice_score
                FROM programming_challenges pc
                LEFT JOIN practice_submissions ps ON ps.challenge_id = pc.id AND ${studentTextMatchSql("ps.student_id", 1, 2, 3)}
                WHERE pc.status <> 'Archived'
            `, [dbStudentId, targetUserId, targetEmail]),
            pool.query(`
                SELECT COUNT(DISTINCT ss.id)::int AS swing_submissions,
                       COUNT(DISTINCT sp.id) FILTER (WHERE sp.content_completed OR sp.video_completed OR sp.quiz_passed OR sp.exercise_completed)::int AS swing_completed_activities,
                       COUNT(DISTINCT sl.id) FILTER (WHERE NOT (COALESCE(sp.content_completed, FALSE) AND COALESCE(sp.video_completed, FALSE) AND COALESCE(sp.quiz_passed, FALSE) AND COALESCE(sp.exercise_completed, FALSE)))::int AS swing_pending_activities
                FROM swing_lessons sl
                LEFT JOIN swing_progress sp ON sp.lesson_id = sl.id AND ${studentTextMatchSql("sp.student_id", 1, 2, 3)}
                LEFT JOIN swing_programming_exercises se ON se.lesson_id = sl.id
                LEFT JOIN swing_submissions ss ON ss.exercise_id = se.id AND ${studentTextMatchSql("ss.student_id", 1, 2, 3)}
            `, [dbStudentId, targetUserId, targetEmail])
                        , pool.query(`
                                SELECT l.id, l.title, l.sequence,
                                       GREATEST(
                                           COALESCE(sp.completion_percentage, 0),
                                           COALESCE(vp.watch_percentage, 0)
                                       ) AS video_percentage,
                                       (
                                           COALESCE(sp.completed, FALSE)
                                           OR COALESCE(vp.completed, FALSE)
                                           OR COALESCE(lp.video_completed, FALSE)
                                           OR GREATEST(COALESCE(sp.completion_percentage, 0), COALESCE(vp.watch_percentage, 0)) >= 95
                                       ) AS video_completed,
                                       qa.percentage AS quiz_percentage,
                                       EXISTS (
                                           SELECT 1
                                           FROM quiz_attempts passed_attempt
                                           WHERE ${studentUuidMatchSql("passed_attempt.student_user_id", 1, 2, 3)}
                                               AND (passed_attempt.lesson_id = l.id OR passed_attempt.assessment_id = 'oop_assessment_' || l.sequence)
                                               AND (${normalizedAssessmentPercentageSql("passed_attempt")} >= ${ASSESSMENT_PASSING_SCORE} OR passed_attempt.passed = TRUE)
                                       ) AS quiz_passed,
                                       ps.score AS practice_score,
                                       lp.completed AS lesson_completed,
                                       (sp.id IS NOT NULL OR vp.id IS NOT NULL OR qa.id IS NOT NULL OR ps.challenge_id IS NOT NULL OR lp.id IS NOT NULL) AS attempted
                                FROM lessons l
                                LEFT JOIN student_progress sp ON ${studentUuidMatchSql("sp.student_user_id", 1, 2, 3)} AND (sp.video_id = l.id OR sp.video_id = REPLACE(l.id, 'oop_lesson_', ''))
                                LEFT JOIN video_progress vp ON ${studentUuidMatchSql("vp.student_id", 1, 2, 3)} AND (vp.lesson_id = l.id OR vp.lesson_id = REPLACE(l.id, 'oop_lesson_', ''))
                                LEFT JOIN lesson_progress lp ON ${studentUuidMatchSql("lp.student_id", 1, 2, 3)} AND lp.lesson_id = l.id
                                LEFT JOIN LATERAL (
                                    SELECT id, percentage, passed,
                                           (SELECT COUNT(*)::int FROM quiz_attempts counted WHERE ${studentUuidMatchSql("counted.student_user_id", 1, 2, 3)} AND (counted.lesson_id = l.id OR counted.assessment_id = 'oop_assessment_' || l.sequence)) AS attempt_count
                                    FROM quiz_attempts
                                    WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)} AND (lesson_id = l.id OR assessment_id = 'oop_assessment_' || l.sequence)
                                    ORDER BY attempt_number DESC, date_completed DESC
                                    LIMIT 1
                                ) qa ON TRUE
                                LEFT JOIN LATERAL (
                                    SELECT ps.id AS submission_id, ps.challenge_id, ps.score
                                    FROM practice_submissions ps
                                    LEFT JOIN programming_challenges pc ON pc.id = ps.challenge_id
                                    WHERE ${studentTextMatchSql("ps.student_id", 1, 2, 3)}
                                      AND (
                                        pc.lesson_id = l.id 
                                        OR pc.lesson_id = REPLACE(l.id, 'oop_lesson_', '')
                                        OR pc.lesson_id = 'oop_lesson_' || l.sequence
                                        OR ps.challenge_id = 'practice_' || l.sequence
                                        OR ps.challenge_id = 'practice-' || l.sequence
                                        OR ps.challenge_id = 'oop_practice_' || l.sequence
                                        OR ps.challenge_id = l.id
                                        OR pc.topic_id = l.id
                                        OR ps.challenge_id = pc.topic_id
                                        OR (l.sequence = 3 AND (ps.challenge_id = 'object-methods' OR ps.challenge_id = 'practice_3'))
                                        OR ps.challenge_id IN (SELECT id FROM programming_challenges WHERE lesson_id = l.id OR lesson_id = REPLACE(l.id, 'oop_lesson_', ''))
                                        OR ps.challenge_id IN (SELECT topic_id FROM programming_challenges WHERE lesson_id = l.id OR lesson_id = REPLACE(l.id, 'oop_lesson_', ''))
                                      )
                                    ORDER BY 
                                      CASE WHEN (ps.compile_status = 'success' OR (ps.source_code IS NOT NULL AND ps.source_code ~ '\bclass\s+')) AND COALESCE(ps.review_status, '') <> 'returned' AND COALESCE(ps.remedial_required, FALSE) = FALSE THEN 1 ELSE 2 END,
                                      ps.submitted_at DESC
                                    LIMIT 1
                                ) ps ON TRUE
                                WHERE l.status <> 'Archived'
                                  AND ${OOP_LESSON_ALIAS_FILTER_SQL("l")}
                                ORDER BY l.sequence, l.title
                        `, [dbStudentId, targetUserId, targetEmail])
                        , pool.query(`
                                SELECT sl.id, sl.title, sl.sequence,
                                       sg.overall_percentage,
                                       sg.content_completed,
                                       (COALESCE(sg.video_completed, FALSE) OR COALESCE(sg.video_percentage, 0) >= 95) AS video_completed,
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
                                LEFT JOIN swing_progress sg ON ${studentTextMatchSql("sg.student_id", 1, 2, 3)} AND (sg.lesson_id = sl.id OR sg.lesson_id = REPLACE(sl.id, 'swing_lesson_', ''))
                                LEFT JOIN LATERAL (
                                     SELECT score, total, percentage, passed, (SELECT COUNT(*)::int FROM swing_quiz_attempts counted WHERE ${studentTextMatchSql("counted.student_id", 1, 2, 3)} AND counted.assessment_id = 'swing_assessment_' || sl.sequence) AS attempt_count
                                    FROM swing_quiz_attempts
                                    WHERE ${studentTextMatchSql("student_id", 1, 2, 3)} AND (lesson_id = sl.id OR lesson_id = REPLACE(sl.id, 'swing_lesson_', ''))
                                    ORDER BY attempt_number DESC, date_completed DESC
                                    LIMIT 1
                                ) qa ON TRUE
                                LEFT JOIN LATERAL (
                                    SELECT MAX(score) AS submission_score
                                    FROM swing_submissions
                                    WHERE ${studentTextMatchSql("student_id", 1, 2, 3)}
                                        AND exercise_id IN (SELECT id FROM swing_programming_exercises WHERE lesson_id = sl.id)
                                ) ss ON TRUE
                                ORDER BY sl.sequence, sl.title
                        `, [dbStudentId, targetUserId, targetEmail])
        ]);
        failureStage = "history_timeline_queries";
        const [assessmentHistoryResult, activityTimelineResult] = await Promise.all([
            pool.query(`
                SELECT qa.id, qa.lesson_id, qa.assessment_id, qa.percentage, qa.passed,
                       qa.attempt_number, qa.date_completed, COALESCE(l.title, qa.assessment_id) AS lesson_title
                FROM quiz_attempts qa
                LEFT JOIN lessons l ON l.id = qa.lesson_id
                WHERE ${studentUuidMatchSql("qa.student_user_id", 1, 2, 3)} AND qa.assessment_id <> 'oop_pre_test'
                ORDER BY qa.date_completed DESC, qa.attempt_number DESC
                LIMIT 50
            `, [dbStudentId, targetUserId, targetEmail]),
            pool.query(`
                SELECT id, 'video' AS type,
                       CASE WHEN completed OR completion_percentage >= 95 THEN 'Completed video' ELSE 'Updated video progress' END AS detail,
                       video_id AS lesson_id, updated_at AS timestamp
                FROM student_progress
                WHERE ${studentUuidMatchSql("student_user_id", 1, 2, 3)}
                UNION ALL
                SELECT qa.id, 'assessment' AS type,
                       'Completed assessment with ' || ROUND(qa.percentage)::text || '%' AS detail,
                       qa.lesson_id, qa.date_completed AS timestamp
                FROM quiz_attempts qa
                WHERE ${studentUuidMatchSql("qa.student_user_id", 1, 2, 3)} AND qa.assessment_id <> 'oop_pre_test'
                UNION ALL
                SELECT ps.id, 'practice' AS type,
                       'Submitted practice code' AS detail,
                       pc.lesson_id, ps.submitted_at AS timestamp
                FROM practice_submissions ps
                JOIN programming_challenges pc ON pc.id = ps.challenge_id
                WHERE ${studentTextMatchSql("ps.student_id", 1, 2, 3)}
                ORDER BY timestamp DESC
                LIMIT 30
            `, [dbStudentId, targetUserId, targetEmail])
        ]);
        const row = { ...course.rows[0], ...videos.rows[0], ...quizzes.rows[0], ...practice.rows[0], ...swing.rows[0] };
        const totalLessons = Number(row.total_lessons || 0);
        const totalVideos = Number(row.total_videos || totalLessons);
        const submittedPracticeActivities = Number(row.submitted_practice_activities || 0);
        const totalPracticeActivities = Number(row.total_practice_activities || 0);
        failureStage = "oop_topics_evidence_mapping";
        const oopTopicRows = await Promise.all(oopTopics.rows.map(async topic => {
            let accessState = { canAccess: false, reason: null, current: null };
            try {
                accessState = await getLessonAccessState(dbStudentId, topic.id);
            } catch (accErr) {
                console.warn(`Failed to get lesson access state for ${topic.id}:`, accErr.message);
            }
            const evidence = accessState.current;
            return {
                id: topic.id,
                title: topic.title,
                sequence: Number(topic.sequence || 0),
                attempted: Boolean(topic.attempted),
                videoPercentage: topic.video_percentage === null ? null : Number(topic.video_percentage),
                videoCompleted: Boolean(topic.video_completed),
                quizPercentage: topic.quiz_percentage === null ? null : Number(topic.quiz_percentage),
                quizAttemptCount: Number(topic.attempt_count || 0),
                quizPassed: topic.quiz_passed === null ? null : Boolean(topic.quiz_passed),
                practiceScore: topic.practice_score === null ? null : Number(topic.practice_score),
                practiceCompleted: Boolean(evidence?.practiceCompleted),
                practiceSubmitted: Boolean(evidence?.practiceSubmitted || evidence?.practiceCompleted || topic.practice_score !== null),
                practice_submitted: Boolean(evidence?.practice_submitted || evidence?.practiceCompleted || topic.practice_score !== null),
                lessonUnlocked: Boolean(accessState.canAccess),
                assessmentUnlocked: Boolean(accessState.canAccess && evidence?.assessmentUnlocked),
                practiceUnlocked: Boolean(accessState.canAccess && evidence?.practiceUnlocked),
                accessReason: accessState.reason,
                lessonProgress: Math.min(100, Math.max(0, Math.round((
                    (Math.min(100, Math.max(0, Number(topic.video_percentage || 0)) / 95 * 100) / 100) +
                    (evidence?.assessmentPassed ? 1 : 0) +
                    (evidence?.practiceCompleted ? 1 : 0)
                ) / 3 * 100))),
                lessonCompleted: Boolean(evidence?.completed)
            };
        }));

        const oopComplete = oopCompletion.oopComplete;
        failureStage = "swing_topics_evidence_mapping";
        const swingTopicRows = await Promise.all(swingTopics.rows.map(async topic => {
            let accessState = { canAccess: false, reason: null, current: null };
            try {
                accessState = await getLessonAccessState(dbStudentId, topic.id);
            } catch (accErr) {
                console.warn(`Failed to get swing access state for ${topic.id}:`, accErr.message);
            }
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
        }));

        failureStage = "final_response_assembly";
        const totalCourseLessons = Math.max(1, (oopTopicRows.length + swingTopicRows.length));
        const completedOopLessons = oopTopicRows.filter(topic => topic.lessonCompleted).length;
        const completedSwingLessons = swingTopicRows.filter(topic => topic.lessonCompleted).length;
        const completedLessons = completedOopLessons + completedSwingLessons;
        const overallProgress = Math.min(100, Math.max(0, calculateTotalCourseProgress(completedLessons, totalCourseLessons)));

        const learningScore = Math.min(100, Math.max(0, Math.round((overallProgress * 0.40) + (Number(row.average_quiz_score || 0) * 0.30) + (Number(row.average_practice_score || 0) * 0.30))));
        const learningClassification = classifyLearningState({
            learningScore,
            quizScore: Number(row.average_quiz_score || 0),
            practiceScore: Number(row.average_practice_score || 0),
            completedLessons,
            totalLessons: totalCourseLessons
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
                totalLessons: totalCourseLessons,
                completedOopLessons,
                completedSwingLessons,
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
                swingTopics: swingTopicRows,
                assessmentHistory: assessmentHistoryResult.rows.map(attempt => ({
                    id: attempt.id,
                    lessonId: attempt.lesson_id || '',
                    lessonTitle: attempt.lesson_title || attempt.assessment_id,
                    assessmentId: attempt.assessment_id,
                    percentage: Number(attempt.percentage || 0),
                    passed: Number(attempt.percentage || 0) >= ASSESSMENT_PASSING_SCORE,
                    attemptNumber: Number(attempt.attempt_number || 0),
                    dateCompleted: attempt.date_completed
                })),
                activityTimeline: activityTimelineResult.rows.map(activity => ({
                    id: activity.id,
                    type: activity.type,
                    detail: activity.detail,
                    lessonId: activity.lesson_id || null,
                    timestamp: activity.timestamp
                }))
            }
        });
    } catch (error) {
        console.error(`[StudentResults:${requestId}] FAILED at stage "${failureStage}":`, {
            pgCode: error.code || null,
            message: error.message || "Unknown error",
            detail: error.detail || null,
            where: error.where || null
        });
        next(error);
    }
});

app.put("/api/progress", requireAuth, async (req, res, next) => {
    try {
        const { videoId, lessonId, lastPosition = 0, completionPercentage = 0, completed = false, notes = "" } = req.body || {};
        const idToValidate = videoId || lessonId;
        const videoIdCheck = validateId(idToValidate, "videoId", "PUT /api/progress");
        if (!videoIdCheck.valid) return res.status(videoIdCheck.status).json({ success: false, message: videoIdCheck.message });
        let safeVideoId = videoIdCheck.value;
        if (/^\d+$/.test(safeVideoId)) {
            safeVideoId = `oop_lesson_${safeVideoId}`;
        } else if (safeVideoId.startsWith("vid_")) {
            safeVideoId = safeVideoId.replace(/^vid_/, "");
        }

        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can update lesson progress." });
        }

        const safeLastPosition = clampNumber(lastPosition, 0, 60 * 60 * 6);
        const safeCompletionPercentage = clampNumber(completionPercentage, 0, 100);
        const safeCompleted = safeCompletionPercentage >= 95 || Boolean(completed);
        const safeNotes = cleanText(notes, 5000);
        const access = await getLessonAccessState(req.authUser.id, safeVideoId);
        if (!access.canAccess) {
            return res.status(403).json({ success: false, message: access.reason });
        }

        const previousProgress = await pool.query(
            "SELECT completion_percentage, completed FROM student_progress WHERE student_user_id = $1 AND (video_id = $2 OR video_id = REPLACE($2, 'oop_lesson_', ''))",
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

        // Get lesson duration and sync to video_progress or swing_progress
        const durationRes = await pool.query("SELECT duration FROM lessons WHERE id = $1", [safeVideoId]);
        if (durationRes.rowCount > 0) {
            let durationSeconds = 0;
            if (durationRes.rows[0].duration) {
                const parts = durationRes.rows[0].duration.split(':').map(Number);
                if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1];
                else if (parts.length === 3) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }

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
        } else if (safeVideoId.startsWith("swing_lesson_")) {
            await pool.query(`
                INSERT INTO swing_progress (student_id, lesson_id, video_completed, video_last_position, video_percentage)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (student_id, lesson_id) DO UPDATE SET
                  video_completed = swing_progress.video_completed OR EXCLUDED.video_completed,
                  video_last_position = GREATEST(swing_progress.video_last_position, EXCLUDED.video_last_position),
                  video_percentage = GREATEST(swing_progress.video_percentage, EXCLUDED.video_percentage),
                  updated_at = NOW()
            `, [req.authUser.id, safeVideoId, safeCompleted, safeLastPosition, safeCompletionPercentage]);
        }

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
        const studentIdCheck = validateId(req.params.studentId, "studentId", "GET /api/quiz-attempts/:studentId");
        if (!studentIdCheck.valid) return res.status(studentIdCheck.status).json({ success: false, message: studentIdCheck.message });
        const studentId = studentIdCheck.value;
        const userRow = await pool.query(
            "SELECT id, user_id, email FROM users WHERE id::text = $1 OR user_id = $1 OR LOWER(email) = LOWER($1) LIMIT 1",
            [studentId]
        );
        const resolvedId = userRow.rows[0]?.id || studentId;
        const resolvedUserId = userRow.rows[0]?.user_id || studentId;
        const resolvedEmail = userRow.rows[0]?.email || "";

        const isSelf = (req.authUser.id === resolvedId || req.authUser.userId === resolvedUserId);
        if (req.authUser.role === "student" && !isSelf) {
            return res.status(403).json({ success: false, message: "Students can only view their own quiz attempts." });
        }

        if (req.authUser.role === "teacher" && !isSelf) {
            const authorized = await isTeacherAuthorizedForStudent(pool, req.authUser.id, resolvedId);
            if (!authorized) {
                return res.status(403).json({ success: false, message: "You are not authorized to monitor this student." });
            }
        }
        const result = await pool.query(`
            WITH combined_attempts AS (
                SELECT
                    qa.id,
                    qa.student_user_id::text AS student_id,
                    qa.assessment_id,
                    qa.lesson_id,
                    qa.score,
                    qa.total,
                    ${normalizedAssessmentPercentageSql("qa")} AS percentage,
                    qa.correct_answers,
                    qa.incorrect_answers,
                    (${normalizedAssessmentPercentageSql("qa")} >= CASE WHEN qa.assessment_id = 'oop_pre_test' THEN ${PRE_TEST_PASSING_SCORE} ELSE ${ASSESSMENT_PASSING_SCORE} END) AS passed,
                    qa.attempt_number,
                    qa.answers,
                    qa.date_completed
                FROM quiz_attempts qa
                WHERE ${studentUuidMatchSql("qa.student_user_id", 1, 2, 3)}
                UNION ALL
                SELECT
                    sqa.id,
                    sqa.student_id,
                    sqa.assessment_id,
                    sqa.lesson_id,
                    sqa.score,
                    sqa.total,
                    ${normalizedAssessmentPercentageSql("sqa")} AS percentage,
                    sqa.correct_answers,
                    sqa.incorrect_answers,
                    (${normalizedAssessmentPercentageSql("sqa")} >= ${ASSESSMENT_PASSING_SCORE}) AS passed,
                    sqa.attempt_number,
                    sqa.answers,
                    sqa.date_completed
                FROM swing_quiz_attempts sqa
                WHERE ${studentTextMatchSql("sqa.student_id", 1, 2, 3)}
            )
            SELECT DISTINCT ON (assessment_id) *,
                   COUNT(*) OVER (PARTITION BY assessment_id)::int AS attempt_count
            FROM combined_attempts
            ORDER BY assessment_id, attempt_number DESC, date_completed DESC
        `, [resolvedId, resolvedUserId, resolvedEmail]);
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

        const assessmentIdCheck = validateId(assessmentId, "assessmentId", "POST /api/quiz-attempts");
        if (!assessmentIdCheck.valid) return res.status(assessmentIdCheck.status).json({ success: false, message: assessmentIdCheck.message });
        const safeAssessmentId = assessmentIdCheck.value;

        if (req.authUser.role !== "student") {
            return res.status(403).json({ success: false, message: "Only students can submit quiz attempts." });
        }

        let safeLessonId = "";
        if (lessonId !== undefined && lessonId !== null && String(lessonId).trim() !== "") {
            const lessonIdCheck = validateId(lessonId, "lessonId", "POST /api/quiz-attempts");
            if (!lessonIdCheck.valid) return res.status(lessonIdCheck.status).json({ success: false, message: lessonIdCheck.message });
            safeLessonId = lessonIdCheck.value;
        }

        const lessonAccess = await getLessonAccessState(req.authUser.id, safeLessonId);
        if (!lessonAccess.canAccess || !lessonAccess.current.videoCompleted) {
            return res.status(403).json({ success: false, message: lessonAccess.reason || "Complete the current lesson prerequisites before starting its assessment." });
        }

        const safeTotal = Math.max(1, Math.floor(clampNumber(total, 1, 100)));
        const safeScore = Math.floor(clampNumber(score, 0, safeTotal));
        const computedPercentage = Math.round(normalizeAssessmentPercentage({ score: safeScore, total: safeTotal }));
        const safeCorrectAnswers = Math.floor(clampNumber(correctAnswers, 0, safeTotal));
        const safeIncorrectAnswers = Math.floor(clampNumber(incorrectAnswers, 0, safeTotal));
        const attemptResult = await pool.query(
            "SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = $2",
            [req.authUser.id, safeAssessmentId]
        );
        const safeAttemptNumber = Number(attemptResult.rows[0]?.next_attempt || 1);
        const isSwingAssessment = safeAssessmentId.startsWith("swing_assessment_") || safeLessonId.startsWith("swing_lesson_");
        const attemptCountResult = await pool.query(
            isSwingAssessment
                ? "SELECT COUNT(*)::int AS attempt_count FROM swing_quiz_attempts WHERE student_id = $1 AND assessment_id = $2"
                : "SELECT COUNT(*)::int AS attempt_count FROM quiz_attempts WHERE student_user_id = $1 AND assessment_id = $2",
            [req.authUser.id, safeAssessmentId]
        );
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
        const safeVideoCompleted = safeVideoPercentage >= VIDEO_COMPLETION_THRESHOLD || Boolean(videoCompleted);
        const access = await getLessonAccessState(req.authUser.id, lessonId);
        if (!access.canAccess) return res.status(403).json({ success: false, message: access.reason });

        const result = await pool.query(
            'INSERT INTO swing_progress (student_id, lesson_id, video_completed, content_completed, overall_percentage, video_last_position, video_percentage) VALUES ($1, $2, $3, COALESCE($4, FALSE), COALESCE($5, 0), $6, $7) ON CONFLICT (student_id, lesson_id) DO UPDATE SET video_completed = swing_progress.video_completed OR EXCLUDED.video_completed, content_completed = swing_progress.content_completed OR EXCLUDED.content_completed, overall_percentage = GREATEST(swing_progress.overall_percentage, EXCLUDED.overall_percentage), video_last_position = GREATEST(swing_progress.video_last_position, EXCLUDED.video_last_position), video_percentage = GREATEST(swing_progress.video_percentage, EXCLUDED.video_percentage), updated_at = NOW() RETURNING *',
            [req.authUser.id, lessonId, safeVideoCompleted, contentCompleted, overallPercentage, safeLastPosition, safeVideoPercentage]
        );

        // Also sync to student_progress
        await pool.query(`
            INSERT INTO student_progress (student_user_id, video_id, last_position, completion_percentage, completed, date_completed)
            VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN NOW() ELSE NULL END)
            ON CONFLICT (student_user_id, video_id) DO UPDATE SET
              last_position = GREATEST(student_progress.last_position, EXCLUDED.last_position),
              completion_percentage = GREATEST(student_progress.completion_percentage, EXCLUDED.completion_percentage),
              completed = student_progress.completed OR EXCLUDED.completed OR GREATEST(student_progress.completion_percentage, EXCLUDED.completion_percentage) >= 95,
              date_completed = CASE WHEN student_progress.completed THEN student_progress.date_completed WHEN EXCLUDED.completed THEN NOW() ELSE student_progress.date_completed END,
              updated_at = NOW()
        `, [req.authUser.id, lessonId, safeLastPosition, safeVideoPercentage, safeVideoCompleted]);

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
             WHERE sequence > (
               SELECT sequence FROM swing_lessons WHERE id = $1
             )
             ORDER BY sequence ASC, id ASC
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
        } else if (req.authUser.role === "teacher") {
            if (requestedStudentId) {
                const authorized = await isTeacherAuthorizedForStudent(pool, req.authUser.id, requestedStudentId);
                if (!authorized) {
                    return res.status(403).json({ success: false, message: "You are not authorized to view recommendations for this student." });
                }
                params.push(requestedStudentId);
                where = "WHERE student_id = $1";
            } else {
                params.push(req.authUser.id);
                where = `WHERE EXISTS (
                    SELECT 1 FROM monitoring_requests mr
                    JOIN users u ON u.id = mr.student_id
                    WHERE mr.teacher_id = $1
                      AND mr.status = 'accepted'
                      AND recommendation_history.student_id IN (u.id::text, u.user_id, u.email)
                )`;
            }
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
            cleanText(req.authUser.id, 160), // Enforce authenticated student ID
            cleanText(req.authUser.name || recommendation.studentName || "", 255),
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
        let whereAuth = "WHERE id = $1";
        const params = [req.params.id];
        if (req.authUser.role === "student") {
            whereAuth += " AND student_id IN ($2, $3, $4)";
            params.push(req.authUser.id, req.authUser.userId, req.authUser.email);
        }
        const result = await pool.query(`
            UPDATE recommendation_history
            SET status = 'Completed', completed_at = NOW()
            ${whereAuth}
            RETURNING *
        `, params);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Recommendation not found." });
        res.json({ success: true, data: toClientRecommendation(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

app.get("/api/practice-challenges", requireAuth, async (req, res, next) => {
    try {
        const includeSwing = req.authUser?.role === "teacher" || req.query?.includeSwing === "true";
        const allowedIds = includeSwing
            ? [...ACTIVE_OOP_PRACTICE_IDS, ...JAVA_SWING_EXERCISES.map(ex => ex.id)]
            : ACTIVE_OOP_PRACTICE_IDS;
        const result = await pool.query(`
            SELECT c.*, COALESCE(json_agg(t.*) FILTER (WHERE t.id IS NOT NULL), '[]') AS test_cases
            FROM programming_challenges c
            LEFT JOIN challenge_test_cases t ON t.challenge_id = c.id
            WHERE c.status <> 'Archived' AND (
                c.id = ANY($1::text[])
                OR c.lesson_id NOT IN ('swing_lesson_1', 'swing_lesson_2', 'swing_lesson_3', 'swing_lesson_4', 'swing_lesson_5')
                OR $2::boolean = true
            )
            GROUP BY c.id
            ORDER BY c.sequence ASC NULLS LAST, c.id ASC
        `, [allowedIds, includeSwing]);
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
            challenge = PRACTICE_CHALLENGES.find(c => c.id === challengeId)
                || JAVA_SWING_EXERCISES.find(c => c.id === challengeId)
                || null;
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

app.put("/api/practice-challenges/:id", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    const client = await pool.connect();
    try {
        const body = req.body || {};
        await client.query("BEGIN");
        let result = await client.query(`
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
        const resolvedLessonId = cleanText(body.lessonId || body.lesson_id || "", 120);
        if (!result.rowCount && resolvedLessonId) {
            result = await client.query(`
                INSERT INTO programming_challenges (
                  id, topic_id, lesson_id, title, description, learning_objectives,
                  requirements, starter_code, sample_input, sample_output, passing_score, status, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (id) DO UPDATE SET
                  topic_id = EXCLUDED.topic_id,
                  lesson_id = EXCLUDED.lesson_id,
                  title = EXCLUDED.title,
                  description = EXCLUDED.description,
                  learning_objectives = EXCLUDED.learning_objectives,
                  requirements = EXCLUDED.requirements,
                  starter_code = EXCLUDED.starter_code,
                  sample_input = EXCLUDED.sample_input,
                  sample_output = EXCLUDED.sample_output,
                  passing_score = EXCLUDED.passing_score,
                  status = EXCLUDED.status,
                  updated_at = NOW()
                RETURNING *
            `, [
                req.params.id,
                cleanText(body.topicId || body.topic_id || (isSwingLessonId(resolvedLessonId) ? "java_swing" : "oop"), 120),
                resolvedLessonId,
                cleanText(body.title || "Practice Activity", 255),
                cleanText(body.description || body.instructions || "", 5000),
                JSON.stringify(Array.isArray(body.learningObjectives) ? body.learningObjectives : []),
                JSON.stringify(Array.isArray(body.requirements) ? body.requirements : []),
                String(body.starterCode || body.starter_code || "").slice(0, 50000),
                String(body.sampleInput || body.sample_input || "").slice(0, 10000),
                String(body.sampleOutput || body.expectedOutput || body.sample_output || "").slice(0, 10000),
                clampNumber(body.passingScore ?? body.passing_score ?? 70, 0, 100),
                cleanText(body.status || "Published", 40),
                req.authUser.id
            ]);
        }
        if (!result.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Practice activity not found." });
        }
        if (isSwingLessonId(result.rows[0].lesson_id)) {
            await client.query(`
                UPDATE swing_programming_exercises SET
                  title = COALESCE($2, title),
                  instructions = COALESCE($3, instructions),
                  starter_code = COALESCE($4, starter_code),
                  updated_at = NOW()
                WHERE lesson_id = $1
            `, [
                result.rows[0].lesson_id,
                result.rows[0].title,
                result.rows[0].description,
                result.rows[0].starter_code
            ]);
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

app.get("/api/teacher/monitoring", requireAuth, requireRole(["teacher"]), async (req, res, next) => {
    try {
        const [students, teachers] = await Promise.all([
            pool.query(`
                WITH lesson_totals AS (
                    SELECT COUNT(*)::int AS total_lessons
                    FROM lessons
                    WHERE status <> 'Archived'
                      AND ${OOP_LESSON_FILTER_SQL}
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
                        WHEN pc.id IS NULL THEN FALSE
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
                      AND EXISTS (
                        SELECT 1 FROM monitoring_requests mr
                        WHERE mr.teacher_id = $1
                          AND mr.student_id = u.id
                          AND mr.status = 'accepted'
                      )
                      AND l.status <> 'Archived'
                      AND ${OOP_LESSON_ALIAS_FILTER_SQL("l")}
                ),
                student_metrics AS (
                    SELECT
                      le.student_id,
                      COUNT(*) FILTER (
                        WHERE le.video_percentage >= 95
                          AND le.assessment_passed
                          AND le.practice_completed
                      )::int AS completed_lessons,
                      LEAST(100, GREATEST(0, ROUND(AVG(le.video_percentage))))::int AS video_progress,
                      LEAST(100, GREATEST(0, ROUND(AVG((
                        LEAST(1.0, GREATEST(0.0, le.video_percentage::numeric / 95.0))
                        + CASE WHEN le.assessment_passed THEN 1.0 ELSE 0.0 END
                        + CASE WHEN le.practice_completed THEN 1.0 ELSE 0.0 END
                      ) / 3.0 * 100))))::int AS overall_progress
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
                      AND EXISTS (
                        SELECT 1 FROM monitoring_requests mr
                        WHERE mr.teacher_id = $1
                          AND mr.student_id = u.id
                          AND mr.status = 'accepted'
                      )
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
                    ELSE LEAST(100, GREATEST(0, COALESCE(sm.overall_progress, 0)))
                  END AS progress,
                  LEAST(100, GREATEST(0, COALESCE(sm.video_progress, 0))) AS video_progress,
                  LEAST(100, GREATEST(0, COALESCE(qm.quiz_average, 0))) AS quiz_average,
                  LEAST(100, GREATEST(0, COALESCE(pm.practice_average, 0))) AS programming_score,
                  LEAST(100, GREATEST(0, ROUND((
                    (LEAST(100, GREATEST(0, COALESCE(sm.overall_progress, 0))) * 0.40)
                    + (LEAST(100, GREATEST(0, COALESCE(qm.quiz_average, 0))) * 0.30)
                    + (LEAST(100, GREATEST(0, COALESCE(pm.practice_average, 0))) * 0.30)
                  ))))::int AS learning_score,
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
                  AND EXISTS (
                    SELECT 1 FROM monitoring_requests mr
                    WHERE mr.teacher_id = $1
                      AND mr.student_id = u.id
                      AND mr.status = 'accepted'
                  )
                GROUP BY u.id, s.student_number, s.course, s.year_level, s.section,
                         lt.total_lessons, sm.completed_lessons, sm.overall_progress, sm.video_progress,
                         qm.quiz_average, pm.practice_average,
                         la.type, la.action, la.lesson_id, la.lesson_title, la.lesson_sequence, la.timestamp
                ORDER BY u.created_at DESC
            `, [req.authUser.id]).catch(async error => {
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
                      AND EXISTS (
                        SELECT 1 FROM monitoring_requests mr
                        WHERE mr.teacher_id = $1
                          AND mr.student_id = u.id
                          AND mr.status = 'accepted'
                      )
                    ORDER BY u.created_at DESC
                `, [req.authUser.id]);
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

app.get("/api/practice-submissions", requireAuth, requireRole(["teacher", "student"]), async (req, res, next) => {
    try {
        if (req.authUser.role === "student") {
            const authenticatedStudentIds = [
                req.authUser.id,
                req.authUser.userId,
                req.authUser.user_id,
                req.authUser.email
            ].filter(Boolean);
            const result = await pool.query(`
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
                WHERE ps.student_id = ANY($1::text[])
                ORDER BY ps.submitted_at DESC
            `, [authenticatedStudentIds]);
            const submissions = result.rows.map(normalizeTeacherSubmission);
            return res.json({ success: true, data: submissions });
        }

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

        const catalogChallenge = PRACTICE_CHALLENGES.find(c => c.id === safeChallengeId) ||
            JAVA_SWING_EXERCISES.find(c => c.id === safeChallengeId);

        const prerequisite = await pool.query(`
            SELECT pc.*,
                   pc.id,
                   pc.lesson_id,
                   pc.title,
                   pc.title AS challenge_title,
                   pc.topic_id AS "topicId",
                   pc.sample_output AS "sampleOutput",
                   pc.passing_score
            FROM programming_challenges pc
            WHERE pc.id = $1 AND pc.status <> 'Archived'
        `, [safeChallengeId]);

        let challengeData = prerequisite.rowCount ? prerequisite.rows[0] : null;
        if (!challengeData && catalogChallenge) {
            challengeData = {
                ...catalogChallenge,
                id: catalogChallenge.id,
                title: catalogChallenge.title,
                challenge_title: catalogChallenge.title,
                topicId: catalogChallenge.topicId,
                sampleOutput: catalogChallenge.sampleOutput || "",
                passing_score: catalogChallenge.passingScore || 70,
                lesson_id: catalogChallenge.lessonId || catalogChallenge.lesson_id
            };
        } else if (challengeData && catalogChallenge) {
            challengeData = {
                ...catalogChallenge,
                ...challengeData,
                title: challengeData.title || catalogChallenge.title,
                challenge_title: challengeData.title || catalogChallenge.title,
                topicId: challengeData.topicId || challengeData.topic_id || catalogChallenge.topicId,
                sampleOutput: challengeData.sampleOutput || challengeData.sample_output || catalogChallenge.sampleOutput || "",
                passing_score: challengeData.passing_score || catalogChallenge.passingScore || 70,
                lesson_id: challengeData.lesson_id || catalogChallenge.lessonId || catalogChallenge.lesson_id
            };
        }

        if (!challengeData || !challengeData.lesson_id) {
            return res.status(404).json({ success: false, message: "Practice challenge not found." });
        }

        const studentUserRow = await pool.query(
            "SELECT id, user_id, email FROM users WHERE id::text = $1 OR user_id = $1 OR LOWER(email) = LOWER($1) LIMIT 1",
            [String(req.authUser.id || req.authUser.userId || req.authUser.email)]
        );
        const studentUuid = studentUserRow.rows[0]?.id || req.authUser.id;
        const studentUserId = studentUserRow.rows[0]?.user_id || req.authUser.userId || String(req.authUser.id);
        const studentEmail = studentUserRow.rows[0]?.email || req.authUser.email || "";

        const lessonAccess = await getLessonAccessState(studentUuid, challengeData.lesson_id);
        if (!lessonAccess.canAccess || !lessonAccess.current.videoCompleted) {
            return res.status(403).json({ success: false, message: "Pass the current lesson assessment before submitting practice." });
        }
        const lessonId = challengeData.lesson_id;
        const isSwing = String(lessonId).startsWith("swing_");
        const lessonSeqMatch = String(lessonId).match(/(\d+)$/);
        const lessonSeqStr = lessonSeqMatch ? lessonSeqMatch[1] : "";

        const assessmentResult = await pool.query(`
            SELECT qa.assessment_id, qa.lesson_id, qa.score, qa.total, qa.percentage, qa.correct_answers, qa.passed
            FROM quiz_attempts qa
            WHERE (qa.student_user_id::text = $1::text OR qa.student_user_id::text = $2 OR qa.student_user_id::text = $3)
              AND (
                qa.lesson_id = $4
                OR qa.assessment_id = 'oop_assessment_' || (SELECT sequence FROM lessons WHERE id = $4)
                OR ($5 <> '' AND qa.assessment_id = 'oop_assessment_' || $5)
                OR EXISTS (
                    SELECT 1 FROM assessments a
                    WHERE a.id = qa.assessment_id AND a.lesson_id = $4
                )
              )
            ORDER BY qa.attempt_number DESC, qa.date_completed DESC
        `, [studentUuid, studentUserId, studentEmail, lessonId, lessonSeqStr]);
        const databaseAssessmentIds = (await pool.query(
            "SELECT id FROM assessments WHERE lesson_id = $1",
            [lessonId]
        )).rows.map(row => row.id);
        const canonicalAssessmentId = `oop_assessment_${lessonSeqStr}`;
        const quizPassed = Boolean(lessonAccess.current?.assessmentPassed) || assessmentResult.rows.some(attempt => (
            attempt.passed === true ||
            (assessmentMatchesLesson({
                assessmentId: attempt.assessment_id,
                attemptLessonId: attempt.lesson_id,
                lessonId,
                canonicalAssessmentId,
                databaseAssessmentIds
            }) && normalizeAssessmentPercentage(attempt) >= ASSESSMENT_PASSING_SCORE)
        ));
        if (!quizPassed) {
            return res.status(403).json({ success: false, message: `Pass the required assessment with ${ASSESSMENT_PASSING_SCORE}% or higher before submitting practice.` });
        }

        let evalResult = {
            compileStatus: 'success',
            score: 100,
            programOutput: '',
            errorMessage: '',
            testResults: []
        };
        try {
            const validation = await evaluateJavaSubmission(challengeData, String(sourceCode));
            evalResult = {
                compileStatus: validation.compileStatus,
                score: validation.score,
                programOutput: validation.programOutput || '',
                errorMessage: validation.compilerError || '',
                testResults: buildEvaluationResults(validation, challengeData)
            };
        } catch (evalErr) {
            const staticCheck = validateBasicJavaStructure(challengeData, String(sourceCode));
            const passed = staticCheck.oopStructureCheck === 'passed';
            evalResult = {
                compileStatus: passed ? 'success' : 'failed',
                score: passed ? 100 : 0,
                programOutput: '',
                errorMessage: passed ? '' : (staticCheck.requirements.find(r => !r.passed)?.message || evalErr.message || 'Structural requirements not met'),
                testResults: staticCheck.requirements || []
            };
        }

        const result = await pool.query(`
            INSERT INTO practice_submissions (
              student_id, challenge_id, source_code, program_output, compile_status,
              runtime, memory_usage, score, error_message, test_results, is_locked, review_status
            )
            VALUES ($1, $2, $3, $4, $5, 0, NULL, $6, $7, $8::jsonb, FALSE, 'pending_review')
            RETURNING *
        `, [
            studentUuid,
            safeChallengeId,
            String(sourceCode).slice(0, 50000),
            evalResult.programOutput,
            evalResult.compileStatus,
            evalResult.score,
            evalResult.errorMessage,
            JSON.stringify(evalResult.testResults)
        ]);

        const practiceSuccess = evalResult.compileStatus === 'success' || Number(evalResult.score || 0) >= 70;
        if (isSwing) {
            await pool.query(`
                INSERT INTO swing_progress (student_id, lesson_id, exercise_completed)
                VALUES ($1, $2, $3)
                ON CONFLICT (student_id, lesson_id) DO UPDATE SET
                  exercise_completed = swing_progress.exercise_completed OR EXCLUDED.exercise_completed,
                  updated_at = NOW()
            `, [studentUuid, lessonId, practiceSuccess]);
        } else {
            await pool.query(`
                INSERT INTO lesson_progress (student_id, lesson_id, practice_completed, practice_submitted, updated_at)
                VALUES ($1, $2, $3, TRUE, NOW())
                ON CONFLICT (student_id, lesson_id) DO UPDATE SET
                  practice_completed = lesson_progress.practice_completed OR EXCLUDED.practice_completed,
                  practice_submitted = TRUE,
                  updated_at = NOW()
            `, [studentUuid, lessonId, practiceSuccess]);
        }

        await logActivity(
            studentUuid,
            "practice_submitted",
            `Submitted practice for ${challengeData.challenge_title || safeChallengeId}`,
            {
                lessonId: challengeData.lesson_id || null,
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
                    [studentUuid]
                );
                for (const teacher of teachers.rows) {
                    const notification = await createOrUpdateNotification(notificationClient, {
                        recipientUserId: teacher.teacher_id,
                        type: "new_practice_submission",
                        title: "New Practice Submission",
                        message: (studentEmail || req.authUser.email || "A student") + " submitted " + (challengeData.challenge_title || safeChallengeId) + " practice.",
                        relatedSubmissionId: result.rows[0].id,
                        relatedPracticeId: safeChallengeId,
                        practiceTitle: challengeData.challenge_title || safeChallengeId,
                        grade: null,
                        maxGrade: 100,
                        metadata: { studentId: studentUuid, studentEmail: studentEmail || req.authUser.email || "" }
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

        try {
            await verifyLessonCompletion(studentUuid, challengeData.lesson_id);
        } catch (verErr) {
            console.warn("verifyLessonCompletion warning:", verErr.message);
        }

        let updatedLessonAccess = { canAccess: true, current: {} };
        try {
            updatedLessonAccess = await getLessonAccessState(studentUuid, challengeData.lesson_id);
        } catch (accErr) {
            console.warn("getLessonAccessState warning:", accErr.message);
        }

        let nextLessonId = null;
        try {
            if (!isSwing) {
                const nextLessonResult = await pool.query(
                    `SELECT id FROM lessons
                     WHERE sequence > (
                       SELECT sequence FROM lessons WHERE id = $1
                     ) AND status <> 'Archived'
                       AND ${OOP_LESSON_FILTER_SQL}
                     ORDER BY sequence ASC, id ASC
                     LIMIT 1`,
                    [challengeData.lesson_id]
                );
                if (nextLessonResult.rowCount) {
                    nextLessonId = nextLessonResult.rows[0].id;
                } else {
                    const oopStatus = await getOOPCompletionStatus(studentUuid);
                    if (oopStatus.oopComplete) {
                        const firstSwing = await pool.query(
                            `SELECT id FROM swing_lessons ORDER BY sequence ASC, id ASC LIMIT 1`
                        );
                        if (firstSwing.rowCount) {
                            nextLessonId = firstSwing.rows[0].id;
                        } else if (JAVA_SWING_LESSONS.length > 0) {
                            nextLessonId = JAVA_SWING_LESSONS[0].id;
                        }
                    }
                }
            } else {
                const nextSwing = await pool.query(
                    `SELECT id FROM swing_lessons
                     WHERE sequence > (
                       SELECT sequence FROM swing_lessons WHERE id = $1
                     )
                     ORDER BY sequence ASC, id ASC
                     LIMIT 1`,
                    [challengeData.lesson_id]
                );
                if (nextSwing.rowCount) nextLessonId = nextSwing.rows[0].id;
            }
        } catch (nextErr) {
            console.warn("nextLesson determination warning:", nextErr.message);
        }

        let nextLessonAccess = null;
        if (nextLessonId) {
            try {
                nextLessonAccess = await getLessonAccessState(studentUuid, nextLessonId);
            } catch (nextAccErr) {
                console.warn("nextLessonAccess warning:", nextAccErr.message);
            }
        }

        res.status(201).json({
            success: true,
            data: {
                ...result.rows[0],
                submissionId: result.rows[0].id,
                lessonId: challengeData.lesson_id,
                practiceSubmitted: true,
                practice_submitted: true,
                passed: Boolean(updatedLessonAccess.current?.practiceCompleted),
                practiceCompleted: Boolean(updatedLessonAccess.current?.practiceCompleted),
                lessonCompleted: Boolean(updatedLessonAccess.current?.completed),
                lessonAccess: updatedLessonAccess.current,
                nextLessonAccess: nextLessonAccess?.current || null,
                nextLessonUnlocked: Boolean(nextLessonAccess?.canAccess),
                canRetry: false,
                editorLocked: false,
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
        if (err.code) {
            console.error(`PostgreSQL Error Code: ${err.code}`);
        }
        if (err.position) {
            console.error(`PostgreSQL Error Position: ${err.position}`);
        }
        console.error(err);
        process.exit(1);
    });
}

module.exports = {
    app,
    initializeDatabase,
    seedLessons,
    seedPracticeChallenges,
    fetchOrderedLessonRows,
    getLessonContent,
    getLessonEvidence,
    getOOPCompletionStatus,
    getSwingCompletionStatus,
    getLessonAccessState,
    resetLessonAssessmentAndVideo
};




