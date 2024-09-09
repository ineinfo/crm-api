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

const commonTitle = "Leads";
// Middleware setup
const upload = multer({ storage: storage });

router.post('/',authenticateToken, upload.fields([
  { name: 'files', maxCount: 10 }, 
  { name: 'documents', maxCount: 10 } 
]), async (req, res) => {

  const {
    lead_type,
    developer_name,
    location,
    starting_price,
    handover_date,
    sqft_starting_size,
    parking,
    furnished,
    account_type,
    leasehold_length,
    email,
    phone_number,
    finance,
    state_id,
    city_id,
    pincode,
    service_charges,
    council_tax_band,
    note,
    range_min,
    range_max,
    property_status,
    property_type = [],
    number_of_bathrooms = [],
    amenities = [],
    parking_option = []
  } = req.body;
  let property_type_ids = property_type;
  let parking_options = parking_option;

  
  const user_id = req.user.id;
  // Convert amenities to an array if it's a string
  const amenitiesArray = Array.isArray(amenities) ? amenities : JSON.parse(amenities || '[]');
  const numberOfBathroomsArray = Array.isArray(number_of_bathrooms) ? number_of_bathrooms : JSON.parse(number_of_bathrooms || '[]');
  const property_type_id_array = Array.isArray(property_type_ids) ? property_type_ids : JSON.parse(property_type_ids || '[]');
  const parking_options_array = Array.isArray(parking_options) ? parking_options : JSON.parse(parking_options || '[]');
  

  if (!developer_name) {
    return res.status(400).json({ message: 'Name fields are missing', status: 'error' });
  }
 
  if(!email) {
    return res.status(400).json({ message: 'Please provide email', status: 'error' });
  }

  if(email) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if(!emailRegexp.test(email)) {
      return res.status(400).json({ message: 'Please provide valid email', status: 'error' });
    }
  }

  if(!phone_number) {
    return res.status(400).json({ message: 'Please provide phone', status: 'error' });
  }
  if(phone_number) {
    let isnum = /^\d+$/.test(phone_number);
    if(!isnum) {
      return res.status(400).json({ message: 'Please provide valid phone', status: 'error' });
    }
  }

  let formattedHandoverDate = null;
  if(handover_date) {
    const [day, month, year] = handover_date.split('-');
    formattedHandoverDate = `${year}-${month}-${day}`;
  }
  
  try {
    // Insert property
    const [result] = await pool.query(
      `INSERT INTO ${TABLE.LEADS_TABLE} 
       (lead_type, developer_name, location, starting_price, finance, handover_date, sqft_starting_size, parking, furnished, account_type, leasehold_length, email, phone_number,service_charges,state_id, city_id, pincode,council_tax_band,note,range_min,range_max,property_status, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?, ?, ?, ?)`,
      [lead_type, developer_name, location, starting_price,finance, formattedHandoverDate, sqft_starting_size, parking, furnished, account_type, leasehold_length, email, phone_number,service_charges, state_id, city_id, pincode,council_tax_band,note,range_min,range_max, property_status,user_id]
    );

    const leadId = result.insertId;

    // Handle amenities
    if (amenitiesArray.length > 0) {
      const amenityValues = amenitiesArray.map(amenities_id => [leadId, amenities_id, user_id]);
      await pool.query(`INSERT INTO ${TABLE.LEADS_AMENITIES_TABLE} (lead_id, amenities_id, user_id) VALUES ?`, [amenityValues]);
    }

    // Handle Number of Bathrooms
    if (numberOfBathroomsArray.length > 0) {
      const amenityValues = numberOfBathroomsArray.map(no_of_bathrooms => [leadId, no_of_bathrooms, user_id]);
      await pool.query(`INSERT INTO ${TABLE.LEADS_NOOFBATHROOM_TABLE} (lead_id, no_of_bathrooms, user_id) VALUES ?`, [amenityValues]);
    }

    // Handle property type 
    if (property_type_id_array.length > 0) {
      const amenityValues = property_type_id_array.map(property_type_id => [leadId, property_type_id, user_id]);
      await pool.query(`INSERT INTO ${TABLE.LEADS_PROPERTY_TYPES_TABLE} (lead_id, property_type_id, user_id) VALUES ?`, [amenityValues]);
    }

    // Handle property type 
    if (parking_options_array.length > 0) {
      const amenityValues = parking_options_array.map(options => [leadId, options, user_id]);
      await pool.query(`INSERT INTO ${TABLE.LEADS_PARKING_OPTIONS_TABLE} (lead_id, parking_option_id, user_id) VALUES ?`, [amenityValues]);
    }

    

    // Handle file uploads and store URLs
    const filesArray = req.files['files'] || [];
    const fileValues = filesArray.map(file => [leadId, `${req.protocol}://${req.get('host')}/propertyimages/${file.filename}`,'images', user_id]);
    if (fileValues.length > 0) {
      await pool.query(`INSERT INTO ${TABLE.LEADS_IMAGES_TABLE} (lead_id, images_url,file_type, user_id) VALUES ?`, [fileValues]);
    }

    // handle documents of pdf 
    const documentsArray = req.files['documents'] || []; 
    const documentsValues = documentsArray.map(file => [leadId, `${req.protocol}://${req.get('host')}/propertydocuments/${file.filename}`,'document', user_id]);
    if (documentsValues.length > 0) {
      await pool.query(`INSERT INTO ${TABLE.LEADS_IMAGES_TABLE} (lead_id, images_url,file_type, user_id) VALUES ?`, [documentsValues]);
    }

    res.status(201).json({ message: commonTitle+' created successfully', status: true, leadId });
  } catch (error) {
    console.error('Error creating :'+commonTitle, error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});


router.get('/finance/', async (req, res) => {
  const id = req.params.id;
  try {
    const mainData  = [{1:'Cash', 2:"Mortgage"}];
    res.status(200).json({
      data:mainData,
      message: "",
      status: true
    });
  } catch (error) {
    console.error('Error retrieving :'+commonTitle, error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});


// Get property(ies)
router.get('/:id?', async (req, res) => {
  const id = req.params.id;
  try {
    // Base query with condition to get only properties with status = 1
    const baseQuery = `SELECT * FROM ${TABLE.LEADS_TABLE} WHERE status != 0`;
    const condition = id ? ` AND id = ?` : '';
    const propertyQuery = baseQuery + condition;
    // Fetch properties based on whether an ID is provided
    const [propertyResult] = id ? await pool.query(propertyQuery, [id]) : await pool.query(propertyQuery);

    if (!propertyResult.length) {
      return res.status(404).json({ message: commonTitle+' not found', status: 'error' });
    }

    // Retrieve images and amenities for each property
    const propertiesWithExtras = await Promise.all(propertyResult.map(async property => {
      const [images] = await pool.query(`SELECT images_url FROM ${TABLE.LEADS_IMAGES_TABLE} WHERE lead_id = ?`, [property.id]);
      const [amenities] = await pool.query(`SELECT amenities_id FROM ${TABLE.LEADS_AMENITIES_TABLE} WHERE lead_id = ?`, [property.id]);
      const [property_type] = await pool.query(`SELECT property_type_id FROM ${TABLE.LEADS_PROPERTY_TYPES_TABLE} WHERE lead_id = ?`, [property.id]);
      const [no_of_bathrooms] = await pool.query(`SELECT no_of_bathrooms FROM ${TABLE.LEADS_NOOFBATHROOM_TABLE} WHERE lead_id = ?`, [property.id]);
      const [parking_option] = await pool.query(`SELECT parking_option_id FROM ${TABLE.LEADS_PARKING_OPTIONS_TABLE} WHERE lead_id = ?`, [property.id]);

      return {
        ...property,
        files: images.map(img => img.images_url),
        amenities: amenities.map(amenity => amenity.amenities_id),
        property_type: property_type.map(property_type => property_type.property_type_id),
        no_of_bathrooms: no_of_bathrooms.map(no_of_bathrooms => no_of_bathrooms.no_of_bathrooms),
        parking_option: parking_option.map(parking_option => parking_option.parking_option_id)
      };
    }));

    // Return the response based on whether a single property or multiple properties were requested
    res.status(200).json({
      data: id ? propertiesWithExtras[0] : propertiesWithExtras,
      message: id ? commonTitle+' retrieved successfully' : commonTitle+' retrieved successfully',
      status: true
    });
  } catch (error) {
    console.error('Error retrieving :'+commonTitle, error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});


router.put('/:id', authenticateToken,upload.fields([
  { name: 'files', maxCount: 10 }, 
  { name: 'documents', maxCount: 10 } 
]), async (req, res) => {
  const { id } = req.params;
  const {
    lead_type,
    developer_name,
    property_type_id,
    starting_price,
    location,
    sqft_starting_size,
    finance,
    parking,
    furnished,
    account_type,
    leasehold_length,
    handover_date,
    email,
    phone_number,
    images = [], // Existing image URLs
    state_id,
    city_id,
    pincode,
    service_charges,
    council_tax_band,
    note,
    range_min,
    range_max,
    property_status,
    property_type = [],
    number_of_bathrooms = [],
    amenities = [],
    parking_option = []
  } = req.body;
  let property_type_ids = property_type;
  let parking_options = parking_option;

  let formattedHandoverDate;
  
  const user_id = req.user.id;
  if(handover_date) {
    const [day, month, year] = handover_date.split('-');
    formattedHandoverDate = `${year}-${month}-${day}`;
  }

  if(!email) {
    return res.status(400).json({ message: 'Please provide email', status: 'error' });
  }
  if(email) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if(!emailRegexp.test(email)) {
      return res.status(400).json({ message: 'Please provide valid email', status: 'error' });
    }
  }

  if(!phone_number) {
    return res.status(400).json({ message: 'Please provide phone', status: 'error' });
  }
  if(phone_number) {
    let isnum = /^\d+$/.test(phone_number);
    if(!isnum) {
      return res.status(400).json({ message: 'Please provide valid phone', status: 'error' });
    }
  }

  const numberOfBathroomsArray = Array.isArray(number_of_bathrooms) ? number_of_bathrooms : JSON.parse(number_of_bathrooms || '[]');
  const property_type_id_array = Array.isArray(property_type_ids) ? property_type_ids : JSON.parse(property_type_ids || '[]');
  const parking_options_array = Array.isArray(parking_options) ? parking_options : JSON.parse(parking_options || '[]');
  

  try {
    // Check if the property exists
    const [property] = await pool.query(`SELECT id FROM ${TABLE.LEADS_TABLE} WHERE id = ?`, [id]);
    if (!property.length) return res.status(404).json({ message: 'Property not found', status: 'error' });

    // Update property details
    let updates = { lead_type, developer_name,  starting_price, location,  sqft_starting_size, finance, parking, furnished,  account_type, leasehold_length, handover_date:formattedHandoverDate, email, phone_number,service_charges, state_id, city_id, pincode,council_tax_band,note,range_min,range_max,property_status, user_id };
    
    
    const updateQuery = Object.keys(updates).filter(key => updates[key]).map(key => `${key} = ?`).join(', ');

    if (updateQuery) {
      await pool.query(`UPDATE ${TABLE.LEADS_TABLE} SET ${updateQuery} WHERE id = ?`, [...Object.values(updates).filter(v => v), id]);
    }

    // Update images
    const newFileUrls = (req.files['files'] || []).map(file => `${req.protocol}://${req.get('host')}/propertyimages/${file.filename}`);
    const allImages = [...images, ...newFileUrls]; // Combine existing and new URLs
    if (images.length) {
      await pool.query(`DELETE FROM ${TABLE.LEADS_IMAGES_TABLE} WHERE lead_id = ? AND images_url NOT IN (?)`, [id, allImages]);
    }
    if (newFileUrls.length) {
      await pool.query(`INSERT INTO ${TABLE.LEADS_IMAGES_TABLE} (lead_id, images_url) VALUES ?`, [newFileUrls.map(url => [id, url])]);
    }

    // Update amenities
    const amenityValues = Array.isArray(amenities) ? amenities.map(a => [id, a]) : [];
    if (amenityValues.length) {
      await pool.query(`DELETE FROM ${TABLE.LEADS_AMENITIES_TABLE} WHERE lead_id = ?`, [id]);
      await pool.query(`INSERT INTO ${TABLE.LEADS_AMENITIES_TABLE} (lead_id, amenities_id) VALUES ?`, [amenityValues]);
    }


    // Handle Number of Bathrooms
    if (numberOfBathroomsArray.length > 0) {
      await pool.query(`DELETE FROM ${TABLE.LEADS_NOOFBATHROOM_TABLE} WHERE lead_id = ?`, [id]);
      const amenityValues = numberOfBathroomsArray.map(no_of_bathrooms => [id, no_of_bathrooms, user_id]);
      await pool.query(`INSERT INTO ${TABLE.LEADS_NOOFBATHROOM_TABLE} (lead_id, no_of_bathrooms, user_id) VALUES ?`, [amenityValues]);
    }

    // Handle property type 
    if (property_type_id_array.length > 0) {
      await pool.query(`DELETE FROM ${TABLE.LEADS_PROPERTY_TYPES_TABLE} WHERE lead_id = ?`, [id]);
      const amenityValues = property_type_id_array.map(property_type_id => [id, property_type_id, user_id]);
      await pool.query(`INSERT INTO ${TABLE.LEADS_PROPERTY_TYPES_TABLE} (lead_id, property_type_id, user_id) VALUES ?`, [amenityValues]);
    }

    // Handle property type 
    if (parking_options_array.length > 0) {
      await pool.query(`DELETE FROM ${TABLE.LEADS_PARKING_OPTIONS_TABLE} WHERE lead_id = ?`, [id]);
      const amenityValues = parking_options_array.map(options => [id, options, user_id]);
      await pool.query(`INSERT INTO ${TABLE.LEADS_PARKING_OPTIONS_TABLE} (lead_id, parking_option_id, user_id) VALUES ?`, [amenityValues]);
    }

    const [updatedRecord] = await pool.query(`SELECT * FROM ${TABLE.LEADS_TABLE} WHERE id = ?`, [id]);
    res.status(200).json({ data: updatedRecord, message: commonTitle+' updated successfully', status: true });
  } catch (error) {
    console.error('Error updating :'+commonTitle, error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});


router.get('/matchproperty/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.LEADS_TABLE} WHERE id = ?`, [id]);
    if (existingRecord.length === 0) {
      return res.status(404).json({ message: 'Record not found', status: false });
    }

    const parkingData = existingRecord[0].parking;
    const locationData = existingRecord[0].location;
    const state_idData = existingRecord[0].state_id;
    const range_minData = existingRecord[0].range_min;
    const starting_priceData = existingRecord[0].starting_price;

    const [matchRecord] = await pool.query(`SELECT * FROM ${TABLE.DEVELOPERS_TABLE} WHERE parking = ? AND location = ? AND state_id = ? AND range_min = ? AND starting_price = ?`, [parkingData, locationData, state_idData, range_minData, starting_priceData]);

    if (matchRecord.length === 0) {
      return res.status(404).json({ message: 'No matching record found', status: false });
    }

    res.status(200).json({ data: matchRecord, message: 'Fetched successfully', status: true });
  } catch (error) {
    console.error('Error retrieving match:', error);
    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});




// Delete a property (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(`UPDATE ${TABLE.LEADS_TABLE} SET status = 0 WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: commonTitle+' not found', status: 'error' });
    }

    res.status(200).json({
      message: commonTitle+' deleted successfully',
      status: true
    });
  } catch (error) {

    res.status(500).json({ message: 'Server error', status: 'error' });
  }
});

module.exports = router;