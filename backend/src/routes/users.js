// src/routes/users.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const usersController = require('../controllers/users');
const { requireAuth, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createUserValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('role_id').isInt({ min: 1 }).withMessage('Role ID must be a positive integer'),
  body('azure_ad_id').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 1, max: 255 }).withMessage('Azure AD ID must be valid'),
  body('provisioning_pref').optional({ nullable: true, checkFalsy: true }).isObject().withMessage('Provisioning preferences must be an object'),
  body('password').optional({ nullable: true, checkFalsy: true }).isLength({ min: 6, max: 100 }).withMessage('Password must be between 6 and 100 characters'),
  body('status').optional({ nullable: true, checkFalsy: true }).isIn(['active', 'disabled', 'suspended']).withMessage('Invalid status')
];

const updateUserValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('role_id').optional().isInt({ min: 1 }).withMessage('Role ID must be a positive integer'),
  body('status').optional().isIn(['active', 'disabled', 'suspended']).withMessage('Invalid status'),
  body('provisioning_pref').optional().isObject().withMessage('Provisioning preferences must be an object')
];

const getUserValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID')
];

const getUsersQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Search term too long'),
  query('role').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Role filter too long'),
  query('status').optional({ nullable: true, checkFalsy: true }).isIn(['active', 'disabled', 'suspended']).withMessage('Invalid status filter'),
  query('sortBy').optional().isIn(['name', 'email', 'created_at', 'status']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
];

// Middleware to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    console.error('Request body:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Routes
// GET /api/users/stats - Get user statistics (Admin/Manager only)
router.get('/stats', requireManager, usersController.getUserStats);

// GET /api/users/roles - Get available roles (Admin/Manager only)
router.get('/roles', requireManager, usersController.getRoles);

// GET /api/users - Get all users with filtering and pagination (Admin/Manager only)
router.get('/', requireManager, getUsersQueryValidation, checkValidation, usersController.getAllUsers);

// GET /api/users/:id - Get single user by ID (Admin/Manager only)
router.get('/:id', requireManager, getUserValidation, checkValidation, usersController.getUserById);

// POST /api/users - Create new user (Admin/Manager only)
router.post('/', requireManager, createUserValidation, checkValidation, usersController.createUser);

// PUT /api/users/:id - Update user (Admin/Manager only)
router.put('/:id', requireManager, updateUserValidation, checkValidation, usersController.updateUser);

// DELETE /api/users/:id - Delete user (Admin/Manager only)
router.delete('/:id', requireManager, getUserValidation, checkValidation, usersController.deleteUser);

module.exports = router;
