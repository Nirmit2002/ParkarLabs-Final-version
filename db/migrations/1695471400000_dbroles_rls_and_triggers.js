/* Create DB roles (app_role, readonly_role), enable RLS stubs, add advisory lock helpers,
   and core triggers: assignment_history + notification on assignment status change.
*/
exports.shorthands = undefined;

exports.up = async (pgm) => {
  // Create DB roles (these are db-level roles - run as superuser during setup)
  // NOTE: In dev this runs as SQL; in some environments you may need to create roles manually.
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
        CREATE ROLE app_role NOINHERIT LOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_role') THEN
        CREATE ROLE readonly_role NOINHERIT;
      END IF;
    END$$;
  `);

  // Grant minimal privileges example (grant on public schema objects later; kept minimal here)
  // Add helper functions: acquire_advisory_lock, release_advisory_lock
  pgm.sql(`
    CREATE OR REPLACE FUNCTION acquire_advisory_lock(p_key bigint, p_timeout integer DEFAULT 10) RETURNS boolean AS $$
    DECLARE
      v_got boolean;
    BEGIN
      SELECT pg_try_advisory_lock(p_key) INTO v_got;
      IF v_got THEN RETURN TRUE; END IF;
      -- simple retry loop for p_timeout seconds
      FOR i IN 1..p_timeout LOOP
        PERFORM pg_sleep(1);
        SELECT pg_try_advisory_lock(p_key) INTO v_got;
        IF v_got THEN RETURN TRUE; END IF;
      END LOOP;
      RETURN FALSE;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION release_advisory_lock(p_key bigint) RETURNS boolean AS $$
    BEGIN
      RETURN pg_advisory_unlock(p_key);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // assignment_history trigger function (maintain history on status change)
  pgm.sql(`
    CREATE OR REPLACE FUNCTION assignment_status_history() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'UPDATE' THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
          INSERT INTO assignment_history(assignment_id, previous_status, new_status, changed_by, note, changed_at)
          VALUES (OLD.id, OLD.status, NEW.status, current_setting('app.current_user_id', true)::integer, NULL, now());
        END IF;
      ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO assignment_history(assignment_id, previous_status, new_status, changed_by, note, changed_at)
        VALUES (NEW.id, NULL, NEW.status, current_setting('app.current_user_id', true)::integer, 'created', now());
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  // attach trigger
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_assignment_history ON assignments;
    CREATE TRIGGER trg_assignment_history
      AFTER INSERT OR UPDATE ON assignments
      FOR EACH ROW EXECUTE PROCEDURE assignment_status_history();
  `);

  // notification trigger: on assignment INSERT or status change produce notification for assigned user
  pgm.sql(`
    CREATE OR REPLACE FUNCTION assignment_notify_trigger() RETURNS trigger AS $$
    DECLARE
      v_user integer;
      v_payload jsonb;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        v_user := NEW.assigned_to_user_id;
        v_payload := jsonb_build_object('type','assignment_assigned','assignment_id', NEW.id);
      ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        v_user := NEW.assigned_to_user_id;
        v_payload := jsonb_build_object('type','assignment_status_changed','assignment_id', NEW.id, 'from', OLD.status, 'to', NEW.status);
      ELSE
        RETURN NEW;
      END IF;

      IF v_user IS NOT NULL THEN
        INSERT INTO notifications(user_id, type, payload, read, created_at)
        VALUES (v_user, (v_payload->>'type')::text, v_payload, false, now());
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_assignment_notify ON assignments;
    CREATE TRIGGER trg_assignment_notify
      AFTER INSERT OR UPDATE ON assignments
      FOR EACH ROW EXECUTE PROCEDURE assignment_notify_trigger();
  `);

  // RLS stub: enable for courses and containers (disabled policies to be added by app later)
  pgm.sql(`ALTER TABLE courses ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE containers ENABLE ROW LEVEL SECURITY;`);
};

exports.down = async (pgm) => {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_assignment_notify ON assignments;`);
  pgm.sql(`DROP FUNCTION IF EXISTS assignment_notify_trigger();`);
  pgm.sql(`DROP TRIGGER IF EXISTS trg_assignment_history ON assignments;`);
  pgm.sql(`DROP FUNCTION IF EXISTS assignment_status_history();`);
  pgm.sql(`DROP FUNCTION IF EXISTS acquire_advisory_lock(bigint, integer);`);
  pgm.sql(`DROP FUNCTION IF EXISTS release_advisory_lock(bigint);`);
  pgm.sql(`ALTER TABLE courses DISABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE containers DISABLE ROW LEVEL SECURITY;`);
  // Note: do not DROP DB roles on down to avoid accidental removal in dev environments
};
