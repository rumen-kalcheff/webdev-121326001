function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'You must be signed in' });
  }

  res.redirect('/login');
}

module.exports = isAuthenticated;
