// src/routes/labs.js
const express = require('express');
const router = express.Router();
const {
  getAllLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
  getLabStats,
  getUsersForDropdown
} = require('../controllers/labs');

// Get all LABs with filters and pagination
router.get('/', getAllLabs);

// Get LAB statistics
router.get('/stats', getLabStats);

// Get users for dropdown
router.get('/users', getUsersForDropdown);

// Get single LAB by ID
router.get('/:id', getLabById);

// Create new LAB
router.post('/', createLab);

// Update LAB
router.put('/:id', updateLab);

// Delete LAB
router.delete('/:id', deleteLab);

module.exports = router;
