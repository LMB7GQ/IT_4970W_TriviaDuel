const express    = require('express');
const router     = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// POST /api/auth/register  → create account
// POST /api/auth/login     → login, returns JWT
// GET  /api/auth/me        → get current user (requires token)

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        protect, getMe);

module.exports = router;