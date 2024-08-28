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

router.post('/',authenticateToken, upload.array('files'), async (req, res) => {
  console.log('reqreq',req.body);
  const {
    developer_name,
    location,
    starting_price,
    number_of_bathrooms,
    property_type_id,
    handover_date,
    sqft_starting_size,
    parking,
    furnished,
    account_type,
    leasehold_length,
    owner_name,
    amenities = []
  } = req.body;

  
  const user_id = req.user.id;
  // Convert amenities to an array if it's a string
  const amenitiesArray = Array.isArray(amenities) ? amenities : JSON.parse(amenities || '[]');

  if (!developer_name || !property_type_id) {
    return res.status(400).json({ message: 'Required fields are missing', status: 'error' });
  }
 
  const [day, month, year] = handover_date.split('-');
  const formattedHandoverDate = `${year}-${month}-${day}`;

  try {
    // Insert property
    const [result] = await pool.query(
      `INSERT INTO ${TABLE.DEVELOPERS_TABLE} 
       (developer_name, location, starting_price, number_of_bathrooms, property_type_id, owner_name, handover_date, sqft_starting_size, parking, furnished, account_type, leasehold_length, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [developer_name, location, starting_price,number_of_bathrooms,property_type_id,owner_name, formattedHandoverDate, sqft_starting_size, parking, furnished, account_type, leasehold_length, user_id]
    );

    const propertyId = result.insertId;

    // Handle amenities
    if (amenitiesArray.length > 0) {
      const amenityValues = amenitiesArray.map(amenities_id => [propertyId, amenities_id, user_id]);
      await pool.query(`INSERT INTO ${TABLE.DEVELOPERS_AMENITIES_TABLE} (developer_id, amenities_id, user_id) VALUES ?`, [amenityValues]);
    }

    // Handle file uploads and store URLs
    const files = req.files || [];
    console.log("req.files", req.files);
    const fileValues = files.map(file => [propertyId, `${req.protocol}://${req.get('host')}/propertyimages/${file.filename}`, user_id]);

    if (fileValues.length > 0) {
      await pool.query(`INSERT INTO ${TABLE.DEVELOPERS_IMAGES_TABLE} (developer_id, images_url, user_id) VALUES ?`, [fileValues]);
    }

    res.status(201).json({ message: 'Property created successfully', status: true, propertyId });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Get property(ies)
router.get('/:id?', async (req, res) => {
  const id = req.params.id;
  try {
    // Base query with condition to get only properties with status = 1
    const baseQuery = `SELECT * FROM ${TABLE.DEVELOPERS_TABLE} WHERE status != 0`;
    const condition = id ? ` AND id = ?` : '';
    const propertyQuery = baseQuery + condition;
    console.log('propertyQuerypropertyQuery',propertyQuery);
    // Fetch properties based on whether an ID is provided
    const [propertyResult] = id ? await pool.query(propertyQuery, [id]) : await pool.query(propertyQuery);

    if (!propertyResult.length) {
      return res.status(404).json({ message: 'Property not found', status: 'error' });
    }

    // Retrieve images and amenities for each property
    const propertiesWithExtras = await Promise.all(propertyResult.map(async property => {
      const [images] = await pool.query(`SELECT images_url FROM ${TABLE.DEVELOPERS_IMAGES_TABLE} WHERE developer_id = ?`, [property.id]);
      const [amenities] = await pool.query(`SELECT amenities_id FROM ${TABLE.DEVELOPERS_AMENITIES_TABLE} WHERE developer_id = ?`, [property.id]);

      return {
        ...property,
        files: images.map(img => img.images_url),
        amenities: amenities.map(amenity => amenity.amenities_id)
      };
    }));

    // Return the response based on whether a single property or multiple properties were requested
    res.status(200).json({
      data: id ? propertiesWithExtras[0] : propertiesWithExtras,
      message: id ? 'Property retrieved successfully' : 'Properties retrieved successfully',
      status: true
    });
  } catch (error) {
    console.error('Error retrieving property:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});


router.put('/:id', upload.array('files'), async (req, res) => {
  const { id } = req.params;
  const {
    developer_name,
    property_type_id,
    starting_price,
    location,
    number_of_bathrooms,
    no_of_bhk,
    sqft_starting_size,
    owner_name,
    parking,
    furnished,
    account_type,
    leasehold_length,
    formattedHandoverDate,
    status,
    property_business_type,
    user_id,
    amenities = [],
    images = [] // Existing image URLs
  } = req.body;

  try {
    // Check if the property exists
    const [property] = await pool.query(`SELECT id FROM ${TABLE.DEVELOPERS_TABLE} WHERE id = ?`, [id]);
    if (!property.length) return res.status(404).json({ message: 'Property not found', status: 'error' });

    // Update property details
    const updates = { developer_name, property_type_id,  starting_price, location,  number_of_bathrooms, sqft_starting_size, owner_name, parking, furnished,  account_type, leasehold_length, formattedHandoverDate, user_id };
    const updateQuery = Object.keys(updates).filter(key => updates[key]).map(key => `${key} = ?`).join(', ');

    if (updateQuery) {
      await pool.query(`UPDATE ${TABLE.DEVELOPERS_TABLE} SET ${updateQuery} WHERE id = ?`, [...Object.values(updates).filter(v => v), id]);
    }

    // Update images
    const newFileUrls = (req.files || []).map(file => `${req.protocol}://${req.get('host')}/propertyimages/${file.filename}`);
    const allImages = [...images, ...newFileUrls]; // Combine existing and new URLs
    if (images.length) {
      await pool.query(`DELETE FROM ${TABLE.DEVELOPERS_IMAGES_TABLE} WHERE developer_id = ? AND images_url NOT IN (?)`, [id, allImages]);
    }
    if (newFileUrls.length) {
      await pool.query(`INSERT INTO ${TABLE.DEVELOPERS_IMAGES_TABLE} (developer_id, images_url) VALUES ?`, [newFileUrls.map(url => [id, url])]);
    }

    // Update amenities
    const amenityValues = Array.isArray(amenities) ? amenities.map(a => [id, a]) : [];
    if (amenityValues.length) {
      await pool.query(`DELETE FROM ${TABLE.DEVELOPERS_AMENITIES_TABLE} WHERE developer_id = ?`, [id]);
      await pool.query(`INSERT INTO ${TABLE.DEVELOPERS_AMENITIES_TABLE} (developer_id, amenities_id) VALUES ?`, [amenityValues]);
    }

    const [updatedRecord] = await pool.query(`SELECT * FROM ${TABLE.DEVELOPERS_TABLE} WHERE id = ?`, [id]);
    res.status(200).json({ data: updatedRecord, message: 'Property updated successfully', status: true });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

// Delete a property (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(`UPDATE ${TABLE.DEVELOPERS_TABLE} SET status = 2 WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found', status: 'error' });
    }

    res.status(200).json({
      message: 'Property deleted successfully',
      status: true
    });
  } catch (error) {

    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

module.exports = router;
