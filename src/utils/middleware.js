const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token is missing or invalid', status: 'error' });
  }
  console.log('tokentoken', token);
  jwt.verify(token, process.env.API_SECRET_KEY, (err, user) => {
    if (err) {
      console.log('errerr',err);
      return res.status(403).json({ message: 'Token is invalid or expired', status: 'error' });
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;