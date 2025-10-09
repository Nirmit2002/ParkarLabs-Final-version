// config/database.js
require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'parkarlabs_dev',
  user: process.env.PGUSER || 'dev_user',
  password: process.env.PGPASSWORD || 'temp123',
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
};

// Query helper function
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed:', { text: text.substring(0, 50) + '...', duration: `${duration}ms`, rows: result.rowCount });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('❌ Query error:', { text: text.substring(0, 50) + '...', duration: `${duration}ms`, error: error.message });
    throw error;
  }
};

// Get database connection
const getPool = () => pool;

// Close all connections
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔌 Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
};

module.exports = {
  pool,
  query,
  getPool,
  testConnection,
  closePool,
  dbConfig
};
