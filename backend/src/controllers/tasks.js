// src/controllers/tasks.js
const { query } = require('../../config/database');

// Get all tasks (admin/manager only)
const getAllTasks = async (req, res) => {
  try {
    const result = await query(`
      SELECT t.*, u.name as created_by_name, c.title as course_title,
             COUNT(a.id) as assignment_count,
             COUNT(CASE WHEN a.status = 'assigned' THEN 1 END) as pending_count,
             COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN courses c ON t.related_course_id = c.id
      LEFT JOIN assignments a ON t.id = a.task_id
      GROUP BY t.id, u.name, c.title
      ORDER BY t.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

// Get user's assigned tasks - FIXED VERSION
const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(`
      SELECT a.id as assignment_id, a.status, a.due_date, a.created_at as assigned_at,
             t.id as task_id, t.title, t.description,
             c.title as course_title, c.slug as course_slug,
             u.name as assigned_by_name
      FROM assignments a
      JOIN tasks t ON a.task_id = t.id
      LEFT JOIN courses c ON t.related_course_id = c.id
      LEFT JOIN users u ON a.assigned_by = u.id
      WHERE a.assigned_to_user_id = $1
      ORDER BY a.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

// Create new task
const createTask = async (req, res) => {
  try {
    const { title, description, relatedCourseId } = req.body;
    const createdBy = req.user.userId;

    // Validate input
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    const result = await query(`
      INSERT INTO tasks (title, description, created_by, related_course_id, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, title, description, created_at
    `, [title, description, createdBy, relatedCourseId || null]);

    res.json({
      success: true,
      message: 'Task created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
};

// Assign task to users - FIXED VERSION
const assignTask = async (req, res) => {
  try {
    const { id } = req.params; // task ID
    const { userIds, dueDate, notes } = req.body;
    const assignedBy = req.user.userId;

    console.log('Assign task called:', { id, userIds, dueDate, assignedBy });

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one user must be selected'
      });
    }

    // Verify task exists
    const taskResult = await query(
      'SELECT id, title FROM tasks WHERE id = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const task = taskResult.rows[0];

    // Verify users exist and get their details
    const usersResult = await query(
      'SELECT id, name, email FROM users WHERE id = ANY($1) AND status = $2',
      [userIds, 'active']
    );

    if (usersResult.rows.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more users not found or inactive'
      });
    }

    // Create assignments for each user
    const assignments = [];
    for (const userId of userIds) {
      try {
        // Check if assignment already exists
        const existingResult = await query(
          'SELECT id FROM assignments WHERE task_id = $1 AND assigned_to_user_id = $2',
          [id, userId]
        );

        if (existingResult.rows.length === 0) {
          // Create new assignment - REMOVED ON CONFLICT clause that was causing issues
          const assignmentResult = await query(`
            INSERT INTO assignments (
              task_id, assigned_to_user_id, assigned_by, status, due_date, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, created_at
          `, [
            id,
            userId, 
            assignedBy,
            'assigned',
            dueDate || null,
            JSON.stringify({ notes: notes || '' })
          ]);

          assignments.push({
            id: assignmentResult.rows[0].id,
            taskId: id,
            userId: userId,
            status: 'assigned',
            createdAt: assignmentResult.rows[0].created_at
          });
        } else {
          console.log(`Assignment already exists for user ${userId} and task ${id}`);
        }
      } catch (assignError) {
        console.error(`Error creating assignment for user ${userId}:`, assignError);
        // Continue with other users
      }
    }

    res.json({
      success: true,
      message: `Task "${task.title}" assigned to ${assignments.length} user(s)`,
      data: {
        taskId: id,
        taskTitle: task.title,
        assignments: assignments,
        assignedBy: req.user.name
      }
    });

  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign task',
      error: error.message
    });
  }
};

// Update task status
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params; // assignment ID
    const { status } = req.body;
    const userId = req.user.userId;

    // Validate status
    const validStatuses = ['assigned', 'in_progress', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Verify assignment exists and belongs to user
    const assignmentResult = await query(
      'SELECT id, task_id, status FROM assignments WHERE id = $1 AND assigned_to_user_id = $2',
      [id, userId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or access denied'
      });
    }

    // Update assignment status
    await query(
      'UPDATE assignments SET status = $1 WHERE id = $2',
      [status, id]
    );

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: {
        assignmentId: id,
        newStatus: status
      }
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status',
      error: error.message
    });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify task exists
    const taskResult = await query(
      'SELECT id, title FROM tasks WHERE id = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Delete task (assignments will be deleted due to CASCADE)
    await query('DELETE FROM tasks WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
};

// Get tasks for a specific module
const getModuleTasks = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const result = await query(`
      SELECT
        t.id, t.title, t.description, t.created_at,
        u.name as created_by_name,
        (
          -- Count direct task assignments
          SELECT COUNT(DISTINCT a.assigned_to_user_id)
          FROM assignments a
          WHERE a.task_id = t.id
        ) + (
          -- Count users with module-level access
          SELECT COUNT(DISTINCT ma.assigned_to_user_id)
          FROM module_assignments ma
          WHERE ma.module_id = $1
        ) + (
          -- Count users with course-level access
          SELECT COUNT(DISTINCT ca.assigned_to_user_id)
          FROM course_assignments ca
          INNER JOIN modules m ON m.course_id = ca.course_id
          WHERE m.id = $1
        ) as assignment_count
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.module_id = $1
      GROUP BY t.id, t.title, t.description, t.created_at, u.name
      ORDER BY t.id ASC
    `, [moduleId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get module tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

// Create task for a module
const createModuleTask = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, description } = req.body;
    const createdBy = req.user.userId;

    // Get course_id for the module
    const moduleResult = await query('SELECT course_id FROM modules WHERE id = $1', [moduleId]);

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const relatedCourseId = moduleResult.rows[0].course_id;

    const result = await query(`
      INSERT INTO tasks (title, description, module_id, related_course_id, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, title, description, created_at
    `, [title, description, moduleId, relatedCourseId, createdBy]);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description } = req.body;

    const result = await query(`
      UPDATE tasks
      SET title = COALESCE($1, title),
          description = COALESCE($2, description)
      WHERE id = $3
      RETURNING id, title, description, created_at
    `, [title, description, taskId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
};

// Get assigned users for a task
const getTaskAssignedUsers = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT u.id, u.name, u.email, a.status, a.due_date
      FROM users u
      INNER JOIN assignments a ON a.assigned_to_user_id = u.id
      WHERE a.task_id = $1
      ORDER BY u.name ASC
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Get task assigned users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned users',
      error: error.message
    });
  }
};

// Unassign task from users
const unassignTask = async (req, res) => {
  try {
    const { id } = req.params; // task ID
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one user ID'
      });
    }

    // Verify task exists
    const taskResult = await query(
      'SELECT id, title FROM tasks WHERE id = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Delete assignments for these users
    const result = await query(`
      DELETE FROM assignments
      WHERE task_id = $1 AND assigned_to_user_id = ANY($2)
    `, [id, userIds]);

    res.json({
      success: true,
      message: `Task unassigned from ${userIds.length} user(s). ${result.rowCount} assignment(s) removed.`
    });
  } catch (error) {
    console.error('Unassign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign task',
      error: error.message
    });
  }
};

module.exports = {
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
};
