// src/routes/user.js
const express = require('express');
const { query } = require('../../config/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all user routes
router.use(requireAuth);

// User dashboard stats
router.get('/test', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await query(`
      SELECT 
        COUNT(*) as my_assignments,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks
      FROM assignments 
      WHERE assigned_to_user_id = $1
    `, [userId]);
    
    res.json({
      success: true,
      message: 'User stats retrieved successfully',
      stats: result.rows[0],
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
