/* Add a convenience FK-like relationship: store assignment_status_id, keep status text for readability.
   This is non-destructive: we add assignment_status_id, populate it, and keep text column in place.
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  // add new column assignment_status_id
  pgm.addColumn('assignments', {
    assignment_status_id: { type: 'integer', references: '"assignment_statuses"', onDelete: 'set null' }
  });

  // populate assignment_status_id from assignments.status text
  pgm.sql(`
    UPDATE assignments a
    SET assignment_status_id = s.id
    FROM assignment_statuses s
    WHERE a.status = s.name;
  `);

  // add index for quick lookup
  pgm.addIndex('assignments', 'assignment_status_id');
};

exports.down = (pgm) => {
  pgm.dropIndex('assignments', 'assignment_status_id');
  pgm.dropColumn('assignments', 'assignment_status_id');
};
