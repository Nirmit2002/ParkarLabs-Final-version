// src/routes/tasks.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  getAllTasks,
  getMyTasks,
  createTask,
  assignTask,
  updateTaskStatus,
  deleteTask,
  getModuleTasks,
  createModuleTask,
  updateTask,
  getTaskAssignedUsers,
  unassignTask
} = require('../controllers/tasks');
const { requireAuth, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const taskValidation = [
  body('title').isLength({ min: 1 }).withMessage('Title is required'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description too long'),
  body('relatedCourseId').optional().isInt().withMessage('Invalid course ID')
];

const assignTaskValidation = [
  body('userIds').isArray({ min: 1 }).withMessage('At least one user ID is required'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
];

const statusUpdateValidation = [
  body('status').isIn(['assigned', 'in_progress', 'completed', 'blocked']).withMessage('Invalid status')
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

// Task management routes (Admin/Manager only)
router.get('/', requireManager, getAllTasks);
router.post('/', requireManager, taskValidation, checkValidation, createTask);
router.delete('/:id', requireManager, deleteTask);

// Task assignment routes (Admin/Manager only)
router.post('/:id/assign', requireManager, assignTaskValidation, checkValidation, assignTask);
router.post('/:id/unassign', requireManager, unassignTask);
router.get('/:id/assigned-users', requireManager, getTaskAssignedUsers);

// User task routes (All authenticated users)
router.get('/my-tasks', requireAuth, getMyTasks);
router.patch('/:id/status', requireAuth, statusUpdateValidation, checkValidation, updateTaskStatus);

// Module-specific task routes (Admin/Manager only)
router.get('/modules/:moduleId', requireManager, getModuleTasks);
router.post('/modules/:moduleId', requireManager, taskValidation, checkValidation, createModuleTask);
router.put('/:taskId', requireManager, taskValidation, checkValidation, updateTask);

module.exports = router;
