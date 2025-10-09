/* Create shared tables: settings, notifications, quotas, snapshots_metadata,
   and add additional useful indexes + constraints (uniques and checks).
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  // settings/config table
  pgm.createTable('settings', {
    key: { type: 'text', primaryKey: true },
    value: { type: 'text' },
    json_value: { type: 'jsonb' },
    description: { type: 'text' },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  // notifications table
  pgm.createTable('notifications', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'integer', references: '"users"', onDelete: 'cascade' },
    type: { type: 'text', notNull: true }, // e.g., assignment, container_ready
    payload: { type: 'jsonb' },
    read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addIndex('notifications', ['user_id', 'read']);

  // quotas table
  pgm.createTable('quotas', {
    id: { type: 'serial', primaryKey: true },
    team_id: { type: 'integer', references: '"teams"', onDelete: 'cascade' },
    user_id: { type: 'integer', references: '"users"', onDelete: 'cascade' },
    cores_limit: { type: 'integer', default: 8 },
    memory_mb_limit: { type: 'integer', default: 8192 },
    disk_mb_limit: { type: 'integer', default: 102400 },
    max_concurrent_containers: { type: 'integer', default: 2 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  // ensure either team_id or user_id is present (but not enforced via complex CHECK easily here)
  pgm.addIndex('quotas', ['team_id']);
  pgm.addIndex('quotas', ['user_id']);

  // snapshots metadata (to complement lxc snapshot identifiers)
  pgm.createTable('snapshots_metadata', {
    id: { type: 'bigserial', primaryKey: true },
    container_id: { type: 'integer', notNull: true, references: '"containers"', onDelete: 'cascade' },
    snapshot_name: { type: 'text', notNull: true },
    created_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    notes: { type: 'text' }
  });

  pgm.addIndex('snapshots_metadata', ['container_id']);
  pgm.addIndex('snapshots_metadata', ['created_at']);

  // Add additional constraints & checks on existing tables
  // tasks.status / assignments.status constraint enforcement via lookup tables not enums here
  pgm.createTable('assignment_statuses', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true, unique: true }
  });

  pgm.sql(`
    INSERT INTO assignment_statuses (name) VALUES
    ('assigned'), ('in_progress'), ('completed'), ('blocked')
    ON CONFLICT DO NOTHING;
  `);

  // add NOT NULL constraints or unique constraints where missing (safe ALTERs)
  pgm.alterColumn('templates', 'name', { type: 'text', notNull: true });
  pgm.alterColumn('dependency_sets', 'name', { type: 'text', notNull: true });
  pgm.alterColumn('courses', 'title', { type: 'text', notNull: true });

  // Create text search index for courses.title and courses.description using tsvector
  pgm.sql(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS search_vector tsvector;`);
  pgm.sql(`UPDATE courses SET search_vector = to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''));`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS courses_search_idx ON courses USING GIN(search_vector);`);
  // trigger to keep search_vector up to date
  pgm.sql(`
    CREATE OR REPLACE FUNCTION courses_tsv_trigger() RETURNS trigger AS $$
    begin
      new.search_vector := to_tsvector('english', coalesce(new.title,'') || ' ' || coalesce(new.description,''));
      return new;
    end
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    DROP TRIGGER IF EXISTS tsvectorupdate ON courses;
    CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
    ON courses FOR EACH ROW EXECUTE PROCEDURE courses_tsv_trigger();
  `);

  // Add some helpful indexes for FK heavy lookups
  pgm.addIndex('assignments', ['task_id']);
  pgm.addIndex('tasks', ['created_by']);
  pgm.addIndex('templates', ['created_by']);
  pgm.addIndex('dependency_sets', ['created_by']);
};

exports.down = (pgm) => {
  pgm.dropIndex('dependency_sets', ['created_by']);
  pgm.dropIndex('templates', ['created_by']);
  pgm.dropIndex('tasks', ['created_by']);
  pgm.dropIndex('assignments', ['task_id']);

  pgm.sql(`DROP TRIGGER IF EXISTS tsvectorupdate ON courses;`);
  pgm.sql(`DROP FUNCTION IF EXISTS courses_tsv_trigger();`);
  pgm.sql(`DROP INDEX IF EXISTS courses_search_idx;`);
  pgm.sql(`ALTER TABLE courses DROP COLUMN IF EXISTS search_vector;`);

  pgm.alterColumn('courses', 'title', { type: 'text' }); // cannot revert notNull easily to previous state

  pgm.sql(`DELETE FROM assignment_statuses WHERE name IN ('assigned','in_progress','completed','blocked');`);
  pgm.dropTable('assignment_statuses');

  pgm.dropIndex('snapshots_metadata', ['created_at']);
  pgm.dropIndex('snapshots_metadata', ['container_id']);
  pgm.dropTable('snapshots_metadata');

  pgm.dropIndex('quotas', ['user_id']);
  pgm.dropIndex('quotas', ['team_id']);
  pgm.dropTable('quotas');

  pgm.dropIndex('notifications', ['user_id', 'read']);
  pgm.dropTable('notifications');

  pgm.dropTable('settings');

  // Drop shared indexes and constraints are handled above
};
