const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
    res.send("Backend Running");
});

// Database Test Route
app.get("/api/test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get All Lessons
app.get("/lessons", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM lessons");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

// Hello Route
app.get("/hello", (req, res) => {
    res.send("Hello World");
});

// Test PostgreSQL Connection
pool.connect()
    .then(() => {
        console.log("✅ PostgreSQL Connected Successfully!");
    })
    .catch((err) => {
        console.error("❌ PostgreSQL Connection Failed");
        console.error(err.message);
    });

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});