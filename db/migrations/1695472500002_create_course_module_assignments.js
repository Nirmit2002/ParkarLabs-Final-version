/* Create separate assignment tables for courses and modules */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create course_assignments table for direct course assignments
  pgm.createTable('course_assignments', {
    id: { type: 'serial', primaryKey: true },
    course_id: { type: 'integer', notNull: true, references: '"courses"', onDelete: 'cascade' },
    assigned_to_user_id: { type: 'integer', notNull: true, references: '"users"', onDelete: 'cascade' },
    assigned_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    due_date: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  // Create module_assignments table for direct module assignments
  pgm.createTable('module_assignments', {
    id: { type: 'serial', primaryKey: true },
    module_id: { type: 'integer', notNull: true, references: '"modules"', onDelete: 'cascade' },
    assigned_to_user_id: { type: 'integer', notNull: true, references: '"users"', onDelete: 'cascade' },
    assigned_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    due_date: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  // Add indexes for performance
  pgm.addIndex('course_assignments', ['course_id']);
  pgm.addIndex('course_assignments', ['assigned_to_user_id']);
  pgm.addIndex('course_assignments', ['course_id', 'assigned_to_user_id']);

  pgm.addIndex('module_assignments', ['module_id']);
  pgm.addIndex('module_assignments', ['assigned_to_user_id']);
  pgm.addIndex('module_assignments', ['module_id', 'assigned_to_user_id']);

  // Add unique constraint to prevent duplicate assignments
  pgm.addConstraint('course_assignments', 'course_assignments_unique', {
    unique: ['course_id', 'assigned_to_user_id']
  });

  pgm.addConstraint('module_assignments', 'module_assignments_unique', {
    unique: ['module_id', 'assigned_to_user_id']
  });
};

exports.down = (pgm) => {
  pgm.dropTable('module_assignments');
  pgm.dropTable('course_assignments');
};
