const pool = require('../utils/db');

// Check email exists or not
const checkEmailExistOrNot = async (tableName, email, ID = null) => {
    try {
        let sql = 'SELECT * FROM ' + tableName + ' WHERE email = ?';
        const values = [email];

        if (ID !== null) {
            sql += ' AND id != ?';
            values.push(ID);
        }

        const [rows] = await pool.query(sql, values);
        return rows.length > 0;
    } catch (error) {
        console.error('Error occurred while checking email:', error);
        throw new Error('Failed to check email existence');
    }
}

// Check phone exists or not
const checkPhoneExistOrNot = async (tableName, phone, ID = null) => {
    try {
        let sql = 'SELECT * FROM ' + tableName + ' WHERE mobile_number = ?';
        const values = [phone];

        if (ID !== null) {
            sql += ' AND id != ?';
            values.push(ID);
        }

        const [rows] = await pool.query(sql, values);
        return rows.length > 0;
        // return !!rows.length; // Returns true if phone exists, false otherwise
    } catch (error) {
        console.error('Error occurred while checking phone:', error);
        throw new Error('Failed to check phone existence');
    }
}

module.exports = {    
    checkEmailExistOrNot,
    checkPhoneExistOrNot
}