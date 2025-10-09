/* 1695471900000_monitoring_views.js
   Materialized views for monitoring and a refresh function
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  // active containers per user
  pgm.sql(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_containers_per_user AS
    SELECT u.id AS user_id, u.email, COUNT(c.*) AS active_containers
    FROM users u
    LEFT JOIN containers c ON c.owner_user_id = u.id AND c.status_id = (SELECT id FROM container_statuses WHERE name='running' LIMIT 1)
    GROUP BY u.id, u.email;
  `);

  // containers by status
  pgm.sql(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_containers_by_status AS
    SELECT cs.name AS status_name, COUNT(c.*) AS cnt
    FROM container_statuses cs
    LEFT JOIN containers c ON c.status_id = cs.id
    GROUP BY cs.name;
  `);

  // refresh function
  pgm.sql(`
    CREATE OR REPLACE FUNCTION refresh_monitoring_materialized_views() RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_containers_per_user;
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_containers_by_status;
    EXCEPTION WHEN unique_violation THEN
      -- fallback to non-concurrent if concurrent refresh not possible
      REFRESH MATERIALIZED VIEW mv_active_containers_per_user;
      REFRESH MATERIALIZED VIEW mv_containers_by_status;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // create helper index on mv_active_containers_per_user for query speed (no-op if exists)
  pgm.sql("CREATE INDEX IF NOT EXISTS mv_active_containers_per_user_user_id_idx ON mv_active_containers_per_user (user_id);");
};

exports.down = (pgm) => {
  pgm.sql("DROP FUNCTION IF EXISTS refresh_monitoring_materialized_views();");
  pgm.sql("DROP MATERIALIZED VIEW IF EXISTS mv_active_containers_per_user;");
  pgm.sql("DROP MATERIALIZED VIEW IF EXISTS mv_containers_by_status;");
  pgm.sql("DROP INDEX IF EXISTS mv_active_containers_per_user_user_id_idx;");
};
