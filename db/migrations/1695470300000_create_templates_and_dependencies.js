/* Create dependency_sets, templates, and template_dependency join table */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('dependency_sets', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true, unique: true },
    description: { type: 'text' },
    script: { type: 'text' }, /* provisioning script or JSON manifest */
    created_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('templates', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true, unique: true },
    image: { type: 'text', notNull: true }, /* e.g., ubuntu:24.04 */
    default_cpu: { type: 'integer', notNull: true, default: 1 },
    default_memory_mb: { type: 'integer', notNull: true, default: 1024 },
    default_disk_mb: { type: 'integer', notNull: true, default: 10240 },
    network_profile: { type: 'text' },
    init_script: { type: 'text' },
    created_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('template_dependency', {
    template_id: { type: 'integer', notNull: true, references: '"templates"', onDelete: 'cascade' },
    dependency_set_id: { type: 'integer', notNull: true, references: '"dependency_sets"', onDelete: 'cascade' }
  }, {
    primaryKey: ['template_id', 'dependency_set_id']
  });

  pgm.addIndex('templates', 'name', { unique: true });
  pgm.addIndex('dependency_sets', 'name', { unique: true });
};

exports.down = (pgm) => {
  pgm.dropIndex('dependency_sets', 'name');
  pgm.dropIndex('templates', 'name');
  pgm.dropTable('template_dependency');
  pgm.dropTable('templates');
  pgm.dropTable('dependency_sets');
};
