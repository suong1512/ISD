const pool = require('../config/db');

async function getAllProducts() {
  const [rows] = await pool.query(`
    SELECT id, name, unit_price
    FROM products
    ORDER BY name ASC
  `);

  return rows;
}

module.exports = {
  getAllProducts
};