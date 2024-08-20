// routes/properties.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../utils/db');
const TABLE = require('../utils/tables');
const router = express.Router();

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

router.post('/', upload.array('files'), async (req, res) => {
  const {
    property_name,
    property_type_id,
    carpet_area,
    location,
    facing,
    amount_total,
    no_of_bhk,
    floor,
    is_furnished,
    owner_name,
    construction_year,
    property_business_type,
    amenities = []
  } = req.body;

  // Convert amenities to an array if it's a string
  const amenitiesArray = Array.isArray(amenities) ? amenities : JSON.parse(amenities || '[]');

  if (!property_name || !property_type_id || !amount_total) {
    return res.status(400).json({ message: 'Required fields are missing', status: 'error' });
  }

  try {
    // Insert property
    const [result] = await pool.query(
      `INSERT INTO ${TABLE.PROPERTIES_TABLE} 
       (property_name, property_type_id, carpet_area, location, facing, amount_total, no_of_bhk, floor, is_furnished, owner_name, construction_year, property_business_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [property_name, property_type_id, carpet_area, location, facing, amount_total, no_of_bhk, floor, is_furnished, owner_name, construction_year, property_business_type]
    );

    const propertyId = result.insertId;

    // Handle amenities
    if (amenitiesArray.length > 0) {
      const amenityValues = amenitiesArray.map(amenities_id => [propertyId, amenities_id]);
      await pool.query(`INSERT INTO ${TABLE.PROPERTY_AMENITIES_TABLE} (property_id, amenities_id) VALUES ?`, [amenityValues]);
    }

    // Handle file uploads and store URLs
    const files = req.files || [];
    console.log("req.files", req.files);
    const fileValues = files.map(file => [propertyId, `${req.protocol}://${req.get('host')}/propertyimages/${file.filename}`]);

    if (fileValues.length > 0) {
      await pool.query(`INSERT INTO ${TABLE.PROPERTY_IMAGES_TABLE} (property_id, images_url) VALUES ?`, [fileValues]);
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
    const baseQuery = `SELECT * FROM ${TABLE.PROPERTIES_TABLE} WHERE status = 1`;
    const condition = id ? ` AND id = ?` : '';
    const propertyQuery = baseQuery + condition;

    // Fetch properties based on whether an ID is provided
    const [propertyResult] = id ? await pool.query(propertyQuery, [id]) : await pool.query(propertyQuery);

    if (!propertyResult.length) {
      return res.status(404).json({ message: 'Property not found', status: 'error' });
    }

    // Retrieve images and amenities for each property
    const propertiesWithExtras = await Promise.all(propertyResult.map(async property => {
      const [images] = await pool.query(`SELECT images_url FROM ${TABLE.PROPERTY_IMAGES_TABLE} WHERE property_id = ?`, [property.id]);
      const [amenities] = await pool.query(`SELECT amenities_id FROM ${TABLE.PROPERTY_AMENITIES_TABLE} WHERE property_id = ?`, [property.id]);

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
    property_name,
    property_type_id,
    carpet_area,
    location,
    facing,
    amount_total,
    no_of_bhk,
    floor,
    is_furnished,
    owner_name,
    construction_year,
    status,
    property_business_type,
    amenities = [],
    images = [] // Existing image URLs
  } = req.body;

  try {
    // Check if the property exists
    const [property] = await pool.query(`SELECT id FROM ${TABLE.PROPERTIES_TABLE} WHERE id = ?`, [id]);
    if (!property.length) return res.status(404).json({ message: 'Property not found', status: 'error' });

    // Update property details
    const updates = { property_name, property_type_id, carpet_area, location, facing, amount_total, no_of_bhk, floor, is_furnished, owner_name, construction_year, status, property_business_type };
    const updateQuery = Object.keys(updates).filter(key => updates[key]).map(key => `${key} = ?`).join(', ');

    if (updateQuery) {
      await pool.query(`UPDATE ${TABLE.PROPERTIES_TABLE} SET ${updateQuery} WHERE id = ?`, [...Object.values(updates).filter(v => v), id]);
    }

    // Update images
    const newFileUrls = (req.files || []).map(file => `${req.protocol}://${req.get('host')}/propertyimages/${file.filename}`);
    const allImages = [...images, ...newFileUrls]; // Combine existing and new URLs
    if (images.length) {
      await pool.query(`DELETE FROM ${TABLE.PROPERTY_IMAGES_TABLE} WHERE property_id = ? AND images_url NOT IN (?)`, [id, allImages]);
    }
    if (newFileUrls.length) {
      await pool.query(`INSERT INTO ${TABLE.PROPERTY_IMAGES_TABLE} (property_id, images_url) VALUES ?`, [newFileUrls.map(url => [id, url])]);
    }

    // Update amenities
    const amenityValues = Array.isArray(amenities) ? amenities.map(a => [id, a]) : [];
    if (amenityValues.length) {
      await pool.query(`DELETE FROM ${TABLE.PROPERTY_AMENITIES_TABLE} WHERE property_id = ?`, [id]);
      await pool.query(`INSERT INTO ${TABLE.PROPERTY_AMENITIES_TABLE} (property_id, amenities_id) VALUES ?`, [amenityValues]);
    }

    const [updatedRecord] = await pool.query(`SELECT * FROM ${TABLE.PROPERTIES_TABLE} WHERE id = ?`, [id]);
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
    const [result] = await pool.query(`UPDATE ${TABLE.PROPERTIES_TABLE} SET status = 2 WHERE id = ?`, [id]);

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
