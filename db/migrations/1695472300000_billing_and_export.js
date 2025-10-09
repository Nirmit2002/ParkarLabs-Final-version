/* 1695472300000_billing_and_export.js
   Adds a usage_exports table and a simple generate_usage_export function.
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('usage_exports', {
    id: { type: 'bigserial', primaryKey: true },
    generated_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    period_start: { type: 'date' },
    period_end: { type: 'date' },
    status: { type: 'text', notNull: true, default: 'pending' }, // pending, ready, failed
    storage_path: { type: 'text' }, // path to CSV export
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    completed_at: { type: 'timestamp' }
  });

  pgm.addIndex('usage_exports', ['status']);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION generate_usage_export(p_start date, p_end date, p_user_id integer) RETURNS integer AS $$
    DECLARE
      v_id integer;
      v_path text;
    BEGIN
      INSERT INTO usage_exports(generated_by, period_start, period_end, status, created_at)
      VALUES (p_user_id, p_start, p_end, 'pending', now()) RETURNING id INTO v_id;

      v_path := '/root/ParkarLabs/db/q/usage_export_' || v_id || '.csv';

      EXECUTE format('COPY (SELECT * FROM usage_counters WHERE period_start BETWEEN %L AND %L) TO %L WITH CSV HEADER', p_start::text, p_end::text, v_path);

      UPDATE usage_exports SET storage_path = v_path, status = 'ready', completed_at = now() WHERE id = v_id;

      RETURN v_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS generate_usage_export(date, date, integer);`);
  pgm.dropTable('usage_exports');
};
