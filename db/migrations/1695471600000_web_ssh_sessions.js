/* 1695471600000_web_ssh_sessions.js
   Web-based SSH session tokens for containers
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  // table
  pgm.createTable('web_ssh_sessions', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'integer', references: 'users', onDelete: 'CASCADE' },
    container_id: { type: 'integer', references: 'containers', onDelete: 'CASCADE' },
    session_token: { type: 'text', notNull: true },
    token_hash: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    expires_at: { type: 'timestamp' },
    last_active_at: { type: 'timestamp' },
    client_ip: { type: 'text' },
    user_agent: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'active' }
  });

  // indexes (if not exists)
  pgm.sql("CREATE INDEX IF NOT EXISTS web_ssh_sessions_user_id_index ON web_ssh_sessions (user_id);");
  pgm.sql("CREATE INDEX IF NOT EXISTS web_ssh_sessions_container_id_index ON web_ssh_sessions (container_id);");
  pgm.sql("CREATE INDEX IF NOT EXISTS web_ssh_sessions_session_token_index ON web_ssh_sessions (session_token);");
  pgm.sql("CREATE INDEX IF NOT EXISTS web_ssh_sessions_expires_at_index ON web_ssh_sessions (expires_at);");
};

exports.down = (pgm) => {
  pgm.dropTable('web_ssh_sessions', { ifExists: true, cascade: true });
};
