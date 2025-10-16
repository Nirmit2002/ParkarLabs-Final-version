// scripts/export-full-database.js
// Export complete database including schema and data
const { query } = require('../backend/config/database');
const fs = require('fs');
const path = require('path');

// Tables to export in order (respecting foreign key dependencies)
const tables = [
  'roles',
  'container_statuses',
  'users',
  'local_auth',
  'sessions',
  'ssh_keys',
  'courses',
  'containers',
  'assignments',
  'audit_logs'
];

async function getTableSchema(tableName) {
  const schemaQuery = `
    SELECT
      'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
      string_agg(
        column_name || ' ' || data_type ||
        CASE
          WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
          WHEN numeric_precision IS NOT NULL THEN '(' || numeric_precision || ',' || numeric_scale || ')'
          ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        ', '
      ) || ');' as create_statement
    FROM information_schema.columns
    WHERE table_name = $1
    GROUP BY table_name;
  `;

  const result = await query(schemaQuery, [tableName]);
  return result.rows[0]?.create_statement || '';
}

async function exportFullDatabase() {
  try {
    console.log('Starting full database export (schema + data)...\n');

    const exportDir = path.join(__dirname, '../db/backup');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    let sqlOutput = `-- ParkarLabs Complete Database Backup
-- Generated on: ${new Date().toISOString()}
-- Includes: Schema + Data
--
-- To restore on new server:
--   1. Create database: sudo -u postgres psql -c "CREATE DATABASE parkarlabs_db;"
--   2. Import: sudo -u postgres psql -d parkarlabs_db -f parkarlabs_backup.sql

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS containers CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS ssh_keys CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS local_auth CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS container_statuses CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

`;

    // Create schema
    console.log('Exporting database schema...');

    sqlOutput += `
-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create container_statuses table
CREATE TABLE IF NOT EXISTS container_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    azure_ad_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    status VARCHAR(50) DEFAULT 'active',
    provisioning_pref JSONB,
    profile_pic VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create local_auth table
CREATE TABLE IF NOT EXISTS local_auth (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50),
    provider_account_id VARCHAR(255),
    meta JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create ssh_keys table
CREATE TABLE IF NOT EXISTS ssh_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create containers table
CREATE TABLE IF NOT EXISTS containers (
    id SERIAL PRIMARY KEY,
    owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    docker_id VARCHAR(255),
    image VARCHAR(255),
    status_id INTEGER REFERENCES container_statuses(id),
    ports JSONB,
    environment JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'assigned',
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(100),
    meta JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

`;

    console.log('✓ Schema exported\n');

    // Export data
    for (const table of tables) {
      console.log(`Exporting data from table: ${table}...`);

      const result = await query(`SELECT * FROM ${table} ORDER BY id`);

      if (result.rows.length === 0) {
        console.log(`  ⚠ Table ${table} is empty, skipping...`);
        sqlOutput += `-- Table ${table} is empty\n\n`;
        continue;
      }

      sqlOutput += `\n-- Data for table: ${table} (${result.rows.length} rows)\n`;

      const columns = Object.keys(result.rows[0]);

      for (const row of result.rows) {
        const values = columns.map(col => {
          const value = row[col];

          if (value === null) return 'NULL';
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (typeof value === 'number') return value;
          if (value instanceof Date) return `'${value.toISOString()}'`;
          if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;

          return `'${String(value).replace(/'/g, "''")}'`;
        });

        sqlOutput += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }

      console.log(`  ✓ Exported ${result.rows.length} rows from ${table}`);
    }

    // Reset sequences
    sqlOutput += `\n-- Reset sequences to continue from max id\n`;
    for (const table of tables) {
      sqlOutput += `SELECT setval('${table}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ${table}), true);\n`;
    }

    // Write to file
    const outputFile = path.join(exportDir, 'parkarlabs_backup.sql');
    fs.writeFileSync(outputFile, sqlOutput);

    console.log(`\n✅ Complete database export finished!`);
    console.log(`📁 Backup file: ${outputFile}`);
    console.log(`📊 File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Export error:', error);
    process.exit(1);
  }
}

exportFullDatabase();
