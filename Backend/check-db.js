const pool = require('./src/config/db');

async function checkAttachments() {
    try {
        const [rows] = await pool.query('SELECT * FROM order_attachments');
        console.log('Attachments in DB:', JSON.stringify(rows, null, 2));

        const [userRows] = await pool.query('SELECT id, full_name FROM users');
        console.log('Users in DB:', JSON.stringify(userRows, null, 2));
        
        const [orderRows] = await pool.query('SELECT id, order_code FROM orders');
        console.log('Orders in DB:', JSON.stringify(orderRows, null, 2));
    } catch (error) {
        console.error('Query failed:', error.message);
    } finally {
        process.exit();
    }
}

checkAttachments();
