/* Adjust FK on-delete behavior for a few sensitive relations to avoid accidental cascading deletes.
   For example: containers.owner_user_id should be SET NULL on user deletion (so container metadata remains).
   Also make sure templates/dependency_sets maintain safe behavior.
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Helper function (raw SQL) to drop and recreate FK with different ON DELETE action.
  // 1) containers.owner_user_id  -> SET NULL (previously cascade)
  pgm.sql(`
    ALTER TABLE containers
    DROP CONSTRAINT IF EXISTS containers_owner_user_id_fkey;
  `);
  pgm.sql(`
    ALTER TABLE containers
    ADD CONSTRAINT containers_owner_user_id_fkey FOREIGN KEY (owner_user_id)
    REFERENCES users(id) ON DELETE SET NULL;
  `);

  // 2) snapshots.container_id -> cascade remains OK (keep)
  // 3) templates.created_by -> SET NULL (already set, but ensure constraint exists)
  pgm.sql(`
    ALTER TABLE templates
    DROP CONSTRAINT IF EXISTS templates_created_by_fkey;
  `);
  pgm.sql(`
    ALTER TABLE templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL;
  `);

  // 4) dependency_sets.created_by -> SET NULL
  pgm.sql(`
    ALTER TABLE dependency_sets
    DROP CONSTRAINT IF EXISTS dependency_sets_created_by_fkey;
  `);
  pgm.sql(`
    ALTER TABLE dependency_sets
    ADD CONSTRAINT dependency_sets_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL;
  `);

  // 5) roles remain restrict (do not allow delete if referenced)
  // 6) assignments.assigned_to_user_id -> SET NULL on delete (preserve assignment record)
  pgm.sql(`
    ALTER TABLE assignments
    DROP CONSTRAINT IF EXISTS assignments_assigned_to_user_id_fkey;
  `);
  pgm.sql(`
    ALTER TABLE assignments
    ADD CONSTRAINT assignments_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id)
    REFERENCES users(id) ON DELETE SET NULL;
  `);
};

exports.down = (pgm) => {
  // revert some to cascade where previously cascade was present (best effort)
  pgm.sql(`
    ALTER TABLE containers
    DROP CONSTRAINT IF EXISTS containers_owner_user_id_fkey;
  `);
  pgm.sql(`
    ALTER TABLE containers
    ADD CONSTRAINT containers_owner_user_id_fkey FOREIGN KEY (owner_user_id)
    REFERENCES users(id) ON DELETE CASCADE;
  `);

  pgm.sql(`
    ALTER TABLE templates
    DROP CONSTRAINT IF EXISTS templates_created_by_fkey;
  `);
  pgm.sql(`
    ALTER TABLE templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE CASCADE;
  `);

  pgm.sql(`
    ALTER TABLE dependency_sets
    DROP CONSTRAINT IF EXISTS dependency_sets_created_by_fkey;
  `);
  pgm.sql(`
    ALTER TABLE dependency_sets
    ADD CONSTRAINT dependency_sets_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE CASCADE;
  `);

  pgm.sql(`
    ALTER TABLE assignments
    DROP CONSTRAINT IF EXISTS assignments_assigned_to_user_id_fkey;
  `);
  pgm.sql(`
    ALTER TABLE assignments
    ADD CONSTRAINT assignments_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id)
    REFERENCES users(id) ON DELETE CASCADE;
  `);
};
