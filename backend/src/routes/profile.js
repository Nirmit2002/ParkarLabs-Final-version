// src/routes/profile.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const profileController = require('../controllers/profile');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and user ID
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const userId = req.user.userId;
    const ext = path.extname(file.originalname);
    cb(null, `user-${userId}-${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validation rules
const updateProfileValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
];

const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6, max: 100 }).withMessage('New password must be between 6 and 100 characters'),
  body('confirmPassword').notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match')
];

const updateRoleValidation = [
  body('role_id').isInt({ min: 1 }).withMessage('Role ID must be a positive integer')
];

// Middleware to check validation results
const checkValidation = (req, res, next) => {
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

// Routes (all routes require authentication)
// GET /api/profile - Get current user's profile
router.get('/', requireAuth, profileController.getProfile);

// PUT /api/profile - Update profile (name, email)
router.put('/', requireAuth, updateProfileValidation, checkValidation, profileController.updateProfile);

// POST /api/profile/picture - Upload profile picture
router.post('/picture', requireAuth, upload.single('profilePic'), (req, res, next) => {
  if (req.fileValidationError) {
    return res.status(400).json({
      success: false,
      message: req.fileValidationError
    });
  }
  next();
}, profileController.uploadProfilePicture);

// PUT /api/profile/password - Change password
router.put('/password', requireAuth, changePasswordValidation, checkValidation, profileController.changePassword);

// PUT /api/profile/role - Update user role (self-update)
router.put('/role', requireAuth, updateRoleValidation, checkValidation, profileController.updateUserRole);

module.exports = router;
