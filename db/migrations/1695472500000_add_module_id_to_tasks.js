/* Add module_id column to tasks table */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add module_id column to tasks table
  pgm.addColumn('tasks', {
    module_id: {
      type: 'integer',
      references: '"modules"',
      onDelete: 'CASCADE'
    }
  });

  // Add index for better query performance
  pgm.addIndex('tasks', 'module_id');
};

exports.down = (pgm) => {
  pgm.dropIndex('tasks', 'module_id');
  pgm.dropColumn('tasks', 'module_id');
};
