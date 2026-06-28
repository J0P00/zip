import pg from 'pg';
import type { QueryResultRow } from 'pg';
import { DATABASE_URL, PGDATABASE, PGHOST, PGPASSWORD, PGPORT, PGUSER } from '../env';

const { Pool } = pg;

export const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL
      }
    : {
        host: PGHOST,
        port: PGPORT,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD
      }
);

export const query = <T extends QueryResultRow = any>(text: string, params: any[] = []) => pool.query<T>(text, params);
