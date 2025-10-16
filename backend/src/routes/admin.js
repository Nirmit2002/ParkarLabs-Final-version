// src/routes/admin.js
const express = require('express');
const { query } = require('../../config/database');
const { requireManager } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all admin routes
router.use(requireManager);

// Admin dashboard stats
router.get('/test', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM courses) as total_courses,
        (SELECT COUNT(*) FROM containers) as total_containers,
        (SELECT COUNT(*) FROM containers WHERE status_id = (SELECT id FROM container_statuses WHERE name='running' LIMIT 1)) as running_containers,
        (SELECT COUNT(*) FROM assignments WHERE status = 'assigned') as pending_assignments,
        (SELECT COUNT(*) FROM assignments WHERE status = 'completed') as completed_assignments
    `);

    res.json({
      success: true,
      message: 'Admin stats retrieved successfully',
      stats: result.rows[0],
      timestamp: new Date().toISOString(),
      requestedBy: req.user?.name || 'Unknown'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Admin stats query failed',
      error: error.message
    });
  }
});

// Employee performance tracking - daily task completion trends for all employees
router.get('/analytics/user-growth', async (req, res) => {
  try {
    // Get daily task completion for all employees over last 7 days
    const result = await query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      ),
      employee_list AS (
        SELECT DISTINCT u.id, u.name
        FROM users u
        INNER JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'employee'
      ),
      daily_completions AS (
        SELECT
          DATE(a.completed_at) as completion_date,
          a.assigned_to_user_id,
          COUNT(*) as tasks_completed
        FROM assignments a
        WHERE a.status = 'completed'
          AND a.completed_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(a.completed_at), a.assigned_to_user_id
      )
      SELECT
        ds.date,
        el.id as user_id,
        el.name as user_name,
        COALESCE(dc.tasks_completed, 0) as completed
      FROM date_series ds
      CROSS JOIN employee_list el
      LEFT JOIN daily_completions dc
        ON ds.date = dc.completion_date
        AND el.id = dc.assigned_to_user_id
      ORDER BY ds.date ASC, el.name ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee performance data',
      error: error.message
    });
  }
});

// Container usage by status
router.get('/analytics/container-status', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        cs.name as status,
        COUNT(c.id) as count
      FROM container_statuses cs
      LEFT JOIN containers c ON c.status_id = cs.id
      GROUP BY cs.name
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch container status data',
      error: error.message
    });
  }
});

// Assignment completion rate
router.get('/analytics/assignment-stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        status,
        COUNT(*) as count
      FROM assignments
      GROUP BY status
      ORDER BY
        CASE
          WHEN status = 'assigned' THEN 1
          WHEN status = 'in_progress' THEN 2
          WHEN status = 'completed' THEN 3
          WHEN status = 'blocked' THEN 4
          ELSE 5
        END
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment stats',
      error: error.message
    });
  }
});

// Activity timeline (last 7 days) - showing user engagement metrics
router.get('/analytics/activity', async (req, res) => {
  try {
    const result = await query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '7 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT
        ds.date,
        -- Count of unique active users per day
        COALESCE((
          SELECT COUNT(DISTINCT actor_user_id)
          FROM audit_logs
          WHERE DATE(created_at) = ds.date
        ), 0) as active_users,
        -- Total actions performed
        COALESCE((
          SELECT COUNT(*)
          FROM audit_logs
          WHERE DATE(created_at) = ds.date
        ), 0) as total_actions,
        -- Tasks completed
        COALESCE((
          SELECT COUNT(*)
          FROM assignments
          WHERE DATE(completed_at) = ds.date
        ), 0) as tasks_completed,
        -- New assignments created
        COALESCE((
          SELECT COUNT(*)
          FROM assignments
          WHERE DATE(created_at) = ds.date
        ), 0) as tasks_assigned
      FROM date_series ds
      ORDER BY ds.date ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity data',
      error: error.message
    });
  }
});

// Role distribution
router.get('/analytics/role-distribution', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        r.name as role,
        COUNT(u.id) as count
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id AND u.status = 'active'
      GROUP BY r.name
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role distribution',
      error: error.message
    });
  }
});

// Live/Active users - users currently online (active in last 10 minutes based on audit logs)
router.get('/analytics/live-users', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT ON (u.id)
        u.id,
        u.name,
        u.email,
        u.status,
        u.created_at,
        u.profile_pic,
        r.name as role_name,
        r.description as role_description,
        MAX(al.created_at) as last_activity
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      LEFT JOIN audit_logs al ON al.actor_user_id = u.id
      WHERE u.status = 'active'
        AND al.created_at >= NOW() - INTERVAL '10 minutes'
      GROUP BY u.id, u.name, u.email, u.status, u.created_at, u.profile_pic, r.name, r.description
      ORDER BY u.id, last_activity DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live users',
      error: error.message
    });
  }
});

// User course tracking - comprehensive progress tracking for all users
router.get('/user-course-tracking', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.created_at as user_joined_at,
        r.name as user_role,

        -- Course assignments count
        (SELECT COUNT(DISTINCT ca.course_id)
         FROM course_assignments ca
         WHERE ca.assigned_to_user_id = u.id) as total_courses_assigned,

        -- Course assignments list (JSON array of course names)
        (SELECT COALESCE(json_agg(c.title ORDER BY c.title), '[]'::json)
         FROM course_assignments ca
         INNER JOIN courses c ON ca.course_id = c.id
         WHERE ca.assigned_to_user_id = u.id) as assigned_courses_list,

        -- Module assignments count (independent modules, not part of courses)
        (SELECT COUNT(DISTINCT ma.module_id)
         FROM module_assignments ma
         WHERE ma.assigned_to_user_id = u.id
         AND NOT EXISTS (
           SELECT 1 FROM course_assignments ca2
           INNER JOIN modules m2 ON m2.course_id = ca2.course_id
           WHERE ca2.assigned_to_user_id = u.id AND ma.module_id = m2.id
         )) as total_modules_assigned,

        -- Module assignments list (JSON array with course name and module title)
        (SELECT COALESCE(json_agg(json_build_object('course', c.title, 'module', m.title, 'position', m.position) ORDER BY c.title, m.position), '[]'::json)
         FROM module_assignments ma
         INNER JOIN modules m ON ma.module_id = m.id
         INNER JOIN courses c ON m.course_id = c.id
         WHERE ma.assigned_to_user_id = u.id
         AND NOT EXISTS (
           SELECT 1 FROM course_assignments ca2
           WHERE ca2.assigned_to_user_id = u.id AND ca2.course_id = c.id
         )) as assigned_modules_list,

        -- Individual task assignments count (tasks not part of any assigned course or module)
        (SELECT COUNT(DISTINCT a.id)
         FROM assignments a
         INNER JOIN tasks t ON a.task_id = t.id
         WHERE a.assigned_to_user_id = u.id
         AND NOT EXISTS (
           SELECT 1 FROM course_assignments ca
           INNER JOIN modules m ON m.course_id = ca.course_id
           WHERE ca.assigned_to_user_id = u.id AND t.module_id = m.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM module_assignments ma
           WHERE ma.assigned_to_user_id = u.id AND ma.module_id = t.module_id
         )) as total_individual_tasks_assigned,

        -- Individual task assignments list (JSON array with course, module, and task details)
        (SELECT COALESCE(json_agg(json_build_object('course', c.title, 'module', m.title, 'module_position', m.position, 'task', t.title, 'task_id', t.id) ORDER BY c.title, m.position, t.id), '[]'::json)
         FROM assignments a
         INNER JOIN tasks t ON a.task_id = t.id
         INNER JOIN modules m ON t.module_id = m.id
         INNER JOIN courses c ON m.course_id = c.id
         WHERE a.assigned_to_user_id = u.id
         AND NOT EXISTS (
           SELECT 1 FROM course_assignments ca
           WHERE ca.assigned_to_user_id = u.id AND ca.course_id = c.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM module_assignments ma
           WHERE ma.assigned_to_user_id = u.id AND ma.module_id = t.module_id
         )) as assigned_tasks_list,

        -- Task statistics
        (SELECT COUNT(*) FROM assignments a WHERE a.assigned_to_user_id = u.id) as total_tasks_assigned,
        (SELECT COUNT(*) FROM assignments a WHERE a.assigned_to_user_id = u.id AND a.status = 'completed') as total_tasks_completed,
        (SELECT COUNT(*) FROM assignments a WHERE a.assigned_to_user_id = u.id AND a.status = 'in_progress') as total_tasks_in_progress,
        (SELECT COUNT(*) FROM assignments a WHERE a.assigned_to_user_id = u.id AND a.status = 'assigned') as total_tasks_pending,

        -- First task started time (from assignment_history when status changed to in_progress)
        (SELECT MIN(ah.changed_at)
         FROM assignment_history ah
         INNER JOIN assignments a ON ah.assignment_id = a.id
         WHERE a.assigned_to_user_id = u.id
         AND ah.new_status = 'in_progress') as first_task_started_at,

        -- Last activity time
        (SELECT MAX(a.completed_at) FROM assignments a WHERE a.assigned_to_user_id = u.id AND a.completed_at IS NOT NULL) as last_task_completed_at,

        -- Average completion time (in minutes) - from when task moved to in_progress until completed
        -- Uses assignment_history if available, otherwise falls back to created_at to completed_at
        (SELECT AVG(
           CASE
             WHEN start_times.started_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (a.completed_at - start_times.started_at))/60
             ELSE EXTRACT(EPOCH FROM (a.completed_at - a.created_at))/60
           END
         )
         FROM assignments a
         LEFT JOIN (
           SELECT ah.assignment_id, MIN(ah.changed_at) as started_at
           FROM assignment_history ah
           WHERE ah.new_status = 'in_progress'
           GROUP BY ah.assignment_id
         ) start_times ON start_times.assignment_id = a.id
         WHERE a.assigned_to_user_id = u.id
         AND a.completed_at IS NOT NULL
         AND a.status = 'completed') as avg_completion_time_minutes,

        -- Completion rate based on all assigned items (courses, modules, tasks)
        -- Total assigned items = courses + modules + individual tasks
        -- Completed items = fully completed courses + fully completed modules + completed individual tasks
        CASE
          WHEN (
            (SELECT COUNT(DISTINCT ca.course_id) FROM course_assignments ca WHERE ca.assigned_to_user_id = u.id) +
            (SELECT COUNT(DISTINCT ma.module_id)
             FROM module_assignments ma
             WHERE ma.assigned_to_user_id = u.id
             AND NOT EXISTS (
               SELECT 1 FROM course_assignments ca2
               INNER JOIN modules m2 ON m2.course_id = ca2.course_id
               WHERE ca2.assigned_to_user_id = u.id AND ma.module_id = m2.id
             )) +
            (SELECT COUNT(DISTINCT a.id)
             FROM assignments a
             INNER JOIN tasks t ON a.task_id = t.id
             WHERE a.assigned_to_user_id = u.id
             AND NOT EXISTS (
               SELECT 1 FROM course_assignments ca
               INNER JOIN modules m ON m.course_id = ca.course_id
               WHERE ca.assigned_to_user_id = u.id AND t.module_id = m.id
             )
             AND NOT EXISTS (
               SELECT 1 FROM module_assignments ma
               WHERE ma.assigned_to_user_id = u.id AND ma.module_id = t.module_id
             ))
          ) > 0
          THEN ROUND(
            (
              -- Count of fully completed courses
              (SELECT COUNT(DISTINCT c.id)
               FROM course_assignments ca
               INNER JOIN courses c ON ca.course_id = c.id
               WHERE ca.assigned_to_user_id = u.id
               AND NOT EXISTS (
                 SELECT 1 FROM tasks t
                 INNER JOIN modules m ON t.module_id = m.id
                 WHERE m.course_id = c.id
                 AND NOT EXISTS (
                   SELECT 1 FROM assignments a
                   WHERE a.task_id = t.id
                   AND a.assigned_to_user_id = u.id
                   AND a.status = 'completed'
                 )
               )) +
              -- Count of fully completed modules (not part of assigned courses)
              (SELECT COUNT(DISTINCT m.id)
               FROM module_assignments ma
               INNER JOIN modules m ON ma.module_id = m.id
               WHERE ma.assigned_to_user_id = u.id
               AND NOT EXISTS (
                 SELECT 1 FROM course_assignments ca2
                 INNER JOIN modules m2 ON m2.course_id = ca2.course_id
                 WHERE ca2.assigned_to_user_id = u.id AND ma.module_id = m2.id
               )
               AND NOT EXISTS (
                 SELECT 1 FROM tasks t
                 WHERE t.module_id = m.id
                 AND NOT EXISTS (
                   SELECT 1 FROM assignments a
                   WHERE a.task_id = t.id
                   AND a.assigned_to_user_id = u.id
                   AND a.status = 'completed'
                 )
               )) +
              -- Count of completed individual tasks (not part of assigned courses or modules)
              (SELECT COUNT(DISTINCT a.id)
               FROM assignments a
               INNER JOIN tasks t ON a.task_id = t.id
               WHERE a.assigned_to_user_id = u.id
               AND a.status = 'completed'
               AND NOT EXISTS (
                 SELECT 1 FROM course_assignments ca
                 INNER JOIN modules m ON m.course_id = ca.course_id
                 WHERE ca.assigned_to_user_id = u.id AND t.module_id = m.id
               )
               AND NOT EXISTS (
                 SELECT 1 FROM module_assignments ma
                 WHERE ma.assigned_to_user_id = u.id AND ma.module_id = t.module_id
               ))
            )::numeric /
            (
              (SELECT COUNT(DISTINCT ca.course_id) FROM course_assignments ca WHERE ca.assigned_to_user_id = u.id) +
              (SELECT COUNT(DISTINCT ma.module_id)
               FROM module_assignments ma
               WHERE ma.assigned_to_user_id = u.id
               AND NOT EXISTS (
                 SELECT 1 FROM course_assignments ca2
                 INNER JOIN modules m2 ON m2.course_id = ca2.course_id
                 WHERE ca2.assigned_to_user_id = u.id AND ma.module_id = m2.id
               )) +
              (SELECT COUNT(DISTINCT a.id)
               FROM assignments a
               INNER JOIN tasks t ON a.task_id = t.id
               WHERE a.assigned_to_user_id = u.id
               AND NOT EXISTS (
                 SELECT 1 FROM course_assignments ca
                 INNER JOIN modules m ON m.course_id = ca.course_id
                 WHERE ca.assigned_to_user_id = u.id AND t.module_id = m.id
               )
               AND NOT EXISTS (
                 SELECT 1 FROM module_assignments ma
                 WHERE ma.assigned_to_user_id = u.id AND ma.module_id = t.module_id
               ))
            )::numeric * 100,
            2
          )
          ELSE 0
        END as completion_rate_percentage

      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'employee'
      AND (
        EXISTS (SELECT 1 FROM course_assignments ca WHERE ca.assigned_to_user_id = u.id)
        OR EXISTS (SELECT 1 FROM module_assignments ma WHERE ma.assigned_to_user_id = u.id)
        OR EXISTS (SELECT 1 FROM assignments a WHERE a.assigned_to_user_id = u.id)
      )
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('User course tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user course tracking data',
      error: error.message
    });
  }
});

// Detailed tracking for specific user - course/module/task breakdown
router.get('/user-course-tracking/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's course progress
    const coursesProgress = await query(`
      SELECT
        c.id as course_id,
        c.title as course_title,
        ca.created_at as assigned_at,

        -- Module stats for this course
        (SELECT COUNT(DISTINCT m.id) FROM modules m WHERE m.course_id = c.id) as total_modules,
        (SELECT COUNT(DISTINCT m.id)
         FROM modules m
         INNER JOIN tasks t ON t.module_id = m.id
         INNER JOIN assignments a ON a.task_id = t.id
         WHERE m.course_id = c.id
         AND a.assigned_to_user_id = $1
         AND a.status = 'completed'
         AND NOT EXISTS (
           SELECT 1 FROM tasks t2
           WHERE t2.module_id = m.id
           AND NOT EXISTS (
             SELECT 1 FROM assignments a2
             WHERE a2.task_id = t2.id
             AND a2.assigned_to_user_id = $1
             AND a2.status = 'completed'
           )
         )) as completed_modules,

        -- Task stats for this course
        (SELECT COUNT(DISTINCT t.id)
         FROM tasks t
         INNER JOIN modules m ON t.module_id = m.id
         WHERE m.course_id = c.id) as total_tasks,
        (SELECT COUNT(DISTINCT a.id)
         FROM assignments a
         INNER JOIN tasks t ON a.task_id = t.id
         INNER JOIN modules m ON t.module_id = m.id
         WHERE m.course_id = c.id
         AND a.assigned_to_user_id = $1
         AND a.status = 'completed') as completed_tasks,
        (SELECT COUNT(DISTINCT a.id)
         FROM assignments a
         INNER JOIN tasks t ON a.task_id = t.id
         INNER JOIN modules m ON t.module_id = m.id
         WHERE m.course_id = c.id
         AND a.assigned_to_user_id = $1
         AND a.status = 'in_progress') as in_progress_tasks

      FROM courses c
      INNER JOIN course_assignments ca ON ca.course_id = c.id
      WHERE ca.assigned_to_user_id = $1
      ORDER BY ca.created_at DESC
    `, [userId]);

    // Get user's module progress (with task details)
    const modulesProgress = await query(`
      SELECT
        m.id as module_id,
        m.title as module_title,
        c.id as course_id,
        c.title as course_title,
        ma.created_at as assigned_at,

        -- Task stats
        (SELECT COUNT(*) FROM tasks t WHERE t.module_id = m.id) as total_tasks,
        (SELECT COUNT(*)
         FROM assignments a
         INNER JOIN tasks t ON a.task_id = t.id
         WHERE t.module_id = m.id
         AND a.assigned_to_user_id = $1
         AND a.status = 'completed') as completed_tasks,
        (SELECT COUNT(*)
         FROM assignments a
         INNER JOIN tasks t ON a.task_id = t.id
         WHERE t.module_id = m.id
         AND a.assigned_to_user_id = $1
         AND a.status = 'in_progress') as in_progress_tasks,

        -- Time tracking
        (SELECT MIN(ah.changed_at)
         FROM assignment_history ah
         INNER JOIN assignments a ON ah.assignment_id = a.id
         INNER JOIN tasks t ON a.task_id = t.id
         WHERE t.module_id = m.id
         AND a.assigned_to_user_id = $1
         AND ah.new_status = 'in_progress') as first_task_started,
        (SELECT MAX(a.completed_at)
         FROM assignments a
         INNER JOIN tasks t ON a.task_id = t.id
         WHERE t.module_id = m.id
         AND a.assigned_to_user_id = $1
         AND a.completed_at IS NOT NULL) as last_task_completed

      FROM modules m
      INNER JOIN courses c ON m.course_id = c.id
      LEFT JOIN module_assignments ma ON ma.module_id = m.id AND ma.assigned_to_user_id = $1
      WHERE EXISTS (
        SELECT 1 FROM course_assignments ca
        WHERE ca.course_id = c.id AND ca.assigned_to_user_id = $1
      )
      OR EXISTS (
        SELECT 1 FROM module_assignments ma2
        WHERE ma2.module_id = m.id AND ma2.assigned_to_user_id = $1
      )
      ORDER BY c.created_at DESC, m.position ASC
    `, [userId]);

    // Get individual task progress
    const tasksProgress = await query(`
      SELECT
        t.id as task_id,
        t.title as task_title,
        m.title as module_title,
        c.title as course_title,
        a.status as task_status,
        a.created_at as assigned_at,
        start_times.started_at,
        a.completed_at,
        CASE
          WHEN start_times.started_at IS NOT NULL AND a.completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (a.completed_at - start_times.started_at))/3600
          ELSE NULL
        END as completion_time_hours

      FROM assignments a
      INNER JOIN tasks t ON a.task_id = t.id
      INNER JOIN modules m ON t.module_id = m.id
      INNER JOIN courses c ON m.course_id = c.id
      LEFT JOIN (
        SELECT ah.assignment_id, MIN(ah.changed_at) as started_at
        FROM assignment_history ah
        WHERE ah.new_status = 'in_progress'
        GROUP BY ah.assignment_id
      ) start_times ON start_times.assignment_id = a.id
      WHERE a.assigned_to_user_id = $1
      ORDER BY a.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: {
        courses: coursesProgress.rows,
        modules: modulesProgress.rows,
        tasks: tasksProgress.rows
      }
    });
  } catch (error) {
    console.error('User detailed tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user detailed tracking data',
      error: error.message
    });
  }
});

// Unassign course from user
router.delete('/unassign-course', async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Course ID are required'
      });
    }

    // Delete course assignment
    const result = await query(
      'DELETE FROM course_assignments WHERE assigned_to_user_id = $1 AND course_id = $2 RETURNING *',
      [userId, courseId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Course unassigned successfully'
    });
  } catch (error) {
    console.error('Unassign course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign course',
      error: error.message
    });
  }
});

// Unassign module from user
router.delete('/unassign-module', async (req, res) => {
  try {
    const { userId, moduleId } = req.body;

    if (!userId || !moduleId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Module ID are required'
      });
    }

    // Delete module assignment
    const result = await query(
      'DELETE FROM module_assignments WHERE assigned_to_user_id = $1 AND module_id = $2 RETURNING *',
      [userId, moduleId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Module assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Module unassigned successfully'
    });
  } catch (error) {
    console.error('Unassign module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign module',
      error: error.message
    });
  }
});

module.exports = router;
