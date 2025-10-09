/**
 * backend/src/routes/containers.js
 * Router for container operations (launch LXC, etc.)
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { requireAuth } = require('../middleware/auth'); // auth middleware must set req.user
const containersController = require('../controllers/containers');

const dependenciesValidation = [
  body('dependencies').isArray().withMessage('dependencies must be an array'),
  body('dependencies.*')
    .isString()
    .isIn(['node','postgresql','nginx','redis','docker','mongodb'])
    .withMessage('Invalid dependency'),
  body('taskId').optional().isInt().withMessage('taskId must be a number'),
  body('sshPublicKey').optional().isString().isLength({ min: 32 }),
];

// POST /api/containers/launch
router.post('/launch', requireAuth, dependenciesValidation, containersController.launch);

module.exports = router;
