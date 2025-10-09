/* Create a generic audit trigger function and attach to critical tables */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // audit trigger function
  pgm.sql(`
    CREATE OR REPLACE FUNCTION app_audit_trigger() RETURNS trigger AS $$
    DECLARE
      v_actor integer := NULL;
    BEGIN
      -- if actor is passed via current_setting, capture it
      BEGIN
        v_actor := current_setting('app.current_user_id')::integer;
      EXCEPTION WHEN others THEN
        v_actor := NULL;
      END;

      INSERT INTO audit_logs(actor_user_id, action, target_type, target_id, meta, created_at)
      VALUES (
        v_actor,
        TG_OP, -- 'INSERT','UPDATE','DELETE'
        TG_TABLE_NAME,
        COALESCE( NEW.id::text, OLD.id::text ),
        to_jsonb(COALESCE(ROW(OLD.*)::text, ROW(NEW.*)::text)) || jsonb_build_object('changed_columns', to_jsonb(array(SELECT column_name FROM information_schema.columns WHERE table_name = TG_TABLE_NAME))),
        now()
      );

      RETURN NULL; -- audit only; do not modify the row
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  // Attach trigger to tables: users, containers, assignments, courses, templates, tasks
  const tables = ['users','containers','assignments','courses','templates','tasks'];
  tables.forEach(t => {
    pgm.sql(`
      DROP TRIGGER IF EXISTS trg_audit_${t} ON ${t};
      CREATE TRIGGER trg_audit_${t}
      AFTER INSERT OR UPDATE OR DELETE ON ${t}
      FOR EACH ROW EXECUTE PROCEDURE app_audit_trigger();
    `);
  });
};

exports.down = (pgm) => {
  const tables = ['users','containers','assignments','courses','templates','tasks'];
  tables.forEach(t => {
    pgm.sql(`DROP TRIGGER IF EXISTS trg_audit_${t} ON ${t};`);
  });

  pgm.sql(`DROP FUNCTION IF EXISTS app_audit_trigger();`);
};
