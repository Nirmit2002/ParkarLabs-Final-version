/* 1695472400000_housekeeping_and_health.js
   Adds safe/indexes and db_health view with idempotency (CREATE INDEX IF NOT EXISTS).
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  // create indexes only if missing (use raw SQL for IF NOT EXISTS)
  pgm.sql("CREATE INDEX IF NOT EXISTS containers_owner_user_id_index ON containers (owner_user_id);");
  pgm.sql("CREATE INDEX IF NOT EXISTS containers_status_id_index ON containers (status_id);");
  pgm.sql("CREATE INDEX IF NOT EXISTS tasks_created_by_index ON tasks (created_by);");
  pgm.sql("CREATE INDEX IF NOT EXISTS tasks_title_index ON tasks (title);");

  // create or replace view
  pgm.sql(`
    CREATE OR REPLACE VIEW db_health AS
    SELECT
      (SELECT count(*) FROM containers) AS total_containers,
      (SELECT count(*) FROM containers WHERE status_id = (SELECT id FROM container_statuses WHERE name='running' LIMIT 1)) AS running_containers,
      (SELECT count(*) FROM users) AS total_users,
      (SELECT count(*) FROM assignments WHERE status = 'assigned') AS assigned_tasks,
      now() AS last_checked;
  `);

  // comments (idempotent) - use valid JS strings to issue SQL comment commands
  pgm.sql("COMMENT ON TABLE usage_counters IS 'Daily usage counters for quotas and billing';");
  pgm.sql("COMMENT ON TABLE operation_queue IS 'Queue of LXC operations to be processed by backend worker';");
};

exports.down = (pgm) => {
  pgm.sql("DROP VIEW IF EXISTS db_health;");
  pgm.sql("DROP INDEX IF EXISTS containers_owner_user_id_index;");
  pgm.sql("DROP INDEX IF EXISTS containers_status_id_index;");
  pgm.sql("DROP INDEX IF EXISTS tasks_created_by_index;");
  pgm.sql("DROP INDEX IF EXISTS tasks_title_index;");
  pgm.sql("COMMENT ON TABLE usage_counters IS NULL;");
  pgm.sql("COMMENT ON TABLE operation_queue IS NULL;");
};
