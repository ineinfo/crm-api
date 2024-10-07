// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();
const authenticateToken = require('../utils/middleware');

let moduleTitle = 'Sales Progression';

// Get an offer list
router.get('/:lead_id',authenticateToken, async (req, res) => {
    const lead_id = req.params.lead_id; 
    try {
        const query = id
            ? `SELECT * FROM ${TABLE.SALES_OFFERS_TABLE} WHERE lead_id = ? AND status != 0`
            : `SELECT * FROM ${TABLE.SALES_OFFERS_TABLE} WHERE status != 0`;

        const [result] = id
            ? await pool.query(query, [lead_id])
            : await pool.query(query);

        if (id) {
            if (result.length === 0) {
                return res.status(404).json({ message: 'Offers not found', status: 'error' });
            }
            res.status(200).json({
                data: result[0],
                message: 'Offers retrieved successfully',
                status: true
            });
        } else {
            res.status(200).json({
                data: result,
                message: 'Offers retrieved successfully',
                status: true
            });
        }
    } catch (error) {
        console.error('Error retrieving Offers:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

router.post('/',authenticateToken, async (req, res) => {
    const user_id = req.user.id
    const { order_id, amount, status } = req.body;
    if (!order_id || !amount || !status) {
        return res.status(400).json({ message: 'Please provide all fields', status: 'error' });
    }
    try {
        const [result] = await pool.query(`INSERT INTO ${TABLE.SALES_OFFERS_TABLE} (order_id, user_id, amount, status) VALUES (?, ?, ?, ?)`, [order_id, user_id, amount, status]);
        let message = ''
        if(status==1) {
            message = 'Offer accepted successfully';
        }
        if(status == 2) {
            message = 'Offer rejected';
        }
        if(status == 3) {
            message = 'Withdrawn successfully'
        }
        res.status(201).json({
            message,
            status: true,
        });
    } catch (error) {
        console.log('error + ',error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

module.exports = router;