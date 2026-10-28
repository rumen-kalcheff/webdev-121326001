const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/labs');
  }
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    const errorMsg = 'Wrong email or password';
    if (req.accepts('html')) {
      return res.status(401).render('login', { error: errorMsg });
    } else {
      return res.status(401).json({ error: errorMsg });
    }
  }

  try {
    const user = await authService.login(email, password);
    if (!user) {
      const errorMsg = 'Wrong email or password';
      if (req.accepts('html')) {
        return res.status(401).render('login', { error: errorMsg });
      } else {
        return res.status(401).json({ error: errorMsg });
      }
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      req.session.user = user;
      
      if (req.accepts('html')) {
        res.redirect('/labs');
      } else {
        res.json({ message: 'Login successful', user });
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
