// backend/src/controllers/containers.js
const containersDb = require('../services/containers_db');
const { query } = require('../services/database'); // adjust if your query helper lives elsewhere
const { launchLabContainer } = require('../services/lxc/launcher');
const crypto = require('crypto');

function containerName(prefix = 'lab') {
  const suffix = crypto.randomBytes(3).toString('hex'); // e.g. lab-5f3a91
  return `${prefix}-${suffix}`;
}

/**
 * POST /api/containers/launch
 * body: { taskId: number, dependencies: string[], sshPublicKey?: string }
 */
exports.launch = async (req, res, next) => {
  const { taskId, dependencies = [], sshPublicKey } = req.body || {};
  const userId = req.user?.id || req.user?.userId;

  if (!Array.isArray(dependencies)) {
    return res
      .status(400)
      .json({ success: false, message: 'dependencies must be an array' });
  }

  // validate dependency keys against our allow-list
  const allowed = ['node', 'postgresql', 'nginx', 'redis', 'docker', 'mongodb'];
  const invalid = dependencies.filter((d) => !allowed.includes(d));
  if (invalid.length) {
    return res
      .status(400)
      .json({
        success: false,
        message: `Invalid dependencies: ${invalid.join(', ')}`
      });
  }

  const name = containerName('lab');

  try {
    await query('BEGIN');

    // Reserve quota/record row as "creating"
    const result = await containersDb.createContainerRecord(null, {
      containerName: name,
      image: 'ubuntu:24.04',
      taskId,
      ownerUserId: userId,
      status: 'creating',
      externalId: name,
      metadata: { dependencies }
    });
    const containerId = result.rows[0].id;

    // (optional) reserve quota via your DB helper, if you have one:
    // await query('SELECT check_and_reserve_quota($1, $2)', [userId, 'container']);

    // Launch the LXC container (cloud-init installs deps, sets up SSH)
    const info = await launchLabContainer({
      name,
      dependencies,
      userPublicKey: sshPublicKey || null
    });

    // Update DB → running, save IP + metadata
    await query(
      `UPDATE containers
         SET status_id = (SELECT id FROM container_statuses WHERE name='running' LIMIT 1),
             ip_address = $2,
             metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{deps}', to_jsonb($3::text[]))
       WHERE id = $1`,
      [containerId, info.ip, dependencies]
    );

    // Audit log (optional)
    await query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
       VALUES ($1, 'launch_container', 'container', $2, $3::jsonb, NOW())`,
      [userId, containerId, JSON.stringify({ name, dependencies })]
    );

    await query('COMMIT');

    // Return SSH details to the frontend
    return res.status(201).json({
      success: true,
      container: {
        id: containerId,
        name,
        status: 'running',
        ip: info.ip
      },
      ssh: info.ssh,         // { user, host, port, privateKey?(if generated), generatedKey }
      hostKey: info.hostKey  // ssh-keyscan fingerprint (optional display)
    });
  } catch (err) {
    try {
      await query('ROLLBACK');
    } catch {}
    console.error('Launch error:', err);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Failed to launch container',
        error: err.message
      });
  }
};
