// src/controllers/userCourses.js
const { query } = require('../../config/database');

// Get all courses assigned to the current user (via course, module, or task assignments)
const getUserCourses = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get courses assigned directly, or via module/task assignments
    const result = await query(`
      SELECT DISTINCT
        c.id, c.title, c.slug, c.description, c.visibility, c.created_at,
        u.name as created_by_name,
        COUNT(DISTINCT m.id) as total_module_count,
        COUNT(DISTINCT t.id) as total_task_count
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN modules m ON c.id = m.course_id
      LEFT JOIN tasks t ON t.related_course_id = c.id
      WHERE c.id IN (
        -- Courses assigned directly
        SELECT DISTINCT course_id FROM course_assignments WHERE assigned_to_user_id = $1
        UNION
        -- Courses with modules assigned
        SELECT DISTINCT m2.course_id FROM module_assignments ma2
        INNER JOIN modules m2 ON ma2.module_id = m2.id
        WHERE ma2.assigned_to_user_id = $1
        UNION
        -- Courses with tasks assigned
        SELECT DISTINCT t2.related_course_id FROM assignments a2
        INNER JOIN tasks t2 ON a2.task_id = t2.id
        WHERE a2.assigned_to_user_id = $1
      )
      GROUP BY c.id, c.title, c.slug, c.description, c.visibility, c.created_at, u.name
      ORDER BY c.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Get user courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned courses',
      error: error.message
    });
  }
};

// Get course details with modules based on user's access level
const getUserCourse = async (req, res) => {
  try {
    const userId = req.user.userId;
    const courseId = req.params.id;

    // Check if user has full course access
    const courseAccessCheck = await query(`
      SELECT id FROM course_assignments
      WHERE course_id = $1 AND assigned_to_user_id = $2
    `, [courseId, userId]);

    const hasFullCourseAccess = courseAccessCheck.rows.length > 0;

    // Get course details
    const courseResult = await query(`
      SELECT
        c.id, c.title, c.slug, c.description, c.visibility, c.created_at,
        u.name as created_by_name
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `, [courseId]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    let modulesResult;

    if (hasFullCourseAccess) {
      // User has full course access - show ALL modules
      modulesResult = await query(`
        SELECT
          m.id, m.title, m.content, m.position, m.created_at,
          COUNT(t.id) as total_task_count
        FROM modules m
        LEFT JOIN tasks t ON t.module_id = m.id
        WHERE m.course_id = $1
        GROUP BY m.id, m.title, m.content, m.position, m.created_at
        ORDER BY m.position ASC
      `, [courseId]);
    } else {
      // User has module or task level access - show only assigned modules
      modulesResult = await query(`
        SELECT DISTINCT
          m.id, m.title, m.content, m.position, m.created_at,
          COUNT(DISTINCT t.id) as total_task_count
        FROM modules m
        LEFT JOIN tasks t ON t.module_id = m.id
        WHERE m.course_id = $1 AND m.id IN (
          -- Modules assigned directly
          SELECT module_id FROM module_assignments WHERE assigned_to_user_id = $2
          UNION
          -- Modules with tasks assigned
          SELECT DISTINCT t2.module_id FROM assignments a2
          INNER JOIN tasks t2 ON a2.task_id = t2.id
          WHERE a2.assigned_to_user_id = $2 AND t2.module_id IS NOT NULL
        )
        GROUP BY m.id, m.title, m.content, m.position, m.created_at
        ORDER BY m.position ASC
      `, [courseId, userId]);
    }

    const course = courseResult.rows[0];
    course.modules = modulesResult.rows;

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Get user course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course details',
      error: error.message
    });
  }
};

// Get module details with tasks based on user's access level
const getUserModuleTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { courseId, moduleId } = req.params;

    // Check if user has full course access
    const courseAccessCheck = await query(`
      SELECT id FROM course_assignments
      WHERE course_id = $1 AND assigned_to_user_id = $2
    `, [courseId, userId]);

    const hasFullCourseAccess = courseAccessCheck.rows.length > 0;

    // Check if user has full module access
    const moduleAccessCheck = await query(`
      SELECT id FROM module_assignments
      WHERE module_id = $1 AND assigned_to_user_id = $2
    `, [moduleId, userId]);

    const hasFullModuleAccess = moduleAccessCheck.rows.length > 0;

    // Get course info
    const courseResult = await query(`
      SELECT c.id, c.title, c.slug
      FROM courses c
      WHERE c.id = $1
    `, [courseId]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get module info
    const moduleResult = await query(`
      SELECT m.id, m.title, m.content, m.position, m.created_at
      FROM modules m
      WHERE m.id = $1 AND m.course_id = $2
    `, [moduleId, courseId]);

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    let tasksResult;

    if (hasFullCourseAccess || hasFullModuleAccess) {
      // User has course or module access - show ALL tasks in this module
      tasksResult = await query(`
        SELECT
          t.id, t.title, t.description, t.created_at,
          u.name as created_by_name,
          a.id as assignment_id,
          a.status as assignment_status,
          a.due_date,
          a.completed_at,
          a.notes
        FROM tasks t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN assignments a ON a.task_id = t.id AND a.assigned_to_user_id = $2
        WHERE t.module_id = $1
        ORDER BY t.created_at ASC
      `, [moduleId, userId]);
    } else {
      // User has task-level access only - show only assigned tasks
      tasksResult = await query(`
        SELECT DISTINCT
          t.id, t.title, t.description, t.created_at,
          u.name as created_by_name,
          a.id as assignment_id,
          a.status as assignment_status,
          a.due_date,
          a.completed_at,
          a.notes
        FROM tasks t
        LEFT JOIN users u ON t.created_by = u.id
        INNER JOIN assignments a ON a.task_id = t.id
        WHERE t.module_id = $1 AND a.assigned_to_user_id = $2
        ORDER BY t.created_at ASC
      `, [moduleId, userId]);
    }

    res.json({
      success: true,
      data: {
        course: courseResult.rows[0],
        module: moduleResult.rows[0],
        tasks: tasksResult.rows
      }
    });
  } catch (error) {
    console.error('Get user module tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch module tasks',
      error: error.message
    });
  }
};

// Start a task by creating an assignment (when user has course/module access but no direct task assignment)
const startTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { courseId, moduleId, taskId } = req.params;

    // Verify the task exists and belongs to this module
    const taskCheck = await query(`
      SELECT t.id
      FROM tasks t
      WHERE t.id = $1 AND t.module_id = $2 AND t.related_course_id = $3
    `, [taskId, moduleId, courseId]);

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has access (via course or module assignment)
    const courseAccessCheck = await query(`
      SELECT id FROM course_assignments
      WHERE course_id = $1 AND assigned_to_user_id = $2
    `, [courseId, userId]);

    const moduleAccessCheck = await query(`
      SELECT id FROM module_assignments
      WHERE module_id = $1 AND assigned_to_user_id = $2
    `, [moduleId, userId]);

    const hasAccess = courseAccessCheck.rows.length > 0 || moduleAccessCheck.rows.length > 0;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this task'
      });
    }

    // Check if assignment already exists
    const existingAssignment = await query(`
      SELECT id, status FROM assignments
      WHERE task_id = $1 AND assigned_to_user_id = $2
    `, [taskId, userId]);

    if (existingAssignment.rows.length > 0) {
      // Assignment already exists, just update status to in_progress
      const result = await query(`
        UPDATE assignments
        SET status = 'in_progress'
        WHERE id = $1
        RETURNING id, status
      `, [existingAssignment.rows[0].id]);

      return res.json({
        success: true,
        message: 'Task started successfully',
        data: {
          assignment_id: result.rows[0].id,
          status: result.rows[0].status
        }
      });
    }

    // Create new assignment
    const result = await query(`
      INSERT INTO assignments (task_id, assigned_to_user_id, status, created_at)
      VALUES ($1, $2, 'in_progress', NOW())
      RETURNING id, status
    `, [taskId, userId]);

    res.json({
      success: true,
      message: 'Task started successfully',
      data: {
        assignment_id: result.rows[0].id,
        status: result.rows[0].status
      }
    });
  } catch (error) {
    console.error('Start task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start task',
      error: error.message
    });
  }
};

// Update task assignment status
const updateTaskStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { assignmentId } = req.params;
    const { status, notes } = req.body;

    // Verify the assignment belongs to this user
    const assignmentCheck = await query(
      'SELECT id FROM assignments WHERE id = $1 AND assigned_to_user_id = $2',
      [assignmentId, userId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    const completedAt = status === 'completed' ? 'NOW()' : 'NULL';

    const result = await query(`
      UPDATE assignments
      SET status = $1,
          notes = COALESCE($2, notes),
          completed_at = ${completedAt}
      WHERE id = $3 AND assigned_to_user_id = $4
      RETURNING id, status, notes, completed_at
    `, [status, notes, assignmentId, userId]);

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status',
      error: error.message
    });
  }
};

module.exports = {
  getUserCourses,
  getUserCourse,
  getUserModuleTasks,
  startTask,
  updateTaskStatus
};
