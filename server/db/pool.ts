const pg = require('pg');
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

export const query = <T = any>(text: string, params: any[] = []) =>
  (pool as any).query(text, params) as Promise<T>;

