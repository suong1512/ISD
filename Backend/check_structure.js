const pool = require('./src/config/db');

async function checkStructure() {
  try {
    const [rows] = await pool.query('DESCRIBE orders');
    console.log('Current structure of orders table:');
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkStructure();
