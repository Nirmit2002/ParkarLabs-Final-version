// src/controllers/courses.js
const { query } = require('../../config/database');
const xlsx = require('xlsx');

// Get all courses
const getCourses = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.id, c.title, c.slug, c.description, c.visibility, c.created_at,
        u.name as created_by_name,
        COUNT(m.id) as module_count,
        COUNT(a.id) as assignment_count
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN modules m ON c.id = m.course_id
      LEFT JOIN assignments a ON a.task_id IN (
        SELECT t.id FROM tasks t WHERE t.related_course_id = c.id
      )
      GROUP BY c.id, c.title, c.slug, c.description, c.visibility, c.created_at, u.name
      ORDER BY c.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
};

// Get single course by ID
const getCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Get course with modules
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
    
    // Get modules for this course with task counts
    const modulesResult = await query(`
      SELECT
        m.id, m.title, m.content, m.position, m.created_at,
        COUNT(t.id) as task_count
      FROM modules m
      LEFT JOIN tasks t ON t.module_id = m.id
      WHERE m.course_id = $1
      GROUP BY m.id, m.title, m.content, m.position, m.created_at
      ORDER BY m.position ASC
    `, [courseId]);
    
    const course = courseResult.rows[0];
    course.modules = modulesResult.rows;
    
    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
      error: error.message
    });
  }
};

// Create new course
const createCourse = async (req, res) => {
  try {
    const { title, description, visibility = 'private' } = req.body;
    const createdBy = req.user.userId;
    
    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if slug already exists
    const slugCheck = await query('SELECT id FROM courses WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Course with this title already exists'
      });
    }
    
    const result = await query(`
      INSERT INTO courses (title, slug, description, created_by, visibility, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, title, slug, description, visibility, created_at
    `, [title, slug, description, createdBy, visibility]);
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: error.message
    });
  }
};

// Update course
const updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { title, description, visibility } = req.body;
    
    // Generate new slug if title changed
    let slug;
    if (title) {
      slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    
    const result = await query(`
      UPDATE courses 
      SET title = COALESCE($1, title),
          slug = COALESCE($2, slug),
          description = COALESCE($3, description),
          visibility = COALESCE($4, visibility)
      WHERE id = $5
      RETURNING id, title, slug, description, visibility, created_at
    `, [title, slug, description, visibility, courseId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Course updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course',
      error: error.message
    });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    const result = await query('DELETE FROM courses WHERE id = $1 RETURNING id', [courseId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course',
      error: error.message
    });
  }
};

// Add module to course
const addModule = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { title, content, position } = req.body;
    
    const result = await query(`
      INSERT INTO modules (course_id, title, content, position, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, title, content, position, created_at
    `, [courseId, title, content, position || 0]);
    
    res.status(201).json({
      success: true,
      message: 'Module added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Add module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add module',
      error: error.message
    });
  }
};

// Update module
const updateModule = async (req, res) => {
  try {
    const { id: courseId, moduleId } = req.params;
    const { title, content, position } = req.body;
    
    const result = await query(`
      UPDATE modules 
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          position = COALESCE($3, position)
      WHERE id = $4 AND course_id = $5
      RETURNING id, title, content, position, created_at
    `, [title, content, position, moduleId, courseId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Module updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update module',
      error: error.message
    });
  }
};

// Delete module
const deleteModule = async (req, res) => {
  try {
    const { id: courseId, moduleId } = req.params;

    const result = await query(
      'DELETE FROM modules WHERE id = $1 AND course_id = $2 RETURNING id',
      [moduleId, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete module',
      error: error.message
    });
  }
};

// Import courses and modules from Excel
const importFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded'
      });
    }

    const createdBy = req.user.userId;
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = {
      courses: [],
      modules: [],
      tasks: [],
      errors: []
    };

    // Expected format:
    // Row 1: Course Title | Course Description | Visibility
    // Row 2: [empty] | Module 1 Title | Module 1 Description
    // Row 3: [empty] | [empty] | Task: Task Title
    // Row 4: [empty] | [empty] | Task: Another Task
    // Row 5: [empty] | Module 2 Title | Module 2 Description
    // ... (continue modules and tasks)
    // Empty row starts next course

    let currentCourseId = null;
    let currentCourseTitle = null;
    let currentModuleId = null;
    let currentModuleTitle = null;
    let modulePosition = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (!row || row.length === 0 || (!row[0] && !row[1] && !row[2])) {
        currentCourseId = null;
        currentCourseTitle = null;
        currentModuleId = null;
        currentModuleTitle = null;
        modulePosition = 0;
        continue;
      }

      const col0 = row[0] ? String(row[0]).trim() : '';
      const col1 = row[1] ? String(row[1]).trim() : '';
      const col2 = row[2] ? String(row[2]).trim() : '';

      // Row with content in col0 = Course row
      if (col0 && !currentCourseId) {
        // Create new course
        const title = col0;
        const description = col1;
        const visibility = col2.toLowerCase() === 'public' ? 'public' : 'private';

        // Generate slug
        const slug = title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        try {
          // Check if course exists
          const slugCheck = await query('SELECT id FROM courses WHERE slug = $1', [slug]);

          if (slugCheck.rows.length > 0) {
            results.errors.push(`Row ${i + 1}: Course "${title}" already exists`);
            currentCourseId = null;
            continue;
          }

          const courseResult = await query(`
            INSERT INTO courses (title, slug, description, created_by, visibility, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id, title, slug, description, visibility
          `, [title, slug, description, createdBy, visibility]);

          currentCourseId = courseResult.rows[0].id;
          currentCourseTitle = title;
          currentModuleId = null;
          currentModuleTitle = null;
          modulePosition = 0;
          results.courses.push(courseResult.rows[0]);
        } catch (error) {
          results.errors.push(`Row ${i + 1}: Error creating course "${title}" - ${error.message}`);
          currentCourseId = null;
        }
      }
      // Row with content in col1 (and empty col0) = Module row
      else if (!col0 && col1 && currentCourseId) {
        // Create module for current course
        const moduleTitle = col1;
        const moduleContent = col2 || '';

        try {
          const moduleResult = await query(`
            INSERT INTO modules (course_id, title, content, position, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id, title, position
          `, [currentCourseId, moduleTitle, moduleContent, modulePosition]);

          currentModuleId = moduleResult.rows[0].id;
          currentModuleTitle = moduleTitle;
          modulePosition++;
          results.modules.push({
            ...moduleResult.rows[0],
            course_title: currentCourseTitle
          });
        } catch (error) {
          results.errors.push(`Row ${i + 1}: Error creating module "${moduleTitle}" - ${error.message}`);
        }
      }
      // Row with content in col2 (and empty col0, col1) = Task row
      else if (!col0 && !col1 && col2 && currentModuleId) {
        // Create task for current module
        let taskTitle = col2;

        // Remove "Task:" prefix if present
        if (taskTitle.toLowerCase().startsWith('task:')) {
          taskTitle = taskTitle.substring(5).trim();
        }

        try {
          const taskResult = await query(`
            INSERT INTO tasks (title, description, module_id, related_course_id, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id, title
          `, [taskTitle, '', currentModuleId, currentCourseId, createdBy]);

          results.tasks.push({
            ...taskResult.rows[0],
            module_title: currentModuleTitle,
            course_title: currentCourseTitle
          });
        } catch (error) {
          results.errors.push(`Row ${i + 1}: Error creating task "${taskTitle}" - ${error.message}`);
        }
      } else {
        if (col0 || col1 || col2) {
          results.errors.push(`Row ${i + 1}: Skipped - invalid format or no active course/module`);
        }
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${results.courses.length} courses, ${results.modules.length} modules, ${results.tasks.length} tasks`,
      data: results
    });

  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import Excel file',
      error: error.message
    });
  }
};

// Assign course to users (direct course-level assignment)
const assignCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { userIds, dueDate } = req.body;
    const assignedBy = req.user.userId;

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one user ID'
      });
    }

    // Get existing course assignments
    const existingResult = await query(`
      SELECT assigned_to_user_id
      FROM course_assignments
      WHERE course_id = $1 AND assigned_to_user_id = ANY($2)
    `, [courseId, userIds]);

    const existingUserIds = new Set(existingResult.rows.map(row => row.assigned_to_user_id));

    // Prepare batch insert for new assignments
    const values = [];
    const insertParams = [];
    let paramCounter = 1;

    for (const userId of userIds) {
      if (!existingUserIds.has(userId)) {
        values.push(
          `($${paramCounter}, $${paramCounter + 1}, $${paramCounter + 2}, $${paramCounter + 3}, NOW())`
        );
        insertParams.push(courseId, userId, assignedBy, dueDate || null);
        paramCounter += 4;
      }
    }

    let assignmentCount = 0;

    // Perform batch insert if there are new assignments
    if (values.length > 0) {
      const insertQuery = `
        INSERT INTO course_assignments (course_id, assigned_to_user_id, assigned_by, due_date, created_at)
        VALUES ${values.join(', ')}
      `;
      await query(insertQuery, insertParams);
      assignmentCount = values.length;
    }

    res.json({
      success: true,
      message: `Course assigned successfully to ${assignmentCount} new user(s).`
    });
  } catch (error) {
    console.error('Assign course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign course',
      error: error.message
    });
  }
};

// Assign module to users (direct module-level assignment)
const assignModule = async (req, res) => {
  try {
    const { id: courseId, moduleId } = req.params;
    const { userIds, dueDate } = req.body;
    const assignedBy = req.user.userId;

    console.log('Assign module request:', { courseId, moduleId, userIds, dueDate, assignedBy });

    if (!userIds || userIds.length === 0) {
      console.log('Error: No user IDs provided');
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one user ID'
      });
    }

    // Get existing module assignments
    const existingResult = await query(`
      SELECT assigned_to_user_id
      FROM module_assignments
      WHERE module_id = $1 AND assigned_to_user_id = ANY($2)
    `, [moduleId, userIds]);

    const existingUserIds = new Set(existingResult.rows.map(row => row.assigned_to_user_id));

    // Prepare batch insert for new assignments
    const values = [];
    const insertParams = [];
    let paramCounter = 1;

    for (const userId of userIds) {
      if (!existingUserIds.has(userId)) {
        values.push(
          `($${paramCounter}, $${paramCounter + 1}, $${paramCounter + 2}, $${paramCounter + 3}, NOW())`
        );
        insertParams.push(moduleId, userId, assignedBy, dueDate || null);
        paramCounter += 4;
      }
    }

    let assignmentCount = 0;

    // Perform batch insert if there are new assignments
    if (values.length > 0) {
      const insertQuery = `
        INSERT INTO module_assignments (module_id, assigned_to_user_id, assigned_by, due_date, created_at)
        VALUES ${values.join(', ')}
      `;
      await query(insertQuery, insertParams);
      assignmentCount = values.length;
    }

    console.log(`Successfully assigned module. ${assignmentCount} assignments created.`);

    res.json({
      success: true,
      message: `Module assigned successfully to ${assignmentCount} new user(s).`
    });
  } catch (error) {
    console.error('Assign module error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to assign module',
      error: error.message,
      details: error.stack
    });
  }
};

// Get assigned users for a course (only direct course assignments)
const getCourseAssignedUsers = async (req, res) => {
  try {
    const courseId = req.params.id;

    const result = await query(`
      SELECT u.id, u.name, u.email, ca.due_date, ca.created_at
      FROM users u
      INNER JOIN course_assignments ca ON ca.assigned_to_user_id = u.id
      WHERE ca.course_id = $1
      ORDER BY u.name ASC
    `, [courseId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Get course assigned users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned users',
      error: error.message
    });
  }
};

// Get assigned users for a module (only direct module assignments)
const getModuleAssignedUsers = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const result = await query(`
      SELECT u.id, u.name, u.email, ma.due_date, ma.created_at
      FROM users u
      INNER JOIN module_assignments ma ON ma.assigned_to_user_id = u.id
      WHERE ma.module_id = $1
      ORDER BY u.name ASC
    `, [moduleId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Get module assigned users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned users',
      error: error.message
    });
  }
};

// Get assigned users for a task
const getTaskAssignedUsers = async (req, res) => {
  try {
    const { taskId } = req.params;

    const result = await query(`
      SELECT u.id, u.name, u.email, a.status, a.due_date
      FROM users u
      INNER JOIN assignments a ON a.assigned_to_user_id = u.id
      WHERE a.task_id = $1
      ORDER BY u.name ASC
    `, [taskId]);

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

// Unassign course from users (remove direct course assignments)
const unassignCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one user ID'
      });
    }

    // Delete course assignments for these users
    const result = await query(`
      DELETE FROM course_assignments
      WHERE course_id = $1 AND assigned_to_user_id = ANY($2)
    `, [courseId, userIds]);

    res.json({
      success: true,
      message: `Course unassigned from ${userIds.length} user(s). ${result.rowCount} assignment(s) removed.`
    });
  } catch (error) {
    console.error('Unassign course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign course',
      error: error.message
    });
  }
};

// Unassign module from users (remove direct module assignments)
const unassignModule = async (req, res) => {
  try {
    const { id: courseId, moduleId } = req.params;
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one user ID'
      });
    }

    // Delete module assignments for these users
    const result = await query(`
      DELETE FROM module_assignments
      WHERE module_id = $1 AND assigned_to_user_id = ANY($2)
    `, [moduleId, userIds]);

    res.json({
      success: true,
      message: `Module unassigned from ${userIds.length} user(s). ${result.rowCount} assignment(s) removed.`
    });
  } catch (error) {
    console.error('Unassign module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign module',
      error: error.message
    });
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  deleteModule,
  importFromExcel,
  assignCourse,
  assignModule,
  getCourseAssignedUsers,
  getModuleAssignedUsers,
  getTaskAssignedUsers,
  unassignCourse,
  unassignModule
};
