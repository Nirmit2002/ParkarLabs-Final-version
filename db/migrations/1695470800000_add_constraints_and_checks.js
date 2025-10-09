/* Fixed migration: avoid subquery in DEFAULT by resolving status_id in JS and setting literal default. */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  // Add check constraints and required NOT NULLs
  pgm.addConstraint('users', 'users_status_check', {
    check: "status IN ('active', 'disabled', 'suspended')"
  });

  pgm.addConstraint('assignments', 'assignments_status_check', {
    check: "status IN ('assigned', 'in_progress', 'completed', 'blocked')"
  });

  pgm.alterColumn('templates', 'image', { type: 'text', notNull: true });
  pgm.alterColumn('courses', 'slug', { type: 'text', notNull: true });
  pgm.alterColumn('containers', 'lxc_name', { type: 'text', notNull: true });
  pgm.alterColumn('audit_logs', 'action', { type: 'text', notNull: true });

  // Resolve the id for 'creating' and set a literal default
  const res = await pgm.db.query("SELECT id FROM container_statuses WHERE name = 'creating' LIMIT 1");
  if (res && res.rows && res.rows.length) {
    const creatingId = res.rows[0].id;
    await pgm.sql(`ALTER TABLE containers ALTER COLUMN status_id SET DEFAULT ${creatingId};`);
  } else {
    // no status found - leave default NULL (or optionally create the status)
    // If you want to create it if missing:
    await pgm.sql(`
      INSERT INTO container_statuses(name)
      VALUES ('creating')
      ON CONFLICT DO NOTHING;
    `);
    const r2 = await pgm.db.query("SELECT id FROM container_statuses WHERE name = 'creating' LIMIT 1");
    if (r2 && r2.rows && r2.rows.length) {
      const creatingId2 = r2.rows[0].id;
      await pgm.sql(`ALTER TABLE containers ALTER COLUMN status_id SET DEFAULT ${creatingId2};`);
    }
  }

  // add provisioning_pref jsonb column
  pgm.addColumn('users', {
    provisioning_pref: { type: 'jsonb', notNull: false, default: null }
  });
};

exports.down = async (pgm) => {
  pgm.dropColumn('users', 'provisioning_pref');
  await pgm.sql(`ALTER TABLE containers ALTER COLUMN status_id DROP DEFAULT;`);
  pgm.alterColumn('audit_logs', 'action', { type: 'text' });
  pgm.alterColumn('containers', 'lxc_name', { type: 'text' });
  pgm.alterColumn('courses', 'slug', { type: 'text' });
  pgm.alterColumn('templates', 'image', { type: 'text' });
  pgm.dropConstraint('assignments', 'assignments_status_check');
  pgm.dropConstraint('users', 'users_status_check');
};
