const express = require('express');
const pool = require('../utils/db');
const TABLE = require('../utils/tables');
const router = express.Router();

// Create a lead
router.post('/', async (req, res) => {
  const {
    first_name, last_name, email, phone, number_of_bedrooms,
    price, property_type, location, user_id, next_followup_date,
    next_followup_time, amenities
  } = req.body;
  if (!first_name || !last_name || !email || !phone || !property_type ) {
    return res.status(400).json({ message: 'Required fields cannot be empty', status: 'error' });
  }
  try {
    // Insert the lead
    const [result] = await pool.query(
      `INSERT INTO ${TABLE.LEADS_TABLE} (first_name, last_name, email, phone, number_of_bedrooms, price, property_type, location, user_id, next_followup_date, next_followup_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone, number_of_bedrooms, price, property_type, location, user_id, next_followup_date, next_followup_time, 1]
    );
    const leadId = result.insertId;

    // Insert amenities if provided
    if (Array.isArray(amenities) && amenities.length) {
      await pool.query(`DELETE FROM ${TABLE.LEAD_AMENITIES_TABLE} WHERE lead_id = ?`, [leadId]);
      const valuesString = amenities.map(amenityId => `(?, ?)`).join(', ');
      const values = amenities.flatMap(amenityId => [leadId, amenityId]);
      const sql = `INSERT INTO ${TABLE.LEAD_AMENITIES_TABLE} (lead_id, amenities_id) VALUES ${valuesString}`;
      await pool.query(sql, values);
    }

    res.status(201).json({
      message: 'Lead created successfully',
      status: true,
      leadId
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Get lead(s)
router.get('/:id?', async (req, res) => {
  const id = req.params.id;
  try {
    let query = `
      SELECT 
        l.id,
        l.first_name,
        l.last_name,
        l.email,
        l.phone,
        l.number_of_bedrooms,
        l.price,
        l.property_type,
        l.location,
        l.user_id,
        l.next_followup_date,
        l.next_followup_time,
        l.status,
        l.created,
        GROUP_CONCAT(la.amenities_id) AS amenities
      FROM ${TABLE.LEADS_TABLE} l
      LEFT JOIN ${TABLE.LEAD_AMENITIES_TABLE} la ON l.id = la.lead_id
      WHERE NOT l.status = 0
    `;
    let queryParams = [];

    if (id) {
      query += ` AND l.id = ?`;
      queryParams.push(id);
    }

    query += ` GROUP BY l.id`;

    const [result] = await pool.query(query, queryParams);

    const formatLeadData = (lead) => ({
      ...lead,
      price: lead.price !== null ? parseFloat(lead.price) : null, // Ensure price is a number
      property_type: lead.property_type || '', // Handle empty property_type
      amenities: lead.amenities ? lead.amenities.split(',').map(Number) : []
    });

    if (id) {
      if (result.length === 0) {
        return res.status(404).json({ message: 'Lead not found', status: 'error' });
      }
      res.status(200).json({
        data: formatLeadData(result[0]),
        message: 'Lead retrieved successfully',
        status: true
      });
    } else {
      res.status(200).json({
        data: result.map(formatLeadData),
        message: 'Leads retrieved successfully',
        status: true
      });
    }
  } catch (error) {
    console.error('Error retrieving leads:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Update lead details
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    first_name, last_name, email, phone, number_of_bedrooms,
    price, property_type, location, user_id, next_followup_date,
    next_followup_time, status, amenities
  } = req.body;

  if (!id || (!first_name && !last_name && !email && !phone && !property_type && !location)) {
    return res.status(400).json({ message: 'Required fields cannot be empty', status: 'error' });
  }

  try {
    const updateFields = [
      first_name && 'first_name = ?',
      last_name && 'last_name = ?',
      email && 'email = ?',
      phone && 'phone = ?',
      number_of_bedrooms !== undefined && 'number_of_bedrooms = ?',
      price !== undefined && 'price = ?',
      property_type && 'property_type = ?',
      location && 'location = ?',
      status && 'status = ?',
      user_id !== undefined && 'user_id = ?',
      next_followup_date && 'next_followup_date = ?',
      next_followup_time && 'next_followup_time = ?',
    ].filter(Boolean).join(', ');

    const updateValues = [
      first_name, last_name, email, phone, number_of_bedrooms, price, property_type,
      location, status, user_id, next_followup_date, next_followup_time
    ].filter(value => value !== undefined);

    if (updateFields.length > 0) {
      await pool.query(`UPDATE ${TABLE.LEADS_TABLE} SET ${updateFields} WHERE id = ?`, [...updateValues, id]);
    }

    // Handle amenities
    if (Array.isArray(amenities) && amenities.length) {
      await pool.query(`DELETE FROM ${TABLE.LEAD_AMENITIES_TABLE} WHERE lead_id = ?`, [id]);
      const valuesString = amenities.map(amenityId => `(?, ?)`).join(', ');
      const values = amenities.flatMap(amenityId => [id, amenityId]);
      const sql = `INSERT INTO ${TABLE.LEAD_AMENITIES_TABLE} (lead_id, amenities_id) VALUES ${valuesString}`;
      await pool.query(sql, values);
    }

    res.status(200).json({ message: 'Lead updated successfully', status: true });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Delete a lead
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Update the lead's status to 0 (soft delete)
    const [result] = await pool.query(`UPDATE ${TABLE.LEADS_TABLE} SET status = 0 WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lead not found', status: 'error' });
    }
    res.status(200).json({
      message: 'Lead deleted successfully',
      status: true
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

module.exports = router;
