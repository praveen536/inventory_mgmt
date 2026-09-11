const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const authController = {
  async login(req, res) {
    const { password } = req.body;
    const username = req.body.username?.trim();

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' },
      });
    }

    if (username !== config.admin.username) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      });
    }

    const validPassword = await bcrypt.compare(password, config.admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      });
    }

    const token = jwt.sign({ username }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      data: { token, username, expiresIn: config.jwt.expiresIn },
    });
  },
  
  async logout(req, res) {
    res.clearCookie('token');
    res.redirect('/login');
  }
};

module.exports = authController;
