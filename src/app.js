const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const labRoutes = require('./routes/labRoutes');

const app = express();

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV !== 'test') {
  throw new Error('SESSION_SECRET is not set');
}

app.use(session({
  secret: sessionSecret || 'test-secret-only-for-tests',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// Global view variables
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/', labRoutes);

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/labs');
});

module.exports = app;
