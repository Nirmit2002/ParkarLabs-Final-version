⚙️  EXTRACTING FUNCTIONS...
===========================

## File: 1695470000000_create_core_types_and_tables.js


---

## File: 1695470100000_create_courses_modules.js


---

## File: 1695470200000_create_tasks_assignments.js


---

## File: 1695470300000_create_templates_and_dependencies.js


---

## File: 1695470400000_create_containers_and_snapshots.js


---

## File: 1695470500000_create_audit_import_and_metrics.js


---

## File: 1695470600000_create_shared_tables_and_indexes.js

79-  // trigger to keep search_vector up to date
80-  pgm.sql(`
81:    CREATE OR REPLACE FUNCTION courses_tsv_trigger() RETURNS trigger AS $$
82-    begin
83-      new.search_vector := to_tsvector('english', coalesce(new.title,'') || ' ' || coalesce(new.description,''));
84-      return new;
85-    end
86-    $$ LANGUAGE plpgsql;
87-  `);
88-  pgm.sql(`
89-    DROP TRIGGER IF EXISTS tsvectorupdate ON courses;
90-    CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
91-    ON courses FOR EACH ROW EXECUTE PROCEDURE courses_tsv_trigger();
92-  `);
93-
94-  // Add some helpful indexes for FK heavy lookups
95-  pgm.addIndex('assignments', ['task_id']);
96-  pgm.addIndex('tasks', ['created_by']);
97-  pgm.addIndex('templates', ['created_by']);
98-  pgm.addIndex('dependency_sets', ['created_by']);
99-};
100-
101-exports.down = (pgm) => {
102-  pgm.dropIndex('dependency_sets', ['created_by']);
103-  pgm.dropIndex('templates', ['created_by']);
104-  pgm.dropIndex('tasks', ['created_by']);
105-  pgm.dropIndex('assignments', ['task_id']);
106-
107-  pgm.sql(`DROP TRIGGER IF EXISTS tsvectorupdate ON courses;`);
108-  pgm.sql(`DROP FUNCTION IF EXISTS courses_tsv_trigger();`);
109-  pgm.sql(`DROP INDEX IF EXISTS courses_search_idx;`);
110-  pgm.sql(`ALTER TABLE courses DROP COLUMN IF EXISTS search_vector;`);
111-

---

## File: 1695470700000_create_audit_triggers.js

5-  // audit trigger function
6-  pgm.sql(`
7:    CREATE OR REPLACE FUNCTION app_audit_trigger() RETURNS trigger AS $$
8-    DECLARE
9-      v_actor integer := NULL;
10-    BEGIN
11-      -- if actor is passed via current_setting, capture it
12-      BEGIN
13-        v_actor := current_setting('app.current_user_id')::integer;
14-      EXCEPTION WHEN others THEN
15-        v_actor := NULL;
16-      END;
17-
18-      INSERT INTO audit_logs(actor_user_id, action, target_type, target_id, meta, created_at)
19-      VALUES (
20-        v_actor,
21-        TG_OP, -- 'INSERT','UPDATE','DELETE'
22-        TG_TABLE_NAME,
23-        COALESCE( NEW.id::text, OLD.id::text ),
24-        to_jsonb(COALESCE(ROW(OLD.*)::text, ROW(NEW.*)::text)) || jsonb_build_object('changed_columns', to_jsonb(array(SELECT column_name FROM information_schema.columns WHERE table_name = TG_TABLE_NAME))),
25-        now()
26-      );
27-
28-      RETURN NULL; -- audit only; do not modify the row
29-    END;
30-    $$ LANGUAGE plpgsql SECURITY DEFINER;
31-  `);
32-
33-  // Attach trigger to tables: users, containers, assignments, courses, templates, tasks
34-  const tables = ['users','containers','assignments','courses','templates','tasks'];
35-  tables.forEach(t => {
36-    pgm.sql(`
37-      DROP TRIGGER IF EXISTS trg_audit_${t} ON ${t};

---

## File: 1695470800000_add_constraints_and_checks.js


---

## File: 1695470900000_adjust_fk_ondelete_behaviour.js


---

## File: 1695471000000_enforce_assignment_status_fk_like.js


---

## File: 1695471100000_sessions_sshkeys_usage_and_retention.js

57-
58-  await pgm.sql(`
59:    CREATE OR REPLACE FUNCTION move_old_audit_logs(p_days integer) RETURNS void AS $$
60-    BEGIN
61-      INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE created_at < now() - (p_days || ' days')::interval;
62-      DELETE FROM audit_logs WHERE created_at < now() - (p_days || ' days')::interval;
63-    END;
64-    $$ LANGUAGE plpgsql;
65-  `);
66-
67-  await pgm.sql(`
68:    CREATE OR REPLACE FUNCTION purge_old_metrics(p_days integer) RETURNS void AS $$
69-    BEGIN
70-      DELETE FROM metrics WHERE recorded_at < now() - (p_days || ' days')::interval;
71-    END;
72-    $$ LANGUAGE plpgsql;
73-  `);
74-
75-  /* Ensure audit_logs/metrics indexes exist (guarded) */
76-  await pgm.sql(`CREATE INDEX IF NOT EXISTS audit_logs_created_at_index ON audit_logs (created_at);`);
77-  await pgm.sql(`CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_index ON audit_logs (actor_user_id);`);
78-  await pgm.sql(`CREATE INDEX IF NOT EXISTS metrics_recorded_at_index ON metrics (recorded_at);`);
79-};
80-
81-exports.down = async (pgm) => {
82-  await pgm.sql(`DROP INDEX IF EXISTS metrics_recorded_at_index;`);
83-  await pgm.sql(`DROP INDEX IF EXISTS audit_logs_actor_user_id_index;`);
84-  await pgm.sql(`DROP INDEX IF EXISTS audit_logs_created_at_index;`);
85-  await pgm.sql(`DROP FUNCTION IF EXISTS purge_old_metrics(integer);`);
86-  await pgm.sql(`DROP FUNCTION IF EXISTS move_old_audit_logs(integer);`);
87-  await pgm.sql(`DROP TABLE IF EXISTS audit_logs_archive;`);
88-
89-  pgm.dropTable('usage_counters', { ifExists: true });
90-  pgm.dropTable('ssh_keys', { ifExists: true });
91-  pgm.dropTable('sessions', { ifExists: true });
92-};

---

## File: 1695471200000_quota_functions.js

7-exports.up = (pgm) => {
8-  pgm.sql(`
9:  CREATE OR REPLACE FUNCTION check_and_reserve_quota(
10-    p_user_id integer,
11-    p_team_id integer,
12-    p_cores integer,
13-    p_memory_mb bigint,
14-    p_disk_mb bigint
15-  ) RETURNS boolean AS $$
16-  DECLARE
17-    v_quota RECORD;
18-    v_usage RECORD;
19-  BEGIN
20-    -- prefer user-specific quota, fallback to team quota
21-    SELECT * INTO v_quota FROM quotas WHERE user_id = p_user_id LIMIT 1;
22-    IF NOT FOUND THEN
23-      SELECT * INTO v_quota FROM quotas WHERE team_id = p_team_id LIMIT 1;
24-    END IF;
25-
26-    IF NOT FOUND THEN
27-      -- no quota record -> allow (or you may choose to deny)
28-      RETURN TRUE;
29-    END IF;
30-
31-    -- get today's usage
32-    SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND period_start = CURRENT_DATE LIMIT 1;
33-    IF NOT FOUND THEN
34-      -- no usage record yet, create it
35-      INSERT INTO usage_counters(user_id, team_id, period_start, cores_used, memory_mb_used, storage_mb_used, concurrent_containers)
36-      VALUES (p_user_id, p_team_id, CURRENT_DATE, 0, 0, 0, 0);
37-      SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND period_start = CURRENT_DATE LIMIT 1;
38-    END IF;
39-

---

## File: 1695471300000_snapshot_helpers.js

7-  // Create function to record snapshot metadata after LXC snapshot creation (back-end will call this)
8-  pgm.sql(`
9:    CREATE OR REPLACE FUNCTION record_snapshot(p_container_id integer, p_snapshot_name text, p_created_by integer, p_notes text) RETURNS void AS $$
10-    BEGIN
11-      INSERT INTO snapshots(container_id, lxc_snapshot_name, created_by, created_at, notes)
12-      VALUES (p_container_id, p_snapshot_name, p_created_by, now(), p_notes);
13-      INSERT INTO snapshots_metadata(container_id, snapshot_name, created_by, created_at, notes)
14-      VALUES (p_container_id, p_snapshot_name, p_created_by, now(), p_notes);
15-    END;
16-    $$ LANGUAGE plpgsql;
17-  `);
18-};
19-
20-exports.down = (pgm) => {
21-  pgm.dropIndex('snapshots', ['container_id', 'created_at']);
22-  pgm.sql(`DROP FUNCTION IF EXISTS record_snapshot(integer, text, integer, text);`);
23-};

---

## File: 1695471400000_dbroles_rls_and_triggers.js

22-  // Add helper functions: acquire_advisory_lock, release_advisory_lock
23-  pgm.sql(`
24:    CREATE OR REPLACE FUNCTION acquire_advisory_lock(p_key bigint, p_timeout integer DEFAULT 10) RETURNS boolean AS $$
25-    DECLARE
26-      v_got boolean;
27-    BEGIN
28-      SELECT pg_try_advisory_lock(p_key) INTO v_got;
29-      IF v_got THEN RETURN TRUE; END IF;
30-      -- simple retry loop for p_timeout seconds
31-      FOR i IN 1..p_timeout LOOP
32-        PERFORM pg_sleep(1);
33-        SELECT pg_try_advisory_lock(p_key) INTO v_got;
34-        IF v_got THEN RETURN TRUE; END IF;
35-      END LOOP;
36-      RETURN FALSE;
37-    END;
38-    $$ LANGUAGE plpgsql;
39-  `);
40-
41-  pgm.sql(`
42:    CREATE OR REPLACE FUNCTION release_advisory_lock(p_key bigint) RETURNS boolean AS $$
43-    BEGIN
44-      RETURN pg_advisory_unlock(p_key);
45-    END;
46-    $$ LANGUAGE plpgsql;
47-  `);
48-
49-  // assignment_history trigger function (maintain history on status change)
50-  pgm.sql(`
51:    CREATE OR REPLACE FUNCTION assignment_status_history() RETURNS trigger AS $$
52-    BEGIN
53-      IF TG_OP = 'UPDATE' THEN
54-        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
55-          INSERT INTO assignment_history(assignment_id, previous_status, new_status, changed_by, note, changed_at)
56-          VALUES (OLD.id, OLD.status, NEW.status, current_setting('app.current_user_id', true)::integer, NULL, now());
57-        END IF;
58-      ELSIF TG_OP = 'INSERT' THEN
59-        INSERT INTO assignment_history(assignment_id, previous_status, new_status, changed_by, note, changed_at)
60-        VALUES (NEW.id, NULL, NEW.status, current_setting('app.current_user_id', true)::integer, 'created', now());
61-      END IF;
62-      RETURN NEW;
63-    END;
64-    $$ LANGUAGE plpgsql SECURITY DEFINER;
65-  `);
66-
67-  // attach trigger
68-  pgm.sql(`
69-    DROP TRIGGER IF EXISTS trg_assignment_history ON assignments;
70-    CREATE TRIGGER trg_assignment_history
71-      AFTER INSERT OR UPDATE ON assignments
72-      FOR EACH ROW EXECUTE PROCEDURE assignment_status_history();
73-  `);
74-
75-  // notification trigger: on assignment INSERT or status change produce notification for assigned user
76-  pgm.sql(`
77:    CREATE OR REPLACE FUNCTION assignment_notify_trigger() RETURNS trigger AS $$
78-    DECLARE
79-      v_user integer;
80-      v_payload jsonb;
81-    BEGIN
82-      IF TG_OP = 'INSERT' THEN
83-        v_user := NEW.assigned_to_user_id;
84-        v_payload := jsonb_build_object('type','assignment_assigned','assignment_id', NEW.id);
85-      ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
86-        v_user := NEW.assigned_to_user_id;
87-        v_payload := jsonb_build_object('type','assignment_status_changed','assignment_id', NEW.id, 'from', OLD.status, 'to', NEW.status);
88-      ELSE
89-        RETURN NEW;
90-      END IF;
91-
92-      IF v_user IS NOT NULL THEN
93-        INSERT INTO notifications(user_id, type, payload, read, created_at)
94-        VALUES (v_user, (v_payload->>'type')::text, v_payload, false, now());
95-      END IF;
96-
97-      RETURN NEW;
98-    END;
99-    $$ LANGUAGE plpgsql SECURITY DEFINER;
100-  `);
101-
102-  pgm.sql(`
103-    DROP TRIGGER IF EXISTS trg_assignment_notify ON assignments;
104-    CREATE TRIGGER trg_assignment_notify
105-      AFTER INSERT OR UPDATE ON assignments
106-      FOR EACH ROW EXECUTE PROCEDURE assignment_notify_trigger();
107-  `);

---

## File: 1695471500000_transactional_container_provisioning.js

6-exports.up = (pgm) => {
7-  pgm.sql(`
8:  CREATE OR REPLACE FUNCTION reserve_container_row(
9-    p_user_id integer,
10-    p_team_id integer,
11-    p_template_id integer,
12-    p_image text,
13-    p_cpu integer,
14-    p_memory_mb integer,
15-    p_disk_mb integer
16-  ) RETURNS integer AS $$
17-  DECLARE
18-    v_ok boolean;
19-    v_lock_key bigint := (p_user_id::bigint << 32) # coalesce(p_team_id,0)::bigint;
20-    v_container_id integer;
21-  BEGIN
22-    -- acquire advisory lock
23-    IF NOT acquire_advisory_lock(v_lock_key, 5) THEN
24-      RAISE EXCEPTION 'Could not acquire advisory lock for user %', p_user_id;
25-    END IF;
26-
27-    BEGIN
28-      -- check and reserve quota
29-      v_ok := check_and_reserve_quota(p_user_id, p_team_id, p_cpu, p_memory_mb, p_disk_mb);
30-      IF NOT v_ok THEN
31-        PERFORM release_advisory_lock(v_lock_key);
32-        RETURN NULL;
33-      END IF;
34-
35-      -- create container row with status 'creating' (status_id default should apply)
36-      INSERT INTO containers (lxc_name, owner_user_id, template_id, image, cpu, memory_mb, disk_mb, metadata, created_at)
37-      VALUES (
38-        concat('plab-', (nextval('containers_id_seq'))::text),

---

## File: 1695471600000_web_ssh_sessions.js


---

## File: 1695471700000_container_lifecycle.js

20-  // create function enforce_container_status_transition(new_status_id integer, old_status_id integer) used by trigger
21-  pgm.sql(`
22:    CREATE OR REPLACE FUNCTION enforce_container_status_transition() RETURNS trigger AS $$
23-    DECLARE
24-      v_old integer := COALESCE(OLD.status_id, NULL);
25-      v_new integer := COALESCE(NEW.status_id, NULL);
26-      v_valid boolean := TRUE;
27-      -- set of allowed transitions (example). You can extend this logic.
28-    BEGIN
29-      IF v_old IS NULL THEN
30-        v_valid := TRUE; -- initial insert always allowed
31-      ELSE
32-        -- allow same status
33-        IF v_old = v_new THEN
34-          v_valid := TRUE;
35-        ELSE
36-          -- Simple policy example:
37-          -- creating -> running, creating -> failed, running -> stopped, stopped -> running, any -> deleting
38-          PERFORM CASE
39-            WHEN (v_old = (SELECT id FROM container_statuses WHERE name='creating' LIMIT 1) AND v_new IN ((SELECT id FROM container_statuses WHERE name='running' LIMIT 1), (SELECT id FROM container_statuses WHERE name='failed' LIMIT 1))) THEN NULL
40-            WHEN (v_old = (SELECT id FROM container_statuses WHERE name='running' LIMIT 1) AND v_new = (SELECT id FROM container_statuses WHERE name='stopped' LIMIT 1)) THEN NULL
41-            WHEN (v_old = (SELECT id FROM container_statuses WHERE name='stopped' LIMIT 1) AND v_new = (SELECT id FROM container_statuses WHERE name='running' LIMIT 1)) THEN NULL
42-            WHEN (v_new = (SELECT id FROM container_statuses WHERE name='deleting' LIMIT 1)) THEN NULL
43-            ELSE RAISE EXCEPTION 'Invalid container status transition from % to %', v_old, v_new
44-          END CASE;
45-        END IF;
46-      END IF;
47-
48-      -- audit the change
49-      INSERT INTO container_lifecycle(container_id, old_status_id, new_status_id, changed_by, changed_at)
50-      VALUES (COALESCE(NEW.id, OLD.id), v_old, v_new, current_setting('app.current_user_id', true)::integer, now());
51-
52-      RETURN NEW;

---

## File: 1695471800000_search_indexes.js


---

## File: 1695471900000_monitoring_views.js

25-  // refresh function
26-  pgm.sql(`
27:    CREATE OR REPLACE FUNCTION refresh_monitoring_materialized_views() RETURNS void AS $$
28-    BEGIN
29-      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_containers_per_user;
30-      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_containers_by_status;
31-    EXCEPTION WHEN unique_violation THEN
32-      -- fallback to non-concurrent if concurrent refresh not possible
33-      REFRESH MATERIALIZED VIEW mv_active_containers_per_user;
34-      REFRESH MATERIALIZED VIEW mv_containers_by_status;
35-    END;
36-    $$ LANGUAGE plpgsql;
37-  `);
38-
39-  // create helper index on mv_active_containers_per_user for query speed (no-op if exists)
40-  pgm.sql("CREATE INDEX IF NOT EXISTS mv_active_containers_per_user_user_id_idx ON mv_active_containers_per_user (user_id);");
41-};
42-
43-exports.down = (pgm) => {
44-  pgm.sql("DROP FUNCTION IF EXISTS refresh_monitoring_materialized_views();");
45-  pgm.sql("DROP MATERIALIZED VIEW IF EXISTS mv_active_containers_per_user;");
46-  pgm.sql("DROP MATERIALIZED VIEW IF EXISTS mv_containers_by_status;");
47-  pgm.sql("DROP INDEX IF EXISTS mv_active_containers_per_user_user_id_idx;");
48-};

---

## File: 1695472000000_import_job_improvements.js


---

## File: 1695472100000_template_versioning.js

21-  pgm.addIndex('template_versions', ['template_id']);
22-  pgm.sql(`
23:    CREATE OR REPLACE FUNCTION promote_template_version(p_template_id integer, p_version_id integer) RETURNS void AS $$
24-    DECLARE v_row template_versions%ROWTYPE;
25-    BEGIN
26-      SELECT * INTO v_row FROM template_versions WHERE id = p_version_id AND template_id = p_template_id;
27-      IF NOT FOUND THEN
28-        RAISE EXCEPTION 'Version not found';
29-      END IF;
30-      UPDATE templates SET image = v_row.image, default_cpu = v_row.cpu, default_memory_mb = v_row.memory_mb, default_disk_mb = v_row.disk_mb, init_script = v_row.init_script, updated_at = now() WHERE id = p_template_id;
31-    END;
32-    $$ LANGUAGE plpgsql;
33-  `);
34-};
35-
36-exports.down = (pgm) => {
37-  pgm.sql(`DROP FUNCTION IF EXISTS promote_template_version(integer, integer);`);
38-  pgm.dropTable('template_versions');
39-};

---

## File: 1695472200000_lxc_operation_queue_and_audit.js


---

## File: 1695472300000_billing_and_export.js

19-
20-  pgm.sql(`
21:    CREATE OR REPLACE FUNCTION generate_usage_export(p_start date, p_end date, p_user_id integer) RETURNS integer AS $$
22-    DECLARE
23-      v_id integer;
24-      v_path text;
25-    BEGIN
26-      INSERT INTO usage_exports(generated_by, period_start, period_end, status, created_at)
27-      VALUES (p_user_id, p_start, p_end, 'pending', now()) RETURNING id INTO v_id;
28-
29-      v_path := '/root/ParkarLabs/db/q/usage_export_' || v_id || '.csv';
30-
31-      EXECUTE format('COPY (SELECT * FROM usage_counters WHERE period_start BETWEEN %L AND %L) TO %L WITH CSV HEADER', p_start::text, p_end::text, v_path);
32-
33-      UPDATE usage_exports SET storage_path = v_path, status = 'ready', completed_at = now() WHERE id = v_id;
34-
35-      RETURN v_id;
36-    END;
37-    $$ LANGUAGE plpgsql;
38-  `);
39-};
40-
41-exports.down = (pgm) => {
42-  pgm.sql(`DROP FUNCTION IF EXISTS generate_usage_export(date, date, integer);`);
43-  pgm.dropTable('usage_exports');
44-};

---

## File: 1695472400000_housekeeping_and_health.js


---

