/* Create audit_logs, import_jobs, import_errors, and metrics table.
   Also create an optional TimescaleDB hypertable if extension exists.
*/
exports.shorthands = undefined;

exports.up = async (pgm) => {
  // audit_logs
  pgm.createTable('audit_logs', {
    id: { type: 'bigserial', primaryKey: true },
    actor_user_id: { type: 'integer', references: '"users"', onDelete: 'set null' },
    action: { type: 'text', notNull: true }, // e.g., 'create','update','delete','container:start'
    target_type: { type: 'text', notNull: true }, // e.g., 'user','container','assignment'
    target_id: { type: 'text' }, // flexible identifier (can store numeric or uuid)
    meta: { type: 'jsonb' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addIndex('audit_logs', ['actor_user_id']);
  pgm.addIndex('audit_logs', ['target_type', 'target_id']);

  // import jobs and errors
  pgm.createTable('import_jobs', {
    id: { type: 'serial', primaryKey: true },
    uploaded_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    file_name: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'pending' }, // pending, processing, completed, failed
    result_summary: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    completed_at: { type: 'timestamp' }
  });

  pgm.createTable('import_errors', {
    id: { type: 'serial', primaryKey: true },
    import_job_id: { type: 'integer', notNull: true, references: '"import_jobs"', onDelete: 'cascade' },
    row_number: { type: 'integer' },
    error_message: { type: 'text' },
    payload: { type: 'jsonb' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addIndex('import_errors', ['import_job_id']);

  // metrics (time-series)
  pgm.createTable('metrics', {
    id: { type: 'bigserial', primaryKey: true },
    metric_name: { type: 'text', notNull: true }, // e.g., 'container.cpu', 'container.memory'
    container_id: { type: 'integer', references: '"containers"', onDelete: 'set null' },
    team_id: { type: 'integer', references: '"teams"', onDelete: 'set null' },
    value_num: { type: 'double precision' },
    value_text: { type: 'text' },
    meta: { type: 'jsonb' },
    recorded_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  // simple index for common time-range queries
  pgm.addIndex('metrics', ['metric_name', 'recorded_at']);
  pgm.addIndex('metrics', ['container_id', 'recorded_at']);

  // Optional: create TimescaleDB hypertable if extension exists (safe to run if extension absent)
  // Using SQL directly because node-pg-migrate does not know about Timescale.
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        -- create hypertable if not exists
        PERFORM create_hypertable('metrics', 'recorded_at', if_not_exists => TRUE);
      END IF;
    EXCEPTION WHEN others THEN
      -- ignore errors to keep migration idempotent if extension not present
      RAISE NOTICE 'TimescaleDB hypertable creation skipped or failed: %', SQLERRM;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('metrics', ['container_id', 'recorded_at']);
  pgm.dropIndex('metrics', ['metric_name', 'recorded_at']);
  pgm.dropTable('metrics');

  pgm.dropIndex('import_errors', ['import_job_id']);
  pgm.dropTable('import_errors');
  pgm.dropTable('import_jobs');

  pgm.dropIndex('audit_logs', ['target_type', 'target_id']);
  pgm.dropIndex('audit_logs', ['actor_user_id']);
  pgm.dropTable('audit_logs');
};
