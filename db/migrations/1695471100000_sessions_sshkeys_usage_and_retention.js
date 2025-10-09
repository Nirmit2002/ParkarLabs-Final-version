/* Sessions, SSH keys, usage counters, and retention helpers (idempotent).
   Uses CREATE INDEX IF NOT EXISTS to avoid failing when index already exists.
*/
exports.shorthands = undefined;

exports.up = async (pgm) => {
  // sessions table
  pgm.createTable('sessions', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'integer', references: '"users"', onDelete: 'cascade' },
    provider: { type: 'text', notNull: true, default: 'azure_ad' },
    provider_account_id: { type: 'text' },
    token_expires_at: { type: 'timestamp' },
    refresh_token_hash: { type: 'text' },
    meta: { type: 'jsonb' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    last_active_at: { type: 'timestamp' }
  });

  // ssh_keys table
  pgm.createTable('ssh_keys', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'integer', references: '"users"', onDelete: 'cascade' },
    key_type: { type: 'text', notNull: true },
    public_key: { type: 'text', notNull: true },
    label: { type: 'text' },
    ephemeral: { type: 'boolean', notNull: true, default: false },
    expires_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  // usage_counters table
  pgm.createTable('usage_counters', {
    id: { type: 'serial', primaryKey: true },
    team_id: { type: 'integer', references: '"teams"', onDelete: 'cascade' },
    user_id: { type: 'integer', references: '"users"', onDelete: 'cascade' },
    period_start: { type: 'date', notNull: true },
    cores_used: { type: 'integer', notNull: true, default: 0 },
    memory_mb_used: { type: 'bigint', notNull: true, default: 0 },
    storage_mb_used: { type: 'bigint', notNull: true, default: 0 },
    concurrent_containers: { type: 'integer', notNull: true, default: 0 },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  /* Use guarded (IF NOT EXISTS) index creation to avoid collision with prior runs */
  await pgm.sql(`CREATE INDEX IF NOT EXISTS sessions_user_id_index ON sessions (user_id);`);
  await pgm.sql(`CREATE INDEX IF NOT EXISTS sessions_provider_account_id_index ON sessions (provider_account_id);`);
  await pgm.sql(`CREATE INDEX IF NOT EXISTS ssh_keys_user_id_index ON ssh_keys (user_id);`);
  await pgm.sql(`CREATE INDEX IF NOT EXISTS ssh_keys_ephemeral_index ON ssh_keys (ephemeral);`);
  await pgm.sql(`CREATE INDEX IF NOT EXISTS usage_counters_team_id_period_start_index ON usage_counters (team_id, period_start);`);
  await pgm.sql(`CREATE INDEX IF NOT EXISTS usage_counters_user_id_period_start_index ON usage_counters (user_id, period_start);`);

  /* Retention helpers: create archive table and functions (idempotent) */
  await pgm.sql(`
    CREATE TABLE IF NOT EXISTS audit_logs_archive (LIKE audit_logs INCLUDING ALL) INHERITS (audit_logs);
  `);

  await pgm.sql(`
    CREATE OR REPLACE FUNCTION move_old_audit_logs(p_days integer) RETURNS void AS $$
    BEGIN
      INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE created_at < now() - (p_days || ' days')::interval;
      DELETE FROM audit_logs WHERE created_at < now() - (p_days || ' days')::interval;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pgm.sql(`
    CREATE OR REPLACE FUNCTION purge_old_metrics(p_days integer) RETURNS void AS $$
    BEGIN
      DELETE FROM metrics WHERE recorded_at < now() - (p_days || ' days')::interval;
    END;
    $$ LANGUAGE plpgsql;
  `);

  /* Ensure audit_logs/metrics indexes exist (guarded) */
  await pgm.sql(`CREATE INDEX IF NOT EXISTS audit_logs_created_at_index ON audit_logs (created_at);`);
  await pgm.sql(`CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_index ON audit_logs (actor_user_id);`);
  await pgm.sql(`CREATE INDEX IF NOT EXISTS metrics_recorded_at_index ON metrics (recorded_at);`);
};

exports.down = async (pgm) => {
  await pgm.sql(`DROP INDEX IF EXISTS metrics_recorded_at_index;`);
  await pgm.sql(`DROP INDEX IF EXISTS audit_logs_actor_user_id_index;`);
  await pgm.sql(`DROP INDEX IF EXISTS audit_logs_created_at_index;`);
  await pgm.sql(`DROP FUNCTION IF EXISTS purge_old_metrics(integer);`);
  await pgm.sql(`DROP FUNCTION IF EXISTS move_old_audit_logs(integer);`);
  await pgm.sql(`DROP TABLE IF EXISTS audit_logs_archive;`);

  pgm.dropTable('usage_counters', { ifExists: true });
  pgm.dropTable('ssh_keys', { ifExists: true });
  pgm.dropTable('sessions', { ifExists: true });
};
