/* Add completed_at and notes columns to assignments table */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add completed_at column to track when an assignment was completed
  pgm.addColumn('assignments', {
    completed_at: {
      type: 'timestamp',
      notNull: false
    }
  });

  // Add notes column for assignment-specific notes
  pgm.addColumn('assignments', {
    notes: {
      type: 'text',
      notNull: false
    }
  });

  // Create index on completed_at for performance
  pgm.createIndex('assignments', 'completed_at');
};

exports.down = (pgm) => {
  pgm.dropIndex('assignments', 'completed_at');
  pgm.dropColumn('assignments', 'notes');
  pgm.dropColumn('assignments', 'completed_at');
};
