// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables')
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Query the database for the user
    const [result] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE email = ?`, [email]);

    // Check if user exists
    if (result.length === 0) {
      return res.status(400).json({ message: 'Invalid username or password', status: 'error' });
    }
    const user = result[0];
    // Check if password is valid
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid userdetailsname or password', status: 'error' });
    }
    const accessToken = jwt.sign({ id: user.id, username: user.username }, process.env.API_SECRET_KEY, { expiresIn: process.env.API_TOKEN_EXPIRESIN });
    res.status(200).json({
      accessToken,
      message: 'Login successful',
      status: true,
      user
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Middleware to verify token and fetch user details
router.get('/verify-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(400).json({ error: 'Token is required', status: false });
    }

    jwt.verify(token, process.env.API_SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token', status: false });
      }

      // Fetch user details from the database
      const [result] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE id = ?`, [decoded.id]);

      if (result.length === 0) {
        return res.status(404).json({ error: 'User not found', status: false });
      }

      const user = result[0];

      return res.status(200).json({
        data: {
          ...user,
          accessToken: token, // Optionally include the token in the response
        },
        message: 'Token is valid',
        status: true
      });
    });
  } catch (error) {
    return res.status(500).json({ error: `Error occurred: ${error.message}`, status: false });
  }
});


module.exports = router;