// src/controllers/profile.js
const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const path = require('path');
const fs = require('fs').promises;

// Get user profile (including profile picture)
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.status,
        u.created_at,
        u.profile_pic,
        r.id as role_id,
        r.name as role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        roleId: user.role_id,
        roleDescription: user.role_description,
        status: user.status,
        profilePic: user.profile_pic,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
};

// Update user profile (name, email)
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if email is already taken by another user
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.toLowerCase(), userId]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already taken by another user'
      });
    }

    // Update user profile
    const result = await query(`
      UPDATE users
      SET name = $1, email = $2
      WHERE id = $3
      RETURNING id, name, email, status, created_at, profile_pic
    `, [name.trim(), email.toLowerCase(), userId]);

    // Log the update
    await query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
       VALUES ($1, 'UPDATE', 'user_profile', $2, $3, NOW())`,
      [userId, userId.toString(), JSON.stringify({
        updated_fields: ['name', 'email'],
        ip: req.ip
      })]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Generate the profile picture URL path
    const profilePicPath = `/uploads/profiles/${req.file.filename}`;

    // Get old profile picture to delete it
    const oldPicResult = await query(
      'SELECT profile_pic FROM users WHERE id = $1',
      [userId]
    );

    const oldProfilePic = oldPicResult.rows[0]?.profile_pic;

    // Update user's profile picture in database
    const result = await query(`
      UPDATE users
      SET profile_pic = $1
      WHERE id = $2
      RETURNING id, name, email, profile_pic
    `, [profilePicPath, userId]);

    // Delete old profile picture file if it exists
    if (oldProfilePic) {
      try {
        const oldFilePath = path.join(__dirname, '../../public', oldProfilePic);
        await fs.unlink(oldFilePath);
      } catch (err) {
        // Ignore errors if file doesn't exist
        console.log('Could not delete old profile picture:', err.message);
      }
    }

    // Log the update
    await query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
       VALUES ($1, 'UPDATE', 'profile_picture', $2, $3, NOW())`,
      [userId, userId.toString(), JSON.stringify({
        new_picture: profilePicPath,
        ip: req.ip
      })]
    );

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePic: profilePicPath
      }
    });

  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    console.log('=== PASSWORD CHANGE REQUEST ===');
    console.log('User ID:', userId);
    console.log('Old password provided:', !!oldPassword);
    console.log('New password provided:', !!newPassword);
    console.log('Confirm password provided:', !!confirmPassword);

    // Validate input
    if (!oldPassword || !newPassword || !confirmPassword) {
      console.log('ERROR: Missing password fields');
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }

    // Check if new password matches confirm password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match'
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current password hash from local_auth table
    let passwordHash = null;
    console.log('Checking local_auth table...');
    const localAuthResult = await query(
      'SELECT password_hash FROM local_auth WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (localAuthResult.rows.length > 0) {
      passwordHash = localAuthResult.rows[0].password_hash;
      console.log('Found password in local_auth table');
    } else {
      console.log('Not found in local_auth, checking sessions table...');
      // Fallback: check sessions table
      const sessionResult = await query(
        'SELECT meta FROM sessions WHERE user_id = $1 AND provider = \'local\' ORDER BY created_at DESC LIMIT 1',
        [userId]
      );

      if (sessionResult.rows.length > 0 && sessionResult.rows[0].meta?.password_hash) {
        passwordHash = sessionResult.rows[0].meta.password_hash;
        console.log('Found password in sessions table');
      } else {
        console.log('Not found in sessions table either');
      }
    }

    if (!passwordHash) {
      console.log('ERROR: No password found for user');
      return res.status(400).json({
        success: false,
        message: 'No password set for this account. Please contact administrator.'
      });
    }

    // Verify old password
    console.log('Verifying old password...');
    const isValidPassword = await bcrypt.compare(oldPassword, passwordHash);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('ERROR: Old password incorrect');
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    console.log('Hashing new password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Get user email for local_auth table
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userResult.rows[0].email;

    console.log('Updating local_auth table...');
    // Update or insert password in local_auth table
    const updateResult = await query(
      `INSERT INTO local_auth (user_id, email, password_hash, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET password_hash = $3, created_at = NOW()
       RETURNING user_id`,
      [userId, userEmail, hashedPassword]
    );

    console.log('Updating sessions table...');
    // Also update sessions table if entry exists there
    await query(
      `UPDATE sessions
       SET meta = jsonb_set(meta, '{password_hash}', to_jsonb($1::text))
       WHERE user_id = $2 AND provider = 'local'`,
      [hashedPassword, userId]
    );

    console.log('Logging password change...');
    // Log the password change
    await query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
       VALUES ($1, 'UPDATE', 'password', $2, $3, NOW())`,
      [userId, userId.toString(), JSON.stringify({
        changed_at: new Date().toISOString(),
        ip: req.ip
      })]
    );

    console.log('SUCCESS: Password changed successfully');
    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Update user role (for admin/manager only)
const updateUserRole = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { role_id } = req.body;

    if (!role_id) {
      return res.status(400).json({
        success: false,
        message: 'Role ID is required'
      });
    }

    // Verify role exists
    const roleCheck = await query('SELECT id, name FROM roles WHERE id = $1', [role_id]);
    if (roleCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
    }

    // Update user role
    const result = await query(`
      UPDATE users
      SET role_id = $1
      WHERE id = $2
      RETURNING id, name, email, role_id
    `, [role_id, userId]);

    // Log the role change
    await query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
       VALUES ($1, 'UPDATE', 'user_role', $2, $3, NOW())`,
      [userId, userId.toString(), JSON.stringify({
        new_role_id: role_id,
        new_role_name: roleCheck.rows[0].name,
        ip: req.ip
      })]
    );

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: {
        ...result.rows[0],
        role_name: roleCheck.rows[0].name
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  changePassword,
  updateUserRole
};
