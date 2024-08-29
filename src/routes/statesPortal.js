// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();

// Create a new Property Type
// router.post('/', async (req, res) => {
//     const { property_type, description } = req.body;
//     if (!property_type) {
//         return res.status(400).json({ message: 'Property Type cannot be empty', status: 'error' });
//     }
//     try {
//         const [result] = await pool.query(`INSERT INTO ${TABLE.PROPERTY_TYPE_TABLE} (property_type, description) VALUES (?, ?)`, [property_type, description]);
//         res.status(201).json({
//             message: 'Property Type created successfully',
//             status: true,
//             propertytypeId: result.insertId

//         });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', status: 'error' });
//     }
// });

// Get an Property Type or all Property Types
router.get('/:id?', async (req, res) => {
    const id = req.params.id; // Get the ID from path parameters
    try {
        // Construct the query
        const query = id
            ? `SELECT * FROM ${TABLE.STATES_TABLE} WHERE country_id = ? AND status = 1`
            : `SELECT * FROM ${TABLE.STATES_TABLE} WHERE status = 1`;

        // Execute the query
        const [result] = id
            ? await pool.query(query, [id])
            : await pool.query(query);

        if (id) {
            // Handle single Property Type response
            if (result.length === 0) {
                return res.status(404).json({ message: 'State not found', status: 'error' });
            }
            res.status(200).json({
                data: result,
                message: 'State retrieved successfully',
                status: true
            });
        } else {
            // Handle all Property Type response
            res.status(200).json({
                data: result,
                message: 'State retrieved successfully',
                status: true
            });
        }
    } catch (error) {
        console.error('Error retrieving State:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// // Update an Property Type by ID
// router.put('/:id', async (req, res) => {
//     const { id } = req.params;
//     const { property_type, description } = req.body;
//     try {
//         const [result] = await pool.query(`UPDATE ${TABLE.PROPERTY_TYPE_TABLE} SET property_type = ?, description = ? WHERE id = ?`, [property_type, description, id]);
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ message: 'Property Type not found', status: 'error' });
//         }
//         res.status(200).json({
//             message: 'Property Type updated successfully',
//             status: true
//         });
//     } catch (error) {
//         console.error('Error updating Property Type:', error);
//         res.status(500).json({ message: 'Server error', status: 'error' });
//     }
// });

// // Delete an Property Type
// router.delete('/:id', async (req, res) => {
//     const { id } = req.params;
//     try {
//         // Update the Property Type's status to 0 (soft delete)
//         const [result] = await pool.query(`UPDATE ${TABLE.PROPERTY_TYPE_TABLE} SET status = 0 WHERE id = ?`, [id]);
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ message: 'Property Type not found', status: 'error' });
//         }
//         res.status(200).json({
//             message: 'Property Type deleted successfully',
//             status: true
//         });
//     } catch (error) {
//         console.error('Error deleting Property Type:', error);
//         res.status(500).json({ message: 'Server error', status: 'error' });
//     }
// });

module.exports = router;
