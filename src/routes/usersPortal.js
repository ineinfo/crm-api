// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables')
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/userimages/'); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create a new user
router.post('/', upload.fields([{ name: 'avatarurl' }]), async (req, res) => {
  const { first_name, last_name, email, password, role_id } = req.body;
  if (!email || !password ||!role_id) {
    return res.status(400).json({ message: 'Email, password or role cannot be empty', status: 'error' });
  }
  // const avatarUrl = req.files['avatarurl'] ? req.files['avatarurl'][0].path : null;
  const avatarUrl = req.files['avatarurl'] 
  ? `${req.protocol}://${req.get('host')}/userimages/${req.files['avatarurl'][0].filename}` 
  : null;
  console.log("avatarUrl:", avatarUrl);
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(`INSERT INTO ${TABLE.USERS_TABLE} (first_name, last_name, avatarurl, email, password, role_id) VALUES (?, ?, ?, ?, ?, ?)`, [first_name, last_name, avatarUrl, email, hashedPassword, role_id]);
    res.status(201).json({
      message: 'User created successfully',
      status: true,
      userId: result.insertId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// get user(s)
router.get('/:id?', async (req, res) => {
  const id = req.params.id; // Get the ID from path parameters
  try {
    // Construct the query
    const query = id 
    ? `SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, r.role_name, u.avatarurl
       FROM ${TABLE.USERS_TABLE} u 
       JOIN ${TABLE.ROLES_TABLE} r 
       ON u.role_id = r.id 
       WHERE u.id = ? AND u.status = 1
       ORDER BY u.created DESC`  // Add the ORDER BY clause
    : `SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, r.role_name, u.avatarurl
       FROM ${TABLE.USERS_TABLE} u 
       JOIN ${TABLE.ROLES_TABLE} r 
       ON u.role_id = r.id 
       WHERE u.status = 1
       ORDER BY u.created DESC`; // Add the ORDER BY clause

    // Execute the query
    const [result] = id 
      ? await pool.query(query, [id]) 
      : await pool.query(query);

    if (id) {
      // Handle single user response
      if (result.length === 0) {
        return res.status(404).json({ message: 'User not found', status: 'error' });
      }
      res.status(200).json({
        data: result[0],
        message: 'User retrieved successfully',
        status: true
      });
    } else {
      // Handle all users response
      res.status(200).json({
        data: result,
        message: 'Users retrieved successfully',
        status: true
      });
    }
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// UPDATE THE FIELDS
router.put('/:id', upload.fields([{ name: 'avatarurl' }]), async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, password, role_id } = req.body;

  try {
    // Get the existing user details to keep avatarurl if not provided
    const [user] = await pool.query(`SELECT avatarurl, password FROM ${TABLE.USERS_TABLE} WHERE id = ?`, [id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found', status: 'error' });
    }
    
    // Determine the new avatar URL
    const existingAvatarUrl = user[0].avatarurl;
    const newAvatarUrl = req.files['avatarurl']
      ? `${req.protocol}://${req.get('host')}/userimages/${req.files['avatarurl'][0].filename}`
      : existingAvatarUrl;

    // Hash password if a new password is provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Build the SET clause and values
    const fields = [first_name, last_name, email, role_id, newAvatarUrl];
    if (hashedPassword) fields.push(hashedPassword);
    const setClause = [
      first_name ? 'first_name = ?' : null,
      last_name ? 'last_name = ?' : null,
      email ? 'email = ?' : null,
      role_id ? 'role_id = ?' : null,
      newAvatarUrl ? 'avatarurl = ?' : null,
      hashedPassword ? 'password = ?' : null
    ].filter(Boolean).join(', ');

    if (!setClause) {
      return res.status(400).json({ message: 'No fields to update', status: 'error' });
    }

    fields.push(id); // Append the ID for the WHERE clause

    const [result] = await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET ${setClause} WHERE id = ?`, fields);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found', status: 'error' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      status: true
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Update the user's status to 2 (soft delete)
    const [result] = await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET status = 0 WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found', status: 'error' });
    }
    res.status(200).json({
      message: 'User deleted successfully',
      status: true
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});


module.exports = router;