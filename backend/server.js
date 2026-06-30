const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend Running");
});

// GET all lessons
app.get("/lessons", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM lessons");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});