/* Create core enum types and base tables: roles, permissions, role_permissions, teams, users */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // role enum as lookup table (use a table instead of PG enum for flexibility)
  pgm.createTable('roles', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('permissions', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('role_permissions', {
    role_id: { type: 'integer', notNull: true, references: '"roles"', onDelete: 'cascade' },
    permission_id: { type: 'integer', notNull: true, references: '"permissions"', onDelete: 'cascade' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  }, {
    primaryKey: ['role_id', 'permission_id']
  });

  pgm.createTable('teams', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    azure_ad_id: { type: 'text', notNull: true, unique: true },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true, unique: true },
    role_id: { type: 'integer', references: '"roles"', notNull: true, onDelete: 'restrict' },
    public_ssh_key: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.createTable('user_teams', {
    user_id: { type: 'integer', notNull: true, references: '"users"', onDelete: 'cascade' },
    team_id: { type: 'integer', notNull: true, references: '"teams"', onDelete: 'cascade' },
  }, {
    primaryKey: ['user_id', 'team_id']
  });

  // Indexes
  pgm.addIndex('users', 'email', { unique: true });
  pgm.addIndex('users', 'azure_ad_id', { unique: true });
  pgm.addIndex('users', 'role_id');
  pgm.addIndex('user_teams', 'team_id');
};

exports.down = (pgm) => {
  pgm.dropIndex('user_teams', 'team_id');
  pgm.dropIndex('users', ['role_id']);
  pgm.dropIndex('users', 'azure_ad_id');
  pgm.dropIndex('users', 'email');

  pgm.dropTable('user_teams');
  pgm.dropTable('users');
  pgm.dropTable('teams');
  pgm.dropTable('role_permissions');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
};
