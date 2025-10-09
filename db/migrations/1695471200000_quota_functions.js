/* Quota enforcement helpers:
   - function: check_quota_for_user(user_id, required_cores, required_memory_mb, required_disk_mb)
   - function updates/reads usage_counters and returns boolean (allowed or not)
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
  CREATE OR REPLACE FUNCTION check_and_reserve_quota(
    p_user_id integer,
    p_team_id integer,
    p_cores integer,
    p_memory_mb bigint,
    p_disk_mb bigint
  ) RETURNS boolean AS $$
  DECLARE
    v_quota RECORD;
    v_usage RECORD;
  BEGIN
    -- prefer user-specific quota, fallback to team quota
    SELECT * INTO v_quota FROM quotas WHERE user_id = p_user_id LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_quota FROM quotas WHERE team_id = p_team_id LIMIT 1;
    END IF;

    IF NOT FOUND THEN
      -- no quota record -> allow (or you may choose to deny)
      RETURN TRUE;
    END IF;

    -- get today's usage
    SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND period_start = CURRENT_DATE LIMIT 1;
    IF NOT FOUND THEN
      -- no usage record yet, create it
      INSERT INTO usage_counters(user_id, team_id, period_start, cores_used, memory_mb_used, storage_mb_used, concurrent_containers)
      VALUES (p_user_id, p_team_id, CURRENT_DATE, 0, 0, 0, 0);
      SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND period_start = CURRENT_DATE LIMIT 1;
    END IF;

    -- Check limits
    IF v_quota.cores_limit IS NOT NULL AND (v_usage.cores_used + p_cores) > v_quota.cores_limit THEN
      RETURN FALSE;
    END IF;

    IF v_quota.memory_mb_limit IS NOT NULL AND (v_usage.memory_mb_used + p_memory_mb) > v_quota.memory_mb_limit THEN
      RETURN FALSE;
    END IF;

    IF v_quota.disk_mb_limit IS NOT NULL AND (v_usage.storage_mb_used + p_disk_mb) > v_quota.disk_mb_limit THEN
      RETURN FALSE;
    END IF;

    -- Reserve: update usage counters (this is simplistic and meant to be used inside transactional ops)
    UPDATE usage_counters
    SET cores_used = cores_used + p_cores,
        memory_mb_used = memory_mb_used + p_memory_mb,
        storage_mb_used = storage_mb_used + p_disk_mb,
        updated_at = now()
    WHERE id = v_usage.id;

    RETURN TRUE;
  END;
  $$ LANGUAGE plpgsql;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS check_and_reserve_quota(integer, integer, integer, bigint, bigint);`);
};
