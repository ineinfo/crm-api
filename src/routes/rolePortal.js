// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables')
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const router = express.Router();

// Create a new role
router.post('/', async (req, res) => {
    const { role_name, description } = req.body;
    if(!role_name){
        return res.status(400).json({ message: 'Role name cannot be empty', status: 'error' });
    }
    try {
      const [result] = await pool.query(`INSERT INTO ${TABLE.ROLES_TABLE} (role_name, description) VALUES (?, ?)`, [role_name, description]);
      res.status(201).json({
        message: 'Role created successfully',
        status: true,
        roleId: result.insertId
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', status: 'error' });
    }
  });
  
// edit the role
  router.get('/:id?', async (req, res) => {
    const id = req.params.id; // Get the ID from path parameters
    try {
      // Construct the query
      const query = id 
        ? `SELECT * FROM ${TABLE.ROLES_TABLE} WHERE id = ? AND status = 1`
        : `SELECT * FROM ${TABLE.ROLES_TABLE} WHERE status = 1`;
      
      // Execute the query
      const [result] = id 
        ? await pool.query(query, [id]) 
        : await pool.query(query);
  
      if (id) {
        // Handle single role response
        if (result.length === 0) {
          return res.status(404).json({ message: 'Role not found', status: 'error' });
        }
        res.status(200).json({
          data: result[0],
          message: 'Role retrieved successfully',
          status: true
        });
      } else {
        // Handle all roles response
        res.status(200).json({
          data: result,
          message: 'Roles retrieved successfully',
          status: true
        });
      }
    } catch (error) {
      console.error('Error retrieving roles:', error);
      res.status(500).json({ message: 'Server error', status: 'error' });
    }
  });
  
// Update a role by ID
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { role_name, description } = req.body;
    try {
      const [result] = await pool.query(`UPDATE ${TABLE.ROLES_TABLE} SET role_name = ?, description = ? WHERE id = ?`, [role_name,description, id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Role not found', status: 'error' });
      }
      res.status(200).json({
        message: 'Role updated successfully',
        status: true
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: 'Server error', status: 'error' });
    }
  });
  
// delete the role   
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // Update the role's status to 2 (soft delete)
      const [result] = await pool.query(`UPDATE ${TABLE.ROLES_TABLE} SET status = 0 WHERE id = ?`, [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Role not found', status: 'error' });
      }
      res.status(200).json({
        message: 'Role deleted successfully',
        status: true
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: 'Server error', status: 'error' });
    }
  });


module.exports = router;