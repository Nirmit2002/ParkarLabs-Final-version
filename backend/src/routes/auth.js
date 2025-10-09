// src/routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../../config/database');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const loginValidation = [
  body('email')
    .isLength({ min: 1 })
    .withMessage('Email is required')
    .trim(),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

// Helper middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Registration endpoint
router.post('/register', registerValidation, handleValidationErrors, authController.register);

// Login endpoint
router.post('/login', loginValidation, handleValidationErrors, authController.login);

// Get current user profile (protected)
router.get('/profile', requireAuth, authController.getProfile);

// Logout endpoint (protected)
router.post('/logout', requireAuth, authController.logout);

// Verify token endpoint (protected)
router.get('/verify', requireAuth, authController.verifyToken);

// Test endpoint (existing)
router.get('/test', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as user_count FROM users');
    res.json({
      success: true,
      message: 'Auth route working',
      userCount: result.rows[0].user_count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database query failed',
      error: error.message
    });
  }
});

// Get all users (existing - now with better formatting)
router.get('/users', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.status, u.created_at,
             r.name as role_name, r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

module.exports = router;
