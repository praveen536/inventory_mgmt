const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  let token = null;

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    // If request accepts HTML (browser navigation), redirect to /login
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.redirect('/login');
    }
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.redirect('/login');
    }
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}

module.exports = authMiddleware;
