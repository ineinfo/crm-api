// routes/followupPortal.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const { getQueryParamId, formatUTCToLocalDate } = require('../utils/commonFunction')

// Create
router.post('/', async (req, res) => {
    const { lead_id, followup_date, summary } = req.body;
    if (!lead_id || !followup_date || !summary) {
        return res.status(400).json({ message: 'Lead ID, Follow Up Date and Description must be required', status: 'error' });
    }
    try {

        const [leadCheck] = await pool.query(`SELECT id FROM ${TABLE.LEADS_TABLE} WHERE id = ? and status = 2`, [lead_id]);
        if (leadCheck.length === 0) {
            return res.status(404).json({ message: 'Lead not found', status: 'error' });
        }

        await pool.query(`INSERT INTO ${TABLE.LEADS_FOLLOWUP_TABLE} (lead_id, followup_date, summary) VALUES (?, ?,?)`, [lead_id, followup_date, summary]);

        res.status(201).json({ message: 'Follow up created successfully', status: true });
    } catch (error) {
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// All & Specific List
router.get('/', async (req, res) => {
    try {
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const url = new URL(fullUrl);
        const leadid = url.searchParams.get('lead_id');
        const id = getQueryParamId(fullUrl);
        let query = `SELECT lf.*, l.first_name as lead_first_name, l.last_name as lead_last_name FROM ${TABLE.LEADS_FOLLOWUP_TABLE} as lf 
        LEFT JOIN ${TABLE.LEADS_TABLE} as l on l.id = lf.lead_id WHERE lf.status = 1 and l.status = 2`;

        const queryParams = [];

        if (id) {
            query += ' AND lf.id = ?';
            queryParams.push(id);
        } else {
            if (leadid) {
                query += ' AND lf.lead_id = ?';
                queryParams.push(leadid);
            }
        }

        query += ` ORDER BY lf.id DESC`;
        const [results] = await pool.query(query, queryParams);

        if (results.length > 0) {
            res.status(200).json({ data: results, message: 'Follow up retrieved successfully', count: results.length, status: true });
        } else {
            return res.status(404).json({ message: 'Follow up not found', status: 'error' });
        }

    } catch (error) {
        console.error('Error retrieving follow up:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Update
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { followup_date, summary, followup_status } = req.body;
    try {
        const [result] = await pool.query(`UPDATE ${TABLE.LEADS_FOLLOWUP_TABLE} SET followup_date = ?, summary = ?, followup_status = ? WHERE id = ?`, [followup_date, summary, followup_status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Follow Up not found', status: 'error' });
        }
        res.status(200).json({ message: 'Follow Up updated successfully', status: true });
    } catch (error) {
        console.error('Error updating follow up:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Delete - Single & Multiple
router.delete('/:ids', async (req, res) => {
    const { ids } = req.params;
    const idList = ids.split(',');

    if (!idList.length) {
        return res.status(400).json({ message: 'No IDs provided', status: 'error' });
    }

    try {
        const placeholders = idList.map(() => '?').join(',');
        const query = `UPDATE ${TABLE.LEADS_FOLLOWUP_TABLE} SET status = 0 WHERE id IN (${placeholders})`;
        const [result] = await pool.query(query, idList);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Follow Up not found', status: 'error' });
        }

        res.status(200).json({ message: `${result.affectedRows} Follow Up(s) deleted successfully`, status: true });
    } catch (error) {
        console.error('Error deleting roles:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Dashboard (Upcoming Follow Up)
router.get('/dashboard', async (req, res) => {
    try {


        const [results] = await pool.query(`SELECT lf.*, l.first_name as lead_first_name, l.last_name as lead_last_name FROM ${TABLE.LEADS_FOLLOWUP_TABLE} as lf 
        LEFT JOIN ${TABLE.LEADS_TABLE} as l on l.id = lf.lead_id WHERE l.status = 2 and lf.status = 1 and lf.followup_status = 1 and lf.followup_date >= CURDATE() 
        ORDER BY lf.followup_date ASC`);

        if (results.length > 0) {
            results.forEach(result => {
                result.followup_date = formatUTCToLocalDate(result.followup_date);
            });
            res.status(200).json({ data: results, message: 'Follow up retrieved successfully', count: results.length, status: true });
        } else {
            return res.status(404).json({ message: 'Follow up not found', status: 'error' });
        }

    } catch (error) {
        console.error('Error retrieving follow up:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

// Follow Up: Create Validation
router.post('/createallow', async (req, res) => {
    try {
        const { lead_id } = req.body;

        const [leadResults] = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.LEADS_TABLE} WHERE id = ? and status = 2`, [lead_id]);
        const { count } = leadResults[0];
        if (count === 0) {
            return res.status(404).json({ message: 'Lead ID not found', status: false });
        }

        const [results] = await pool.query(`SELECT count(*) as totalcount FROM ${TABLE.LEADS_FOLLOWUP_TABLE} WHERE lead_id = ? AND followup_status = 1`, [lead_id]);
        const { totalcount } = results[0];
        if (totalcount > 0) {
            res.status(200).json({ data: { count: totalcount }, message: 'Sorry, You cannot add a new follow-up until the existing one is updated. Please update the status before creating a new follow-up.', status: false });
        } else {
            res.status(200).json({ data: { count: totalcount }, message: 'You can now add a new follow-up', status: true });
        }

    } catch (error) {
        console.error('Error retrieving follow-up:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

module.exports = router;