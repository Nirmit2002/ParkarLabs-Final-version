// src/routes/userCourses.js
const express = require('express');
const userCoursesController = require('../controllers/userCourses');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.get('/', requireAuth, userCoursesController.getUserCourses);
router.get('/:id', requireAuth, userCoursesController.getUserCourse);
router.get('/:courseId/modules/:moduleId/tasks', requireAuth, userCoursesController.getUserModuleTasks);
router.post('/:courseId/modules/:moduleId/tasks/:taskId/start', requireAuth, userCoursesController.startTask);
router.patch('/assignments/:assignmentId/status', requireAuth, userCoursesController.updateTaskStatus);

module.exports = router;
