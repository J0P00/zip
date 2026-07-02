require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
        }
        : {
            host: process.env.DB_HOST || process.env.PGHOST,
            port: process.env.DB_PORT || process.env.PGPORT || 5432,
            user: process.env.DB_USER || process.env.PGUSER,
            password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
            database: process.env.DB_NAME || process.env.PGDATABASE,
            ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
        }
);

module.exports = pool;
