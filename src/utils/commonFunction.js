const pool = require('../utils/db');

const getQueryParamId = (url) => new URL(url).searchParams.get('id');

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

function formatUTCToLocalDate(utcDate) {
    const date = new Date(utcDate);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000); // Convert the date to local timezone

    // Format the local date to YYYY-MM-DD
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(localDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatDateForDB(dateStr) {
    const [day, month, year] = dateStr.split('-');
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month}-${day}`;

}

module.exports = {
    getQueryParamId,
    checkEmailExistOrNot,
    checkPhoneExistOrNot,
    formatUTCToLocalDate,
    formatDateForDB
}