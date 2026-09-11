const { Router } = require('express');
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts, try again later' },
  },
});

router.post('/login', loginLimiter, authController.login);

module.exports = router;
