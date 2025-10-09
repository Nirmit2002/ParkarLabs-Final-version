exports.shorthands = undefined;

exports.up = (pgm) => {
  // Ensure snapshots table exists (we created snapshots earlier). Add helpful index and function.
  pgm.addIndex('snapshots', ['container_id', 'created_at']);

  // Create function to record snapshot metadata after LXC snapshot creation (back-end will call this)
  pgm.sql(`
    CREATE OR REPLACE FUNCTION record_snapshot(p_container_id integer, p_snapshot_name text, p_created_by integer, p_notes text) RETURNS void AS $$
    BEGIN
      INSERT INTO snapshots(container_id, lxc_snapshot_name, created_by, created_at, notes)
      VALUES (p_container_id, p_snapshot_name, p_created_by, now(), p_notes);
      INSERT INTO snapshots_metadata(container_id, snapshot_name, created_by, created_at, notes)
      VALUES (p_container_id, p_snapshot_name, p_created_by, now(), p_notes);
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('snapshots', ['container_id', 'created_at']);
  pgm.sql(`DROP FUNCTION IF EXISTS record_snapshot(integer, text, integer, text);`);
};
