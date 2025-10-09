/* Transaction-safe example function to provision a container row while reserving quota and taking an advisory lock.
   The actual LXC creation is done by backend; this function reserves DB rows and returns a container row id.
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
  CREATE OR REPLACE FUNCTION reserve_container_row(
    p_user_id integer,
    p_team_id integer,
    p_template_id integer,
    p_image text,
    p_cpu integer,
    p_memory_mb integer,
    p_disk_mb integer
  ) RETURNS integer AS $$
  DECLARE
    v_ok boolean;
    v_lock_key bigint := (p_user_id::bigint << 32) # coalesce(p_team_id,0)::bigint;
    v_container_id integer;
  BEGIN
    -- acquire advisory lock
    IF NOT acquire_advisory_lock(v_lock_key, 5) THEN
      RAISE EXCEPTION 'Could not acquire advisory lock for user %', p_user_id;
    END IF;

    BEGIN
      -- check and reserve quota
      v_ok := check_and_reserve_quota(p_user_id, p_team_id, p_cpu, p_memory_mb, p_disk_mb);
      IF NOT v_ok THEN
        PERFORM release_advisory_lock(v_lock_key);
        RETURN NULL;
      END IF;

      -- create container row with status 'creating' (status_id default should apply)
      INSERT INTO containers (lxc_name, owner_user_id, template_id, image, cpu, memory_mb, disk_mb, metadata, created_at)
      VALUES (
        concat('plab-', (nextval('containers_id_seq'))::text),
        p_user_id, p_template_id, p_image, p_cpu, p_memory_mb, p_disk_mb, '{}'::jsonb, now()
      ) RETURNING id INTO v_container_id;

      -- return the container id to caller
      RETURN v_container_id;
    EXCEPTION WHEN OTHERS THEN
      PERFORM release_advisory_lock(v_lock_key);
      RAISE;
    END;

    -- release lock (caller may still hold/ask backend to keep until LXC creation completes)
    PERFORM release_advisory_lock(v_lock_key);

    RETURN v_container_id;
  END;
  $$ LANGUAGE plpgsql;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS reserve_container_row(integer, integer, integer, text, integer, integer, integer);`);
};
