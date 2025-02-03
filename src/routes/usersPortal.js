// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables')
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authenticateToken = require('../utils/middleware');
const { checkEmailExistOrNot, checkPhoneExistOrNot } = require('../utils/commonFunction')


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
  const { first_name, last_name, email, mobile_number, role_id , password} = req.body;
  
  // Check if required fields are provided
  if (!email || !mobile_number || !role_id ||!password) {
    return res.status(400).json({ message: 'Email, mobile number, Password or role cannot be empty', status: 'error' });
  }

  // Email Validation
  if (email) {
    const emailExists = await checkEmailExistOrNot(TABLE.USERS_TABLE, email);
    if (emailExists) {
      return res.status(409).json({ message: 'Email already exists', status: 'error' });
    }
  }

  // Mobile Validation
  if (mobile_number) {
    const phoneExists = await checkPhoneExistOrNot(TABLE.USERS_TABLE, mobile_number);
    if (phoneExists) {
      return res.status(409).json({ message: 'Mobile Number already exists', status: 'error' });
    }
  }

  // Construct the avatar URL if the file is uploaded
  const avatarUrl = req.files['avatarurl'] 
    ? `${req.protocol}://${req.get('host')}/userimages/${req.files['avatarurl'][0].filename}` 
    : null;

  try {
    // Insert the new user into the database
    const [result] = await pool.query(
      `INSERT INTO ${TABLE.USERS_TABLE} (first_name, last_name, avatarurl, email, mobile_number, role_id , password) 
       VALUES (?, ?, ?, ?, ?, ?,?)`, 
      [first_name, last_name, avatarUrl, email, mobile_number, role_id, await bcrypt.hash(password, 10)]
    );

    // Return success response
    res.status(201).json({
      message: 'User created successfully',
      status: true,
      userId: result.insertId
    });
  } catch (error) {
    // Handle any errors
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
    ? `SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, r.role_name,u.mobile_number, u.avatarurl
       FROM ${TABLE.USERS_TABLE} u 
       JOIN ${TABLE.ROLES_TABLE} r 
       ON u.role_id = r.id 
       WHERE u.id = ? AND u.status = 1
       ORDER BY u.created DESC`  // Add the ORDER BY clause
    : `SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, r.role_name,u.mobile_number, u.avatarurl
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
  const { first_name, last_name, email, mobile_number, role_id, password } = req.body;

  try {
    // Get the existing user details to keep avatarurl if not provided
    const [user] = await pool.query(`SELECT avatarurl FROM ${TABLE.USERS_TABLE} WHERE id = ?`, [id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found', status: 'error' });
    }
    
    // Determine the new avatar URL
    const existingAvatarUrl = user[0].avatarurl;
    const newAvatarUrl = req.files['avatarurl']
      ? `${req.protocol}://${req.get('host')}/userimages/${req.files['avatarurl'][0].filename}`
      : existingAvatarUrl;

    // Build the SET clause and values
    const fields = [];
    const setClause = [];

    // Always add fields even if they are empty strings
    if ('first_name' in req.body) {
      setClause.push('first_name = ?');
      fields.push(first_name || '');  // Default to empty string if undefined
    }
    if ('last_name' in req.body) {
      setClause.push('last_name = ?');
      fields.push(last_name || '');  // Default to empty string if undefined
    }
    if ('email' in req.body) {
      setClause.push('email = ?');
      fields.push(email || '');  // Default to empty string if undefined
    }
    if ('mobile_number' in req.body) {
      setClause.push('mobile_number = ?');
      fields.push(mobile_number || '');  // Default to empty string if undefined
    }
    if ('role_id' in req.body) {
      setClause.push('role_id = ?');
      fields.push(role_id || '');  // Default to empty string if undefined
    }
    if ('password' in req.body) {
      setClause.push('password = ?');
      fields.push(await bcrypt.hash(password, 10) || ''); 
    }
    if (newAvatarUrl) {
      setClause.push('avatarurl = ?');
      fields.push(newAvatarUrl);
    }

    // Email Validation
    if (email) {
      const emailExists = await checkEmailExistOrNot(TABLE.USERS_TABLE, email, id);
      if (emailExists) {
        return res.status(409).json({ message: 'Email already exists', status: 'error' });
      }
    }

    // Mobile Validation
    if (mobile_number) {
      const phoneExists = await checkPhoneExistOrNot(TABLE.USERS_TABLE, mobile_number, id);
      if (phoneExists) {
        return res.status(409).json({ message: 'Mobile Number already exists', status: 'error' });
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ message: 'No fields to update', status: 'error' });
    }

    fields.push(id); // Append the ID for the WHERE clause

    const query = `UPDATE ${TABLE.USERS_TABLE} SET ${setClause.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(query, fields);

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


function validatePassword(password) {
  // Minimum length check
  if (password.length < 9) {
      return false;
  }

  // Uppercase, lowercase, and special characters check
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const specialCharactersRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

  const hasUppercase = uppercaseRegex.test(password);
  const hasLowercase = lowercaseRegex.test(password);
  const hasSpecialCharacters = specialCharactersRegex.test(password);

  // Check if all conditions are met
  return hasUppercase && hasLowercase && hasSpecialCharacters;
}

// Change Password
router.post('/changepassword', authenticateToken, async (req, res) => {
  try {
    const id = req.user.id;
    if (!id) {
      return res.status(400).json({ message: 'User ID must be provided', status: 'error' });
    }

    const [existingRecordResults] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE id = ?`, [id]);
    if (existingRecordResults.length === 0) {
      return sendResponse(res, { error: ManageResponseStatus('notFound'), status: false }, 404);
    }

    const { current_password, new_password, confirm_password } = req.body;

    // Field Validation
    if (typeof current_password !== 'string' || typeof new_password !== 'string' || typeof confirm_password !== 'string') {
      return res.status(400).json({ message: 'All fields must be string', status: 'error' });
    }

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: 'Current Password, New Password, and Confirm Password fields are required', status: 'error' });
    }

    // Validate the current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, existingRecordResults[0].password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current Password is Incorrect', status: 'error' });
    }

    // Password Validation
    if (!validatePassword(new_password)) {
      return res.status(400).json({ message: 'New Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.', status: 'error' });
    }

    if (!validatePassword(confirm_password)) {
      return res.status(400).json({ message: 'Confirm Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.', status: 'error' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ message: 'New Password and Confirm Password do not match.', status: 'error' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update the password in the database
    await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET password = ? WHERE id = ?`, [hashedPassword, id]);
    return res.status(200).json({ message: 'Password Successfully Updated', status: true });
  } catch (error) {
    return res.status(500).json({ error: `Error occurred: ${error.message}`, status: 'error' });
  }
});

module.exports = router;