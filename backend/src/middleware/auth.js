// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'parkarlabs_jwt_secret_key_2024';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Verify user still exists and is active
    const userResult = await query(`
      SELECT u.id, u.email, u.name, u.status, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.status = 'active'
      LIMIT 1
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: userResult.rows[0].name
    };

    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Role-based access control middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    // Convert to array if single role passed
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}, your role: ${userRole}`
      });
    }

    next();
  };
};

// Admin only middleware (with token verification)
const requireAdmin = (req, res, next) => {
  // First verify the token, then check the role
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    
    // Now check if user has admin role
    const roleCheck = requireRole(['admin']);
    roleCheck(req, res, next);
  });
};

// Manager or Admin middleware (with token verification)
const requireManager = (req, res, next) => {
  // First verify the token, then check the role
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    
    // Now check if user has admin or manager role
    const roleCheck = requireRole(['admin', 'manager']);
    roleCheck(req, res, next);
  });
};

// Any authenticated user middleware
const requireAuth = verifyToken;

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireManager,
  requireAuth
};
