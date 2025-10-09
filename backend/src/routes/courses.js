// src/routes/courses.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const coursesController = require('../controllers/courses');
const { requireAuth, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const courseValidation = [
  body('title').isLength({ min: 1 }).withMessage('Title is required'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
  body('visibility').optional().isIn(['private', 'public']).withMessage('Invalid visibility')
];

const moduleValidation = [
  body('title').isLength({ min: 1 }).withMessage('Module title is required'),
  body('content').optional(),
  body('position').optional().isInt({ min: 0 }).withMessage('Position must be a positive integer')
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

// Public routes (all authenticated users can view courses)
router.get('/', requireAuth, coursesController.getCourses);
router.get('/:id', requireAuth, coursesController.getCourse);

// Admin/Manager only routes (course management)
router.post('/', requireManager, courseValidation, checkValidation, coursesController.createCourse);
router.put('/:id', requireManager, courseValidation, checkValidation, coursesController.updateCourse);
router.delete('/:id', requireManager, coursesController.deleteCourse);

// Module management (Admin/Manager only)
router.post('/:id/modules', requireManager, moduleValidation, checkValidation, coursesController.addModule);
router.put('/:id/modules/:moduleId', requireManager, moduleValidation, checkValidation, coursesController.updateModule);
router.delete('/:id/modules/:moduleId', requireManager, coursesController.deleteModule);

module.exports = router;
