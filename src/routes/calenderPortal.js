// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const authenticateToken = require('../utils/middleware');
const {formatDateTimeForDB} = require('../utils/commonFunction')
const router = express.Router();


router.post('/',authenticateToken, async (req, res) => {
    const { title, description, allDay, start, end, color } = req.body;
    const user_id = req.user.id;
    if (!title) {
        return res.status(400).json({ message: 'Please fill all fields', status: 'error' });
    }
    try {
        let start_db = null;
        let end_db = null;
        if(start) {
            start_db  = formatDateTimeForDB(start);
        }

        if(end) {
            end_db  = formatDateTimeForDB(end);
        }
        const [result] = await pool.query(`INSERT INTO ${TABLE.CALENDER_TABLE} (title, description, allDay, start, end, user_id, color) VALUES (?, ?, ?, ?, ?, ?, ?)`, [title, description, allDay, start_db, end_db, user_id, color]);
        res.status(201).json({
            message: 'Meeting created successfully',
            status: true,
            propertytypeId: result.insertId

        });
    } catch (error) {
        console.log('error',error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

router.get('/:id?',authenticateToken, async (req, res) => {
    const id = req.params.id; 
    const user_id = req.user.id;
    try {
        const query = id
            ? `SELECT * FROM ${TABLE.CALENDER_TABLE} WHERE id = ? AND user_id = ? AND status != 0`
            : `SELECT * FROM ${TABLE.CALENDER_TABLE} WHERE status != 0 AND user_id = ?`;

        // Execute the query
        const [result] = id
            ? await pool.query(query, [id, user_id])
            : await pool.query(query, [user_id]);

        if (id) {
            if (result.length === 0) {
                return res.status(404).json({ message: 'Meetings not found', status: 'error' });
            }
            res.status(200).json({
                data: result[0],
                message: 'Meetings retrieved successfully',
                status: true
            });
        } else {
            res.status(200).json({
                data: result,
                message: 'Meetings retrieved successfully',
                status: true
            });
        }
    } catch (error) {
        console.error('Error retrieving Meetings:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Update an Property Type by ID
router.put('/:id',authenticateToken, async (req, res) => {
    const { title, description, allDay, start, end, color } = req.body;
    const user_id = req.user.id;
    if (!title) {
        return res.status(400).json({ message: 'Please fill all fields', status: 'error' });
    }
    const { id } = req.params;
    try {
        
        const [Checkresult] = await pool.query(`SELECT * FROM ${TABLE.CALENDER_TABLE} WHERE status != 0 AND id = ?`, [id])
        if (Checkresult.length === 0) {
            return res.status(404).json({ message: 'Meetings not found', status: 'error' });
        }

        let start_db = null;
        let end_db = null;
        if(start) {
            start_db  = formatDateTimeForDB(start);
        }else{
            start_db  = Checkresult[0].start;
        }

        if(end) {
            end_db  = formatDateTimeForDB(end);
        }else{
            end_db  = Checkresult[0].end;
        }

        const [result] = await pool.query(`UPDATE ${TABLE.CALENDER_TABLE} SET title = ?, description = ?, allDay = ?, start = ?, end = ?, color = ?, user_id = ? WHERE id = ?`, [title, description, allDay, start_db, end_db,color, user_id, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Meeting not found', status: 'error' });
        }
        res.status(200).json({
            message: 'Meeting updated successfully',
            status: true
        });
    } catch (error) {
        console.error('Error updating Meeting:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Delete an Property Type
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query(`UPDATE ${TABLE.CALENDER_TABLE} SET status = 0 WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Meeting not found', status: 'error' });
        }
        res.status(200).json({
            message: 'Meeting deleted successfully',
            status: true
        });
    } catch (error) {
        console.error('Error deleting:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

module.exports = router;
