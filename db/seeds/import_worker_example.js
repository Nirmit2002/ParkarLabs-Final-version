// seeds/import_worker_example.js
// Lightweight CSV importer example. Use in dev to test import_jobs processing.
require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');
const csv = require('csv-parse/sync'); // run `npm i csv-parse` if needed

(async () => {
  const client = new Client({
    host: process.env.PGHOST, port: process.env.PGPORT, user: process.env.PGUSER,
    password: process.env.PGPASSWORD, database: process.env.PGDATABASE
  });
  await client.connect();

  try {
    // find pending imports
    const { rows } = await client.query("SELECT id, storage_path FROM import_jobs WHERE status='pending' LIMIT 1");
    if (!rows.length) {
      console.log('No pending import jobs.');
      return;
    }
    const job = rows[0];
    console.log('Processing job', job.id, job.storage_path);

    // mark started
    await client.query("UPDATE import_jobs SET status='processing', started_at=NOW() WHERE id=$1", [job.id]);

    // read file (local path)
    const data = fs.readFileSync(job.storage_path, 'utf8');
    const records = csv.parse(data, { columns: true, skip_empty_lines: true });

    // naive import example: assume columns for courses: title, description
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        await client.query(`INSERT INTO courses(title, description, created_at) VALUES($1,$2,NOW())`, [row.title || 'untitled', row.description || '']);
      } catch (e) {
        await client.query(`INSERT INTO import_errors(import_job_id,row_number,error_message,payload,created_at) VALUES($1,$2,$3,$4,NOW())`, [job.id, i+1, e.message, JSON.stringify(row)]);
      }
    }

    await client.query("UPDATE import_jobs SET status='completed', completed_at=NOW() WHERE id=$1", [job.id]);
    console.log('Import complete');
  } catch (e) {
    console.error('Import failed', e);
    await client.query("UPDATE import_jobs SET status='failed', failed_at=NOW() WHERE id=$1", [job && job.id]);
  } finally {
    await client.end();
  }
})();
