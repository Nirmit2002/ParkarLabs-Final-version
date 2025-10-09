/* 1695472100000_template_versioning.js
   Adds templates_versions table to record versioned templates and helper function to promote version to current.
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('template_versions', {
    id: { type: 'bigserial', primaryKey: true },
    template_id: { type: 'integer', references: '"templates"', onDelete: 'cascade' },
    version_tag: { type: 'text', notNull: true },   // e.g., v1.0, stable, latest
    image: { type: 'text' },
    cpu: { type: 'integer' },
    memory_mb: { type: 'integer' },
    disk_mb: { type: 'integer' },
    init_script: { type: 'text' },
    metadata: { type: 'jsonb' },
    created_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addIndex('template_versions', ['template_id']);
  pgm.sql(`
    CREATE OR REPLACE FUNCTION promote_template_version(p_template_id integer, p_version_id integer) RETURNS void AS $$
    DECLARE v_row template_versions%ROWTYPE;
    BEGIN
      SELECT * INTO v_row FROM template_versions WHERE id = p_version_id AND template_id = p_template_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Version not found';
      END IF;
      UPDATE templates SET image = v_row.image, default_cpu = v_row.cpu, default_memory_mb = v_row.memory_mb, default_disk_mb = v_row.disk_mb, init_script = v_row.init_script, updated_at = now() WHERE id = p_template_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS promote_template_version(integer, integer);`);
  pgm.dropTable('template_versions');
};
