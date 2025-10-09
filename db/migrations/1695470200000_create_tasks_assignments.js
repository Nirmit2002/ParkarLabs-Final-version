/* Create tasks, assignments, and assignment_history tables */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('tasks', {
    id: { type: 'serial', primaryKey: true },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    created_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    related_course_id: { type: 'integer', references: '"courses"', onDelete: 'set null' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('assignments', {
    id: { type: 'serial', primaryKey: true },
    task_id: { type: 'integer', references: '"tasks"', onDelete: 'cascade' },
    assigned_to_user_id: { type: 'integer', references: '"users"', onDelete: 'cascade' },
    assigned_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    assigned_group_id: { type: 'integer', references: '"teams"', onDelete: 'set null' },
    status: { type: 'text', notNull: true, default: 'assigned' }, /* assigned, in_progress, completed, blocked */
    due_date: { type: 'timestamp' },
    metadata: { type: 'jsonb' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('assignment_history', {
    id: { type: 'serial', primaryKey: true },
    assignment_id: { type: 'integer', notNull: true, references: '"assignments"', onDelete: 'cascade' },
    previous_status: { type: 'text' },
    new_status: { type: 'text' },
    changed_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    note: { type: 'text' },
    changed_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addIndex('assignments', ['assigned_to_user_id']);
  pgm.addIndex('assignments', ['assigned_group_id']);
};

exports.down = (pgm) => {
  pgm.dropIndex('assignments', ['assigned_group_id']);
  pgm.dropIndex('assignments', ['assigned_to_user_id']);
  pgm.dropTable('assignment_history');
  pgm.dropTable('assignments');
  pgm.dropTable('tasks');
};
