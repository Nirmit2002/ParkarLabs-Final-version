🗃️  EXTRACTING TABLE STRUCTURES...
=================================

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


---

## File: 1695470700000_create_audit_triggers.js


---

## File: 1695470800000_add_constraints_and_checks.js


---

## File: 1695470900000_adjust_fk_ondelete_behaviour.js


---

## File: 1695471000000_enforce_assignment_status_fk_like.js


---

## File: 1695471100000_sessions_sshkeys_usage_and_retention.js

55:    CREATE TABLE IF NOT EXISTS audit_logs_archive (LIKE audit_logs INCLUDING ALL) INHERITS (audit_logs);
56-  `);
57-
58-  await pgm.sql(`
59-    CREATE OR REPLACE FUNCTION move_old_audit_logs(p_days integer) RETURNS void AS $$
60-    BEGIN
61-      INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE created_at < now() - (p_days || ' days')::interval;
62-      DELETE FROM audit_logs WHERE created_at < now() - (p_days || ' days')::interval;
63-    END;
64-    $$ LANGUAGE plpgsql;
65-  `);
66-
67-  await pgm.sql(`
68-    CREATE OR REPLACE FUNCTION purge_old_metrics(p_days integer) RETURNS void AS $$
69-    BEGIN
70-      DELETE FROM metrics WHERE recorded_at < now() - (p_days || ' days')::interval;
71-    END;
72-    $$ LANGUAGE plpgsql;
73-  `);
74-
75-  /* Ensure audit_logs/metrics indexes exist (guarded) */

---

## File: 1695471200000_quota_functions.js


---

## File: 1695471300000_snapshot_helpers.js


---

## File: 1695471400000_dbroles_rls_and_triggers.js


---

## File: 1695471500000_transactional_container_provisioning.js


---

## File: 1695471600000_web_ssh_sessions.js


---

## File: 1695471700000_container_lifecycle.js

7:  // Add container lifecycle audit table (idempotent via CREATE TABLE IF NOT EXISTS)
8-  pgm.sql(`
9:    CREATE TABLE IF NOT EXISTS container_lifecycle (
10-      id bigserial PRIMARY KEY,
11-      container_id integer REFERENCES containers(id) ON DELETE CASCADE,
12-      old_status_id integer,
13-      new_status_id integer,
14-      reason text,
15-      changed_by integer REFERENCES users(id) ON DELETE SET NULL,
16-      changed_at timestamp DEFAULT current_timestamp NOT NULL
17-    );
18-  `);
19-
20-  // create function enforce_container_status_transition(new_status_id integer, old_status_id integer) used by trigger
21-  pgm.sql(`
22-    CREATE OR REPLACE FUNCTION enforce_container_status_transition() RETURNS trigger AS $$
23-    DECLARE
24-      v_old integer := COALESCE(OLD.status_id, NULL);
25-      v_new integer := COALESCE(NEW.status_id, NULL);
26-      v_valid boolean := TRUE;
27-      -- set of allowed transitions (example). You can extend this logic.
28-    BEGIN
29-      IF v_old IS NULL THEN

---

## File: 1695471800000_search_indexes.js


---

## File: 1695471900000_monitoring_views.js


---

## File: 1695472000000_import_job_improvements.js


---

## File: 1695472100000_template_versioning.js


---

## File: 1695472200000_lxc_operation_queue_and_audit.js


---

## File: 1695472300000_billing_and_export.js


---

## File: 1695472400000_housekeeping_and_health.js


---

