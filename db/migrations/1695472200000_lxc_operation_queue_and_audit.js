/* 1695472200000_lxc_operation_queue_and_audit.js
   Adds a queue table for backend LXC operations and a detailed operations audit table
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('operation_queue', {
    id: { type: 'bigserial', primaryKey: true },
    container_id: { type: 'integer', references: '"containers"', onDelete: 'cascade' },
    operation: { type: 'text', notNull: true }, // operations: create, start, stop, snapshot, delete
    payload: { type: 'jsonb' },
    status: { type: 'text', notNull: true, default: 'pending' }, // pending, in_progress, completed, failed
    attempts: { type: 'integer', notNull: true, default: 0 },
    scheduled_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addIndex('operation_queue', ['status']);
  pgm.addIndex('operation_queue', ['scheduled_at']);

  pgm.createTable('operation_audit', {
    id: { type: 'bigserial', primaryKey: true },
    operation_queue_id: { type: 'integer', references: '"operation_queue"', onDelete: 'set null' },
    container_id: { type: 'integer', references: '"containers"', onDelete: 'set null' },
    action: { type: 'text' }, // start, progress, complete, fail
    details: { type: 'jsonb' },
    created_by: { type: 'integer', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addIndex('operation_audit', ['container_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('operation_audit');
  pgm.dropTable('operation_queue');
};
