// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();

// Create a new amenity
router.post('/', async (req, res) => {
    const { amenity_name, description } = req.body;
    if (!amenity_name) {
        return res.status(400).json({ message: 'Amenity name cannot be empty', status: 'error' });
    }
    try {
        const [result] = await pool.query(`INSERT INTO ${TABLE.AMENITIES_TABLE} (amenity_name, description) VALUES (?, ?)`, [amenity_name, description]);
        res.status(201).json({
            message: 'Amenity created successfully',
            status: true,
            amenityId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Get an amenity or all amenitiess
router.get('/:id?', async (req, res) => {
    const id = req.params.id; // Get the ID from path parameters
    try {
        // Construct the query
        const query = id
            ? `SELECT * FROM ${TABLE.AMENITIES_TABLE} WHERE id = ? AND status = 1 ORDER BY amenity_name ASC`
            : `SELECT * FROM ${TABLE.AMENITIES_TABLE} WHERE status = 1 ORDER BY amenity_name ASC`;

        // Execute the query
        const [result] = id
            ? await pool.query(query, [id])
            : await pool.query(query);

        if (id) {
            // Handle single amenity response
            if (result.length === 0) {
                return res.status(404).json({ message: 'Amenity not found', status: 'error' });
            }
            res.status(200).json({
                data: result[0],
                message: 'Amenity retrieved successfully',
                status: true
            });
        } else {
            // Handle all amenities response
            res.status(200).json({
                data: result,
                message: 'Amenities retrieved successfully',
                status: true
            });
        }
    } catch (error) {
        console.error('Error retrieving amenities:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Update an amenity by ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { amenity_name, description } = req.body;
    try {
        const [result] = await pool.query(`UPDATE ${TABLE.AMENITIES_TABLE} SET amenity_name = ?, description = ? WHERE id = ?`, [amenity_name, description, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Amenity not found', status: 'error' });
        }
        res.status(200).json({
            message: 'Amenity updated successfully',
            status: true
        });
    } catch (error) {
        console.error('Error updating amenity:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Delete an amenity
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Update the amenity's status to 0 (soft delete)
        const [result] = await pool.query(`UPDATE ${TABLE.AMENITIES_TABLE} SET status = 0 WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Amenity not found', status: 'error' });
        }
        res.status(200).json({
            message: 'Amenity deleted successfully',
            status: true
        });
    } catch (error) {
        console.error('Error deleting amenity:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

module.exports = router;
