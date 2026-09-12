import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zigma_technologies',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/** True when MySQL is down / unreachable (e.g. GitHub Actions CI build with no DB). */
export function isDbUnavailableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; errno?: number; errors?: unknown[] };
  if (
    e.code === 'ECONNREFUSED' ||
    e.code === 'ENOTFOUND' ||
    e.code === 'ETIMEDOUT' ||
    e.code === 'ECONNRESET' ||
    e.code === 'EPIPE'
  ) {
    return true;
  }
  // Misconfigured CI env — allow artifact build without a reachable DB
  if (
    (e.code === 'ER_ACCESS_DENIED_ERROR' || e.code === 'ER_BAD_DB_ERROR') &&
    (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true')
  ) {
    return true;
  }
  if (Array.isArray(e.errors)) {
    return e.errors.some((inner) => isDbUnavailableError(inner));
  }
  return false;
}

export default pool;
