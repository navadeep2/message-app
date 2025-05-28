const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer tokenstring

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid token' });

      req.user = user; // {id, username}
      next();
    });
  } else {
    res.status(401).json({ message: 'Authorization header missing' });
  }
}

module.exports = { authenticateJWT };
