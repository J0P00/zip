const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const buildUserId = (email, role) => {
    const seed = String(email)
        .trim()
        .toLowerCase()
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `${String(role).slice(0, 3).toUpperCase()}-${String(seed).padStart(4, "0")}`;
};

const toClientUser = (row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    accountSource: row.account_source || "custom",
    registrationDate: row.created_at,
    accountStatus: row.account_status || "Active",
    studentNumber: row.student_number || "",
    course: row.course || "",
    yearLevel: row.year_level || "",
    section: row.section || "",
    employeeId: row.employee_id || "",
    department: row.department || "",
    specialization: row.specialization || "",
    assignedCourses: row.assigned_courses || "",
    termsAgreementAccepted: row.terms_agreement_accepted || false,
    termsAcceptedAt: row.terms_accepted_at || "",
    termsVersion: row.terms_version || ""
});

const findUserByEmail = async (email) => {
    const result = await pool.query(`
        SELECT u.*, s.student_number, s.course, s.year_level, s.section,
               t.employee_id, t.department, t.specialization, t.assigned_courses
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
        WHERE LOWER(u.email) = LOWER($1)
    `, [email]);
    return result.rows[0] || null;
};

const signToken = (user) => jwt.sign(
    { id: user.id, userId: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
);

const register = async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, email, password, role, studentNumber, course, yearLevel, section, employeeId, termsVersion } = req.body || {};

        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: "Name, email, password, and role are required." });
        }

        if (await findUserByEmail(email)) {
            return res.status(409).json({ success: false, message: "An account is already registered with this email address." });
        }

        await client.query("BEGIN");
        const passwordHash = await bcrypt.hash(password, 12);
        const userResult = await client.query(`
            INSERT INTO users (user_id, name, email, password_hash, role, terms_agreement_accepted, terms_accepted_at, terms_version)
            VALUES ($1, $2, LOWER($3), $4, $5, TRUE, NOW(), $6)
            RETURNING *
        `, [buildUserId(email, role), name, email, passwordHash, role, termsVersion || "2026.06.26"]);
        const user = userResult.rows[0];

        if (role === "student") {
            await client.query(`
                INSERT INTO students (user_id, student_number, course, year_level, section, program_status)
                VALUES ($1, $2, $3, $4, $5, 'Regular')
            `, [user.id, studentNumber || user.user_id, course || "", yearLevel || "", section || ""]);
        }
        if (role === "teacher") {
            await client.query(`
                INSERT INTO teachers (user_id, employee_id, department, specialization, assigned_courses)
                VALUES ($1, $2, 'College of Computer Studies', 'Object-Oriented Programming', 'OOP 101, Advanced Java')
            `, [user.id, employeeId || user.user_id]);
        }

        await client.query("COMMIT");
        const fullUser = await findUserByEmail(email);
        res.status(201).json({
            success: true,
            message: "Account registered successfully.",
            token: signToken(fullUser),
            user: toClientUser(fullUser)
        });
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const user = await findUserByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        res.json({
            success: true,
            message: "Login successful.",
            token: signToken(user),
            user: toClientUser(user)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    register,
    login,
};
