import dotenv from 'dotenv';
dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const API_PORT = Number(process.env.API_PORT || process.env.PORT || 5000);
export const JWT_SECRET = process.env.JWT_SECRET || 'change-this-local-development-secret';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const PGHOST = process.env.PGHOST || 'localhost';
export const PGPORT = Number(process.env.PGPORT || 5432);
export const PGDATABASE = process.env.PGDATABASE || 'oop_pedagogical_hub';
export const PGUSER = process.env.PGUSER || 'postgres';
export const PGPASSWORD = process.env.PGPASSWORD || '';

export function validateEnv() {
  const errors: string[] = [];
  if (NODE_ENV === 'production' && JWT_SECRET === 'change-this-local-development-secret') {
    errors.push('JWT_SECRET must be set to a strong secret in production.');
  }
  if (!DATABASE_URL && !PGPASSWORD) {
    errors.push('Set DATABASE_URL or PGPASSWORD/PGUSER/PGDATABASE/PGHOST/PGPORT for PostgreSQL.');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
