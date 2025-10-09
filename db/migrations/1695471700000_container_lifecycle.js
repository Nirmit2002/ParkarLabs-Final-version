/* 1695471700000_container_lifecycle.js
   Container lifecycle helper: function to validate status transitions and trigger
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add container lifecycle audit table (idempotent via CREATE TABLE IF NOT EXISTS)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS container_lifecycle (
      id bigserial PRIMARY KEY,
      container_id integer REFERENCES containers(id) ON DELETE CASCADE,
      old_status_id integer,
      new_status_id integer,
      reason text,
      changed_by integer REFERENCES users(id) ON DELETE SET NULL,
      changed_at timestamp DEFAULT current_timestamp NOT NULL
    );
  `);

  // create function enforce_container_status_transition(new_status_id integer, old_status_id integer) used by trigger
  pgm.sql(`
    CREATE OR REPLACE FUNCTION enforce_container_status_transition() RETURNS trigger AS $$
    DECLARE
      v_old integer := COALESCE(OLD.status_id, NULL);
      v_new integer := COALESCE(NEW.status_id, NULL);
      v_valid boolean := TRUE;
      -- set of allowed transitions (example). You can extend this logic.
    BEGIN
      IF v_old IS NULL THEN
        v_valid := TRUE; -- initial insert always allowed
      ELSE
        -- allow same status
        IF v_old = v_new THEN
          v_valid := TRUE;
        ELSE
          -- Simple policy example:
          -- creating -> running, creating -> failed, running -> stopped, stopped -> running, any -> deleting
          PERFORM CASE
            WHEN (v_old = (SELECT id FROM container_statuses WHERE name='creating' LIMIT 1) AND v_new IN ((SELECT id FROM container_statuses WHERE name='running' LIMIT 1), (SELECT id FROM container_statuses WHERE name='failed' LIMIT 1))) THEN NULL
            WHEN (v_old = (SELECT id FROM container_statuses WHERE name='running' LIMIT 1) AND v_new = (SELECT id FROM container_statuses WHERE name='stopped' LIMIT 1)) THEN NULL
            WHEN (v_old = (SELECT id FROM container_statuses WHERE name='stopped' LIMIT 1) AND v_new = (SELECT id FROM container_statuses WHERE name='running' LIMIT 1)) THEN NULL
            WHEN (v_new = (SELECT id FROM container_statuses WHERE name='deleting' LIMIT 1)) THEN NULL
            ELSE RAISE EXCEPTION 'Invalid container status transition from % to %', v_old, v_new
          END CASE;
        END IF;
      END IF;

      -- audit the change
      INSERT INTO container_lifecycle(container_id, old_status_id, new_status_id, changed_by, changed_at)
      VALUES (COALESCE(NEW.id, OLD.id), v_old, v_new, current_setting('app.current_user_id', true)::integer, now());

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  // Create trigger on containers table - AFTER UPDATE OF status_id
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_container_status_transition ON containers;
    CREATE TRIGGER trg_container_status_transition
      AFTER UPDATE ON containers
      FOR EACH ROW
      WHEN (OLD.status_id IS DISTINCT FROM NEW.status_id)
      EXECUTE PROCEDURE enforce_container_status_transition();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_container_status_transition ON containers;`);
  pgm.sql(`DROP FUNCTION IF EXISTS enforce_container_status_transition();`);
  pgm.dropTable('container_lifecycle', { ifExists: true, cascade: true });
};
