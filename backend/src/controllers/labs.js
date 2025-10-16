// src/controllers/labs.js
const { query } = require('../../config/database');

// Get all LABs with user and status information
const getAllLabs = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', userId = '' } = req.query;
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (c.lxc_name ILIKE $${paramCount} OR u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND cs.name = $${paramCount}`;
      params.push(status);
    }

    if (userId) {
      paramCount++;
      whereClause += ` AND c.owner_user_id = $${paramCount}`;
      params.push(userId);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM containers c
      LEFT JOIN users u ON c.owner_user_id = u.id
      LEFT JOIN container_statuses cs ON c.status_id = cs.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const totalLabs = parseInt(countResult.rows[0].total);

    // Get LABs with pagination
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const labsQuery = `
      SELECT
        c.id,
        c.lxc_name,
        c.owner_user_id,
        c.image,
        c.cpu,
        c.memory_mb,
        c.disk_mb,
        c.ip_address,
        c.started_at,
        c.stopped_at,
        c.created_at,
        u.name as owner_name,
        u.email as owner_email,
        cs.name as status,
        cs.id as status_id
      FROM containers c
      LEFT JOIN users u ON c.owner_user_id = u.id
      LEFT JOIN container_statuses cs ON c.status_id = cs.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    params.push(limit, offset);
    const labsResult = await query(labsQuery, params);

    res.json({
      success: true,
      data: labsResult.rows,
      pagination: {
        total: totalLabs,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalLabs / limit)
      }
    });

  } catch (error) {
    console.error('Get all labs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LABs',
      error: error.message
    });
  }
};

// Get single LAB by ID
const getLabById = async (req, res) => {
  try {
    const { id } = req.params;

    const labQuery = `
      SELECT
        c.id,
        c.lxc_name,
        c.owner_user_id,
        c.template_id,
        c.image,
        c.cpu,
        c.memory_mb,
        c.disk_mb,
        c.ip_address,
        c.metadata,
        c.started_at,
        c.stopped_at,
        c.created_at,
        u.name as owner_name,
        u.email as owner_email,
        cs.name as status,
        cs.id as status_id
      FROM containers c
      LEFT JOIN users u ON c.owner_user_id = u.id
      LEFT JOIN container_statuses cs ON c.status_id = cs.id
      WHERE c.id = $1
    `;

    const result = await query(labQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'LAB not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get lab by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LAB',
      error: error.message
    });
  }
};

// Create new LAB
const createLab = async (req, res) => {
  try {
    const { lxc_name, owner_user_id, image, cpu, memory_mb, disk_mb } = req.body;

    // Validate required fields
    if (!lxc_name || !owner_user_id || !image) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: lxc_name, owner_user_id, image'
      });
    }

    // Check if lxc_name already exists
    const existingLab = await query('SELECT id FROM containers WHERE lxc_name = $1', [lxc_name]);
    if (existingLab.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'LAB name already exists'
      });
    }

    // Verify user exists
    const userCheck = await query('SELECT id, name FROM users WHERE id = $1', [owner_user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Create LAB
    const insertQuery = `
      INSERT INTO containers (
        lxc_name,
        owner_user_id,
        image,
        cpu,
        memory_mb,
        disk_mb,
        status_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW())
      RETURNING *
    `;

    const result = await query(insertQuery, [
      lxc_name,
      owner_user_id,
      image,
      cpu || 1,
      memory_mb || 1024,
      disk_mb || 10240
    ]);

    res.status(201).json({
      success: true,
      message: 'LAB created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create lab error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create LAB',
      error: error.message
    });
  }
};

// Update LAB
const updateLab = async (req, res) => {
  try {
    const { id } = req.params;
    const { lxc_name, owner_user_id, image, cpu, memory_mb, disk_mb, status_id } = req.body;

    // Check if LAB exists
    const existingLab = await query('SELECT * FROM containers WHERE id = $1', [id]);
    if (existingLab.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'LAB not found'
      });
    }

    // Check if lxc_name is being changed and if it conflicts
    if (lxc_name && lxc_name !== existingLab.rows[0].lxc_name) {
      const nameCheck = await query('SELECT id FROM containers WHERE lxc_name = $1 AND id != $2', [lxc_name, id]);
      if (nameCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'LAB name already exists'
        });
      }
    }

    // Verify user exists if being changed
    if (owner_user_id) {
      const userCheck = await query('SELECT id FROM users WHERE id = $1', [owner_user_id]);
      if (userCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (lxc_name) {
      paramCount++;
      updates.push(`lxc_name = $${paramCount}`);
      params.push(lxc_name);
    }

    if (owner_user_id) {
      paramCount++;
      updates.push(`owner_user_id = $${paramCount}`);
      params.push(owner_user_id);
    }

    if (image) {
      paramCount++;
      updates.push(`image = $${paramCount}`);
      params.push(image);
    }

    if (cpu) {
      paramCount++;
      updates.push(`cpu = $${paramCount}`);
      params.push(cpu);
    }

    if (memory_mb) {
      paramCount++;
      updates.push(`memory_mb = $${paramCount}`);
      params.push(memory_mb);
    }

    if (disk_mb) {
      paramCount++;
      updates.push(`disk_mb = $${paramCount}`);
      params.push(disk_mb);
    }

    if (status_id) {
      paramCount++;
      updates.push(`status_id = $${paramCount}`);
      params.push(status_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    paramCount++;
    params.push(id);

    const updateQuery = `
      UPDATE containers
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, params);

    res.json({
      success: true,
      message: 'LAB updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update lab error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update LAB',
      error: error.message
    });
  }
};

// Delete LAB
const deleteLab = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if LAB exists
    const existingLab = await query('SELECT * FROM containers WHERE id = $1', [id]);
    if (existingLab.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'LAB not found'
      });
    }

    // Delete LAB
    const deleteQuery = `
      DELETE FROM containers
      WHERE id = $1
      RETURNING id, lxc_name
    `;

    const result = await query(deleteQuery, [id]);

    res.json({
      success: true,
      message: 'LAB deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Delete lab error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete LAB',
      error: error.message
    });
  }
};

// Get LAB statistics
const getLabStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_labs,
        COUNT(*) FILTER (WHERE cs.name = 'running') as running_labs,
        COUNT(*) FILTER (WHERE cs.name = 'stopped') as stopped_labs,
        COUNT(*) FILTER (WHERE cs.name = 'creating') as creating_labs,
        COUNT(*) FILTER (WHERE cs.name = 'failed') as failed_labs,
        SUM(c.cpu) as total_cpu,
        SUM(c.memory_mb) as total_memory_mb,
        SUM(c.disk_mb) as total_disk_mb
      FROM containers c
      LEFT JOIN container_statuses cs ON c.status_id = cs.id
    `;

    const result = await query(statsQuery);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get lab stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LAB statistics',
      error: error.message
    });
  }
};

// Get users for dropdown
const getUsersForDropdown = async (req, res) => {
  try {
    const usersQuery = `
      SELECT id, name, email
      FROM users
      WHERE status = 'active'
      ORDER BY name
    `;

    const result = await query(usersQuery);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get users for dropdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

module.exports = {
  getAllLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
  getLabStats,
  getUsersForDropdown
};
