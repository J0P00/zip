const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
let diagnosticsPromise;

const executableName = (name) => process.platform === "win32" ? `${name}.exe` : name;

const candidatePaths = (name) => {
    const candidates = [];
    if (process.env.JAVA_HOME) {
        candidates.push(path.join(process.env.JAVA_HOME, "bin", executableName(name)));
    }
    candidates.push(name);
    return candidates;
};

const runVersion = async (executable) => {
    try {
        const result = await execFileAsync(executable, ["-version"], {
            timeout: 5000,
            windowsHide: true,
            maxBuffer: 32 * 1024
        });
        return String(result.stdout || result.stderr || "").trim();
    } catch (error) {
        if (error.code === "ENOENT") return null;
        const output = String(error.stdout || error.stderr || "").trim();
        if (output) return output;
        throw error;
    }
};

const findOnPath = async (name) => {
    const locator = process.platform === "win32" ? "where" : "which";
    try {
        const result = await execFileAsync(locator, [name], { timeout: 5000, windowsHide: true });
        return String(result.stdout || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null;
    } catch {
        return null;
    }
};

const resolveExecutable = async (name) => {
    const pathCandidate = await findOnPath(name);
    const candidates = pathCandidate
        ? [pathCandidate, ...candidatePaths(name)]
        : candidatePaths(name);
    for (const candidate of [...new Set(candidates)]) {
        const version = await runVersion(candidate);
        if (version) {
            return { path: candidate, version };
        }
    }
    return null;
};

const getJavaToolchainDiagnostics = () => {
    if (!diagnosticsPromise) {
        diagnosticsPromise = Promise.all([
            resolveExecutable("java"),
            resolveExecutable("javac")
        ]).then(([java, javac]) => ({
            available: Boolean(java && javac),
            javaAvailable: Boolean(java),
            javacAvailable: Boolean(javac),
            javaVersion: java?.version || null,
            javacVersion: javac?.version || null,
            javaPath: java?.path || null,
            javacPath: javac?.path || null,
            javaHome: process.env.JAVA_HOME || null,
            platform: os.platform(),
            arch: os.arch()
        })).catch((error) => ({
            available: false,
            javaAvailable: false,
            javacAvailable: false,
            javaVersion: null,
            javacVersion: null,
            javaPath: null,
            javacPath: null,
            javaHome: process.env.JAVA_HOME || null,
            platform: os.platform(),
            arch: os.arch(),
            diagnosticError: String(error.message || error)
        }));
    }
    return diagnosticsPromise;
};

const assertJavaToolchain = async () => {
    const diagnostics = await getJavaToolchainDiagnostics();
    if (!diagnostics.available) {
        const error = new Error("The backend Java toolchain is unavailable. Configure a full JDK with both java and javac.");
        error.code = "JAVA_COMPILER_UNAVAILABLE";
        error.diagnostics = diagnostics;
        throw error;
    }
    return diagnostics;
};

module.exports = {
    assertJavaToolchain,
    getJavaToolchainDiagnostics
};
