const pool = require('./src/config/db');

async function checkStatus() {
  try {
    const [rows] = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    console.log('Current status counts:');
    console.table(rows);
    
    const [overdueOrders] = await pool.query('SELECT id, prepare_completed_at, qc_completed_at, shipping_completed_at, delivered_at FROM orders WHERE status = "OVERDUE"');
    if (overdueOrders.length > 0) {
        console.log('Overdue orders details:');
        console.table(overdueOrders);
    } else {
        console.log('No orders with status = "OVERDUE" found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkStatus();
