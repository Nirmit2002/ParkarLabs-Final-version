// src/controllers/courses.js
const { query } = require('../../config/database');

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
    
    // Get modules for this course
    const modulesResult = await query(`
      SELECT id, title, content, position, created_at
      FROM modules 
      WHERE course_id = $1 
      ORDER BY position ASC
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

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  deleteModule
};
