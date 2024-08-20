const express = require('express');
const pool = require('../utils/db');
const TABLE = require('../utils/tables');
const router = express.Router();

router.post('/', async (req, res) => {
  const {
    customer_name, customer_mobile, customer_email, customer_address,
    number_of_bedrooms, number_of_bathrooms, price, purchase_type, location, user_id, created, status,
    amenities
  } = req.body;

  // Check required fields
  if (!customer_name || !customer_mobile || !customer_email || !purchase_type || !location) {
    return res.status(400).json({ message: 'Required fields cannot be empty', status: 'error' });
  }

  try {
    // Insert the client
    const [result] = await pool.query(
      `INSERT INTO ${TABLE.CLIENTS_TABLE} 
      (customer_name, customer_mobile, customer_email, customer_address, number_of_bedrooms, number_of_bathrooms, price, purchase_type, location, user_id, created, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_name, customer_mobile, customer_email, customer_address, 
        number_of_bedrooms, number_of_bathrooms, price, purchase_type, 
        location, user_id, created, status
      ]
    );
    const clientId = result.insertId;

    // Insert amenities if provided
    if (amenities && Array.isArray(amenities)) {
      const amenityPromises = amenities.map(amenityId =>
        pool.query(
          `INSERT INTO ${TABLE.CLIENT_AMENITIES_TABLE} (customer_id, amenities_id) VALUES (?, ?)`,
          [clientId, amenityId]
        )
      );
      await Promise.all(amenityPromises);
    }

    res.status(201).json({
      message: 'Client created successfully',
      status: true,
      clientId
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Get client(s)
router.get('/:id?', async (req, res) => {
  const id = req.params.id;
  try {
    let query = `
      SELECT 
        c.id,
        c.customer_name,
        c.customer_mobile,
        c.customer_email,
        c.customer_address,
        c.number_of_bedrooms,
        c.number_of_bathrooms,
        c.price,
        c.purchase_type,
        c.location,
        c.user_id,
        c.created,
        c.status,
        GROUP_CONCAT(ca.amenities_id) AS amenities
      FROM ${TABLE.CLIENTS_TABLE} c
      LEFT JOIN ${TABLE.CLIENT_AMENITIES_TABLE} ca ON c.id = ca.customer_id
      WHERE NOT c.status = 0
    `;
    let queryParams = [];

    if (id) {
      query += ` AND c.id = ?`;
      queryParams.push(id);
    }

    query += ` GROUP BY c.id`;

    const [result] = await pool.query(query, queryParams);

    const formatClientData = (client) => ({
      ...client,
      price: client.price !== null ? parseFloat(client.price) : null, // Ensure price is a number
      purchase_type: client.purchase_type || '', // Handle empty purchase_type
      amenities: client.amenities ? client.amenities.split(',').map(Number) : []
    });

    if (id) {
      if (result.length === 0) {
        return res.status(404).json({ message: 'Client not found', status: 'error' });
      }
      res.status(200).json({
        data: formatClientData(result[0]),
        message: 'Client retrieved successfully',
        status: true
      });
    } else {
      res.status(200).json({
        data: result.map(formatClientData),
        message: 'Clients retrieved successfully',
        status: true
      });
    }
  } catch (error) {
    console.error('Error retrieving clients:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Update client details
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    customer_name, customer_mobile, customer_email, customer_address,
    number_of_bedrooms, number_of_bathrooms, price, purchase_type, location, user_id, status,
    amenities
  } = req.body;

  // Check for required fields
  if (!id || (!customer_name && !customer_mobile && !customer_email && !purchase_type && !location)) {
    return res.status(400).json({ message: 'Required fields cannot be empty', status: 'error' });
  }

  try {
    // Prepare fields for the update query
    const updateFields = [
      customer_name && 'customer_name = ?',
      customer_mobile && 'customer_mobile = ?',
      customer_email && 'customer_email = ?',
      customer_address && 'customer_address = ?',
      number_of_bedrooms !== undefined && 'number_of_bedrooms = ?',
      number_of_bathrooms !== undefined && 'number_of_bathrooms = ?',
      price !== undefined && 'price = ?',
      purchase_type && 'purchase_type = ?',
      location && 'location = ?',
      status !== undefined && 'status = ?',
      user_id !== undefined && 'user_id = ?',
    ].filter(Boolean).join(', ');

    // Prepare values for the update query
    const updateValues = [
      customer_name,
      customer_mobile,
      customer_email,
      customer_address,
      number_of_bedrooms,
      number_of_bathrooms,
      price,
      purchase_type,
      location,
      status,
      user_id,
    ].filter(value => value !== undefined);

    if (updateFields.length > 0) {
      // Execute the update query
      await pool.query(`UPDATE ${TABLE.CLIENTS_TABLE} SET ${updateFields} WHERE id = ?`, [...updateValues, id]);
    }

    // Handle amenities
    if (Array.isArray(amenities) && amenities.length) {
      // Delete existing amenities for the client
      await pool.query(`DELETE FROM ${TABLE.CLIENT_AMENITIES_TABLE} WHERE customer_id = ?`, [id]);

      // Insert new amenities
      const valuesString = amenities.map(() => `(?, ?)`).join(', ');
      const values = amenities.flatMap(amenityId => [id, amenityId]);
      const sql = `INSERT INTO ${TABLE.CLIENT_AMENITIES_TABLE} (customer_id, amenities_id) VALUES ${valuesString}`;
      await pool.query(sql, values);
    }

    res.status(200).json({ message: 'Client updated successfully', status: true });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});


// Delete a client
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Update the client's status to 0 (soft delete)
    const [result] = await pool.query(`UPDATE ${TABLE.CLIENTS_TABLE} SET status = 0 WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Client not found', status: 'error' });
    }
    res.status(200).json({
      message: 'Client deleted successfully',
      status: true
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

module.exports = router;
