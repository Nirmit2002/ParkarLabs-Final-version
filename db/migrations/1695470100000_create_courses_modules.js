/* Create courses and modules tables */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('courses', {
    id: { type: 'serial', primaryKey: true },
    title: { type: 'text', notNull: true },
    slug: { type: 'text', notNull: true, unique: true },
    description: { type: 'text' },
    created_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    visibility: { type: 'text', notNull: true, default: 'private' }, /* private/public */
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('modules', {
    id: { type: 'serial', primaryKey: true },
    course_id: { type: 'integer', notNull: true, references: '"courses"', onDelete: 'cascade' },
    title: { type: 'text', notNull: true },
    content: { type: 'text' },
    position: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addIndex('modules', ['course_id', 'position']);
  pgm.addIndex('courses', 'slug', { unique: true });
};

exports.down = (pgm) => {
  pgm.dropIndex('courses', 'slug');
  pgm.dropIndex('modules', ['course_id', 'position']);
  pgm.dropTable('modules');
  pgm.dropTable('courses');
};
