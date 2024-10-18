// routes/properties.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../utils/db');
const TABLE = require('../utils/tables');
const router = express.Router();
const authenticateToken = require('../utils/middleware');


// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/propertyimages/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Middleware setup
const upload = multer({ storage: storage });

router.post('/',authenticateToken, async (req, res) => {

  const {
    firstName,
    lastName,
    countryId,
    stateId,
    cityId,
    postcode,
    email,
    mobileNumber,
    developmentType,
    followupDate,
  } = req.body;
  
  const user_id = req.user.id;

  if (!firstName || !lastName || !email || !mobileNumber || !postcode || !followupDate) {
    return res.status(400).json({ message: 'Required fields are missing', status: 'error' });
  }

  if(email) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if(!emailRegexp.test(email)) {
      return res.status(400).json({ message: 'Please provide valid email', status: 'error' });
    }
  }
  
  if(mobileNumber) {
    let isnum = /^\d+$/.test(mobileNumber);
    if(!isnum) {
      return res.status(400).json({ message: 'Please provide valid phone', status: 'error' });
    }
  }

  let dbFollowupDate = null;
  if(followupDate) {
    const [day, month, year] = followupDate.split('-');
    dbFollowupDate = `${year}-${month}-${day}`;
  }

  try {
    // Insert property
    const [result] = await pool.query(
      `INSERT INTO ${TABLE.OPPORTUNITY_TABLE} 
       (first_name, last_name, country_id, state_id, city_id, postcode, email, mobile, development_type, followup, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, countryId, stateId, cityId, postcode, email, mobileNumber, developmentType, dbFollowupDate,user_id]
    );

    res.status(201).json({ message: 'Prospect created successfully', status: true, lastInsertedId:result.insertId });
  } catch (error) {
    console.error('Error creating Prospect:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Get property(ies)
router.get('/:id?', async (req, res) => {
  const id = req.params.id;
  try {
    // Base query with condition to get only properties with status = 1
    const baseQuery = `SELECT * FROM ${TABLE.OPPORTUNITY_TABLE} WHERE status != 0`;
    const condition = id ? ` AND id = ?` : '';
    const propertyQuery = baseQuery + condition;
    const [propertyResult] = id ? await pool.query(propertyQuery, [id]) : await pool.query(propertyQuery);

    if (!propertyResult.length) {
      return res.status(404).json({ message: 'Prospects not found', status: 'error' });
    }

    // Return the response based on whether a single property or multiple properties were requested
    res.status(200).json({
      data: id ? propertyResult[0] : propertyResult,
      message: id ? 'Prospect retrieved successfully' : 'Prospects retrieved successfully',
      status: true
    });
  } catch (error) {
    console.error('Error retrieving Prospect:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});


router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    countryId,
    stateId,
    cityId,
    postcode,
    email,
    mobileNumber,
    developmentType,
    followupDate,
  } = req.body;
  
  const user_id = req.user.id;

  if (!firstName || !lastName || !email || !mobileNumber || !postcode || !followupDate) {
    return res.status(400).json({ message: 'Required fields are missing', status: 'error' });
  }

  if(email) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if(!emailRegexp.test(email)) {
      return res.status(400).json({ message: 'Please provide valid email', status: 'error' });
    }
  }
  
  if(mobileNumber) {
    let isnum = /^\d+$/.test(mobileNumber);
    if(!isnum) {
      return res.status(400).json({ message: 'Please provide valid phone', status: 'error' });
    }
  }

  let dbFollowupDate = null;
  if(followupDate) {
    const [day, month, year] = followupDate.split('-');
    dbFollowupDate = `${year}-${month}-${day}`;
  }

  
  
  try {
    // Check if the property exists
    const [property] = await pool.query(`SELECT id FROM ${TABLE.OPPORTUNITY_TABLE} WHERE id = ?`, [id]);
    if (!property.length) return res.status(404).json({ message: 'Prospects not found', status: 'error' });

    // Update property details
    let updates = {
        first_name:firstName,
        last_name:lastName,
        country_id:countryId,
        state_id:stateId,
        city_id:cityId,
        postcode,
        email,
        mobile:mobileNumber,
        development_type:developmentType,
        followup:dbFollowupDate,
        user_id
      } ;
    
    // Build update query
    const updateEntries = Object.entries(updates).filter(([key, value]) => value !== undefined);
    const updateQuery = updateEntries.map(([key]) => `${key} = ?`).join(', ');
    const updateValues = updateEntries.map(([_, value]) => value);

    if (updateQuery) {
      await pool.query(`UPDATE ${TABLE.OPPORTUNITY_TABLE} SET ${updateQuery} WHERE id = ?`, [...updateValues, id]);
    }
    

    const [updatedRecord] = await pool.query(`SELECT * FROM ${TABLE.OPPORTUNITY_TABLE} WHERE id = ?`, [id]);
    res.status(200).json({ data: updatedRecord, message: 'Prospect updated successfully', status: true });
  } catch (error) {
    console.error('Error updating Prospects:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Delete a property (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(`UPDATE ${TABLE.OPPORTUNITY_TABLE} SET status = 0 WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Prospects not found', status: 'error' });
    }

    res.status(200).json({
      message: 'Prospects deleted successfully',
      status: true
    });
  } catch (error) {

    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

module.exports = router;
