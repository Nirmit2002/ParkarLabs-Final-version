// src/controllers/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'parkarlabs_jwt_secret_key_2024',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// User registration function
const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Input validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if user already exists
    const existingUser = await query(`
      SELECT id, email FROM users WHERE email = $1
    `, [email.toLowerCase()]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get default employee role
    const roleResult = await query(`
      SELECT id FROM roles WHERE name = 'employee' LIMIT 1
    `);

    if (roleResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Default role not found. Please contact administrator.'
      });
    }

    const defaultRoleId = roleResult.rows[0].id;

    // Generate Azure AD ID (for now, use email-based UUID)
    const crypto = require('crypto');
    const azureAdId = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 32);

    // Create user in transaction
    await query('BEGIN');
    
    try {
      const userResult = await query(`
        INSERT INTO users (azure_ad_id, name, email, role_id, status, created_at)
        VALUES ($1, $2, $3, $4, 'active', NOW())
        RETURNING id, name, email, status, created_at
      `, [azureAdId, name.trim(), email.toLowerCase(), defaultRoleId]);

      const newUser = userResult.rows[0];

      // Store password hash in a separate credential store using existing sessions table structure
      // We'll use the sessions table to store password info temporarily
      await query(`
        INSERT INTO sessions (user_id, provider, provider_account_id, meta, created_at)
        VALUES ($1, 'local', $2, $3, NOW())
      `, [newUser.id, email.toLowerCase(), JSON.stringify({ password_hash: hashedPassword })]);

      // Create audit log
      await query(`
        INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
        VALUES ($1, 'REGISTER', 'user', $2, $3, NOW())
      `, [newUser.id, newUser.id.toString(), JSON.stringify({
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        registrationMethod: 'email'
      })]);

      await query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please login with your credentials.',
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            status: newUser.status,
            role: 'employee'
          }
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: error.message
    });
  }
};

// Updated login function with password verification
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Get user with role information
    const userResult = await query(`
      SELECT u.id, u.email, u.name, u.azure_ad_id, u.status, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1 AND u.status = 'active'
      LIMIT 1
    `, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check for stored password hash in sessions table
    let isValidPassword = false;
    
    const sessionResult = await query(`
      SELECT meta FROM sessions 
      WHERE user_id = $1 AND provider = 'local'
      ORDER BY created_at DESC LIMIT 1
    `, [user.id]);

    if (sessionResult.rows.length > 0 && sessionResult.rows[0].meta?.password_hash) {
      // Check hashed password (for registered users)
      isValidPassword = await bcrypt.compare(password, sessionResult.rows[0].meta.password_hash);
    } else {
      // Fallback for existing demo accounts
      isValidPassword = password === 'temp123';
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role_name);

    // Log the login attempt
    await query(`
      INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
      VALUES ($1, 'LOGIN', 'user', $2, $3, NOW())
    `, [user.id, user.id.toString(), JSON.stringify({ ip: req.ip, userAgent: req.get('User-Agent') })]);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role_name,
          status: user.status
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT middleware

    const result = await query(`
      SELECT u.id, u.name, u.email, u.status, u.created_at,
             r.name as role_name, r.description as role_description
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
        roleDescription: user.role_description,
        status: user.status,
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

// Logout function
const logout = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (userId) {
      // Log the logout attempt
      await query(`
        INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, created_at)
        VALUES ($1, 'LOGOUT', 'user', $2, $3, NOW())
      `, [userId, userId.toString(), JSON.stringify({ ip: req.ip })]);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

// Verify token endpoint
const verifyToken = async (req, res) => {
  try {
    // Token verification is handled by middleware
    res.json({
      success: true,
      message: 'Token is valid',
      user: req.user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
  verifyToken
};
