/* 1695472000000_import_job_improvements.js
   Adds optional columns and indexes for import jobs
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE import_jobs
      ADD COLUMN IF NOT EXISTS storage_path text,
      ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
      ADD COLUMN IF NOT EXISTS started_at timestamp,
      ADD COLUMN IF NOT EXISTS failed_at timestamp;
  `);

  pgm.sql("CREATE INDEX IF NOT EXISTS import_jobs_status_index ON import_jobs (status);");
  pgm.sql("CREATE INDEX IF NOT EXISTS import_jobs_uploaded_by_index ON import_jobs (uploaded_by);");
};

exports.down = (pgm) => {
  pgm.sql("DROP INDEX IF EXISTS import_jobs_status_index;");
  pgm.sql("DROP INDEX IF EXISTS import_jobs_uploaded_by_index;");
  // do not drop columns in down to avoid possible data loss; if you must:
  // pgm.sql("ALTER TABLE import_jobs DROP COLUMN IF EXISTS storage_path;");
};
