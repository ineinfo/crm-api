// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();

let moduleTitle = 'Property Status';

// Get an Property Type or all Property Types
router.get('/:id?', async (req, res) => {
    const id = req.params.id; 
    try {
        const query = id
            ? `SELECT * FROM ${TABLE.PROPERTY_STATUS} WHERE id = ? AND status = 1 ORDER BY title ASC`
            : `SELECT * FROM ${TABLE.PROPERTY_STATUS} WHERE status = 1 ORDER BY title ASC`;

        const [result] = id
            ? await pool.query(query, [id])
            : await pool.query(query);

        if (id) {
            if (result.length === 0) {
                return res.status(404).json({ message: moduleTitle+' not found', status: 'error' });
            }
            res.status(200).json({
                data: result[0],
                message: moduleTitle+' retrieved successfully',
                status: true
            });
        } else {
            res.status(200).json({
                data: result,
                message: moduleTitle+' retrieved successfully',
                status: true
            });
        }
    } catch (error) {
        console.error('Error retrieving '+moduleTitle+':', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});
module.exports = router;