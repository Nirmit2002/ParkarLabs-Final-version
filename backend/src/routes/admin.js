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

module.exports = router;
