// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();
const authenticateToken = require('../utils/middleware');
const multer = require('multer');
const path = require('path');

let moduleTitle = 'Sales Progression';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/lead_documents/'); 
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Get an offer list
router.get('/status',authenticateToken, async (req, res) => {
    try {
        const query = `SELECT * FROM ${TABLE.MASTER_SALES_PROGRESSION_TABLE} WHERE status != 0`;

        const [result] = await pool.query(query);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Sales Progression Status not found', status: 'error' });
        }
        res.status(200).json({
            data: result,
            message: 'Sales Progression Status retrieved successfully',
            status: true
        });
    } catch (error) {
        console.error('Error retrieving Sales Progression Status:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});


router.get('/status_ledger/:lead_id',authenticateToken, async (req, res) => {
    try {
        const query = `SELECT * FROM ${TABLE.LEADS_TABLE} WHERE status != 0 and id = ?`;
        const [result] = await pool.query(query, [lead_id]);
        if (result.length === 0) {
            return res.status(404).json({ message: 'Lead not found', status: 'error' });
        }

        const lead_query = `SELECT lead.*,msp.sales_status FROM 
                    ${TABLE.LEAD_SALES_STATUS_LIST_TABLE} lead
                    LEFT JOIN ${TABLE.MASTER_SALES_PROGRESSION_TABLE} msp
                    ON msp.id = lead.lead_status
                    WHERE lead.lead_id = ?`;
        const [lead_result] = await pool.query(lead_query, [lead_id]);
        if (result.length === 0) {
            return res.status(404).json({ message: 'Lead status  not found', status: 'error' });
        }
        res.status(200).json({
            data: lead_result,
            message: 'Lead status retrieved successfully',
            status: true
        });
    } catch (error) {
        console.error('Error retrieving Lead status:', error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

router.get('/:lead_id?',authenticateToken, async (req, res) => {
    const lead_id = req.params.lead_id; 
    try {
        const query = lead_id
            ? `SELECT * FROM ${TABLE.SALES_OFFERS_TABLE} WHERE lead_id = ? AND status != 0`
            : `SELECT * FROM ${TABLE.SALES_OFFERS_TABLE} WHERE status != 0`;

        const [result] = lead_id
            ? await pool.query(query, [lead_id])
            : await pool.query(query);

        if (!lead_id) {
            if (result.length === 0) {
                return res.status(404).json({ message: 'Offers not found', status: 'error' });
            }
            res.status(200).json({
                data: result,
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


router.put('/updatestatus',upload.fields([{ name: 'document' }]), authenticateToken, async (req, res) => {
    const user_id = req.user.id
    const { lead_id, amount, lead_status, document } = req.body;
    if (!lead_id || !lead_status) {
        return res.status(400).json({ message: 'Please provide all fields', status: 'error' });
    }
    try {

        const query = `SELECT * FROM ${TABLE.LEADS_TABLE} WHERE status!=0 AND id=?`;
        const [lead_check] = await pool.query(query, [lead_id])
        if (!lead_check || lead_check.length === 0) {
            return res.status(401).json({
                message:'Lead not found',
                status: false,
            });    
        }

        let result = null;
        if(lead_status == 1) {
            [result] = await pool.query(`INSERT INTO ${TABLE.LEAD_SALES_STATUS_LIST_TABLE} (lead_id, user_id, amount, lead_status) VALUES (?, ?, ?, ?)`, [lead_id, user_id, amount, lead_status]);
        }

        if(lead_status == 2) {
            [result] = await pool.query(`INSERT INTO ${TABLE.LEAD_SALES_STATUS_LIST_TABLE} (lead_id, user_id, lead_status) VALUES (?, ?, ?)`, [lead_id, user_id, lead_status]);
        }

        if(lead_status == 3) {
            let documentPath = null;

            const documentUrl = req.files['document'] 
            ? `${req.protocol}://${req.get('host')}/lead_documents/${req.files['document'][0].filename}` 
            : null;
        

            [result] = await pool.query(`INSERT INTO ${TABLE.LEAD_SALES_STATUS_LIST_TABLE} (lead_id, user_id, lead_status, document_url) VALUES (?, ?, ?, ?)`, [lead_id, user_id, lead_status, documentUrl]);
        }

        await pool.query(`UPDATE ${TABLE.LEADS_TABLE} SET lead_status = ?, lead_sales_status_list_id = ? WHERE id = ?`, [lead_status, result.insertId, lead_id]);
        
        res.status(201).json({
            message: "Lead Status Updated successfully",
            status: true,
        });
    } catch (error) {
        console.log('error + ',error);
        res.status(500).json({ message: 'Server error', status: 'error' });
    }
});

router.post('/',authenticateToken, async (req, res) => {
    const user_id = req.user.id
    const { lead_id, amount, status } = req.body;
    if (!lead_id || !amount || !status) {
        return res.status(400).json({ message: 'Please provide all fields', status: 'error' });
    }
    try {
        const [result] = await pool.query(`INSERT INTO ${TABLE.SALES_OFFERS_TABLE} (lead_id, user_id, amount, status) VALUES (?, ?, ?, ?)`, [lead_id, user_id, amount, status]);
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