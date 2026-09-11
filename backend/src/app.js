const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const authController = require('./controllers/authController');

const app = express();

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Security & Parsing
app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP for inline scripts in EJS
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// View Routes
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', authController.login);
app.get('/logout', authController.logout);
app.get('/dashboard', authMiddleware, (req, res) => {
  res.render('dashboard', { user: req.user });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// 404
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).send('404 Not Found');
    return;
  }
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
