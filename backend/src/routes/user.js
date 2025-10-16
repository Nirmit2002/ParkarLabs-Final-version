// src/routes/user.js
const express = require('express');
const { query } = require('../../config/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all user routes
router.use(requireAuth);

// Get module-wise task completion
router.get('/module-progress', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get modules with task completion stats
    const moduleProgress = await query(`
      SELECT
        m.id as module_id,
        m.title as module_title,
        c.id as course_id,
        c.title as course_title,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN a.status = 'in_progress' THEN a.id END) as in_progress_tasks
      FROM modules m
      INNER JOIN courses c ON m.course_id = c.id
      INNER JOIN tasks t ON t.module_id = m.id
      LEFT JOIN assignments a ON a.task_id = t.id AND a.assigned_to_user_id = $1
      WHERE (
        EXISTS (
          SELECT 1 FROM course_assignments ca
          WHERE ca.course_id = c.id AND ca.assigned_to_user_id = $1
        )
        OR EXISTS (
          SELECT 1 FROM module_assignments ma
          WHERE ma.module_id = m.id AND ma.assigned_to_user_id = $1
        )
      )
      GROUP BY m.id, m.title, c.id, c.title
      HAVING COUNT(DISTINCT t.id) > 0
      ORDER BY c.created_at DESC, m.position ASC
      LIMIT 5
    `, [userId]);

    res.json({
      success: true,
      data: moduleProgress.rows
    });
  } catch (error) {
    console.error('Get module progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch module progress',
      error: error.message
    });
  }
});

// User dashboard stats
router.get('/test', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Count course assignments (top-level)
    const courseCount = await query(`
      SELECT COUNT(*) as count FROM course_assignments WHERE assigned_to_user_id = $1
    `, [userId]);

    // Count module assignments (only those NOT part of a full course assignment)
    const moduleCount = await query(`
      SELECT COUNT(*) as count
      FROM module_assignments ma
      WHERE ma.assigned_to_user_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM course_assignments ca
        INNER JOIN modules m ON m.course_id = ca.course_id
        WHERE ca.assigned_to_user_id = $1
        AND ma.module_id = m.id
      )
    `, [userId]);

    // Count task assignments (only those NOT part of a full course or module assignment)
    const taskCount = await query(`
      SELECT COUNT(*) as count
      FROM assignments a
      INNER JOIN tasks t ON a.task_id = t.id
      WHERE a.assigned_to_user_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM course_assignments ca
        WHERE ca.course_id = t.related_course_id
        AND ca.assigned_to_user_id = $1
      )
      AND NOT EXISTS (
        SELECT 1 FROM module_assignments ma
        WHERE ma.module_id = t.module_id
        AND ma.assigned_to_user_id = $1
      )
    `, [userId]);

    // Get task stats for tasks that user has direct assignments for
    const taskStats = await query(`
      SELECT
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks
      FROM assignments
      WHERE assigned_to_user_id = $1
    `, [userId]);

    // Total assignments = courses + independent modules + independent tasks
    const totalAssignments =
      parseInt(courseCount.rows[0].count) +
      parseInt(moduleCount.rows[0].count) +
      parseInt(taskCount.rows[0].count);

    res.json({
      success: true,
      message: 'User stats retrieved successfully',
      stats: {
        my_assignments: totalAssignments,
        pending_tasks: parseInt(taskStats.rows[0].pending_tasks),
        completed_tasks: parseInt(taskStats.rows[0].completed_tasks),
        in_progress_tasks: parseInt(taskStats.rows[0].in_progress_tasks),
        course_assignments: parseInt(courseCount.rows[0].count),
        module_assignments: parseInt(moduleCount.rows[0].count),
        task_assignments: parseInt(taskCount.rows[0].count)
      },
      timestamp: new Date().toISOString(),
      user: req.user.name
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'User stats query failed',
      error: error.message
    });
  }
});

module.exports = router;
