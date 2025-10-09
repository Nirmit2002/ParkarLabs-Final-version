/**
 * Minimal DB helper for ParkarLabs
 * Exports:
 *   - query(text, params)
 *   - getClient()  // to run BEGIN/COMMIT/ROLLBACK via client
 *   - closePool()
 *   - testConnection()
 *
 * Adjust PG connection via env vars: DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.PGDATABASE ? undefined : process.env.DATABASE_URL,
  // If you prefer explicit settings (uncomment and edit):
  // host: process.env.PGHOST,
  // user: process.env.PGUSER,
  // password: process.env.PGPASSWORD,
  // database: process.env.PGDATABASE,
  // port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
  // max: 10,
  // idleTimeoutMillis: 30000,
});

async function query(text, params = []) {
  return pool.query(text, params);
}

// Returns a client for manual transaction control:
// const client = await getClient();
// await client.query('BEGIN');
// try { ... await client.query(...); await client.query('COMMIT'); } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
async function getClient() {
  const client = await pool.connect();
  return client;
}

async function closePool() {
  try {
    await pool.end();
  } catch (err) {
    console.error('Error closing DB pool', err);
  }
}

async function testConnection() {
  try {
    const res = await pool.query('SELECT 1 as ok');
    return res && res.rowCount === 1;
  } catch (err) {
    console.error('DB testConnection failed', err.message || err);
    return false;
  }
}

module.exports = {
  query,
  getClient,
  closePool,
  testConnection,
  pool,
};
