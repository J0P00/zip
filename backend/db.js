require("dotenv").config();

const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/oophub";
const isCloudDb = databaseUrl.includes("neon.tech") || 
                  databaseUrl.includes("supabase") || 
                  databaseUrl.includes("render.com") || 
                  databaseUrl.includes("amazonaws.com") ||
                  databaseUrl.includes("sslmode=require");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
});

module.exports = pool;