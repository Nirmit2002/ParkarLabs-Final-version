/* Create containers and snapshots metadata */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // container_status small lookup table
  pgm.createTable('container_statuses', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true, unique: true }
  });

  pgm.createTable('containers', {
    id: { type: 'serial', primaryKey: true },
    lxc_name: { type: 'text', notNull: true, unique: true },
    owner_user_id: { type: 'integer', notNull: true, references: '"users"', onDelete: 'cascade' },
    template_id: { type: 'integer', references: '"templates"', onDelete: 'set null' },
    image: { type: 'text', notNull: true },
    cpu: { type: 'integer', notNull: true, default: 1 },
    memory_mb: { type: 'integer', notNull: true, default: 1024 },
    disk_mb: { type: 'integer', notNull: true, default: 10240 },
    ip_address: { type: 'inet' },
    status_id: { type: 'integer', references: '"container_statuses"', onDelete: 'set null' },
    metadata: { type: 'jsonb' },
    started_at: { type: 'timestamp' },
    stopped_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('snapshots', {
    id: { type: 'serial', primaryKey: true },
    container_id: { type: 'integer', notNull: true, references: '"containers"', onDelete: 'cascade' },
    lxc_snapshot_name: { type: 'text', notNull: true },
    created_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    notes: { type: 'text' }
  });

  pgm.addIndex('containers', ['owner_user_id']);
  pgm.addIndex('containers', ['status_id']);

  // Seed common container statuses (up/down/creating/failed/stopped)
  pgm.sql(`
    INSERT INTO container_statuses(name) VALUES
    ('creating'),
    ('running'),
    ('stopped'),
    ('failed'),
    ('deleting')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM container_statuses WHERE name IN ('creating','running','stopped','failed','deleting');`);
  pgm.dropIndex('containers', ['status_id']);
  pgm.dropIndex('containers', ['owner_user_id']);
  pgm.dropTable('snapshots');
  pgm.dropTable('containers');
  pgm.dropTable('container_statuses');
};
