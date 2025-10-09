// src/controllers/users.js
const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');

// Get all users with filtering and search
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      whereClause += ` AND r.name = $${paramCount}`;
      params.push(role);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND u.status = $${paramCount}`;
      params.push(status);
    }

    // Valid sort columns
    const validSortColumns = ['name', 'email', 'created_at', 'status'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const totalUsers = parseInt(countResult.rows[0].total);

    // Get users with pagination
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const usersQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.azure_ad_id,
        u.status,
        u.created_at,
        r.name as role_name,
        r.description as role_description,
        (SELECT COUNT(*) FROM assignments WHERE assigned_to_user_id = u.id) as total_assignments,
        (SELECT COUNT(*) FROM assignments WHERE assigned_to_user_id = u.id AND status = 'completed') as completed_assignments,
        (SELECT COUNT(*) FROM containers WHERE owner_user_id = u.id) as total_containers,
        (SELECT COUNT(*) FROM containers WHERE owner_user_id = u.id AND status_id = (SELECT id FROM container_statuses WHERE name = 'running' LIMIT 1)) as running_containers
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.${sortColumn} ${order}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    params.push(limit, offset);
    const usersResult = await query(usersQuery, params);

    res.json({
      success: true,
      data: usersResult.rows,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalUsers / limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const userQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.azure_ad_id,
        u.status,
        u.provisioning_pref,
        u.created_at,
        r.id as role_id,
        r.name as role_name,
        r.description as role_description,
        (SELECT COUNT(*) FROM assignments WHERE assigned_to_user_id = u.id) as total_assignments,
        (SELECT COUNT(*) FROM assignments WHERE assigned_to_user_id = u.id AND status = 'assigned') as pending_assignments,
        (SELECT COUNT(*) FROM assignments WHERE assigned_to_user_id = u.id AND status = 'in_progress') as in_progress_assignments,
        (SELECT COUNT(*) FROM assignments WHERE assigned_to_user_id = u.id AND status = 'completed') as completed_assignments,
        (SELECT COUNT(*) FROM containers WHERE owner_user_id = u.id) as total_containers,
        (SELECT COUNT(*) FROM containers WHERE owner_user_id = u.id AND status_id = (SELECT id FROM container_statuses WHERE name = 'running' LIMIT 1)) as running_containers,
        (SELECT MAX(created_at) FROM audit_logs WHERE actor_user_id = u.id) as last_activity
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;

    const result = await query(userQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get recent activities
    const activitiesQuery = `
      SELECT
        action,
        target_type,
        target_id,
        created_at,
        meta
      FROM audit_logs
      WHERE actor_user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const activitiesResult = await query(activitiesQuery, [id]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        recent_activities: activitiesResult.rows
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    const { name, email, role_id, azure_ad_id, provisioning_pref } = req.body;

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if azure_ad_id already exists (if provided)
    if (azure_ad_id) {
      const existingAzureUser = await query('SELECT id FROM users WHERE azure_ad_id = $1', [azure_ad_id]);
      if (existingAzureUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Azure AD ID already exists'
        });
      }
    }

    // Verify role exists
    const roleCheck = await query('SELECT id, name FROM roles WHERE id = $1', [role_id]);
    if (roleCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
    }

    // Create user
    const insertQuery = `
      INSERT INTO users (
        name,
        email,
        role_id,
        azure_ad_id,
        provisioning_pref,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, 'active', NOW())
      RETURNING id, name, email, azure_ad_id, status, created_at
    `;

    const result = await query(insertQuery, [
      name,
      email,
      role_id,
      azure_ad_id || `local_${Date.now()}`,
      provisioning_pref ? JSON.stringify(provisioning_pref) : null
    ]);

    // Log the creation
    await query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
       VALUES ($1, 'CREATE', 'user', $2, $3, NOW())`,
      [req.user.userId, result.rows[0].id.toString(), JSON.stringify({ created_by: req.user.name })]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...result.rows[0],
        role_name: roleCheck.rows[0].name
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role_id, status, provisioning_pref } = req.body;

    // Check if user exists
    const existingUser = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it conflicts
    if (email && email !== existingUser.rows[0].email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Verify role exists if being changed
    if (role_id) {
      const roleCheck = await query('SELECT id, name FROM roles WHERE id = $1', [role_id]);
      if (roleCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }

    if (email) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      params.push(email);
    }

    if (role_id) {
      paramCount++;
      updates.push(`role_id = $${paramCount}`);
      params.push(role_id);
    }

    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (provisioning_pref) {
      paramCount++;
      updates.push(`provisioning_pref = $${paramCount}`);
      params.push(JSON.stringify(provisioning_pref));
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
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, email, azure_ad_id, status, created_at
    `;

    const result = await query(updateQuery, params);

    // Log the update
    await query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
       VALUES ($1, 'UPDATE', 'user', $2, $3, NOW())`,
      [req.user.userId, id, JSON.stringify({ updated_by: req.user.name, changes: req.body })]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Delete user (soft delete by setting status to 'disabled')
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete by setting status to 'disabled'
    const updateQuery = `
      UPDATE users
      SET status = 'disabled'
      WHERE id = $1
      RETURNING id, name, email, status
    `;

    const result = await query(updateQuery, [id]);

    // Log the deletion
    await query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
       VALUES ($1, 'DELETE', 'user', $2, $3, NOW())`,
      [req.user.userId, id, JSON.stringify({ deleted_by: req.user.name })]
    );

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Get available roles for user creation/editing
const getRoles = async (req, res) => {
  try {
    const rolesQuery = `
      SELECT id, name, description
      FROM roles
      ORDER BY name
    `;

    const result = await query(rolesQuery);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE u.status = 'active') as active_users,
        COUNT(*) FILTER (WHERE u.status = 'disabled') as disabled_users,
        COUNT(*) FILTER (WHERE r.name = 'admin') as admin_users,
        COUNT(*) FILTER (WHERE r.name = 'manager') as manager_users,
        COUNT(*) FILTER (WHERE r.name = 'employee') as employee_users,
        COUNT(*) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_this_month,
        COUNT(*) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_this_week
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
    `;

    const result = await query(statsQuery);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getUserStats
};
