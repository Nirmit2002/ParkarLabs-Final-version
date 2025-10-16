// scripts/export-database.js
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

async function exportDatabase() {
  try {
    console.log('Starting database export...\n');

    const exportDir = path.join(__dirname, '../db/backup');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    let sqlOutput = `-- ParkarLabs Database Backup
-- Generated on: ${new Date().toISOString()}
--
-- This file contains the complete database schema and data
-- To restore, run: psql -U postgres -d parkarlabs_db -f parkarlabs_backup.sql

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`;

    for (const table of tables) {
      console.log(`Exporting table: ${table}...`);

      // Get table data
      const result = await query(`SELECT * FROM ${table} ORDER BY id`);

      if (result.rows.length === 0) {
        console.log(`  ⚠ Table ${table} is empty, skipping...`);
        sqlOutput += `-- Table ${table} is empty\n\n`;
        continue;
      }

      sqlOutput += `-- Data for table: ${table}\n`;
      sqlOutput += `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;\n`;

      // Get column names
      const columns = Object.keys(result.rows[0]);

      for (const row of result.rows) {
        const values = columns.map(col => {
          const value = row[col];

          if (value === null) return 'NULL';
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (typeof value === 'number') return value;
          if (value instanceof Date) return `'${value.toISOString()}'`;
          if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;

          // Escape single quotes in strings
          return `'${String(value).replace(/'/g, "''")}'`;
        });

        sqlOutput += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }

      sqlOutput += `\n`;
      console.log(`  ✓ Exported ${result.rows.length} rows from ${table}`);
    }

    // Reset sequences
    sqlOutput += `-- Reset sequences\n`;
    for (const table of tables) {
      sqlOutput += `SELECT setval('${table}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ${table}), true);\n`;
    }

    // Write to file
    const outputFile = path.join(exportDir, 'parkarlabs_backup.sql');
    fs.writeFileSync(outputFile, sqlOutput);

    console.log(`\n✅ Database export completed successfully!`);
    console.log(`📁 Backup file: ${outputFile}`);
    console.log(`📊 File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Export error:', error);
    process.exit(1);
  }
}

exportDatabase();
